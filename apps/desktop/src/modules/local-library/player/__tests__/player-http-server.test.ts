import * as http from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';

import { startPlayerHttpServer } from '../player-http-server';

describe('startPlayerHttpServer CORS', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'shiroani-player-http-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('serves subtitles to allowed localhost origins with CORS headers', async () => {
    const subsPath = path.join(tempDir, '0.ass');
    await writeFile(subsPath, 'Dialogue: 0,0:00:00.00,0:00:01.00,Default,,0,0,0,,Hello\n');

    const registry = {
      get: jest.fn(() => ({
        sessionId: 'session-1',
        tmpDir: tempDir,
        subtitleTracks: [{ track: { index: 0 }, extractedPath: subsPath }],
        fonts: [],
      })),
      touch: jest.fn(),
    };

    const server = await startPlayerHttpServer(registry as never);
    try {
      const response = await request(server.port, '/subs/session-1/0.ass', {
        Origin: 'http://localhost:15174',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:15174');
      expect(response.headers['vary']).toContain('Origin');
      expect(response.body).toContain('Dialogue: 0');
      expect(registry.touch).toHaveBeenCalledWith('session-1');
    } finally {
      await server.close();
    }
  });

  it('rejects subtitle requests from non-local origins', async () => {
    const subsPath = path.join(tempDir, '0.ass');
    await writeFile(subsPath, 'Dialogue: 0,0:00:00.00,0:00:01.00,Default,,0,0,0,,Hello\n');

    const registry = {
      get: jest.fn(() => ({
        sessionId: 'session-1',
        tmpDir: tempDir,
        subtitleTracks: [{ track: { index: 0 }, extractedPath: subsPath }],
        fonts: [],
      })),
      touch: jest.fn(),
    };

    const server = await startPlayerHttpServer(registry as never);
    try {
      const response = await request(server.port, '/subs/session-1/0.ass', {
        Origin: 'https://evil.example',
      });

      expect(response.statusCode).toBe(403);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
      expect(response.body).toBe('forbidden');
      expect(registry.touch).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });
});

function request(
  port: number,
  pathname: string,
  headers: Record<string, string>
): Promise<{
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path: pathname,
        method: 'GET',
        headers,
      },
      res => {
        const chunks: Buffer[] = [];
        res.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      }
    );

    req.on('error', reject);
    req.end();
  });
}
