/**
 * PlayerService -- orchestrates player sessions end to end.
 *
 * Responsibilities:
 *   - lazy-start the shared local HTTP server on first open
 *   - for each session: probe -> extract subs -> extract fonts -> spawn ffmpeg
 *     with the correct pipeline -> register
 *   - seek / audio-switch: replace the ffmpeg args + restart the child; same
 *     session id / stream URL survives
 *   - close: tear down ffmpeg, remove tmp dir, drop from the registry
 *   - periodic GC sweep for stale sessions
 *
 * The service is singleton (per Nest) and owns a single {@link SessionRegistry}.
 * Socket payload translation lives in `player.gateway.ts`.
 */

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';

import {
  createLogger,
  type PlayerAudioTrack,
  type PlayerChapter,
  type PlayerSession,
  type PlayerSubtitleTrack,
  LOCALHOST,
} from '@shiroani/shared';

import { FfmpegService } from '../ffmpeg/ffmpeg.service';
import { FfmpegNotInstalledError } from '../ffmpeg/ffmpeg.errors';
import { LocalLibraryService } from '../local-library.service';

import { FfmpegSession } from './ffmpeg-session';
import { extractFontAttachments, type ExtractedFont } from './font-extractor';
import {
  PlayerProbeError,
  isTextSubtitleCodec,
  pickDefaultAudioTrack,
  probeForPlayback,
  type PlayerProbeResult,
  type PlayerProbedSubtitleTrack,
} from './probe';
import { buildPipeline } from './pipeline-decider';
import {
  MAX_CONCURRENT_SESSIONS,
  SessionRegistry,
  STALE_SESSION_TIMEOUT_MS,
  SWEEP_INTERVAL_MS,
  type PlayerSessionState,
} from './session-registry';
import { startPlayerHttpServer, type PlayerHttpServerHandle } from './player-http-server';
import { extractSubtitleToAss } from './subtitle-extractor';

const logger = createLogger('PlayerService');

/** Top-level error classes that surface typed codes to the renderer. */
export class PlayerFileNotFoundError extends Error {
  constructor(filePath: string) {
    super(`File not found: ${filePath}`);
    this.name = 'PlayerFileNotFoundError';
  }
}

export class PlayerProbeFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlayerProbeFailedError';
  }
}

@Injectable()
export class PlayerService implements OnModuleDestroy {
  private readonly registry = new SessionRegistry();
  private httpServer: PlayerHttpServerHandle | null = null;
  private httpServerPromise: Promise<PlayerHttpServerHandle> | null = null;
  private sweepTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly ffmpegService: FfmpegService,
    private readonly localLibraryService: LocalLibraryService
  ) {
    logger.info('PlayerService initialized');
    this.startSweep();
  }

  onModuleDestroy(): void {
    logger.info('PlayerService shutting down');
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
    // Fire-and-forget shutdown -- Nest's onModuleDestroy is sync but our
    // teardown is async. We log errors rather than blocking the lifecycle.
    void this.shutdown().catch(err => logger.error(`Shutdown error: ${(err as Error).message}`));
  }

  /**
   * Full teardown -- called from Nest lifecycle and from the main-process
   * `before-quit` hook. Idempotent.
   */
  async shutdown(): Promise<void> {
    const sessions = this.registry.values();
    for (const state of sessions) {
      try {
        await this.teardownSession(state);
      } catch (err) {
        logger.warn(`Error tearing down session ${state.sessionId}: ${(err as Error).message}`);
      }
    }
    if (this.httpServer) {
      await this.httpServer.close();
      this.httpServer = null;
      this.httpServerPromise = null;
    }
  }

  getServerPort(): number | null {
    return this.httpServer?.port ?? null;
  }

  /**
   * Open a new session for the given episode. Probes -> extracts -> spawns
   * ffmpeg -> registers. On LRU eviction, the oldest session is torn down
   * before the new one is inserted.
   */
  async openSession(episodeId: number): Promise<PlayerSession> {
    const t0 = Date.now();
    const phase = (label: string, since: number): void => {
      logger.info(`openSession episode=${episodeId} ${label} (+${Date.now() - since}ms)`);
    };

    logger.info(`openSession episode=${episodeId} start`);

    const episode = this.localLibraryService.getEpisodeById(episodeId);
    if (!episode) {
      throw new PlayerFileNotFoundError(`Episode ${episodeId}`);
    }
    if (!existsSync(episode.filePath)) {
      logger.warn(`openSession episode=${episodeId} file missing path=${episode.filePath}`);
      throw new PlayerFileNotFoundError(episode.filePath);
    }
    logger.info(
      `openSession episode=${episodeId} resolved file size=${episode.fileSize} path=${episode.filePath}`
    );

    // Throws FfmpegNotInstalledError -- the gateway maps it to the typed
    // code the renderer's setup dialog listens for.
    const { ffmpegPath, ffprobePath } = this.ffmpegService.resolvePaths();
    logger.debug(`openSession episode=${episodeId} ffmpeg=${ffmpegPath} ffprobe=${ffprobePath}`);

    const tServer = Date.now();
    const server = await this.ensureHttpServer();
    phase(`http-server-ready port=${server.port}`, tServer);

    const tProbe = Date.now();
    let probe: PlayerProbeResult;
    try {
      probe = await probeForPlayback(ffprobePath, episode.filePath);
    } catch (err) {
      if (err instanceof PlayerProbeError) {
        logger.error(
          `openSession episode=${episodeId} probe failed: ${err.message} stderr=${err.stderr.slice(-512)}`
        );
        throw new PlayerProbeFailedError(err.message);
      }
      throw err;
    }
    phase(
      `probe-complete video=${probe.videoCodec} ${probe.width}x${probe.height} ` +
        `audio=${probe.audioTracks.length}tracks subs=${probe.subtitleTracks.length}tracks ` +
        `attach=${probe.attachments.length} dur=${probe.durationSeconds.toFixed(1)}s`,
      tProbe
    );

    const sessionId = randomUUID();
    const tmpDir = path.join(tmpdir(), 'shiroani-player', sessionId);
    await fs.mkdir(tmpDir, { recursive: true });
    logger.debug(`openSession episode=${episodeId} session=${sessionId} tmpDir=${tmpDir}`);

    const audioTrack = pickDefaultAudioTrack(probe.audioTracks);
    const resumePositionSeconds = this.resolveResumePosition(episodeId, probe.durationSeconds);

    // Subtitle extraction runs in parallel; each text track -> one ffmpeg
    // invocation. Image subs are included as disabled entries.
    const tSubs = Date.now();
    const subtitleTracks = await this.extractSubtitlesForSession({
      ffmpegPath,
      filePath: episode.filePath,
      tmpDir,
      tracks: probe.subtitleTracks,
    });
    const extractedCount = subtitleTracks.filter(s => s.extractedPath !== null).length;
    phase(`subs-extracted ${extractedCount}/${probe.subtitleTracks.length}`, tSubs);

    // Font extraction runs once per session, regardless of track count --
    // the dump_attachment pass dumps every attachment in one ffmpeg call.
    const tFonts = Date.now();
    const fonts = await this.extractFontsForSession({
      ffmpegPath,
      filePath: episode.filePath,
      tmpDir,
    });
    phase(`fonts-extracted ${fonts.length}`, tFonts);

    const { args, mode } = buildPipeline({
      filePath: episode.filePath,
      probe,
      audioTrack,
      startSeconds: resumePositionSeconds,
    });

    const ffmpeg = new FfmpegSession({ sessionId, ffmpegPath, args });

    const state: PlayerSessionState = {
      sessionId,
      episodeId,
      filePath: episode.filePath,
      tmpDir,
      probe,
      audioTrack,
      audioRelativeIndex: audioTrack?.relativeIndex ?? 0,
      currentStartSeconds: resumePositionSeconds,
      subtitleTracks,
      fonts,
      ffmpeg,
      lastActivityMs: Date.now(),
    };

    // Evict LRU BEFORE inserting so the registry never transiently exceeds
    // the cap. Teardown is awaited to avoid the new session seeing the
    // evicted one's tmp files.
    const { evict } = this.registry.add(state);
    if (evict) {
      const evicted = this.registry.remove(evict);
      if (evicted) {
        logger.info(`Evicting LRU session ${evict} to make room for ${sessionId}`);
        await this.teardownSession(evicted).catch(err =>
          logger.warn(`Evict teardown ${evict}: ${(err as Error).message}`)
        );
      }
    }

    logger.info(
      `openSession episode=${episodeId} session=${sessionId} READY mode=${mode} ` +
        `video=${probe.videoCodec} audio=${audioTrack?.codec ?? 'none'} ` +
        `durationSec=${probe.durationSeconds.toFixed(1)} resume=${resumePositionSeconds.toFixed(1)} ` +
        `(total +${Date.now() - t0}ms)`
    );

    return this.buildSessionPayload(state, server.port, mode);
  }

  /**
   * Seek: kill the running ffmpeg, rebuild args with the new `-ss`, restart
   * the child. Same session id + stream URL; renderer re-`load()`s the
   * `<video>` element.
   */
  seek(sessionId: string, positionSeconds: number): { streamUrl: string; positionSeconds: number } {
    const state = this.registry.get(sessionId);
    if (!state) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    const server = this.httpServer;
    if (!server) {
      throw new Error('Player HTTP server not running');
    }

    const clampedPos = Math.max(0, Math.min(positionSeconds, state.probe.durationSeconds));

    const { args } = buildPipeline({
      filePath: state.filePath,
      probe: state.probe,
      audioTrack: state.audioTrack,
      startSeconds: clampedPos,
    });

    state.ffmpeg.replaceArgs(args);
    state.ffmpeg.restart();
    state.currentStartSeconds = clampedPos;
    this.registry.touch(sessionId);

    return {
      streamUrl: this.buildStreamUrl(server.port, sessionId),
      positionSeconds: clampedPos,
    };
  }

  /**
   * Switch the mapped audio track. Uses the same primitive as seek --
   * rebuild args (new `-map` + start offset) and restart the child.
   */
  switchAudio(
    sessionId: string,
    trackIndex: number,
    atPositionSeconds: number
  ): { streamUrl: string; positionSeconds: number } {
    const state = this.registry.get(sessionId);
    if (!state) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    const server = this.httpServer;
    if (!server) {
      throw new Error('Player HTTP server not running');
    }

    const targetTrack = state.probe.audioTracks.find(t => t.index === trackIndex);
    if (!targetTrack) {
      throw new Error(`Audio track ${trackIndex} not found on session ${sessionId}`);
    }

    const clampedPos = Math.max(0, Math.min(atPositionSeconds, state.probe.durationSeconds));

    const { args } = buildPipeline({
      filePath: state.filePath,
      probe: state.probe,
      audioTrack: targetTrack,
      startSeconds: clampedPos,
    });

    state.ffmpeg.replaceArgs(args);
    state.ffmpeg.restart();
    state.audioTrack = targetTrack;
    state.audioRelativeIndex = targetTrack.relativeIndex;
    state.currentStartSeconds = clampedPos;
    this.registry.touch(sessionId);

    return {
      streamUrl: this.buildStreamUrl(server.port, sessionId),
      positionSeconds: clampedPos,
    };
  }

  /** Close a session on demand from the renderer. Safe to call on an unknown id. */
  async closeSession(sessionId: string): Promise<boolean> {
    const state = this.registry.remove(sessionId);
    if (!state) {
      return false;
    }
    await this.teardownSession(state);
    return true;
  }

  // ==========================================================================
  // Internals
  // ==========================================================================

  private resolveResumePosition(episodeId: number, durationSeconds: number): number {
    const progress = this.localLibraryService.getEpisodeProgress(episodeId);
    if (!progress) return 0;
    if (progress.completed) return 0;
    if (progress.positionSeconds <= 0) return 0;
    // Guard against pathological stored positions (> duration).
    if (durationSeconds > 0 && progress.positionSeconds >= durationSeconds - 1) return 0;
    return progress.positionSeconds;
  }

  private async ensureHttpServer(): Promise<PlayerHttpServerHandle> {
    if (this.httpServer) return this.httpServer;
    if (!this.httpServerPromise) {
      this.httpServerPromise = startPlayerHttpServer(this.registry).then(handle => {
        this.httpServer = handle;
        return handle;
      });
    }
    return this.httpServerPromise;
  }

  private async extractSubtitlesForSession(input: {
    ffmpegPath: string;
    filePath: string;
    tmpDir: string;
    tracks: PlayerProbedSubtitleTrack[];
  }): Promise<Array<{ track: PlayerProbedSubtitleTrack; extractedPath: string | null }>> {
    const { ffmpegPath, filePath, tmpDir, tracks } = input;
    const subsDir = path.join(tmpDir, 'subs');
    if (tracks.length === 0) return [];
    await fs.mkdir(subsDir, { recursive: true });

    const results = await Promise.all(
      tracks.map(async track => {
        if (!isTextSubtitleCodec(track.codec)) {
          return { track, extractedPath: null };
        }
        const outputPath = path.join(subsDir, `${track.index}.ass`);
        try {
          await extractSubtitleToAss({
            ffmpegPath,
            filePath,
            relativeIndex: track.relativeIndex,
            outputPath,
          });
          return { track, extractedPath: outputPath };
        } catch (err) {
          // A failed single-track extraction shouldn't tank the session --
          // surface the track as disabled and log the reason.
          logger.warn(
            `Subtitle extract failed track=${track.index} codec=${track.codec}: ${(err as Error).message}`
          );
          return { track, extractedPath: null };
        }
      })
    );
    return results;
  }

  private async extractFontsForSession(input: {
    ffmpegPath: string;
    filePath: string;
    tmpDir: string;
  }): Promise<ExtractedFont[]> {
    const fontsDir = path.join(input.tmpDir, 'fonts');
    try {
      return await extractFontAttachments({
        ffmpegPath: input.ffmpegPath,
        filePath: input.filePath,
        outputDir: fontsDir,
      });
    } catch (err) {
      logger.warn(`Font extraction failed: ${(err as Error).message}`);
      return [];
    }
  }

  private buildStreamUrl(port: number, sessionId: string): string {
    return `http://${LOCALHOST}:${port}/stream/${sessionId}`;
  }

  private buildSubsUrl(port: number, sessionId: string, streamIndex: number): string {
    return `http://${LOCALHOST}:${port}/subs/${sessionId}/${streamIndex}.ass`;
  }

  private buildFontUrl(port: number, sessionId: string, filename: string): string {
    return `http://${LOCALHOST}:${port}/fonts/${sessionId}/${encodeURIComponent(filename)}`;
  }

  private buildSessionPayload(
    state: PlayerSessionState,
    port: number,
    mode: PlayerSession['mode']
  ): PlayerSession {
    const audioTracks: PlayerAudioTrack[] = state.probe.audioTracks.map(t => ({
      index: t.index,
      codec: t.codec,
      language: t.language,
      title: t.title,
      channels: t.channels,
      isDefault: t.isDefault,
    }));

    const subtitleTracks: PlayerSubtitleTrack[] = state.subtitleTracks.map(
      ({ track, extractedPath }) => ({
        index: track.index,
        codec: track.codec,
        language: track.language,
        title: track.title,
        isForced: track.isForced,
        isDefault: track.isDefault,
        subsUrl: extractedPath ? this.buildSubsUrl(port, state.sessionId, track.index) : null,
      })
    );

    const chapters: PlayerChapter[] = state.probe.chapters.map(c => ({
      startSeconds: c.startSeconds,
      endSeconds: c.endSeconds,
      title: c.title,
    }));

    const fontUrls = state.fonts.map(f => this.buildFontUrl(port, state.sessionId, f.filename));

    return {
      sessionId: state.sessionId,
      episodeId: state.episodeId,
      streamUrl: this.buildStreamUrl(port, state.sessionId),
      mode,
      durationSeconds: state.probe.durationSeconds,
      videoCodec: state.probe.videoCodec,
      width: state.probe.width,
      height: state.probe.height,
      audioTracks,
      subtitleTracks,
      chapters,
      fontUrls,
      resumePositionSeconds: state.currentStartSeconds,
    };
  }

  private async teardownSession(state: PlayerSessionState): Promise<void> {
    try {
      state.ffmpeg.kill();
    } catch (err) {
      logger.debug(`teardown: ffmpeg kill ${state.sessionId}: ${(err as Error).message}`);
    }
    try {
      await fs.rm(state.tmpDir, { recursive: true, force: true });
    } catch (err) {
      logger.debug(`teardown: rm tmp ${state.sessionId}: ${(err as Error).message}`);
    }
    logger.info(`Closed session ${state.sessionId}`);
  }

  private startSweep(): void {
    this.sweepTimer = setInterval(() => {
      const stale = this.registry.findStale(STALE_SESSION_TIMEOUT_MS);
      if (stale.length === 0) return;
      logger.info(`Reaping ${stale.length} stale session(s)`);
      for (const id of stale) {
        const state = this.registry.remove(id);
        if (state) {
          void this.teardownSession(state).catch(err =>
            logger.warn(`Sweep teardown ${id}: ${(err as Error).message}`)
          );
        }
      }
    }, SWEEP_INTERVAL_MS);
    // Don't keep the Node event loop alive just for this timer.
    this.sweepTimer.unref?.();
  }

  /**
   * Exposed for diagnostics / tests -- returns the current in-memory count
   * of active sessions.
   */
  getActiveSessionCount(): number {
    return this.registry.size();
  }

  /** Exposed for diagnostics -- echo of the session cap. */
  getMaxSessions(): number {
    return MAX_CONCURRENT_SESSIONS;
  }

  // Gate exposed for testing -- allows direct error translation helpers to
  // live in the gateway without leaking error constructors.
  static isFfmpegNotInstalledError(err: unknown): err is FfmpegNotInstalledError {
    return err instanceof FfmpegNotInstalledError;
  }
}
