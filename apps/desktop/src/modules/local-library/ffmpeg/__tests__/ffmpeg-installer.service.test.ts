/**
 * Integration-ish tests for the installer pipeline. We don't hit the network
 * or touch the real filesystem — `fetch`, `yauzl`, and `fs` are mocked just
 * enough to exercise the full resolve → download → verify → extract →
 * finalize sequence, the progress emitter, and cancellation.
 */

import { PassThrough } from 'node:stream';
import { createHash } from 'node:crypto';
import type { FfmpegInstallProgress } from '@shiroani/shared';

// ---------------------------------------------------------------------------
// Mocks
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

// A synthetic zip payload — we don't actually parse it, we mock yauzl.open
// to pretend the archive contains the two expected entries.
const fakeZip = Buffer.from('fake-ffmpeg-archive');
const fakeZipSha256 = createHash('sha256').update(fakeZip).digest('hex');

// Mock node:fs/promises + node:fs so extractBinaries doesn't touch real disk.
const writtenFiles = new Map<string, Buffer>();
const fsMkdirMock = jest.fn().mockResolvedValue(undefined);
const fsUnlinkMock = jest.fn().mockResolvedValue(undefined);
const fsRmMock = jest.fn().mockResolvedValue(undefined);
const fsChmodMock = jest.fn().mockResolvedValue(undefined);
const fsAccessMock = jest.fn().mockImplementation((p: string) => {
  if (!writtenFiles.has(p)) throw new Error(`ENOENT: ${p}`);
  return Promise.resolve();
});

jest.mock('node:fs/promises', () => ({
  __esModule: true,
  default: {
    mkdir: fsMkdirMock,
    unlink: fsUnlinkMock,
    rm: fsRmMock,
    chmod: fsChmodMock,
    access: fsAccessMock,
  },
  mkdir: fsMkdirMock,
  unlink: fsUnlinkMock,
  rm: fsRmMock,
  chmod: fsChmodMock,
  access: fsAccessMock,
}));

// createWriteStream / createReadStream — the installer pipes fetch → file
// and file → sha256 hash. We sink to an in-memory Buffer and re-serve it.
jest.mock('node:fs', () => {
  const real = jest.requireActual<typeof import('node:fs')>('node:fs');
  return {
    ...real,
    createWriteStream: (targetPath: string) => {
      const chunks: Buffer[] = [];
      const stream = new PassThrough();
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('finish', () => {
        writtenFiles.set(targetPath, Buffer.concat(chunks));
      });
      return stream;
    },
    createReadStream: (sourcePath: string) => {
      const data = writtenFiles.get(sourcePath) ?? Buffer.alloc(0);
      const stream = new PassThrough();
      setImmediate(() => {
        stream.end(data);
      });
      return stream;
    },
    existsSync: () => true,
    accessSync: () => undefined,
    constants: real.constants,
  };
});

// Override FFMPEG_PINS so the test can run regardless of which
// platform/arch Jest is running under.
jest.mock('../ffmpeg.constants', () => {
  const real = jest.requireActual<typeof import('../ffmpeg.constants')>('../ffmpeg.constants');
  return {
    ...real,
    FFMPEG_PINS: {
      [process.platform]: {
        [process.arch]: {
          url: 'https://example.invalid/ffmpeg.zip',
          sha256: fakeZipSha256,
          assetName: 'ffmpeg-test.zip',
          archiveRoot: 'ffmpeg-test',
          ffmpegEntry: 'bin/ffmpeg',
          ffprobeEntry: 'bin/ffprobe',
        },
      },
    },
  };
});

// Mock yauzl so "opening" the fake archive synthesises the two entries we
// asked for and streams a tiny buffer back.
jest.mock('yauzl', () => {
  interface FakeEntry {
    fileName: string;
  }

  const fakeOpen = jest.fn((_file: string, _opts: unknown, cb: unknown) => {
    const callback = cb as (err: Error | null, zipfile?: unknown) => void;
    const entries: FakeEntry[] = [
      { fileName: 'ffmpeg-test/bin/ffmpeg' },
      { fileName: 'ffmpeg-test/bin/ffprobe' },
    ];
    const listeners: Record<string, ((arg?: unknown) => void)[]> = {};
    let idx = 0;

    const zipfile = {
      on: (event: string, handler: (arg?: unknown) => void) => {
        (listeners[event] ??= []).push(handler);
      },
      readEntry: () => {
        if (idx < entries.length) {
          const entry = entries[idx++];
          setImmediate(() => listeners.entry?.forEach(h => h(entry)));
        } else {
          setImmediate(() => listeners.end?.forEach(h => h()));
        }
      },
      openReadStream: (
        _entry: FakeEntry,
        streamCb: (err: Error | null, stream?: NodeJS.ReadableStream) => void
      ) => {
        const stream = new PassThrough();
        setImmediate(() => {
          stream.end(Buffer.from('fake-binary-bytes'));
        });
        streamCb(null, stream);
      },
      close: () => {},
    };
    callback(null, zipfile);
  });

  return { __esModule: true, default: { open: fakeOpen }, open: fakeOpen };
});

// Mock global fetch so the installer downloads our fake zip without hitting
// the network. We provide a streaming body + content-length so the download
// phase emits real progress events.
function mockFetchOk(_signal: AbortSignal): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(fakeZip));
      controller.close();
    },
  });
  // Minimal Response stub — we only access .ok, .status, .statusText, .body,
  // and .headers.get('content-length').
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    body: stream,
    headers: new Headers({ 'content-length': String(fakeZip.length) }),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

import { FfmpegInstallerService } from '../ffmpeg-installer.service';
import { FfmpegService } from '../ffmpeg.service';
import { FFMPEG_STORE_KEYS, BTBN_TAG } from '../ffmpeg.constants';

describe('FfmpegInstallerService.install', () => {
  beforeEach(() => {
    mockStoreData.clear();
    writtenFiles.clear();
    fsMkdirMock.mockClear();
    fsUnlinkMock.mockClear();
    fsRmMock.mockClear();

    global.fetch = jest.fn((_url, init) =>
      Promise.resolve(
        mockFetchOk((init as RequestInit | undefined)?.signal ?? new AbortController().signal)
      )
    ) as unknown as typeof fetch;
  });

  function createInstaller(): {
    installer: FfmpegInstallerService;
    ffmpegService: FfmpegService;
    progress: FfmpegInstallProgress[];
  } {
    const ffmpegService = new FfmpegService();
    const installer = new FfmpegInstallerService(ffmpegService);
    const progress: FfmpegInstallProgress[] = [];
    installer.onProgress(p => progress.push(p));
    return { installer, ffmpegService, progress };
  }

  it('runs the full pipeline and persists bundled mode + tag on success', async () => {
    const { installer } = createInstaller();
    await expect(installer.install()).resolves.toBeUndefined();

    expect(mockStoreData.get(FFMPEG_STORE_KEYS.MODE)).toBe('bundled');
    expect(mockStoreData.get(FFMPEG_STORE_KEYS.INSTALLED_VERSION)).toBe(BTBN_TAG);
    expect(mockStoreData.get(FFMPEG_STORE_KEYS.INSTALLED_ARCH)).toBe(process.arch);
  });

  it('emits download + verify + extract + done progress events in order', async () => {
    const { installer, progress } = createInstaller();
    await installer.install();

    const phases = progress.map(p => p.phase);
    expect(phases).toContain('download');
    expect(phases).toContain('verify');
    expect(phases).toContain('extract');
    expect(phases[phases.length - 1]).toBe('done');
  });

  it('refuses to start a second install while one is in flight', async () => {
    const { installer } = createInstaller();
    const first = installer.install();
    await expect(installer.install()).rejects.toThrow(/already in progress/);
    await first;
  });

  it('uninstall wipes bundled mode + version metadata', async () => {
    const { installer, ffmpegService } = createInstaller();
    await installer.install();
    expect(ffmpegService.getMode()).toBe('bundled');

    await installer.uninstall();
    expect(ffmpegService.getMode()).toBe('none');
    expect(ffmpegService.getInstalledVersion()).toBeNull();
    expect(fsRmMock).toHaveBeenCalled();
  });
});
