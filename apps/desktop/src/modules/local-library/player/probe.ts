/**
 * Playback-time ffprobe wrapper.
 *
 * Superset of what the scanner probes:
 *   - keeps the scanner's audio/subtitle/video stream info
 *   - additionally returns chapter metadata for the scrubber overlay
 *   - additionally returns attachment info (for MKV font extraction)
 *
 * The scanner has its own probe in `scanner/pipeline/probe.ts`, tuned for
 * batch throughput (no chapters, no attachments). We keep these separate so
 * the scanner isn't paying for metadata it doesn't persist.
 */

import { spawn } from 'node:child_process';

export interface PlayerProbedAudioTrack {
  /** ffmpeg absolute stream index. */
  index: number;
  /**
   * Zero-based index within the audio-only stream list — used by the ffmpeg
   * `-map 0:a:N` selector. We keep both because the renderer speaks absolute
   * indexes in its track picker, but the pipeline needs the relative one.
   */
  relativeIndex: number;
  codec: string | null;
  channels: number | null;
  language: string | null;
  title: string | null;
  isDefault: boolean;
}

export interface PlayerProbedSubtitleTrack {
  index: number;
  /** Zero-based index within the subtitle-only stream list. */
  relativeIndex: number;
  codec: string | null;
  language: string | null;
  title: string | null;
  isDefault: boolean;
  isForced: boolean;
}

export interface PlayerProbedChapter {
  startSeconds: number;
  endSeconds: number;
  title: string | null;
}

export interface PlayerProbedAttachment {
  index: number;
  filename: string | null;
  mimeType: string | null;
}

export interface PlayerProbeResult {
  durationSeconds: number;
  videoCodec: string | null;
  width: number | null;
  height: number | null;
  audioTracks: PlayerProbedAudioTrack[];
  subtitleTracks: PlayerProbedSubtitleTrack[];
  chapters: PlayerProbedChapter[];
  attachments: PlayerProbedAttachment[];
}

export class PlayerProbeError extends Error {
  readonly filePath: string;
  readonly stderr: string;
  constructor(filePath: string, message: string, stderr: string) {
    super(message);
    this.name = 'PlayerProbeError';
    this.filePath = filePath;
    this.stderr = stderr;
  }
}

interface RawFfprobeDisposition {
  default?: number;
  forced?: number;
  attached_pic?: number;
}

interface RawFfprobeStream {
  index?: number;
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  channels?: number;
  disposition?: RawFfprobeDisposition;
  tags?: { language?: string; title?: string; filename?: string; mimetype?: string };
}

interface RawFfprobeChapter {
  start_time?: string;
  end_time?: string;
  tags?: { title?: string };
}

interface RawFfprobeFormat {
  duration?: string;
}

interface RawFfprobeOutput {
  streams?: RawFfprobeStream[];
  chapters?: RawFfprobeChapter[];
  format?: RawFfprobeFormat;
}

/**
 * Run ffprobe with JSON output, parse streams + chapters + format, return a
 * structured result. Throws {@link PlayerProbeError} on failure.
 */
export async function probeForPlayback(
  ffprobePath: string,
  filePath: string,
  options: { signal?: AbortSignal; timeoutMs?: number } = {}
): Promise<PlayerProbeResult> {
  const { signal, timeoutMs = 30_000 } = options;
  const stdout = await runFfprobe(ffprobePath, filePath, { signal, timeoutMs });

  let parsed: RawFfprobeOutput;
  try {
    parsed = JSON.parse(stdout) as RawFfprobeOutput;
  } catch (err) {
    throw new PlayerProbeError(
      filePath,
      `Failed to parse ffprobe JSON: ${(err as Error).message}`,
      ''
    );
  }

  return mapPlayerProbe(parsed);
}

function runFfprobe(
  ffprobePath: string,
  filePath: string,
  options: { signal?: AbortSignal; timeoutMs: number }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const { signal, timeoutMs } = options;

    if (signal?.aborted) {
      reject(new PlayerProbeError(filePath, 'Probe aborted before spawn', ''));
      return;
    }

    // `-show_chapters` and `-show_streams` together give us everything we
    // need for the playback panel in a single process.
    const args = [
      '-v',
      'error',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      '-show_chapters',
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
      reject(new PlayerProbeError(filePath, `ffprobe timed out after ${timeoutMs}ms`, stderrBuf));
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
      reject(new PlayerProbeError(filePath, 'Probe aborted', stderrBuf));
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
      reject(new PlayerProbeError(filePath, `ffprobe spawn failed: ${err.message}`, stderrBuf));
    });

    child.on('close', code => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      if (code === 0) {
        resolve(stdoutBuf);
      } else {
        reject(new PlayerProbeError(filePath, `ffprobe exited with code ${code}`, stderrBuf));
      }
    });
  });
}

export function mapPlayerProbe(parsed: RawFfprobeOutput): PlayerProbeResult {
  const streams = Array.isArray(parsed.streams) ? parsed.streams : [];
  const videoStream = streams.find(s => s.codec_type === 'video' && !s.disposition?.attached_pic);

  const audioStreams = streams.filter(s => s.codec_type === 'audio');
  const subtitleStreams = streams.filter(s => s.codec_type === 'subtitle');
  const attachmentStreams = streams.filter(s => s.codec_type === 'attachment');

  const audioTracks: PlayerProbedAudioTrack[] = audioStreams.map((s, i) => ({
    index: typeof s.index === 'number' ? s.index : -1,
    relativeIndex: i,
    codec: s.codec_name ?? null,
    channels: typeof s.channels === 'number' ? s.channels : null,
    language: s.tags?.language ?? null,
    title: s.tags?.title ?? null,
    isDefault: s.disposition?.default === 1,
  }));

  const subtitleTracks: PlayerProbedSubtitleTrack[] = subtitleStreams.map((s, i) => ({
    index: typeof s.index === 'number' ? s.index : -1,
    relativeIndex: i,
    codec: s.codec_name ?? null,
    language: s.tags?.language ?? null,
    title: s.tags?.title ?? null,
    isDefault: s.disposition?.default === 1,
    isForced: s.disposition?.forced === 1,
  }));

  const attachments: PlayerProbedAttachment[] = attachmentStreams.map(s => ({
    index: typeof s.index === 'number' ? s.index : -1,
    filename: s.tags?.filename ?? null,
    mimeType: s.tags?.mimetype ?? null,
  }));

  const chapters: PlayerProbedChapter[] = (parsed.chapters ?? []).map(c => {
    const start = c.start_time ? Number(c.start_time) : NaN;
    const end = c.end_time ? Number(c.end_time) : NaN;
    return {
      startSeconds: Number.isFinite(start) ? start : 0,
      endSeconds: Number.isFinite(end) ? end : 0,
      title: c.tags?.title ?? null,
    };
  });

  const duration = parsed.format?.duration ? Number(parsed.format.duration) : NaN;

  return {
    durationSeconds: Number.isFinite(duration) ? duration : 0,
    videoCodec: videoStream?.codec_name ?? null,
    width: typeof videoStream?.width === 'number' ? videoStream.width : null,
    height: typeof videoStream?.height === 'number' ? videoStream.height : null,
    audioTracks,
    subtitleTracks,
    chapters,
    attachments,
  };
}

/**
 * Pick the default audio track (first `disposition.default = 1`), falling
 * back to the first audio stream when none is flagged. Returns undefined
 * only when the file has zero audio tracks.
 */
export function pickDefaultAudioTrack(
  tracks: PlayerProbedAudioTrack[]
): PlayerProbedAudioTrack | undefined {
  return tracks.find(t => t.isDefault) ?? tracks[0];
}

/**
 * Codecs ffmpeg can extract as ASS via `-c:s ass` and the renderer's JASSUB
 * overlay can render. Image subs (PGS/VobSub) are excluded — they get a
 * null `subsUrl` so the UI picker can disable them.
 */
const TEXT_SUB_CODECS = new Set([
  'ass',
  'ssa',
  'subrip',
  'srt',
  'webvtt',
  'vtt',
  'mov_text',
  'text',
]);

export function isTextSubtitleCodec(codec: string | null): boolean {
  if (!codec) return false;
  return TEXT_SUB_CODECS.has(codec.toLowerCase());
}
