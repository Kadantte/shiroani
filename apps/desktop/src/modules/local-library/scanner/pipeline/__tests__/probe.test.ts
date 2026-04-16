/**
 * Probe tests — we mock `child_process.spawn` and feed a canned JSON blob that
 * matches real ffprobe output. The mapping logic is the unit under test.
 */

import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';

jest.mock('node:child_process', () => ({
  spawn: jest.fn(),
}));

// Import after the mock is registered.
import { spawn } from 'node:child_process';
import { mapProbe, probeFile, ProbeError } from '../probe';

interface FakeChild extends EventEmitter {
  stdout: PassThrough;
  stderr: PassThrough;
  kill: jest.Mock;
}

function makeFakeChild(): FakeChild {
  const child = new EventEmitter() as FakeChild;
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = jest.fn();
  return child;
}

// Canned output reproduces the shape `ffprobe -show_format -show_streams
// -print_format json` actually produces for a typical multi-track anime mkv.
const SAMPLE_JSON = {
  streams: [
    {
      index: 0,
      codec_name: 'hevc',
      codec_type: 'video',
      width: 1920,
      height: 1080,
    },
    {
      index: 1,
      codec_name: 'opus',
      codec_type: 'audio',
      channels: 2,
      disposition: { default: 1 },
      tags: { language: 'jpn', title: 'Japanese' },
    },
    {
      index: 2,
      codec_name: 'aac',
      codec_type: 'audio',
      channels: 6,
      disposition: { default: 0 },
      tags: { language: 'eng' },
    },
    {
      index: 3,
      codec_name: 'ass',
      codec_type: 'subtitle',
      disposition: { default: 1, forced: 0 },
      tags: { language: 'eng', title: 'Full' },
    },
    {
      index: 4,
      codec_name: 'ass',
      codec_type: 'subtitle',
      disposition: { default: 0, forced: 1 },
      tags: { language: 'eng', title: 'Signs' },
    },
  ],
  format: {
    duration: '1425.032',
  },
};

describe('mapProbe', () => {
  it('maps the sample ffprobe output into a ProbeResult', () => {
    const result = mapProbe(SAMPLE_JSON);

    expect(result.videoCodec).toBe('hevc');
    expect(result.width).toBe(1920);
    expect(result.height).toBe(1080);
    expect(result.durationSeconds).toBeCloseTo(1425.032, 2);

    expect(result.audioTracks).toHaveLength(2);
    expect(result.audioTracks[0]).toMatchObject({
      index: 1,
      codec: 'opus',
      channels: 2,
      language: 'jpn',
      title: 'Japanese',
      default: true,
    });
    expect(result.audioTracks[1].default).toBe(false);

    expect(result.subtitleTracks).toHaveLength(2);
    expect(result.subtitleTracks[0]).toMatchObject({
      codec: 'ass',
      language: 'eng',
      title: 'Full',
      default: true,
      forced: false,
    });
    expect(result.subtitleTracks[1].forced).toBe(true);
  });

  it('returns null for missing duration', () => {
    const result = mapProbe({ streams: [], format: {} });
    expect(result.durationSeconds).toBeNull();
    expect(result.videoCodec).toBeNull();
    expect(result.audioTracks).toEqual([]);
    expect(result.subtitleTracks).toEqual([]);
  });

  it('does not throw on unexpected / missing fields', () => {
    const result = mapProbe({
      streams: [
        { codec_type: 'video', codec_name: 'h264' }, // no width/height
        { codec_type: 'audio', codec_name: 'flac' }, // no tags, no channels
      ],
    });
    expect(result.width).toBeNull();
    expect(result.height).toBeNull();
    expect(result.audioTracks[0].language).toBeNull();
    expect(result.audioTracks[0].channels).toBeNull();
  });
});

describe('probeFile', () => {
  const spawnMock = spawn as jest.MockedFunction<typeof spawn>;

  beforeEach(() => {
    spawnMock.mockReset();
  });

  it('resolves with the parsed result when ffprobe exits 0', async () => {
    const child = makeFakeChild();
    spawnMock.mockReturnValue(child as unknown as ReturnType<typeof spawn>);

    const promise = probeFile('/fake/ffprobe', '/fake/file.mkv', { timeoutMs: 5000 });

    // Feed stdout + close.
    child.stdout.end(JSON.stringify(SAMPLE_JSON));
    setImmediate(() => child.emit('close', 0));

    const result = await promise;
    expect(result.videoCodec).toBe('hevc');
    expect(spawnMock).toHaveBeenCalledWith(
      '/fake/ffprobe',
      expect.arrayContaining(['-print_format', 'json', '-show_format', '-show_streams']),
      expect.objectContaining({ windowsHide: true })
    );
  });

  it('rejects with ProbeError on non-zero exit', async () => {
    const child = makeFakeChild();
    spawnMock.mockReturnValue(child as unknown as ReturnType<typeof spawn>);

    const promise = probeFile('/fake/ffprobe', '/broken.mkv');
    child.stderr.end('invalid data');
    setImmediate(() => child.emit('close', 1));

    await expect(promise).rejects.toBeInstanceOf(ProbeError);
  });

  it('rejects with ProbeError when JSON is malformed', async () => {
    const child = makeFakeChild();
    spawnMock.mockReturnValue(child as unknown as ReturnType<typeof spawn>);

    const promise = probeFile('/fake/ffprobe', '/weird.mkv');
    child.stdout.end('NOT JSON');
    setImmediate(() => child.emit('close', 0));

    await expect(promise).rejects.toBeInstanceOf(ProbeError);
  });

  it('aborts when the signal fires', async () => {
    const child = makeFakeChild();
    spawnMock.mockReturnValue(child as unknown as ReturnType<typeof spawn>);

    const ac = new AbortController();
    const promise = probeFile('/fake/ffprobe', '/slow.mkv', { signal: ac.signal });
    ac.abort();

    await expect(promise).rejects.toBeInstanceOf(ProbeError);
    expect(child.kill).toHaveBeenCalled();
  });
});
