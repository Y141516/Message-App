'use client';
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

type Callback = () => void | Promise<void>;

/**
 * Unified realtime hook — subscribes to relevant table changes on a single
 * channel. Falls back safely to polling (wired separately in each screen)
 * if Realtime is unavailable.
 *
 * Free-tier reliability notes:
 * - Automatically reconnects with backoff if the socket drops
 *   (CHANNEL_ERROR / TIMED_OUT / CLOSED), which matters a lot for a
 *   Telegram Mini App since the WebView is frequently backgrounded when
 *   the user switches away from Telegram, and mobile networks drop
 *   connections often. Without this, a channel could silently stay dead
 *   until the page fully reloads.
 * - Triggers an immediate refetch on regaining visibility/focus and right
 *   after reconnecting, to pick up anything missed while the socket was
 *   down — this covers the gap without needing a paid plan.
 */
function useRealtimeTables(
  tables: string[],
  onAnyChange: Callback,
  enabled = true,
  channelName = 'rt-all'
) {
  const channelRef = useRef<any>(null);
  const cbRef = useRef(onAnyChange);
  const retryRef = useRef(0);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => { cbRef.current = onAnyChange; });

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    let cancelled = false;

    const clearRetryTimer = () => {
      if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
    };

    const teardown = () => {
      if (channelRef.current) {
        try { supabase.removeChannel(channelRef.current); } catch {}
        channelRef.current = null;
      }
    };

    const connect = () => {
      if (cancelled) return;
      teardown();

      try {
        let channel = supabase.channel(channelName);

        tables.forEach(table => {
          channel = channel.on(
            'postgres_changes' as any,
            { event: '*', schema: 'public', table },
            () => { cbRef.current(); }
          );
        });

        channel.subscribe((status: string) => {
          if (cancelled) return;
          if (status === 'SUBSCRIBED') {
            retryRef.current = 0;
            // Pick up anything that changed while we were reconnecting.
            cbRef.current();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            // Exponential backoff, capped at 15s, so a dropped connection
            // (e.g. Telegram WebView backgrounded) recovers on its own.
            clearRetryTimer();
            const delay = Math.min(15000, 1000 * Math.pow(2, retryRef.current));
            retryRef.current += 1;
            retryTimerRef.current = setTimeout(connect, delay);
          }
        });

        channelRef.current = channel;
      } catch {
        clearRetryTimer();
        const delay = Math.min(15000, 1000 * Math.pow(2, retryRef.current));
        retryRef.current += 1;
        retryTimerRef.current = setTimeout(connect, delay);
      }
    };

    connect();

    // If the tab was backgrounded, the socket may have silently died without
    // firing CLOSED — force a reconnect + refetch as soon as we're back.
    const onVisible = () => { if (!document.hidden) { retryRef.current = 0; connect(); } };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      cancelled = true;
      clearRetryTimer();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      teardown();
    };
  }, [enabled, channelName]);
}

// ─── User-facing: queue status + replies ─────────────────────
export function useRealtimeQueue(onQueueChange: Callback, enabled = true) {
  useRealtimeTables(['queues'], onQueueChange, enabled, 'rt-queues');
}

export function useRealtimeReplies(onReplyChange: Callback, enabled = true) {
  useRealtimeTables(['replies', 'messages'], onReplyChange, enabled, 'rt-replies');
}

// ─── Leader-facing: new messages ─────────────────────────────
export function useRealtimeMessages(onMessageChange: Callback, enabled = true) {
  useRealtimeTables(['messages'], onMessageChange, enabled, 'rt-messages');
}

// ─── Leader-facing: own queue status changes ──────────────────
export function useRealtimeLeaderQueue(onChange: Callback, enabled = true) {
  useRealtimeTables(['queues', 'messages'], onChange, enabled, 'rt-leader-dashboard');
}

// ─── Announcements ───────────────────────────────────────────
export function useRealtimeAnnouncements(onNew: Callback, enabled = true) {
  useRealtimeTables(['announcements', 'announcement_dismissals'], onNew, enabled, 'rt-announcements');
}
