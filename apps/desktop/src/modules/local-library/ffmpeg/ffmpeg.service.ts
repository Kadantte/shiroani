import { Injectable } from '@nestjs/common';
import { app } from 'electron';
import { existsSync, accessSync, constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { createLogger, type FfmpegMode, type FfmpegStatus } from '@shiroani/shared';
import { store } from '../../../main/store';
import { FfmpegNotInstalledError } from './ffmpeg.errors';
import { FFMPEG_BIN_DIR, FFMPEG_PINS, FFMPEG_STORE_KEYS } from './ffmpeg.constants';

const logger = createLogger('FfmpegService');

/**
 * Consumer-facing helper that resolves FFmpeg + FFprobe paths based on the
 * installer state persisted in `electron-store`.
 *
 * Used by later phases (scan, player, poster extraction). Does NOT spawn
 * FFmpeg itself — that concern stays with each consumer.
 */
@Injectable()
export class FfmpegService {
  constructor() {
    logger.info('FfmpegService initialized');
  }

  /** Absolute path to `userData/bin/` (used by the bundled mode). */
  getBundledBinDir(): string {
    return path.join(app.getPath('userData'), FFMPEG_BIN_DIR);
  }

  private getBundledPaths(): { ffmpegPath: string; ffprobePath: string } {
    const dir = this.getBundledBinDir();
    const suffix = process.platform === 'win32' ? '.exe' : '';
    return {
      ffmpegPath: path.join(dir, `ffmpeg${suffix}`),
      ffprobePath: path.join(dir, `ffprobe${suffix}`),
    };
  }

  /** Whether the current platform+arch has a pinned bundled build. */
  isBundledSupported(): boolean {
    const archMap = FFMPEG_PINS[process.platform];
    if (!archMap) return false;
    return archMap[process.arch] !== undefined;
  }

  /** Current mode stored in electron-store (defaults to 'none'). */
  getMode(): FfmpegMode {
    const raw = store.get(FFMPEG_STORE_KEYS.MODE);
    if (raw === 'bundled' || raw === 'system' || raw === 'none') return raw;
    return 'none';
  }

  getInstalledVersion(): string | null {
    const raw = store.get(FFMPEG_STORE_KEYS.INSTALLED_VERSION);
    return typeof raw === 'string' && raw.length > 0 ? raw : null;
  }

  getSystemPaths(): { ffmpegPath: string | null; ffprobePath: string | null } {
    const ffmpegPath = store.get(FFMPEG_STORE_KEYS.SYSTEM_FFMPEG_PATH);
    const ffprobePath = store.get(FFMPEG_STORE_KEYS.SYSTEM_FFPROBE_PATH);
    return {
      ffmpegPath: typeof ffmpegPath === 'string' && ffmpegPath.length > 0 ? ffmpegPath : null,
      ffprobePath: typeof ffprobePath === 'string' && ffprobePath.length > 0 ? ffprobePath : null,
    };
  }

  /**
   * Resolve a working ffmpeg+ffprobe pair.
   *
   * Resolution order (matches the design doc):
   *   1. mode === 'system'  → use user-provided paths
   *   2. mode === 'bundled' → use `userData/bin/ffmpeg[.exe]`
   *   3. otherwise          → throw FfmpegNotInstalledError
   *
   * Validates that the files exist and are executable; stale state from an
   * earlier uninstall won't yield a "still installed" result.
   */
  resolvePaths(): { ffmpegPath: string; ffprobePath: string } {
    const mode = this.getMode();

    if (mode === 'system') {
      const { ffmpegPath, ffprobePath } = this.getSystemPaths();
      if (!ffmpegPath || !ffprobePath) {
        throw new FfmpegNotInstalledError('System ffmpeg paths are not configured');
      }
      if (!this.isExecutable(ffmpegPath) || !this.isExecutable(ffprobePath)) {
        throw new FfmpegNotInstalledError('System ffmpeg paths are no longer valid');
      }
      return { ffmpegPath, ffprobePath };
    }

    if (mode === 'bundled') {
      const { ffmpegPath, ffprobePath } = this.getBundledPaths();
      if (!this.isExecutable(ffmpegPath) || !this.isExecutable(ffprobePath)) {
        throw new FfmpegNotInstalledError('Bundled ffmpeg binaries are missing');
      }
      return { ffmpegPath, ffprobePath };
    }

    throw new FfmpegNotInstalledError();
  }

  /**
   * Throws {@link FfmpegNotInstalledError} if no working install is resolved.
   * Convenience wrapper for callers that only care about availability.
   */
  ensureAvailable(): void {
    this.resolvePaths();
  }

  /**
   * Whether ffmpeg is currently available (non-throwing variant of
   * {@link resolvePaths}).
   */
  isAvailable(): boolean {
    try {
      this.resolvePaths();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Compute the full status snapshot — used by IPC/gateway handlers and by
   * the UI to render the correct setup-dialog state.
   */
  getStatus(): FfmpegStatus {
    const mode = this.getMode();
    const bundledSupported = this.isBundledSupported();
    const version = this.getInstalledVersion();

    let ffmpegPath: string | null = null;
    let ffprobePath: string | null = null;
    let installed = false;

    try {
      const resolved = this.resolvePaths();
      ffmpegPath = resolved.ffmpegPath;
      ffprobePath = resolved.ffprobePath;
      installed = true;
    } catch {
      // installed already false — keep it that way.
    }

    return {
      mode,
      installed,
      ffmpegPath,
      ffprobePath,
      version: mode === 'bundled' ? version : null,
      platform: process.platform,
      bundledSupported,
    };
  }

  /**
   * Quick filesystem-level existence + executable check. For bundled installs
   * we control both the file and the mode bits, so this is sufficient; the
   * deeper "is this actually ffmpeg" validation runs at system-path-pick time
   * via {@link validateSystemBinary}.
   */
  private isExecutable(filePath: string): boolean {
    if (!existsSync(filePath)) return false;
    try {
      // On Windows X_OK is effectively a no-op (always succeeds for existing
      // files), which is fine — PE execution permission is not filesystem-gated.
      accessSync(filePath, fsConstants.F_OK | fsConstants.X_OK);
      return true;
    } catch {
      return false;
    }
  }
}
