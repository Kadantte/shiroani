import { useEffect, useState, type RefObject } from 'react';
import { createLogger } from '@shiroani/shared';

// Vite `?url` / `?worker&url` imports point the JASSUB runtime at the right
// assets in both dev and production. Paths match jassub@2.4.2's actual layout
// under `dist/` — the published README references an older flat layout.
import jassubWorkerUrl from 'jassub/dist/worker/worker.js?worker&url';
import jassubWasmUrl from 'jassub/dist/wasm/jassub-worker.wasm?url';
import jassubModernWasmUrl from 'jassub/dist/wasm/jassub-worker-modern.wasm?url';

const logger = createLogger('JASSUB');

/** Anything that might throw inside JASSUB's async fetch of sub content. */
export type JassubError =
  | { kind: 'fetch-failed'; message: string }
  | { kind: 'init-failed'; message: string };

export interface UseJassubOptions {
  /** Ref to the `<video>` element that JASSUB will attach its canvas over. */
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Subtitle URL (.ass). null/undefined → no subs rendered. */
  subsUrl: string | null | undefined;
  /**
   * Bumped whenever we need to force a full re-init (e.g. switching
   * subtitle tracks mid-session). Change of `subsUrl` already triggers re-init
   * — this is for callers that want to reset without changing the URL.
   */
  resetKey?: number;
  /**
   * MKV-extracted fonts for this episode, served by the backend. Passed as
   * `fonts[]` at JASSUB construction so they're pre-loaded and libass doesn't
   * FOUT when a cue hits an unknown family.
   */
  fonts?: string[];
}

export interface UseJassubResult {
  error: JassubError | null;
  /** True while JASSUB is fetching the sub payload + spinning up the worker. */
  isLoading: boolean;
}

/**
 * Owns the JASSUB (libass-WASM) instance for the given `<video>` + subtitle
 * source. Re-creates the instance when `subsUrl`, `videoRef.current`, or
 * `resetKey` change; destroys it on unmount.
 *
 * JASSUB renders to an OffscreenCanvas in a Worker, which keeps subtitle
 * rendering off the main thread. That plus hardware-accelerated video decode
 * is what makes this player feel native.
 *
 * We intentionally fetch the .ass payload ourselves (instead of handing
 * `subUrl` to JASSUB). That way a bad URL fails fast with a recognizable error
 * rather than hanging inside the worker, and we can bypass service-worker /
 * origin restrictions consistently.
 */
export function useJassub({
  videoRef,
  subsUrl,
  resetKey,
  fonts,
}: UseJassubOptions): UseJassubResult {
  const [error, setError] = useState<JassubError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !subsUrl) {
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    // `instance` is the JASSUB instance once constructed. `destroy()` is async
    // but returns void — we don't await on the cleanup path.
    let instance: { destroy: () => Promise<void> } | null = null;

    setError(null);
    setIsLoading(true);

    (async () => {
      try {
        // Fetch the .ass payload first. If the backend hasn't finished
        // producing subs yet the fetch will 404; surface that as a plain
        // error rather than a JASSUB timeout.
        const res = await fetch(subsUrl);
        if (!res.ok) {
          throw new Error(`Subtitle fetch ${res.status} ${res.statusText}`);
        }
        const subContent = await res.text();
        if (cancelled) return;

        // Dynamic import — keeps ~200 KB of JASSUB out of the initial bundle
        // for users who never open the local player.
        const { default: JASSUB } = await import('jassub');
        if (cancelled) return;

        instance = new JASSUB({
          video,
          subContent,
          fonts: fonts && fonts.length > 0 ? fonts : undefined,
          workerUrl: jassubWorkerUrl,
          wasmUrl: jassubWasmUrl,
          modernWasmUrl: jassubModernWasmUrl,
        });
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        logger.error('JASSUB init failed:', message);
        setError({
          kind: message.includes('fetch') ? 'fetch-failed' : 'init-failed',
          message,
        });
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (instance) {
        instance.destroy().catch(() => {
          /* teardown */
        });
        instance = null;
      }
    };
    // videoRef itself is stable (it's a ref object); we intentionally depend on
    // `videoRef.current` via the effect reading it each run. resetKey triggers
    // forced recreates, and `fonts` identity changes are tolerated (a new
    // array triggers a re-init, which is what we want).
  }, [videoRef, subsUrl, resetKey, fonts]);

  return { error, isLoading };
}
