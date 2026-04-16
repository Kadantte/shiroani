/**
 * ScannerService lifecycle tests.
 *
 * We mock `node:worker_threads.Worker` so no actual worker process starts.
 * Tests drive the state machine by emitting `message` / `exit` events on the
 * mock.
 */

import { EventEmitter } from 'node:events';
import type { ScannerWorkerMessage } from '../scanner.messages';

// ---------------------------------------------------------------------------
// Mocks — hoisted via jest.mock before the imports that consume them.
// ---------------------------------------------------------------------------

const mockWorkers: FakeWorker[] = [];

interface FakeWorker extends EventEmitter {
  postMessage: jest.Mock;
  terminate: jest.Mock;
  options?: unknown;
}

jest.mock('node:worker_threads', () => {
  const actual = jest.requireActual<typeof import('node:worker_threads')>('node:worker_threads');
  class FakeWorkerImpl extends EventEmitter {
    postMessage = jest.fn();
    terminate = jest.fn();
    constructor(
      public path: string,
      public options?: unknown
    ) {
      super();
      mockWorkers.push(this as unknown as FakeWorker);
    }
  }
  return {
    ...actual,
    Worker: FakeWorkerImpl,
  };
});

jest.mock('electron', () => ({
  app: {
    getPath: () => '/tmp/shiroani-test-userdata',
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks).
// ---------------------------------------------------------------------------

import { ScannerService, ScannerInternalEvents } from '../scanner.service';
import { FfmpegNotInstalledError } from '../../ffmpeg/ffmpeg.errors';

// ---------------------------------------------------------------------------
// Fakes for the injected services.
// ---------------------------------------------------------------------------

interface FakeDatabase {
  prepare: jest.Mock;
}

function makeDbMock(): { db: FakeDatabase; scans: Map<number, Record<string, unknown>> } {
  const scans = new Map<number, Record<string, unknown>>();
  let nextId = 1;

  const prepare = jest.fn((sql: string) => {
    if (sql.startsWith('INSERT INTO library_scans')) {
      return {
        run: (rootId: number, status: string) => {
          const id = nextId++;
          scans.set(id, { id, rootId, status });
          return { lastInsertRowid: id };
        },
      };
    }
    if (sql.startsWith('UPDATE library_scans')) {
      return {
        run: (...args: unknown[]) => {
          const id = args[args.length - 1] as number;
          const status = args[0] as string;
          const scan = scans.get(id);
          if (scan) {
            scan.status = status;
          }
          return { changes: 1 };
        },
      };
    }
    if (sql.startsWith('UPDATE library_roots')) {
      return { run: () => ({ changes: 1 }) };
    }
    throw new Error(`Unexpected prepared SQL: ${sql}`);
  });

  return {
    db: { prepare },
    scans,
  };
}

function makeFfmpegMock(installed: boolean) {
  return {
    resolvePaths: jest.fn(() => {
      if (!installed) throw new FfmpegNotInstalledError();
      return {
        ffmpegPath: '/bin/ffmpeg',
        ffprobePath: '/bin/ffprobe',
      };
    }),
    ensureAvailable: jest.fn(),
  };
}

function makeLibraryMock(rootExists = true) {
  return {
    getRootById: jest.fn(() => {
      if (!rootExists) return undefined;
      return {
        id: 1,
        path: '/library',
        label: null,
        enabled: true,
        addedAt: '',
        lastScannedAt: null,
      };
    }),
  };
}

function makeService(options: { ffmpegInstalled?: boolean; rootExists?: boolean } = {}): {
  service: ScannerService;
  scans: Map<number, Record<string, unknown>>;
} {
  const dbMock = makeDbMock();
  const ffmpegMock = makeFfmpegMock(options.ffmpegInstalled ?? true);
  const libraryMock = makeLibraryMock(options.rootExists ?? true);

  const service = new ScannerService(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { db: dbMock.db } as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ffmpegMock as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    libraryMock as any
  );

  return { service, scans: dbMock.scans };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ScannerService lifecycle', () => {
  beforeEach(() => {
    mockWorkers.length = 0;
  });

  it('spawns a worker and emits SCAN_STARTED', async () => {
    const { service } = makeService();
    const startedSpy = jest.fn();
    service.events.on(ScannerInternalEvents.STARTED, startedSpy);

    const scanId = await service.startScan(1);
    expect(scanId).toBe(1);
    expect(mockWorkers).toHaveLength(1);
    expect(startedSpy).toHaveBeenCalledWith({ rootId: 1, scanId: 1 });
    expect(service.getActiveScans()).toHaveLength(1);
  });

  it('refuses concurrent scans for the same root', async () => {
    const { service } = makeService();
    await service.startScan(1);
    await expect(service.startScan(1)).rejects.toThrow(/already running/);
  });

  it('throws FfmpegNotInstalledError when ffmpeg is not available', async () => {
    const { service } = makeService({ ffmpegInstalled: false });
    await expect(service.startScan(1)).rejects.toBeInstanceOf(FfmpegNotInstalledError);
    expect(mockWorkers).toHaveLength(0);
  });

  it('finalizes with DONE when the worker posts done + exit 0', async () => {
    const { service, scans } = makeService();
    const doneSpy = jest.fn();
    service.events.on(ScannerInternalEvents.DONE, doneSpy);

    await service.startScan(1);
    const worker = mockWorkers[0];

    const done: ScannerWorkerMessage = {
      type: 'done',
      filesAdded: 5,
      filesRemoved: 1,
      filesSkipped: 0,
      seriesCount: 2,
    };
    worker.emit('message', done);
    worker.emit('exit', 0);

    expect(doneSpy).toHaveBeenCalledWith(
      expect.objectContaining({ rootId: 1, scanId: 1, filesAdded: 5, seriesCount: 2 })
    );
    expect(service.getActiveScans()).toHaveLength(0);
    expect(scans.get(1)?.status).toBe('completed');
  });

  it('finalizes with CANCELLED when cancelScan is called and worker acknowledges', async () => {
    const { service, scans } = makeService();
    const cancelledSpy = jest.fn();
    service.events.on(ScannerInternalEvents.CANCELLED, cancelledSpy);

    await service.startScan(1);
    const worker = mockWorkers[0];

    expect(service.cancelScan(1)).toBe(true);
    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'cancel' });

    const cancelled: ScannerWorkerMessage = { type: 'cancelled' };
    worker.emit('message', cancelled);
    worker.emit('exit', 0);

    expect(cancelledSpy).toHaveBeenCalledWith({ rootId: 1, scanId: 1 });
    expect(scans.get(1)?.status).toBe('cancelled');
  });

  it('finalizes with FAILED when the worker exits non-zero without a terminal message', async () => {
    const { service, scans } = makeService();
    const failedSpy = jest.fn();
    service.events.on(ScannerInternalEvents.FAILED, failedSpy);

    await service.startScan(1);
    const worker = mockWorkers[0];
    worker.emit('exit', 137);

    expect(failedSpy).toHaveBeenCalledWith(
      expect.objectContaining({ rootId: 1, scanId: 1, error: expect.stringContaining('137') })
    );
    expect(scans.get(1)?.status).toBe('failed');
  });

  it('cancelScan returns false when no scan is active', () => {
    const { service } = makeService();
    expect(service.cancelScan(42)).toBe(false);
  });

  it('surfaces progress messages to the PROGRESS event (throttled)', async () => {
    jest.useFakeTimers();
    try {
      const { service } = makeService();
      const progressSpy = jest.fn();
      service.events.on(ScannerInternalEvents.PROGRESS, progressSpy);

      await service.startScan(1);
      const worker = mockWorkers[0];

      worker.emit('message', {
        type: 'progress',
        phase: 'probing',
        filesSeen: 10,
        filesDone: 3,
        filesTotal: 10,
        filesSkipped: 0,
        currentPath: '/a.mkv',
        seriesCount: 0,
      });
      worker.emit('message', {
        type: 'progress',
        phase: 'probing',
        filesSeen: 10,
        filesDone: 5,
        filesTotal: 10,
        filesSkipped: 0,
        currentPath: '/b.mkv',
        seriesCount: 0,
      });

      // No event yet — we're before the throttle flush.
      expect(progressSpy).not.toHaveBeenCalled();

      jest.advanceTimersByTime(150);

      // Exactly one emission, carrying the most recent payload.
      expect(progressSpy).toHaveBeenCalledTimes(1);
      expect(progressSpy).toHaveBeenCalledWith(
        expect.objectContaining({ filesDone: 5, currentPath: '/b.mkv' })
      );
    } finally {
      jest.useRealTimers();
    }
  });
});
