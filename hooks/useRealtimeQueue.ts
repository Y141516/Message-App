'use client';
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

type Callback = () => void | Promise<void>;

/**
 * Unified realtime hook — subscribes to ALL relevant table changes.
 * Works even if Supabase Realtime is not enabled (falls back to polling).
 * Uses a single channel for all subscriptions to reduce connection overhead.
 */
function useRealtimeTables(
  tables: string[],
  onAnyChange: Callback,
  enabled = true,
  channelName = 'rt-all'
) {
  const channelRef = useRef<any>(null);
  const cbRef = useRef(onAnyChange);
  useEffect(() => { cbRef.current = onAnyChange; });

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const connect = () => {
      try {
        let channel = supabase.channel(channelName);

        tables.forEach(table => {
          channel = channel.on(
            'postgres_changes' as any,
            { event: '*', schema: 'public', table },
            () => {
              console.log(`[Realtime] ${table} changed — refreshing`);
              cbRef.current();
            }
          );
        });

        channel.subscribe((status: string, err: any) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[Realtime] ✅ Connected: ${tables.join(', ')}`);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('[Realtime] ⚠️ Connection issue — polling will cover');
          }
        });

        channelRef.current = channel;
      } catch (err) {
        console.warn('[Realtime] Setup failed:', err);
      }
    };

    connect();

    return () => {
      if (channelRef.current) {
        try { supabase.removeChannel(channelRef.current); } catch {}
      }
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

// ─── Announcements ───────────────────────────────────────────
export function useRealtimeAnnouncements(onNew: Callback, enabled = true) {
  useRealtimeTables(['announcements'], onNew, enabled, 'rt-announcements');
}
