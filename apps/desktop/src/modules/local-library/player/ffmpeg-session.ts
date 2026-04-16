/**
 * Per-session ffmpeg process manager.
 *
 * Wraps one {@link ChildProcess} and offers a focused lifecycle:
 *   - `start()` spawns ffmpeg with the pipeline args and wires up stderr logging.
 *   - `pipe(res)` connects the current stdout to an HTTP response; safely
 *     handles client disconnects by SIGKILLing ffmpeg so we don't write to a
 *     dead socket forever.
 *   - `kill()` tears everything down idempotently.
 *
 * The service layer owns the lifecycle — this class just keeps track of one
 * child at a time and exposes the two callsites (HTTP pipe + forced restart
 * on seek/audio-switch) that need to re-spawn with fresh args.
 */

import { spawn, type ChildProcessByStdio } from 'node:child_process';
import type { Readable } from 'node:stream';
import type { ServerResponse } from 'node:http';
import { createLogger } from '@shiroani/shared';

const logger = createLogger('FfmpegSession');

/**
 * ffmpeg is spawned with `stdio: ['ignore', 'pipe', 'pipe']` -- stdin is
 * null, stdout + stderr are readable. The generic `ChildProcess` type loses
 * that shape, so we declare a narrowed child type that matches the spawn
 * options one-to-one.
 */
type FfmpegChild = ChildProcessByStdio<null, Readable, Readable>;

export interface FfmpegSessionOptions {
  sessionId: string;
  ffmpegPath: string;
  /** Initial argv — rebuilt on seek / audio switch via {@link replaceArgs}. */
  args: string[];
}

/**
 * State of an ffmpeg child process for a single player session.
 *
 * Thread-safety: every operation is called from the main Electron thread,
 * so no locking needed. Idempotency matters though — {@link kill} is called
 * from multiple places (HTTP client abort, session close, LRU eviction).
 */
export class FfmpegSession {
  private child: FfmpegChild | null = null;
  private currentArgs: string[];
  private readonly sessionId: string;
  private readonly ffmpegPath: string;
  /** Tail of the most recent stderr output, preserved for error diagnostics. */
  private stderrTail = '';
  private killed = false;

  constructor(options: FfmpegSessionOptions) {
    this.sessionId = options.sessionId;
    this.ffmpegPath = options.ffmpegPath;
    this.currentArgs = options.args;
  }

  /** Replace the argv that will be used on the next `start()` / `ensureRunning()`. */
  replaceArgs(args: string[]): void {
    this.currentArgs = args;
  }

  /** True when a child process is currently running. */
  isRunning(): boolean {
    return this.child !== null && this.child.exitCode === null && !this.killed;
  }

  /**
   * Spawn ffmpeg if one isn't already running. No-op when the current
   * process is still alive — this is the safe entry point for the HTTP
   * handler.
   */
  ensureRunning(): FfmpegChild {
    if (this.child && this.child.exitCode === null && !this.killed) {
      return this.child;
    }
    return this.spawnNew();
  }

  /**
   * Kill the running process and spawn a fresh one with `currentArgs`. Used
   * after {@link replaceArgs} for seek / audio-track switch — the new
   * process starts at the updated `-ss` offset or with the new `-map`
   * selection, and the HTTP handler re-pipes on the next `/stream` request.
   */
  restart(): FfmpegChild {
    this.killChildOnly();
    return this.spawnNew();
  }

  /**
   * Pipe the current ffmpeg stdout to an HTTP response. Handles three
   * failure paths:
   *   - client disconnects → SIGKILL ffmpeg
   *   - ffmpeg exits non-zero → ends the response
   *   - ffmpeg stderr chatter → swallowed into `stderrTail` for diagnostics
   *
   * Returns after the pipe is attached — the caller should not write to
   * `res` again.
   */
  pipeTo(res: ServerResponse): void {
    const child = this.ensureRunning();

    const cleanup = (): void => {
      child.stdout.off('data', onStdout);
      child.stdout.off('end', onStdoutEnd);
      child.off('error', onError);
      child.off('exit', onExit);
      res.off('close', onClientClose);
      res.off('error', onResError);
    };

    const onStdout = (chunk: Buffer): void => {
      // Respect backpressure — if the write buffer is full, pause stdout
      // until `drain`. Prevents unbounded memory growth on slow clients.
      const ok = res.write(chunk);
      if (!ok) {
        child.stdout.pause();
        res.once('drain', () => {
          child.stdout.resume();
        });
      }
    };

    const onStdoutEnd = (): void => {
      cleanup();
      if (!res.writableEnded) {
        res.end();
      }
    };

    const onError = (err: Error): void => {
      logger.error(`[session ${this.sessionId}] ffmpeg error: ${err.message}`);
      cleanup();
      if (!res.writableEnded) {
        res.end();
      }
    };

    const onExit = (code: number | null, signal: NodeJS.Signals | null): void => {
      logger.debug(
        `[session ${this.sessionId}] ffmpeg exited code=${code} signal=${signal ?? 'none'}`
      );
      cleanup();
      if (!res.writableEnded) {
        res.end();
      }
    };

    const onClientClose = (): void => {
      logger.debug(`[session ${this.sessionId}] client disconnected — killing ffmpeg`);
      cleanup();
      this.killChildOnly();
    };

    const onResError = (err: Error): void => {
      logger.debug(`[session ${this.sessionId}] response error: ${err.message}`);
      cleanup();
      this.killChildOnly();
    };

    child.stdout.on('data', onStdout);
    child.stdout.on('end', onStdoutEnd);
    child.on('error', onError);
    child.on('exit', onExit);
    res.on('close', onClientClose);
    res.on('error', onResError);
  }

  /** Tear down permanently. Safe to call repeatedly. */
  kill(): void {
    if (this.killed) return;
    this.killed = true;
    this.killChildOnly();
  }

  getStderrTail(): string {
    return this.stderrTail;
  }

  private spawnNew(): FfmpegChild {
    // `killed` can be set back to false implicitly via replaceArgs+restart,
    // but our explicit kill() is one-way. Don't revive a dead session.
    if (this.killed) {
      throw new Error(`Cannot spawn: session ${this.sessionId} was killed`);
    }

    logger.debug(
      `[session ${this.sessionId}] spawning ffmpeg ${this.ffmpegPath} ${this.currentArgs.join(' ')}`
    );

    const child = spawn(this.ffmpegPath, this.currentArgs, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Buffer the last ~8 KB of stderr so diagnostic surfacing doesn't
    // unbounded-ly accumulate memory over long streams.
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      this.stderrTail = (this.stderrTail + chunk).slice(-8192);
    });

    child.on('error', err => {
      logger.error(`[session ${this.sessionId}] spawn error: ${err.message}`);
    });

    child.on('exit', (code, signal) => {
      if (code !== 0 && signal !== 'SIGKILL') {
        logger.warn(
          `[session ${this.sessionId}] ffmpeg exited code=${code}: ${this.stderrTail.slice(-512)}`
        );
      }
    });

    this.child = child;
    return child;
  }

  /** Kill the current child without marking the session itself as dead. */
  private killChildOnly(): void {
    const child = this.child;
    if (!child) return;
    this.child = null;
    if (child.exitCode === null) {
      try {
        child.kill('SIGKILL');
      } catch (err) {
        logger.debug(`[session ${this.sessionId}] kill error: ${(err as Error).message}`);
      }
    }
  }
}
