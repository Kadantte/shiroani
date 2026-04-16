/**
 * Pinned FFmpeg release used by the opt-in installer.
 *
 * Source: https://github.com/BtbN/FFmpeg-Builds
 *
 * We pin a specific autobuild tag + per-platform sha256 rather than tracking
 * `latest`, so every ShiroAni release downloads the exact same binary and we
 * don't silently switch ffmpeg versions under users. To bump the pin:
 *
 *   1. Pick a new autobuild tag from
 *      https://github.com/BtbN/FFmpeg-Builds/releases
 *   2. Copy the `win64-gpl.zip` asset name (it embeds the git rev) and its
 *      sha256 from the `checksums.sha256` asset in the same release.
 *   3. Update `BTBN_TAG` + the matching entry in `FFMPEG_PINS`.
 *
 * Note on checksums: BtbN publishes a `checksums.sha256` asset with every
 * release. We hard-code the value here rather than fetching that file because
 * hard-coded verification is auditable across git history — a compromise of
 * the release wouldn't silently be "trusted" at download time. If a future
 * release ever ships without checksums we'd fall back to computing+storing
 * the hash on first install, but this is the preferred path.
 */

import type { FfmpegInstallPhase } from '@shiroani/shared';

/** Pinned BtbN autobuild tag. */
export const BTBN_TAG = 'autobuild-2026-04-16-13-18';

export interface FfmpegPin {
  /** Full asset URL to download. */
  url: string;
  /** Hex sha256 of the asset archive. */
  sha256: string;
  /** Name of the asset file (used for the tmp download filename). */
  assetName: string;
  /**
   * The directory prefix that the archive uses internally — e.g. BtbN ZIPs
   * contain `ffmpeg-N-<rev>-<platform>/bin/ffmpeg.exe`. We use this to locate
   * the binaries during extraction without brittle string matching.
   */
  archiveRoot: string;
  /** Relative path of ffmpeg inside `archiveRoot`. */
  ffmpegEntry: string;
  /** Relative path of ffprobe inside `archiveRoot`. */
  ffprobeEntry: string;
}

/**
 * Per-platform pinned downloads.
 *
 * BtbN no longer ships macOS builds in FFmpeg-Builds (as of 2026), so darwin
 * users must use the "system ffmpeg path" flow (Homebrew's `ffmpeg` package
 * is the canonical choice there). Electron 40 on darwin will hit
 * `FfmpegUnsupportedPlatformError` if they try to auto-install, and the UI
 * surfaces that as a friendly fallback prompt.
 */
export const FFMPEG_PINS: Partial<Record<NodeJS.Platform, Record<string, FfmpegPin>>> = {
  win32: {
    x64: {
      url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/autobuild-2026-04-16-13-18/ffmpeg-N-123978-g3b19a61837-win64-gpl.zip',
      sha256: '80fa6ac7ec5bcbfb96f281b63a968223393ce241d3097b4e8bf063b0798d09bd',
      assetName: 'ffmpeg-N-123978-g3b19a61837-win64-gpl.zip',
      archiveRoot: 'ffmpeg-N-123978-g3b19a61837-win64-gpl',
      ffmpegEntry: 'bin/ffmpeg.exe',
      ffprobeEntry: 'bin/ffprobe.exe',
    },
    arm64: {
      url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/autobuild-2026-04-16-13-18/ffmpeg-N-123978-g3b19a61837-winarm64-gpl.zip',
      sha256: '243752e5a1e993b88248eeb22e5a748f25b04930ffb73c85f34ee8f73dcfa77d',
      assetName: 'ffmpeg-N-123978-g3b19a61837-winarm64-gpl.zip',
      archiveRoot: 'ffmpeg-N-123978-g3b19a61837-winarm64-gpl',
      ffmpegEntry: 'bin/ffmpeg.exe',
      ffprobeEntry: 'bin/ffprobe.exe',
    },
  },
};

// ============================================
// Store keys
// ============================================

/**
 * electron-store keys used by the ffmpeg module. Keep them prefixed so the
 * persisted schema stays self-documenting and clashes with other modules are
 * impossible.
 */
export const FFMPEG_STORE_KEYS = {
  /** Current mode: 'bundled' | 'system' | 'none'. */
  MODE: 'ffmpeg.mode',
  /** Tag of the installed bundled build (null when mode !== 'bundled'). */
  INSTALLED_VERSION: 'ffmpeg.installedVersion',
  /** Arch of the installed bundled build. */
  INSTALLED_ARCH: 'ffmpeg.installedArch',
  /** User-provided path to a system ffmpeg binary. */
  SYSTEM_FFMPEG_PATH: 'ffmpeg.systemFfmpegPath',
  /** User-provided path to a system ffprobe binary. */
  SYSTEM_FFPROBE_PATH: 'ffmpeg.systemFfprobePath',
} as const;

/** Subdirectory under `userData` where the bundled binaries live. */
export const FFMPEG_BIN_DIR = 'bin';

/** Subdirectory under `userData` used for in-flight downloads. */
export const FFMPEG_DOWNLOAD_DIR = 'bin-download';

/** Minimum interval (ms) between progress emits — keeps the socket unflooded. */
export const PROGRESS_EMIT_MIN_INTERVAL_MS = 100;

/**
 * Phases that represent an in-flight install (used to refuse a second
 * `install()` call while one is already running).
 */
export const ACTIVE_INSTALL_PHASES = new Set<FfmpegInstallPhase>([
  'resolve',
  'download',
  'verify',
  'extract',
  'finalize',
]);
