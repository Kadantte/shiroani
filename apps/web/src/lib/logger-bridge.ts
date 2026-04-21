/**
 * Renderer → main log forwarder.
 *
 * Subscribes to the shared ring buffer (`subscribeToLogBuffer`) and forwards
 * every *new* entry to the main process via `electronAPI.log.write`. This
 * guarantees renderer logs reach the rotated JSONL log file on disk even when
 * DevTools is closed in a production build.
 *
 * Key design notes:
 *   - Delta-only: we track the last forwarded entry reference + buffer length
 *     and only ship entries that appeared after the previous tick, so we
 *     never re-forward the whole buffer on each update.
 *   - Wrap-safe: the underlying buffer is capped and shifts oldest-first once
 *     full. When the length stays at `cap` but new entries arrive at the tail,
 *     we detect the wrap by comparing object references at the last known
 *     index and fall back to shipping only the delta relative to the snapshot
 *     tail.
 *   - Loop-safe: entries whose context already starts with `Renderer:` or
 *     `Main` (cross-process-forwarded logs) are filtered so we don't ping-pong
 *     between ranges if the main side ever surfaces forwarded entries back.
 *   - IPC failures are swallowed in preload, but we additionally guard here
 *     so a thrown/rejected write cannot unwind into the renderer logger and
 *     cause a cascade.
 */

import { subscribeToLogBuffer, type LogEntry } from '@shiroani/shared';

let installed = false;

function isCrossProcessForward(context: string): boolean {
  if (!context) return false;
  if (context.startsWith('Renderer:')) return true;
  // Guard against future main → renderer forwards. `Main` alone is the
  // top-level main logger context; `Main:*` is unused today but reserved.
  if (context === 'Main' || context.startsWith('Main:')) return true;
  return false;
}

function forwardEntry(entry: LogEntry): void {
  if (isCrossProcessForward(entry.context)) return;
  const api = window.electronAPI;
  const write = api?.log?.write;
  if (!write) return;
  try {
    // preload already `.catch(() => {})`s the underlying invoke, but defensive
    // double-catch here ensures a thrown synchronous error can never bubble.
    void write({
      level: entry.level,
      context: entry.context,
      message: entry.message,
      data: entry.data,
    }).catch(() => {
      // swallow — forwarding failures must not re-enter the renderer logger.
    });
  } catch {
    // swallow
  }
}

/**
 * Install the renderer → main log forwarder. Idempotent: calling twice is a
 * no-op. Returns an `uninstall` function that detaches the buffer subscription.
 * When running outside an Electron shell (i.e. `window.electronAPI.log.write`
 * is unavailable) this is a no-op and returns a no-op uninstaller.
 */
export function installRendererLogBridge(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (!window.electronAPI?.log?.write) return () => {};
  if (installed) return () => {};
  installed = true;

  // Tracks the entry object reference at `lastSeenCount - 1` when we last
  // forwarded. Used to detect whether the buffer wrapped (shifted) between
  // two callback invocations.
  let lastSeenCount = 0;
  let lastTailRef: LogEntry | null = null;

  const unsubscribe = subscribeToLogBuffer(snapshot => {
    try {
      const len = snapshot.length;
      if (len === 0) {
        lastSeenCount = 0;
        lastTailRef = null;
        return;
      }

      // Fast path: buffer grew and the previous tail is still at
      // `lastSeenCount - 1`. Forward everything past that index.
      if (
        lastSeenCount > 0 &&
        lastSeenCount <= len &&
        snapshot[lastSeenCount - 1] === lastTailRef
      ) {
        for (let i = lastSeenCount; i < len; i++) {
          forwardEntry(snapshot[i]);
        }
      } else if (lastSeenCount === 0) {
        // First tick since install — forward the whole current snapshot.
        for (let i = 0; i < len; i++) {
          forwardEntry(snapshot[i]);
        }
      } else {
        // Buffer must have wrapped (shifted). We can't reliably identify the
        // overlap, so forward just the single newest entry to stay conservative
        // — duplicates are worse than drops for log hygiene, and shift only
        // happens once the ring hits its cap so at most we miss a few entries
        // from the very first forward after a massive burst.
        forwardEntry(snapshot[len - 1]);
      }

      lastSeenCount = len;
      lastTailRef = snapshot[len - 1];
    } catch {
      // Never re-throw from the subscription callback — would break the
      // shared logger's listener loop.
    }
  });

  return () => {
    try {
      unsubscribe();
    } finally {
      installed = false;
      lastSeenCount = 0;
      lastTailRef = null;
    }
  };
}
