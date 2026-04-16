/**
 * ffprobe wrapper — spawns ffprobe, parses the JSON output, and maps it into
 * the small shape `local_episodes` cares about.
 *
 * We intentionally ask only for `-show_format` and `-show_streams`: everything
 * Phase 2 stores is derivable from those two. Extracting chapter metadata or
 * per-packet info would balloon the probe cost for no current benefit.
 */

import { spawn } from 'node:child_process';

export interface ProbedAudioTrack {
  index: number;
  codec: string | null;
  channels: number | null;
  language: string | null;
  title: string | null;
  default: boolean;
}

export interface ProbedSubtitleTrack {
  index: number;
  codec: string | null;
  language: string | null;
  title: string | null;
  default: boolean;
  forced: boolean;
}

export interface ProbeResult {
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  videoCodec: string | null;
  audioTracks: ProbedAudioTrack[];
  subtitleTracks: ProbedSubtitleTrack[];
}

interface FfprobeStream {
  index?: number;
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  channels?: number;
  disposition?: { default?: number; forced?: number };
  tags?: { language?: string; title?: string };
}

interface FfprobeFormat {
  duration?: string;
}

interface FfprobeOutput {
  streams?: FfprobeStream[];
  format?: FfprobeFormat;
}

export class ProbeError extends Error {
  readonly filePath: string;
  readonly stderr: string;
  constructor(filePath: string, message: string, stderr: string) {
    super(message);
    this.name = 'ProbeError';
    this.filePath = filePath;
    this.stderr = stderr;
  }
}

export interface ProbeOptions {
  /** Abort the spawned ffprobe mid-flight (used for scan cancellation). */
  signal?: AbortSignal;
  /** Kill the process after this long if it hasn't exited; default 30s. */
  timeoutMs?: number;
}

/**
 * Run ffprobe on `filePath`. Returns a structured result or throws
 * {@link ProbeError} on non-zero exit / parse failure.
 */
export async function probeFile(
  ffprobePath: string,
  filePath: string,
  options: ProbeOptions = {}
): Promise<ProbeResult> {
  const { signal, timeoutMs = 30_000 } = options;

  const stdout = await runFfprobe(ffprobePath, filePath, { signal, timeoutMs });
  let parsed: FfprobeOutput;
  try {
    parsed = JSON.parse(stdout) as FfprobeOutput;
  } catch (err) {
    throw new ProbeError(filePath, `Failed to parse ffprobe JSON: ${(err as Error).message}`, '');
  }
  return mapProbe(parsed);
}

function runFfprobe(
  ffprobePath: string,
  filePath: string,
  options: { signal?: AbortSignal; timeoutMs: number }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const { signal, timeoutMs } = options;

    if (signal?.aborted) {
      reject(new ProbeError(filePath, 'Probe aborted before spawn', ''));
      return;
    }

    const args = [
      '-v',
      'error',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      filePath,
    ];

    const child = spawn(ffprobePath, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdoutBuf = '';
    let stderrBuf = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        child.kill('SIGKILL');
      } catch {
        // ignore
      }
      reject(new ProbeError(filePath, `ffprobe timed out after ${timeoutMs}ms`, stderrBuf));
    }, timeoutMs);

    const onAbort = (): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        child.kill('SIGKILL');
      } catch {
        // ignore
      }
      reject(new ProbeError(filePath, 'Probe aborted', stderrBuf));
    };

    signal?.addEventListener('abort', onAbort, { once: true });

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      stdoutBuf += chunk;
    });
    child.stderr.on('data', chunk => {
      stderrBuf += chunk;
    });

    child.on('error', err => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      reject(new ProbeError(filePath, `ffprobe spawn failed: ${err.message}`, stderrBuf));
    });

    child.on('close', code => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      if (code === 0) {
        resolve(stdoutBuf);
      } else {
        reject(new ProbeError(filePath, `ffprobe exited with code ${code}`, stderrBuf));
      }
    });
  });
}

export function mapProbe(parsed: FfprobeOutput): ProbeResult {
  const streams = Array.isArray(parsed.streams) ? parsed.streams : [];

  const videoStream = streams.find(s => s.codec_type === 'video');
  const audioTracks: ProbedAudioTrack[] = streams
    .filter(s => s.codec_type === 'audio')
    .map(s => ({
      index: typeof s.index === 'number' ? s.index : -1,
      codec: s.codec_name ?? null,
      channels: typeof s.channels === 'number' ? s.channels : null,
      language: s.tags?.language ?? null,
      title: s.tags?.title ?? null,
      default: s.disposition?.default === 1,
    }));
  const subtitleTracks: ProbedSubtitleTrack[] = streams
    .filter(s => s.codec_type === 'subtitle')
    .map(s => ({
      index: typeof s.index === 'number' ? s.index : -1,
      codec: s.codec_name ?? null,
      language: s.tags?.language ?? null,
      title: s.tags?.title ?? null,
      default: s.disposition?.default === 1,
      forced: s.disposition?.forced === 1,
    }));

  const duration = parsed.format?.duration ? Number(parsed.format.duration) : NaN;

  return {
    durationSeconds: Number.isFinite(duration) ? duration : null,
    width: typeof videoStream?.width === 'number' ? videoStream.width : null,
    height: typeof videoStream?.height === 'number' ? videoStream.height : null,
    videoCodec: videoStream?.codec_name ?? null,
    audioTracks,
    subtitleTracks,
  };
}
