/**
 * Typed errors thrown by the FFmpeg module.
 *
 * These are exported so downstream services (scanner, player, poster extractor
 * in later phases) can do `instanceof FfmpegNotInstalledError` checks and
 * surface the correct recovery flow to the user.
 */

export class FfmpegNotInstalledError extends Error {
  constructor(message = 'FFmpeg is not installed') {
    super(message);
    this.name = 'FfmpegNotInstalledError';
  }
}

export class FfmpegUnsupportedPlatformError extends Error {
  readonly platform: NodeJS.Platform;
  constructor(platform: NodeJS.Platform) {
    super(
      `No pinned FFmpeg build for platform "${platform}". ` +
        `Point ShiroAni at a system ffmpeg binary instead.`
    );
    this.name = 'FfmpegUnsupportedPlatformError';
    this.platform = platform;
  }
}

export class FfmpegInstallCancelledError extends Error {
  constructor() {
    super('FFmpeg install cancelled');
    this.name = 'FfmpegInstallCancelledError';
  }
}

export class FfmpegChecksumMismatchError extends Error {
  constructor(expected: string, actual: string) {
    super(`FFmpeg archive checksum mismatch: expected ${expected}, got ${actual}`);
    this.name = 'FfmpegChecksumMismatchError';
  }
}
