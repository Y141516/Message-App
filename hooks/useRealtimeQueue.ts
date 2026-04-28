'use client';
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Subscribes to queue open/close changes — triggers callback instantly
 */
export function useRealtimeQueue(onQueueChange: () => void, enabled = true) {
  const channelRef = useRef<any>(null);
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    try {
      const ch = supabase.channel('rt-queues')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'queues' }, () => onQueueChange())
        .subscribe();
      channelRef.current = ch;
    } catch (err) { console.warn('[Realtime] queue failed:', err); }
    return () => { try { if (channelRef.current) supabase.removeChannel(channelRef.current); } catch {} };
  }, [enabled]);
}

/**
 * Subscribes to new replies — triggers when leader replies to a user
 */
export function useRealtimeReplies(onReplyChange: () => void, enabled = true) {
  const channelRef = useRef<any>(null);
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    try {
      const ch = supabase.channel('rt-replies')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'replies' }, () => onReplyChange())
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => onReplyChange())
        .subscribe();
      channelRef.current = ch;
    } catch (err) { console.warn('[Realtime] replies failed:', err); }
    return () => { try { if (channelRef.current) supabase.removeChannel(channelRef.current); } catch {} };
  }, [enabled]);
}

/**
 * Subscribes to new messages — triggers instantly when user sends a message
 * This is the key to real-time for leaders
 */
export function useRealtimeMessages(onMessageChange: () => void, enabled = true) {
  const channelRef = useRef<any>(null);
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    try {
      const ch = supabase.channel('rt-messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
          onMessageChange();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') console.log('[Realtime] Messages channel live ✅');
        });
      channelRef.current = ch;
    } catch (err) { console.warn('[Realtime] messages failed:', err); }
    return () => { try { if (channelRef.current) supabase.removeChannel(channelRef.current); } catch {} };
  }, [enabled]);
}

/**
 * Subscribes to announcements
 */
export function useRealtimeAnnouncements(onNew: () => void, enabled = true) {
  const channelRef = useRef<any>(null);
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    try {
      const ch = supabase.channel('rt-announcements')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, () => onNew())
        .subscribe();
      channelRef.current = ch;
    } catch (err) { console.warn('[Realtime] announcements failed:', err); }
    return () => { try { if (channelRef.current) supabase.removeChannel(channelRef.current); } catch {} };
  }, [enabled]);
}
