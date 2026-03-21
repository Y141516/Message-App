'use client';
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Supabase Realtime hook — subscribes to queue + replies table changes
 * Calls the provided callback instantly when data changes
 * Falls back gracefully if realtime is unavailable
 */
export function useRealtimeQueue(onQueueChange: () => void, enabled = true) {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled) return;

    // Subscribe to queues table changes (open/close)
    const channel = supabase
      .channel('queue-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queues' },
        () => { onQueueChange(); }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Queue channel connected');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [enabled]);
}

export function useRealtimeReplies(onReplyChange: () => void, enabled = true) {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('reply-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'replies' },
        () => { onReplyChange(); }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        () => { onReplyChange(); }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [enabled]);
}

export function useRealtimeMessages(onMessageChange: () => void, enabled = true) {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('message-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => { onMessageChange(); }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [enabled]);
}
