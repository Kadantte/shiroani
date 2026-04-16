/**
 * Extract an embedded text subtitle track to ASS.
 *
 * ffmpeg will convert most text formats (srt, webvtt, ssa) to ASS when told
 * `-c:s ass`. We run once per session per track, write the output to a tmp
 * file, and the player's HTTP server serves it from there — JASSUB ingests
 * ASS directly in the renderer.
 *
 * Image-based subs (PGS / VobSub / DVB) are rejected at a higher layer via
 * `isTextSubtitleCodec` in `probe.ts`; this module assumes the caller only
 * hands it extractable codecs.
 */

import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { createLogger } from '@shiroani/shared';

const logger = createLogger('SubtitleExtractor');

export class SubtitleExtractionError extends Error {
  readonly stderr: string;
  constructor(message: string, stderr: string) {
    super(message);
    this.name = 'SubtitleExtractionError';
    this.stderr = stderr;
  }
}

export interface ExtractSubtitleInput {
  ffmpegPath: string;
  filePath: string;
  /** Zero-based index within the subtitle-only stream list (`0:s:N`). */
  relativeIndex: number;
  outputPath: string;
  /** Optional cancellation. */
  signal?: AbortSignal;
  /** Hard timeout — some subtitle tracks on huge files can be slow. Default 60s. */
  timeoutMs?: number;
}

/**
 * Extract one subtitle track to `outputPath` as ASS. Creates parent dirs as
 * needed. Resolves on success, throws {@link SubtitleExtractionError} on
 * failure.
 *
 * Note: we use `-map 0:s:<relative>` (stream-type specifier) so callers can
 * pass zero-based indexes straight from the probe without translating to the
 * absolute ffmpeg stream index.
 */
export async function extractSubtitleToAss(input: ExtractSubtitleInput): Promise<void> {
  const { ffmpegPath, filePath, relativeIndex, outputPath, signal, timeoutMs = 60_000 } = input;

  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const args = [
    '-nostdin',
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    filePath,
    '-map',
    `0:s:${relativeIndex}`,
    '-c:s',
    'ass',
    '-f',
    'ass',
    outputPath,
  ];

  await new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new SubtitleExtractionError('Extraction aborted before spawn', ''));
      return;
    }

    const child = spawn(ffmpegPath, args, {
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe'],
    });

    let stderrBuf = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        child.kill('SIGKILL');
      } catch {
        // ignore
      }
      reject(new SubtitleExtractionError(`Extraction timed out after ${timeoutMs}ms`, stderrBuf));
    }, timeoutMs);

    const onAbort = (): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        child.kill('SIGKILL');
      } catch {
        // ignore
      }
      reject(new SubtitleExtractionError('Extraction aborted', stderrBuf));
    };

    signal?.addEventListener('abort', onAbort, { once: true });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      stderrBuf += chunk;
    });

    child.on('error', err => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      reject(new SubtitleExtractionError(`ffmpeg spawn failed: ${err.message}`, stderrBuf));
    });

    child.on('close', code => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      if (code === 0) {
        logger.debug(`extracted ${filePath}#s:${relativeIndex} -> ${outputPath}`);
        resolve();
      } else {
        reject(
          new SubtitleExtractionError(
            `ffmpeg exited with code ${code} while extracting subtitle track ${relativeIndex}`,
            stderrBuf
          )
        );
      }
    });
  });
}
