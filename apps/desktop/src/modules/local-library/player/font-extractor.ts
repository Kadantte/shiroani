/**
 * Extract MKV font attachments to a tmp directory.
 *
 * MKV releases ship fonts inline so ASS renderers can pick them up — we
 * unpack them to disk once per session and the player HTTP server hands
 * them to JASSUB in the renderer via `fetch()`.
 *
 * We run ffmpeg with `-dump_attachment:t ""` from within the target
 * directory so the attachments land with their original filenames (e.g.
 * `ArialUnicode.ttf`) instead of a generated name.
 *
 * MP4 and other containers without attachment streams yield an empty
 * result — no failure, just zero fonts.
 */

import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { createLogger } from '@shiroani/shared';

const logger = createLogger('FontExtractor');

export class FontExtractionError extends Error {
  readonly stderr: string;
  constructor(message: string, stderr: string) {
    super(message);
    this.name = 'FontExtractionError';
    this.stderr = stderr;
  }
}

export interface ExtractFontsInput {
  ffmpegPath: string;
  filePath: string;
  /** Directory to dump attachment files into (created if missing). */
  outputDir: string;
  signal?: AbortSignal;
  /** Default 60s — big BDRip MKVs can carry dozens of font attachments. */
  timeoutMs?: number;
}

export interface ExtractedFont {
  /** Filename (basename) as emitted by ffmpeg — safe to URL-encode. */
  filename: string;
  /** Absolute on-disk path. */
  absolutePath: string;
}

/**
 * Extract every attachment stream to `outputDir`, return the list of files
 * that landed there. Returns `[]` when the source has no attachments.
 *
 * ffmpeg exits non-zero on "no attachments" in some versions; we treat an
 * empty output dir after the process settles as the success-empty case
 * regardless of the exit code, since the scanner probe already told us
 * whether to expect fonts.
 */
export async function extractFontAttachments(input: ExtractFontsInput): Promise<ExtractedFont[]> {
  const { ffmpegPath, filePath, outputDir, signal, timeoutMs = 60_000 } = input;

  await fs.mkdir(outputDir, { recursive: true });

  // `-dump_attachment:t ""` — the ":t" stream specifier scopes to attachment
  // streams; the empty string asks ffmpeg to name each file after the
  // attachment's `filename` tag. We pair it with `-f null -` so ffmpeg has a
  // muxer but produces no output stream.
  const args = [
    '-nostdin',
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-dump_attachment:t',
    '',
    '-i',
    filePath,
    '-f',
    'null',
    '-',
  ];

  await new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new FontExtractionError('Font extraction aborted before spawn', ''));
      return;
    }

    const child = spawn(ffmpegPath, args, {
      // Set CWD so `-dump_attachment` writes into outputDir directly.
      cwd: outputDir,
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
      reject(new FontExtractionError(`Font extraction timed out after ${timeoutMs}ms`, stderrBuf));
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
      reject(new FontExtractionError('Font extraction aborted', stderrBuf));
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
      reject(new FontExtractionError(`ffmpeg spawn failed: ${err.message}`, stderrBuf));
    });

    child.on('close', () => {
      // Deliberately ignore the exit code — empty attachment lists exit
      // non-zero on some ffmpeg versions, and we reconcile via the
      // post-scan of outputDir anyway. Real failures (spawn error) come
      // through the 'error' event.
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      resolve();
    });
  });

  // Post-scan: collect everything written into outputDir. Ignore hidden
  // files and directories — attachments are always plain files.
  const entries = await fs.readdir(outputDir, { withFileTypes: true });
  const fonts: ExtractedFont[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (entry.name.startsWith('.')) continue;
    fonts.push({
      filename: entry.name,
      absolutePath: path.join(outputDir, entry.name),
    });
  }

  logger.debug(`extracted ${fonts.length} font attachment(s) from ${filePath}`);
  return fonts;
}
