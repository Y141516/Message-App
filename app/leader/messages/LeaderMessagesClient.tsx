'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter, X, Siren, MessageSquare,
  MapPin, Users, ChevronRight, Inbox,
  CheckCheck, Clock,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { useUserStore } from '@/store/userStore';
import { cn, formatRelativeTime, getMessageTypeLabel, getEmergencyColor } from '@/lib/utils';
import toast from 'react-hot-toast';

type Tab = 'unreplied' | 'replied';

export default function LeaderMessagesClient() {
  const router = useRouter();
  const { user } = useUserStore();

  const [tab, setTab] = useState<Tab>('unreplied');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [filterSort, setFilterSort] = useState<'newest' | 'oldest'>('newest');
  const [filterType, setFilterType] = useState<'all' | 'emergency' | 'regular'>('all');
  const [filterCity, setFilterCity] = useState('');

  useEffect(() => {
    if (!user) { router.replace('/'); return; }
    if (user.role !== 'leader' && user.role !== 'admin') { router.replace('/home'); return; }
    setMessages([]); setPage(0); fetchMessages(0);
  }, [tab, filterSort, filterType, filterCity, user]);

  const fetchMessages = useCallback(async (pageNum = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        telegram_id: user!.telegram_id,
        tab,
        page: String(pageNum),
        sort: filterSort,
        type: filterType,
        ...(filterCity && { city: filterCity }),
      });
      const res = await fetch(`/api/leader/messages?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (pageNum === 0) {
        setMessages(data.messages || []);
      } else {
        setMessages(prev => [...prev, ...(data.messages || [])]);
      }
      setTotal(data.total || 0);
      setHasMore(data.hasMore || false);
    } catch {
      toast.error('Could not load messages');
    } finally {
      setLoading(false);
    }
  }, [tab, filterSort, filterType, filterCity, user]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchMessages(next);
  };

  const activeFilterCount = [filterSort !== 'newest', filterType !== 'all', !!filterCity].filter(Boolean).length;

  return (
    <AppShell showNav={false}>
      <PageHeader title="Messages" showBack
        subtitle={`${total} ${tab === 'unreplied' ? 'pending' : 'replied'}`}
      />

      {/* Tabs */}
      <div className="px-4 mb-3">
        <div className="flex bg-[#12121A] rounded-2xl p-1 border border-[#2A2A3E]">
          {(['unreplied', 'replied'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5',
                tab === t
                  ? 'bg-[#1A1A26] text-[#C9A84C] border border-[#C9A84C]/20'
                  : 'text-[#5A5A72] hover:text-[#9A9AB0]'
              )}>
              {t === 'unreplied' ? <Clock className="w-3.5 h-3.5" /> : <CheckCheck className="w-3.5 h-3.5" />}
              {t === 'unreplied' ? 'Unreplied' : 'Replied'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-6 max-w-lg mx-auto space-y-3">

        {/* Filter bar */}
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-all',
              showFilters || activeFilterCount > 0
                ? 'bg-[#C9A84C]/10 border-[#C9A84C]/30 text-[#C9A84C]'
                : 'bg-[#1A1A26] border-[#2A2A3E] text-[#9A9AB0]'
            )}>
            <Filter className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#C9A84C] text-[#0A0A0F] text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          <span className="text-[#5A5A72] text-xs ml-auto">{total} messages</span>
        </div>

        {/* Filter panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-[#1A1A26] border border-[#2A2A3E] rounded-2xl p-4 space-y-3 overflow-hidden">
              <div>
                <p className="text-[#5A5A72] text-xs mb-2">Sort</p>
                <FilterPills options={[{ id: 'newest', label: 'Newest' }, { id: 'oldest', label: 'Oldest' }]}
                  value={filterSort} onChange={v => setFilterSort(v as 'newest' | 'oldest')} />
              </div>
              <div>
                <p className="text-[#5A5A72] text-xs mb-2">Type</p>
                <FilterPills
                  options={[{ id: 'all', label: 'All' }, { id: 'emergency', label: 'Emergency' }, { id: 'regular', label: 'Regular' }]}
                  value={filterType} onChange={v => setFilterType(v as any)} />
              </div>
              <div>
                <p className="text-[#5A5A72] text-xs mb-2">City</p>
                <input
                  value={filterCity}
                  onChange={e => setFilterCity(e.target.value)}
                  placeholder="Filter by city..."
                  className="w-full bg-[#12121A] border border-[#2A2A3E] rounded-xl px-3 py-2 text-[#F0EDE8] text-sm outline-none focus:border-[#C9A84C]/50 placeholder:text-[#5A5A72]"
                />
              </div>
              {activeFilterCount > 0 && (
                <button onClick={() => { setFilterSort('newest'); setFilterType('all'); setFilterCity(''); }}
                  className="text-xs text-red-400 flex items-center gap-1">
                  <X className="w-3 h-3" /> Reset filters
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        {loading && messages.length === 0 ? (
          <>{[0,1,2,3].map(i => <SkeletonCard key={i} />)}</>
        ) : messages.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#1A1A26] border border-[#2A2A3E] rounded-2xl p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#12121A] border border-[#2A2A3E] flex items-center justify-center mx-auto mb-3">
              <Inbox className="w-6 h-6 text-[#5A5A72]" />
            </div>
            <p className="text-[#F0EDE8] text-sm font-medium">No {tab} messages</p>
            <p className="text-[#5A5A72] text-xs mt-1">
              {tab === 'unreplied' ? 'All messages have been replied to.' : 'No replies sent yet.'}
            </p>
          </motion.div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageCard
                key={msg.id}
                message={msg}
                index={i}
                onClick={() => router.push(`/leader/reply?id=${msg.id}`)}
                showReply={tab === 'unreplied'}
              />
            ))}

            {hasMore && (
              <button onClick={loadMore} disabled={loading}
                className="w-full py-3 text-[#9A9AB0] text-sm border border-[#2A2A3E] rounded-2xl hover:border-[#C9A84C]/30 hover:text-[#C9A84C] transition-all disabled:opacity-50">
                {loading ? 'Loading...' : 'Load more'}
              </button>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function MessageCard({ message, index, onClick, showReply }: {
  message: any; index: number; onClick: () => void; showReply: boolean;
}) {
  const user = message.users;
  const groups = user?.user_groups?.map((ug: any) => ug.groups?.name).filter(Boolean) || [];

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full bg-[#1A1A26] border border-[#2A2A3E] rounded-2xl p-4 text-left hover:border-[#C9A84C]/25 transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C9A84C]/20 to-[#8A6F2E]/10 border border-[#C9A84C]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[#C9A84C] text-sm font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
          <div>
            <p className="text-[#F0EDE8] text-sm font-semibold">{user?.name || 'Unknown'}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {user?.city && (
                <span className="flex items-center gap-0.5 text-[10px] text-[#5A5A72]">
                  <MapPin className="w-2.5 h-2.5" />{user.city}
                </span>
              )}
              {groups.length > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-[#5A5A72]">
                  <Users className="w-2.5 h-2.5" />{groups[0]}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {message.is_emergency && (
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1', getEmergencyColor(message.message_type))}>
              <Siren className="w-2.5 h-2.5" />
              {getMessageTypeLabel(message.message_type).replace(' Emergency', '')}
            </span>
          )}
          <span className="text-[#3A3A52] text-[10px]">{formatRelativeTime(message.created_at)}</span>
        </div>
      </div>

      {/* Message preview */}
      {message.content && (
        <p className="text-[#9A9AB0] text-xs leading-relaxed line-clamp-2 mb-3">
          {message.content}
        </p>
      )}
      {!message.content && message.media_type && (
        <p className="text-[#5A5A72] text-xs italic mb-3 flex items-center gap-1">
          <MessageSquare className="w-3 h-3" /> {message.media_type} attachment
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {groups.map((g: string) => (
            <span key={g} className="text-[10px] px-2 py-0.5 rounded-full bg-[#2A2A3E] text-[#5A5A72]">{g}</span>
          ))}
        </div>
        {showReply && (
          <span className="flex items-center gap-1 text-[#C9A84C] text-xs font-medium flex-shrink-0">
            Reply <ChevronRight className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </motion.button>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-[#1A1A26] border border-[#2A2A3E] rounded-2xl p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#2A2A3E]" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-[#2A2A3E] rounded w-28" />
          <div className="h-2 bg-[#2A2A3E] rounded w-20" />
        </div>
      </div>
      <div className="h-2.5 bg-[#2A2A3E] rounded w-full" />
      <div className="h-2.5 bg-[#2A2A3E] rounded w-2/3" />
    </div>
  );
}

function FilterPills({ options, value, onChange }: {
  options: { id: string; label: string }[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button key={opt.id} onClick={() => onChange(opt.id)}
          className={cn(
            'px-3 py-1.5 rounded-xl text-xs font-medium transition-all border',
            value === opt.id
              ? 'bg-[#C9A84C]/15 text-[#C9A84C] border-[#C9A84C]/30'
              : 'bg-[#12121A] text-[#9A9AB0] border-[#2A2A3E] hover:text-[#F0EDE8]'
          )}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}
