/**
 * Tiny wrapper around `localStorage` that collapses the "read with fallback /
 * write ignoring errors" pattern we've re-implemented in a handful of stores.
 *
 * Each accessor swallows every failure mode silently:
 * - `localStorage` unavailable (SSR, tests without jsdom, private mode) →
 *   `get` returns the fallback, `set` is a no-op
 * - `parse` throws → fallback
 * - `setItem` throws (quota, etc.) → no-op
 *
 * Intentionally minimal: we do NOT log, surface quota errors, or attempt
 * retries — callers already treat in-memory state as authoritative.
 */
export interface LocalStorageAccessorOptions<T> {
  parse: (raw: string) => T;
  serialize: (value: T) => string;
  fallback: T;
}

export interface LocalStorageAccessor<T> {
  get: () => T;
  set: (value: T) => void;
}

function isStorageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function createLocalStorageAccessor<T>(
  key: string,
  { parse, serialize, fallback }: LocalStorageAccessorOptions<T>
): LocalStorageAccessor<T> {
  return {
    get: () => {
      if (!isStorageAvailable()) return fallback;
      try {
        const raw = window.localStorage.getItem(key);
        if (raw === null) return fallback;
        return parse(raw);
      } catch {
        return fallback;
      }
    },
    set: (value: T) => {
      if (!isStorageAvailable()) return;
      try {
        window.localStorage.setItem(key, serialize(value));
      } catch {
        // storage unavailable / quota — in-memory state is authoritative
      }
    },
  };
}
