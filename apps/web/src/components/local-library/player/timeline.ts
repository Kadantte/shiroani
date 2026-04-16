export function clampPlaybackPosition(positionSeconds: number, durationSeconds: number): number {
  if (!Number.isFinite(positionSeconds)) return 0;
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return Math.max(0, positionSeconds);
  }
  return Math.max(0, Math.min(positionSeconds, durationSeconds));
}

export function getAbsolutePlaybackPosition(
  streamStartSeconds: number,
  streamCurrentTimeSeconds: number,
  durationSeconds: number
): number {
  const base = Math.max(0, Number.isFinite(streamStartSeconds) ? streamStartSeconds : 0);
  const relative = Math.max(
    0,
    Number.isFinite(streamCurrentTimeSeconds) ? streamCurrentTimeSeconds : 0
  );
  return clampPlaybackPosition(base + relative, durationSeconds);
}

export function getStreamPlaybackTime(
  streamStartSeconds: number,
  absolutePositionSeconds: number
): number {
  const base = Math.max(0, Number.isFinite(streamStartSeconds) ? streamStartSeconds : 0);
  const absolute = Math.max(
    0,
    Number.isFinite(absolutePositionSeconds) ? absolutePositionSeconds : 0
  );
  return Math.max(0, absolute - base);
}
