import { useEffect, useState } from 'react';

/**
 * Returns the current epoch in **seconds**, re-rendering on a fixed cadence.
 *
 * Used by schedule views to tick live status / countdowns / the "TERAZ"
 * indicator without each view hand-rolling its own `setInterval`. Consumers
 * pick the cadence — DailyView uses 30 s (fine-grained now-line), while the
 * weekly grids tick every 60 s.
 */
export function useNowSeconds(intervalMs: number): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
