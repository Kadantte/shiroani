/**
 * Unit tests for the path resolver — the invariant the rest of the feature
 * will rely on. Network + filesystem paths are mocked; we assert purely on
 * which paths come back for each stored mode.
 */

import path from 'node:path';

// ---------------------------------------------------------------------------
// Mocks — must be hoisted before the imports that consume them.
// ---------------------------------------------------------------------------

const mockStoreData = new Map<string, unknown>();

jest.mock('../../../../main/store', () => ({
  store: {
    get: (key: string) => mockStoreData.get(key),
    set: (key: string, value: unknown) => mockStoreData.set(key, value),
    delete: (key: string) => mockStoreData.delete(key),
  },
}));

jest.mock('electron', () => ({
  app: {
    getPath: (name: string) => (name === 'userData' ? '/tmp/shiroani-test' : '/tmp'),
  },
}));

// `existsSync` / `accessSync` are mocked per-test to simulate presence of the
// binaries; the default is "everything exists + is executable".
const existsMap = new Map<string, boolean>();
jest.mock('node:fs', () => {
  const real = jest.requireActual<typeof import('node:fs')>('node:fs');
  return {
    ...real,
    existsSync: (p: string) => existsMap.get(p) !== false,
    accessSync: (p: string) => {
      if (existsMap.get(p) === false) {
        throw new Error(`ENOENT: ${p}`);
      }
      return undefined;
    },
    constants: real.constants,
  };
});

import { FfmpegService } from '../ffmpeg.service';
import { FfmpegNotInstalledError } from '../ffmpeg.errors';
import { FFMPEG_STORE_KEYS } from '../ffmpeg.constants';

describe('FfmpegService.resolvePaths', () => {
  let service: FfmpegService;
  const userDataBin = path.join('/tmp/shiroani-test', 'bin');
  const isWin = process.platform === 'win32';
  const ffmpegBundled = path.join(userDataBin, isWin ? 'ffmpeg.exe' : 'ffmpeg');
  const ffprobeBundled = path.join(userDataBin, isWin ? 'ffprobe.exe' : 'ffprobe');

  beforeEach(() => {
    mockStoreData.clear();
    existsMap.clear();
    service = new FfmpegService();
  });

  it('throws FfmpegNotInstalledError when mode is not set', () => {
    expect(() => service.resolvePaths()).toThrow(FfmpegNotInstalledError);
    expect(service.isAvailable()).toBe(false);
  });

  it('returns bundled paths when mode === "bundled" and binaries exist', () => {
    mockStoreData.set(FFMPEG_STORE_KEYS.MODE, 'bundled');
    // Bundled paths default to "exists"; no need to tweak existsMap.

    const { ffmpegPath, ffprobePath } = service.resolvePaths();
    expect(ffmpegPath).toBe(ffmpegBundled);
    expect(ffprobePath).toBe(ffprobeBundled);
    expect(service.isAvailable()).toBe(true);
  });

  it('throws when mode === "bundled" but binaries are missing from disk', () => {
    mockStoreData.set(FFMPEG_STORE_KEYS.MODE, 'bundled');
    existsMap.set(ffmpegBundled, false);
    existsMap.set(ffprobeBundled, false);

    expect(() => service.resolvePaths()).toThrow(FfmpegNotInstalledError);
  });

  it('returns system paths when mode === "system" and files exist', () => {
    mockStoreData.set(FFMPEG_STORE_KEYS.MODE, 'system');
    const sysFfmpeg = '/usr/local/bin/ffmpeg';
    const sysFfprobe = '/usr/local/bin/ffprobe';
    mockStoreData.set(FFMPEG_STORE_KEYS.SYSTEM_FFMPEG_PATH, sysFfmpeg);
    mockStoreData.set(FFMPEG_STORE_KEYS.SYSTEM_FFPROBE_PATH, sysFfprobe);

    const { ffmpegPath, ffprobePath } = service.resolvePaths();
    expect(ffmpegPath).toBe(sysFfmpeg);
    expect(ffprobePath).toBe(sysFfprobe);
  });

  it('throws when mode === "system" but paths are not configured', () => {
    mockStoreData.set(FFMPEG_STORE_KEYS.MODE, 'system');
    expect(() => service.resolvePaths()).toThrow(FfmpegNotInstalledError);
  });

  it('throws when mode === "system" but one of the files is missing', () => {
    mockStoreData.set(FFMPEG_STORE_KEYS.MODE, 'system');
    mockStoreData.set(FFMPEG_STORE_KEYS.SYSTEM_FFMPEG_PATH, '/usr/local/bin/ffmpeg');
    mockStoreData.set(FFMPEG_STORE_KEYS.SYSTEM_FFPROBE_PATH, '/usr/local/bin/ffprobe');
    existsMap.set('/usr/local/bin/ffprobe', false);

    expect(() => service.resolvePaths()).toThrow(FfmpegNotInstalledError);
  });

  it('ensureAvailable throws the same typed error', () => {
    expect(() => service.ensureAvailable()).toThrow(FfmpegNotInstalledError);
  });
});

describe('FfmpegService.getStatus', () => {
  beforeEach(() => {
    mockStoreData.clear();
    existsMap.clear();
  });

  it('reports installed=false and version=null in the default state', () => {
    const service = new FfmpegService();
    const status = service.getStatus();

    expect(status.mode).toBe('none');
    expect(status.installed).toBe(false);
    expect(status.version).toBeNull();
    expect(status.ffmpegPath).toBeNull();
    expect(status.ffprobePath).toBeNull();
    expect(typeof status.bundledSupported).toBe('boolean');
  });

  it('reports installed=true and includes version after a bundled install', () => {
    mockStoreData.set(FFMPEG_STORE_KEYS.MODE, 'bundled');
    mockStoreData.set(FFMPEG_STORE_KEYS.INSTALLED_VERSION, 'autobuild-2026-04-16-13-18');
    const service = new FfmpegService();
    const status = service.getStatus();

    expect(status.installed).toBe(true);
    expect(status.mode).toBe('bundled');
    expect(status.version).toBe('autobuild-2026-04-16-13-18');
    expect(status.ffmpegPath).toContain(process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
  });

  it('never exposes a version string in system mode — version is bundled-only metadata', () => {
    mockStoreData.set(FFMPEG_STORE_KEYS.MODE, 'system');
    mockStoreData.set(FFMPEG_STORE_KEYS.SYSTEM_FFMPEG_PATH, '/usr/local/bin/ffmpeg');
    mockStoreData.set(FFMPEG_STORE_KEYS.SYSTEM_FFPROBE_PATH, '/usr/local/bin/ffprobe');
    mockStoreData.set(FFMPEG_STORE_KEYS.INSTALLED_VERSION, 'stale-bundled-tag');

    const service = new FfmpegService();
    const status = service.getStatus();
    expect(status.version).toBeNull();
  });
});
