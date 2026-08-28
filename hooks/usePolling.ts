'use client';
import { useEffect, useRef, useCallback } from 'react';

interface UsePollingOptions {
  interval?: number;   // ms — default 3000 (3s)
  enabled?: boolean;
  immediate?: boolean;
}

/**
 * Smart polling hook:
 * - Runs immediately on mount
 * - Polls every `interval` ms (default 3s)
 * - Pauses when tab is hidden (saves requests)
 * - Fires immediately when tab becomes visible again
 * - Prevents concurrent runs (won't stack up)
 */
export function usePolling(
  fn: () => Promise<void> | void,
  deps: any[],
  options: UsePollingOptions = {}
) {
  const { interval = 3000, enabled = true, immediate = true } = options;
  const timerRef   = useRef<NodeJS.Timeout | null>(null);
  const fnRef      = useRef(fn);
  const runningRef = useRef(false);

  // Always keep fnRef current so closures never go stale
  useEffect(() => { fnRef.current = fn; });

  const run = useCallback(async () => {
    if (runningRef.current || document.hidden) return;
    runningRef.current = true;
    try { await fnRef.current(); } finally { runningRef.current = false; }
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const start = useCallback(() => {
    stop();
    // Small random jitter (±15%) on the interval — otherwise many clients
    // that all mounted around the same moment (e.g. hundreds of people
    // opening the app right as a queue opens) end up polling in near-perfect
    // sync, creating periodic load spikes instead of smooth, spread-out
    // traffic.
    const jittered = interval * (0.85 + Math.random() * 0.3);
    timerRef.current = setInterval(run, jittered);
  }, [interval, stop, run]);

  useEffect(() => {
    if (!enabled) { stop(); return; }

    // Fetch immediately on mount / dep change
    if (immediate) run();
    start();

    const onVisibility = () => {
      if (document.hidden) {
        stop(); // pause while hidden
      } else {
        run();  // fetch immediately when tab becomes visible
        start();
      }
    };

    // Also fetch when window regains focus (user switches back to Telegram)
    const onFocus = () => { if (!document.hidden) run(); };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);
}
