/**
 * Pipeline decider.
 *
 * Given a probe result + the audio track the user wants + where to start,
 * decide whether we can `-c copy` remux or need to transcode — and produce
 * the exact ffmpeg argv for the session.
 *
 * Goal: use remux whenever possible (near-zero CPU on any machine) and only
 * escalate to libx264/AAC when the container or codecs would break HTML5
 * playback in Chromium (h264+aac in fragmented MP4).
 *
 * Seeking strategy: we pass `-ss <seconds>` BEFORE `-i` — this is the fast
 * input seek that uses the keyframe index. Accuracy is ~keyframe granularity
 * (up to ~2s on most streams); the renderer fine-tunes via `currentTime`.
 *
 * Output is always fragmented MP4 on stdout:
 *   -movflags frag_keyframe+empty_moov+default_base_moof+faststart
 *   -f mp4 pipe:1
 * which streams cleanly to a `<video>` element without needing a seekable
 * container (Jellyfin does the same thing).
 */

import type { PlayerProbeResult, PlayerProbedAudioTrack } from './probe';
import type { PlayerSessionMode } from '@shiroani/shared';

/** Video codecs we can mux directly into fMP4 and Chromium will play. */
const REMUXABLE_VIDEO = new Set(['h264', 'avc1', 'avc']);

/** Audio codecs we can mux directly into fMP4 and Chromium will play. */
const REMUXABLE_AUDIO = new Set(['aac', 'mp3', 'mp4a']);

export interface PipelinePlan {
  mode: PlayerSessionMode;
  /** argv for `spawn(ffmpegPath, args)` — no shell, no escaping needed. */
  args: string[];
  /** Echo of the effective start time so the session can compute currentTime offsets. */
  startSeconds: number;
}

export interface BuildPipelineInput {
  /** Absolute path to the source video file. */
  filePath: string;
  /** Playback-time probe result. */
  probe: PlayerProbeResult;
  /** Which audio track to map (the whole track object — we need its relativeIndex). */
  audioTrack: PlayerProbedAudioTrack | undefined;
  /** Seconds to seek to before starting the stream. Zero for fresh opens. */
  startSeconds: number;
}

/**
 * Build the ffmpeg argv for a session at the given start time.
 *
 * The fragmented-MP4 flags + `-sn` (no subs muxed) + single-audio-track
 * mapping apply to every mode; only the `-c:v` / `-c:a` args differ.
 */
export function buildPipeline(input: BuildPipelineInput): PipelinePlan {
  const { filePath, probe, audioTrack, startSeconds } = input;

  const clampedStart = Math.max(0, Math.floor(startSeconds * 1000) / 1000);
  const needsVideoTranscode = !isRemuxableVideo(probe.videoCodec);
  const needsAudioTranscode = audioTrack ? !isRemuxableAudio(audioTrack.codec) : false;

  const videoArgs = needsVideoTranscode
    ? ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p']
    : ['-c:v', 'copy'];

  // When downmixing/re-encoding audio, pin to stereo AAC 192k — safest for
  // browsers and keeps bitrate predictable for 5.1+ sources.
  const audioArgs = needsAudioTranscode
    ? ['-c:a', 'aac', '-ac', '2', '-b:a', '192k']
    : ['-c:a', 'copy'];

  const mode: PlayerSessionMode = needsVideoTranscode
    ? needsAudioTranscode
      ? 'transcode-both'
      : 'transcode-video'
    : needsAudioTranscode
      ? 'transcode-audio'
      : 'remux';

  // Map the primary video stream + the chosen audio stream. `-sn` keeps
  // subtitles out of the stream — JASSUB renders them in the DOM overlay.
  const mapArgs: string[] = [];
  mapArgs.push('-map', '0:v:0');
  if (audioTrack) {
    mapArgs.push('-map', `0:a:${audioTrack.relativeIndex}`);
  }

  const args: string[] = [
    // Disable stdin — we never feed the child anything, and leaving it open
    // can confuse ffmpeg's terminal-size detection on Windows.
    '-nostdin',
    // Keep the log quiet but still capture real errors on stderr.
    '-hide_banner',
    '-loglevel',
    'error',
  ];

  // Input seek (fast). Emitted only when start > 0 so the very first stream
  // byte is the file's first keyframe for best compatibility.
  if (clampedStart > 0) {
    args.push('-ss', clampedStart.toString());
  }

  args.push('-i', filePath);
  args.push('-sn');
  args.push(...mapArgs);
  args.push(...videoArgs);
  args.push(...audioArgs);

  // Fragmented-MP4 output over pipe:1. The `default_base_moof` bit is what
  // makes Chromium happy with mid-stream fragments; without it, some
  // versions hiccup on the first seek.
  args.push(
    '-movflags',
    'frag_keyframe+empty_moov+default_base_moof+faststart',
    '-f',
    'mp4',
    'pipe:1'
  );

  return { mode, args, startSeconds: clampedStart };
}

function isRemuxableVideo(codec: string | null): boolean {
  if (!codec) return false;
  return REMUXABLE_VIDEO.has(codec.toLowerCase());
}

function isRemuxableAudio(codec: string | null): boolean {
  if (!codec) return false;
  return REMUXABLE_AUDIO.has(codec.toLowerCase());
}
