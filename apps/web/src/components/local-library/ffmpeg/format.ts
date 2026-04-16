/**
 * Tiny byte / speed formatters used by the FFmpeg install progress UI.
 * Kept local — if any other feature ends up needing these we'll promote
 * them into `@shiroani/shared`.
 */

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 100 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function formatSpeed(bytesPerSec: number): string {
  if (!Number.isFinite(bytesPerSec) || bytesPerSec <= 0) return '—';
  return `${formatBytes(bytesPerSec)}/s`;
}

export function formatEta(bytes: number, total: number, speed: number): string {
  if (!Number.isFinite(speed) || speed <= 0 || total <= 0 || bytes >= total) return '';
  const remaining = (total - bytes) / speed;
  if (!Number.isFinite(remaining) || remaining <= 0) return '';
  if (remaining < 60) return `${Math.ceil(remaining)}s`;
  const minutes = Math.floor(remaining / 60);
  const seconds = Math.round(remaining % 60);
  return `${minutes}m ${seconds}s`;
}
