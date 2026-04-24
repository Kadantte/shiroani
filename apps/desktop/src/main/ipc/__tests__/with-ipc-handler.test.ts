jest.mock('electron');
jest.mock('../../logging/logger', () => ({
  createMainLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  }),
  getLogsDir: jest.fn(() => '/tmp/shiroani-test-logs'),
  attachUpdaterLogger: jest.fn(),
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { z } from 'zod';
import { ipcMain } from 'electron';
import { handle, handleWithFallback, on } from '../with-ipc-handler';

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ipcMain as any).__reset();
});

describe('handle()', () => {
  it('registers channel and resolves on valid args', async () => {
    const schema = z.tuple([z.string()]);
    handle<[string], string>('test:channel', async (_event, arg) => `hello ${arg}`, { schema });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('test:channel', 'world');
    expect(result).toBe('hello world');
  });

  it('throws BAD_REQUEST IpcError on invalid args', async () => {
    const schema = z.tuple([z.string()]);
    handle<[string], string>('test:bad', async () => 'ok', { schema });
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ipcMain as any).__invoke('test:bad', 123)
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      name: 'IpcError',
    });
  });

  it('rethrows handler errors', async () => {
    handle('test:throw', async () => {
      throw new Error('handler failed');
    });
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ipcMain as any).__invoke('test:throw')
    ).rejects.toThrow('handler failed');
  });

  it('passes through multiple args when schema matches', async () => {
    const schema = z.tuple([z.string(), z.number()]);
    handle<[string, number], string>('test:multi', async (_event, a, b) => `${a}:${b}`, { schema });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('test:multi', 'foo', 42);
    expect(result).toBe('foo:42');
  });

  it('works without a schema (permissive)', async () => {
    handle('test:noschema', async (_event, ...args) => args);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('test:noschema', 1, 'two');
    expect(result).toEqual([1, 'two']);
  });
});

describe('handleWithFallback()', () => {
  it('returns handler result on success', async () => {
    const schema = z.tuple([z.number()]);
    handleWithFallback<[number], number>(
      'test:fallback-ok',
      async (_event, n) => n * 2,
      () => -1,
      { schema }
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('test:fallback-ok', 5);
    expect(result).toBe(10);
  });

  it('returns fallback value when handler throws', async () => {
    handleWithFallback<[], string>(
      'test:fallback-err',
      async () => {
        throw new Error('boom');
      },
      () => 'fallback'
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('test:fallback-err');
    expect(result).toBe('fallback');
  });

  it('RETHROWS Zod BAD_REQUEST (does not hit fallback)', async () => {
    const schema = z.tuple([z.string()]);
    handleWithFallback<[string], string>(
      'test:fallback-bad',
      async () => 'ok',
      () => 'fallback',
      { schema }
    );
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ipcMain as any).__invoke('test:fallback-bad', 999)
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('fallback receives the thrown error', async () => {
    const fallback = jest.fn(() => 'recovered');
    handleWithFallback<[], string>(
      'test:fallback-with-err',
      async () => {
        throw new Error('internal');
      },
      fallback
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (ipcMain as any).__invoke('test:fallback-with-err');
    expect(fallback).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('on()', () => {
  it('registers listener via ipcMain.on', () => {
    const handler = jest.fn();
    on('test:on-channel', handler);
    expect(ipcMain.on).toHaveBeenCalledWith('test:on-channel', expect.any(Function));
  });

  it('invokes handler on send with valid args', () => {
    const schema = z.tuple([z.string()]);
    const handler = jest.fn();
    on<[string]>('test:on-valid', handler, { schema });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ipcMain as any).__send('test:on-valid', 'hello');
    expect(handler).toHaveBeenCalledWith({}, 'hello');
  });

  it('does NOT invoke handler with invalid args (errors swallowed)', () => {
    const schema = z.tuple([z.string()]);
    const handler = jest.fn();
    on<[string]>('test:on-invalid', handler, { schema });
    // Should not throw
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ipcMain as any).__send('test:on-invalid', 42);
    }).not.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });
});
