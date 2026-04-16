/**
 * FFmpeg Installer Types
 *
 * Types for the opt-in FFmpeg download flow used by the Local Library feature.
 * FFmpeg is not bundled into the ShiroAni installer — the user either installs
 * a pinned static build to app data or points at an existing system binary.
 */

/** How ffmpeg is resolved at runtime. */
export type FfmpegMode = 'bundled' | 'system' | 'none';

/** Phase of an in-flight installer job — used for UI labels. */
export type FfmpegInstallPhase =
  | 'idle'
  | 'resolve'
  | 'download'
  | 'verify'
  | 'extract'
  | 'finalize'
  | 'cancelled'
  | 'failed'
  | 'done';

/** Aggregate installer status surfaced to the renderer. */
export interface FfmpegStatus {
  /** Current configured mode. `none` until the user opts in. */
  mode: FfmpegMode;
  /** Whether a working ffmpeg+ffprobe pair is currently available. */
  installed: boolean;
  /** Resolved absolute path to ffmpeg (when installed). */
  ffmpegPath: string | null;
  /** Resolved absolute path to ffprobe (when installed). */
  ffprobePath: string | null;
  /** Installed version / tag (BtbN release tag for bundled, null for system). */
  version: string | null;
  /** Platform for which the bundled install is supported (`win32`, `darwin`). */
  platform: NodeJS.Platform;
  /** Whether the current platform has a pinned bundled build. */
  bundledSupported: boolean;
}

/** Progress payload broadcast during an install. */
export interface FfmpegInstallProgress {
  phase: FfmpegInstallPhase;
  /** Bytes downloaded so far (0 outside the download phase). */
  bytes: number;
  /** Total bytes expected (0 when unknown). */
  total: number;
  /** Instantaneous speed in bytes/second (0 when not applicable). */
  speed: number;
  /** Optional human-readable detail (e.g. current file during extract). */
  detail?: string;
}

/** Result returned by the status handler. */
export interface FfmpegStatusResult {
  status: FfmpegStatus;
}

/** Payload for setting user-provided system binary paths. */
export interface FfmpegSetSystemPathsPayload {
  ffmpegPath: string;
  ffprobePath: string;
}

/** Ack returned after a set-system-paths request. */
export interface FfmpegSetSystemPathsResult {
  success: boolean;
  status: FfmpegStatus;
  /** Populated with a human-readable reason on failure. */
  error?: string;
}

/** Payload returned when an install finishes (success or otherwise). */
export interface FfmpegInstallDoneResult {
  success: boolean;
  status: FfmpegStatus;
  error?: string;
}
