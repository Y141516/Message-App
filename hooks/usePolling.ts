'use client';
import { useEffect, useRef, useCallback } from 'react';

interface UsePollingOptions {
  interval?: number;
  enabled?: boolean;
  immediate?: boolean;
}

export function usePolling(
  fn: () => Promise<void> | void,
  deps: any[],
  options: UsePollingOptions = {}
) {
  const { interval = 5000, enabled = true, immediate = true } = options;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fnRef = useRef(fn);
  const runningRef = useRef(false);

  useEffect(() => { fnRef.current = fn; });

  const stop = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const start = useCallback(() => {
    stop();
    timerRef.current = setInterval(async () => {
      if (!document.hidden && !runningRef.current) {
        runningRef.current = true;
        try { await fnRef.current(); } finally { runningRef.current = false; }
      }
    }, interval);
  }, [interval, stop]);

  useEffect(() => {
    if (!enabled) { stop(); return; }

    // Run immediately on mount
    if (immediate) {
      runningRef.current = true;
      Promise.resolve(fnRef.current()).finally(() => { runningRef.current = false; });
    }
    start();

    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        // Fetch immediately on tab focus
        if (!runningRef.current) {
          runningRef.current = true;
          Promise.resolve(fnRef.current()).finally(() => { runningRef.current = false; });
        }
        start();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, ...deps]);
}
