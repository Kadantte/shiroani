jest.mock('electron');
jest.mock('../../logging/logger', () => ({
  createMainLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { ipcMain, app } from 'electron';
import { registerFileHandlers, cleanupFileHandlers } from '../file';

describe('registerFileHandlers', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'shiroani-file-test-'));
    // Route all allowed dirs to our temp dir (path containment check joins with sep)
    (app.getPath as jest.Mock).mockImplementation(() => tmpDir);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ipcMain as any).__reset();
  });

  afterEach(() => {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('file:write-json', () => {
    it('writes JSON to an allowed path', async () => {
      registerFileHandlers();
      const target = join(tmpDir, 'data.json');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (ipcMain as any).__invoke(
        'file:write-json',
        target,
        '{"hello":"world"}'
      );
      expect(result).toEqual({ success: true });
      expect(readFileSync(target, 'utf-8')).toBe('{"hello":"world"}');
    });

    it('rejects non-.json extension', async () => {
      registerFileHandlers();
      const target = join(tmpDir, 'data.txt');
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ipcMain as any).__invoke('file:write-json', target, '{}')
      ).rejects.toThrow(/must end in \.json/i);
    });

    it('rejects path outside allowed directories', async () => {
      registerFileHandlers();
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ipcMain as any).__invoke('file:write-json', '/etc/passwd.json', '{}')
      ).rejects.toThrow(/outside allowed directories/i);
    });

    it('BAD_REQUEST on empty-string path', async () => {
      registerFileHandlers();
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ipcMain as any).__invoke('file:write-json', '', '{}')
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });
  });

  describe('file:read-json', () => {
    it('reads JSON from allowed path', async () => {
      registerFileHandlers();
      const target = join(tmpDir, 'config.json');
      writeFileSync(target, '{"foo":1}', 'utf-8');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (ipcMain as any).__invoke('file:read-json', target);
      expect(result).toBe('{"foo":1}');
    });

    it('rejects read outside allowed dir', async () => {
      registerFileHandlers();
      // Use a path guaranteed not to sit inside `tmpDir`
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ipcMain as any).__invoke('file:read-json', '/etc/hosts.json')
      ).rejects.toThrow(/outside allowed directories/i);
    });
  });

  describe('cleanupFileHandlers', () => {
    it('removes handlers', () => {
      registerFileHandlers();
      cleanupFileHandlers();
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('file:write-json');
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('file:read-json');
    });
  });
});
