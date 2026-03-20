'use client';
import { useEffect, useRef, useCallback } from 'react';

interface UsePollingOptions {
  interval?: number;       // ms between polls (default 10000)
  enabled?: boolean;       // can disable polling
  immediate?: boolean;     // fetch immediately on mount (default true)
}

/**
 * Smart polling hook:
 * - Fetches immediately on mount
 * - Polls every `interval` ms
 * - Pauses when tab is hidden (saves requests)
 * - Resumes immediately when tab becomes visible
 * - Stops on unmount
 */
export function usePolling(
  fn: () => Promise<void> | void,
  deps: any[],
  options: UsePollingOptions = {}
) {
  const { interval = 10000, enabled = true, immediate = true } = options;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fnRef = useRef(fn);

  // Always keep fnRef current so stale closures don't cause issues
  useEffect(() => { fnRef.current = fn; });

  const start = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!document.hidden) fnRef.current();
    }, interval);
  }, [interval]);

  const stop = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => {
    if (!enabled) { stop(); return; }

    if (immediate) fnRef.current();
    start();

    // Pause when hidden, resume + fetch immediately when visible
    const onVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else {
        fnRef.current(); // fetch immediately on resume
        start();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled, ...deps]);
}
