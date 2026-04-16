import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { app } from 'electron';
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import yauzl from 'yauzl';
import {
  createLogger,
  type FfmpegInstallPhase,
  type FfmpegInstallProgress,
} from '@shiroani/shared';
import { store } from '../../../main/store';
import { FfmpegService } from './ffmpeg.service';
import {
  BTBN_TAG,
  FFMPEG_BIN_DIR,
  FFMPEG_DOWNLOAD_DIR,
  FFMPEG_PINS,
  FFMPEG_STORE_KEYS,
  type FfmpegPin,
  PROGRESS_EMIT_MIN_INTERVAL_MS,
} from './ffmpeg.constants';
import {
  FfmpegChecksumMismatchError,
  FfmpegInstallCancelledError,
  FfmpegUnsupportedPlatformError,
} from './ffmpeg.errors';

const logger = createLogger('FfmpegInstallerService');

export type ProgressListener = (progress: FfmpegInstallProgress) => void;

/**
 * Orchestrates the opt-in FFmpeg download:
 *
 *   resolve → download → verify → extract → finalize
 *
 * One install can run at a time. The renderer observes progress through the
 * WebSocket gateway (which subscribes to this service via {@link onProgress}).
 * Cancellation aborts the in-flight fetch, cleans up tmp files, and emits a
 * `cancelled` progress event.
 *
 * All filesystem and network work happens in the main process — the renderer
 * never touches the archive.
 */
@Injectable()
export class FfmpegInstallerService {
  private listeners: Set<ProgressListener> = new Set();
  private abortController: AbortController | null = null;
  private lastProgressEmit = 0;

  constructor(
    @Inject(forwardRef(() => FfmpegService))
    private readonly ffmpegService: FfmpegService
  ) {
    logger.info('FfmpegInstallerService initialized');
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Register a progress listener. Returns an unsubscribe function. */
  onProgress(listener: ProgressListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  isInstalling(): boolean {
    return this.abortController !== null;
  }

  /**
   * Start the install pipeline. Resolves when the install has settled
   * (success, failure, or cancellation); throws the underlying error in the
   * failure path so the caller can surface it to the UI.
   */
  async install(): Promise<void> {
    if (this.abortController) {
      throw new Error('An FFmpeg install is already in progress');
    }

    const controller = new AbortController();
    this.abortController = controller;

    let tmpArchivePath: string | null = null;
    try {
      // ----- resolve ---------------------------------------------------------
      this.setPhase('resolve');
      const pin = this.resolvePin();

      const userData = app.getPath('userData');
      const downloadDir = path.join(userData, FFMPEG_DOWNLOAD_DIR);
      const binDir = path.join(userData, FFMPEG_BIN_DIR);
      await fs.mkdir(downloadDir, { recursive: true });
      await fs.mkdir(binDir, { recursive: true });
      tmpArchivePath = path.join(downloadDir, pin.assetName);

      // ----- download --------------------------------------------------------
      this.setPhase('download');
      await this.downloadAsset(pin, tmpArchivePath, controller.signal);

      // ----- verify ----------------------------------------------------------
      this.setPhase('verify');
      this.emitProgress({ phase: 'verify', bytes: 0, total: 0, speed: 0 }, true);
      await this.verifyChecksum(tmpArchivePath, pin.sha256);

      // ----- extract ---------------------------------------------------------
      this.setPhase('extract');
      this.emitProgress({ phase: 'extract', bytes: 0, total: 0, speed: 0 }, true);
      await this.extractBinaries(tmpArchivePath, pin, binDir);

      // ----- finalize --------------------------------------------------------
      this.setPhase('finalize');
      store.set(FFMPEG_STORE_KEYS.MODE, 'bundled');
      store.set(FFMPEG_STORE_KEYS.INSTALLED_VERSION, BTBN_TAG);
      store.set(FFMPEG_STORE_KEYS.INSTALLED_ARCH, process.arch);

      // Best-effort cleanup of the tmp archive — a leftover here is harmless.
      await this.safeUnlink(tmpArchivePath);
      tmpArchivePath = null;

      this.setPhase('done');
      this.emitProgress({ phase: 'done', bytes: 0, total: 0, speed: 0 }, true);
      logger.info(`FFmpeg install finished (tag=${BTBN_TAG})`);
    } catch (error) {
      // Always clean up the partial download.
      if (tmpArchivePath) {
        await this.safeUnlink(tmpArchivePath);
      }

      if (this.isCancellation(error)) {
        this.setPhase('cancelled');
        this.emitProgress({ phase: 'cancelled', bytes: 0, total: 0, speed: 0 }, true);
        throw new FfmpegInstallCancelledError();
      }

      this.setPhase('failed');
      const message = error instanceof Error ? error.message : String(error);
      this.emitProgress({ phase: 'failed', bytes: 0, total: 0, speed: 0, detail: message }, true);
      logger.error('FFmpeg install failed:', error);
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Cancel the in-flight install. Safe to call when nothing is running —
   * it's a no-op.
   */
  cancel(): void {
    if (!this.abortController) return;
    logger.info('Cancelling FFmpeg install');
    this.abortController.abort();
  }

  /**
   * Remove the bundled binaries from `userData/bin/` and clear the install
   * metadata. Does NOT touch `systemFfmpegPath` — that's a separate concept.
   */
  async uninstall(): Promise<void> {
    const binDir = this.ffmpegService.getBundledBinDir();
    // Don't blow up if the dir is already gone.
    await fs.rm(binDir, { recursive: true, force: true });
    // Only clear the mode if we were actually in the bundled mode — otherwise
    // uninstalling-the-missing-binaries should be a no-op for system users.
    const currentMode = this.ffmpegService.getMode();
    if (currentMode === 'bundled') {
      store.delete(FFMPEG_STORE_KEYS.MODE);
    }
    store.delete(FFMPEG_STORE_KEYS.INSTALLED_VERSION);
    store.delete(FFMPEG_STORE_KEYS.INSTALLED_ARCH);
    logger.info('FFmpeg uninstalled');
  }

  // ---------------------------------------------------------------------------
  // Phases
  // ---------------------------------------------------------------------------

  private resolvePin(): FfmpegPin {
    const archMap = FFMPEG_PINS[process.platform];
    const pin = archMap?.[process.arch];
    if (!pin) {
      throw new FfmpegUnsupportedPlatformError(process.platform);
    }
    return pin;
  }

  private async downloadAsset(
    pin: FfmpegPin,
    targetPath: string,
    signal: AbortSignal
  ): Promise<void> {
    logger.info(`Downloading FFmpeg archive: ${pin.url}`);
    const response = await fetch(pin.url, { signal, redirect: 'follow' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} for ${pin.url}`);
    }
    if (!response.body) {
      throw new Error('Download response has no body');
    }

    const contentLength = Number(response.headers.get('content-length') ?? '0');
    const total = Number.isFinite(contentLength) && contentLength > 0 ? contentLength : 0;

    // Track progress as bytes flow through. We wrap the web-stream in a Node
    // Readable and count bytes manually — this avoids pulling in a third-party
    // stream-counter just to show a progress bar.
    const startedAt = Date.now();
    let bytesRead = 0;
    this.lastProgressEmit = 0;

    const webStream = response.body as unknown as ReadableStream<Uint8Array>;
    const nodeStream = Readable.fromWeb(
      webStream as unknown as Parameters<typeof Readable.fromWeb>[0]
    );

    nodeStream.on('data', (chunk: Buffer) => {
      bytesRead += chunk.length;
      const elapsedSec = (Date.now() - startedAt) / 1000;
      const speed = elapsedSec > 0 ? bytesRead / elapsedSec : 0;
      this.emitProgress({ phase: 'download', bytes: bytesRead, total, speed });
    });

    const fileStream = createWriteStream(targetPath);
    // pipeline() propagates the AbortSignal failure through the promise and
    // also closes the file descriptor on error.
    await pipeline(nodeStream, fileStream, { signal });

    // Emit a final 100% event so the bar snaps clean before moving on.
    this.emitProgress(
      { phase: 'download', bytes: bytesRead, total: total || bytesRead, speed: 0 },
      true
    );
  }

  private async verifyChecksum(filePath: string, expectedSha256: string): Promise<void> {
    logger.info(`Verifying sha256 of ${filePath}`);
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    await pipeline(stream, async source => {
      for await (const chunk of source) {
        hash.update(chunk as Buffer);
      }
    });
    const actual = hash.digest('hex');
    if (actual.toLowerCase() !== expectedSha256.toLowerCase()) {
      throw new FfmpegChecksumMismatchError(expectedSha256, actual);
    }
  }

  private async extractBinaries(
    archivePath: string,
    pin: FfmpegPin,
    binDir: string
  ): Promise<void> {
    logger.info(`Extracting ffmpeg + ffprobe from ${pin.assetName}`);
    // BtbN archives embed both binaries under `<archiveRoot>/bin/`. We only
    // extract those two entries, normalizing path separators because yauzl
    // returns forward-slash paths on every platform.
    const wanted = new Map<string, string>();
    wanted.set(
      this.normalizeZipEntry(`${pin.archiveRoot}/${pin.ffmpegEntry}`),
      path.join(binDir, path.basename(pin.ffmpegEntry))
    );
    wanted.set(
      this.normalizeZipEntry(`${pin.archiveRoot}/${pin.ffprobeEntry}`),
      path.join(binDir, path.basename(pin.ffprobeEntry))
    );

    await openAndExtract(archivePath, wanted, detail => {
      this.emitProgress({ phase: 'extract', bytes: 0, total: 0, speed: 0, detail });
    });

    // POSIX: chmod the extracted binaries so the OS will execute them.
    if (process.platform !== 'win32') {
      for (const dest of wanted.values()) {
        try {
          await fs.chmod(dest, 0o755);
        } catch (error) {
          logger.warn(`chmod failed on ${dest}:`, error);
        }
      }
    }

    // Sanity check — if either target is missing, extraction silently
    // succeeded-but-did-nothing. Surface that as a failure.
    for (const dest of wanted.values()) {
      try {
        await fs.access(dest);
      } catch {
        throw new Error(`Extraction did not produce expected file: ${dest}`);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private normalizeZipEntry(p: string): string {
    return p.replace(/\\/g, '/');
  }

  private setPhase(phase: FfmpegInstallPhase): void {
    // Phase tracking is currently only used by the progress listeners. We
    // keep the indirection so we can add cross-phase bookkeeping later
    // (e.g. reporting on orphaned tmp files) without touching every caller.
    void phase;
  }

  /**
   * Emit a progress event, throttled to at most one every
   * {@link PROGRESS_EMIT_MIN_INTERVAL_MS} ms unless `force === true`.
   */
  private emitProgress(progress: FfmpegInstallProgress, force = false): void {
    const now = Date.now();
    if (!force && now - this.lastProgressEmit < PROGRESS_EMIT_MIN_INTERVAL_MS) {
      return;
    }
    this.lastProgressEmit = now;
    for (const listener of this.listeners) {
      try {
        listener(progress);
      } catch (error) {
        logger.warn('Progress listener threw:', error);
      }
    }
  }

  private async safeUnlink(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      const maybe = error as NodeJS.ErrnoException;
      if (maybe && maybe.code !== 'ENOENT') {
        logger.warn(`Failed to delete tmp file ${filePath}:`, error);
      }
    }
  }

  private isCancellation(error: unknown): boolean {
    if (!error) return false;
    if (error instanceof FfmpegInstallCancelledError) return true;
    const err = error as { name?: string; code?: string };
    return err.name === 'AbortError' || err.code === 'ABORT_ERR';
  }
}

// ============================================
// Zip extraction — thin promise wrapper around yauzl
// ============================================

/**
 * Open `archivePath` and stream only the entries listed in `wanted` (zip entry
 * name → destination file path) out to disk.
 *
 * We don't extract the full archive — BtbN's `win64-gpl.zip` is ~200 MB and
 * contains dozens of unrelated executables, docs, and licenses.
 */
function openAndExtract(
  archivePath: string,
  wanted: Map<string, string>,
  onDetail: (detail: string) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    yauzl.open(archivePath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) {
        reject(err ?? new Error('Failed to open zip archive'));
        return;
      }

      const remaining = new Set(wanted.keys());
      let settled = false;
      const finish = (error?: unknown) => {
        if (settled) return;
        settled = true;
        zipfile.close();
        if (error) reject(error);
        else resolve();
      };

      zipfile.on('error', finish);
      zipfile.on('end', () => {
        if (remaining.size > 0) {
          finish(new Error(`Zip missing expected entries: ${Array.from(remaining).join(', ')}`));
        } else {
          finish();
        }
      });

      zipfile.on('entry', (entry: yauzl.Entry) => {
        const entryName = entry.fileName.replace(/\\/g, '/');
        const destination = wanted.get(entryName);
        if (!destination) {
          zipfile.readEntry();
          return;
        }

        onDetail(path.basename(destination));
        zipfile.openReadStream(entry, (streamErr, readStream) => {
          if (streamErr || !readStream) {
            finish(streamErr ?? new Error(`openReadStream failed for ${entryName}`));
            return;
          }

          // Ensure the target dir exists (always true for our use, but cheap).
          fs.mkdir(path.dirname(destination), { recursive: true })
            .then(() => {
              const writer = createWriteStream(destination);
              readStream.pipe(writer);
              writer.on('error', finish);
              writer.on('finish', () => {
                remaining.delete(entryName);
                if (remaining.size === 0) {
                  finish();
                } else {
                  zipfile.readEntry();
                }
              });
            })
            .catch(finish);
        });
      });

      zipfile.readEntry();
    });
  });
}
