'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Plus, Trash2, Power, ChevronRight, X } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { useUserStore } from '@/store/userStore';
import { usePolling } from '@/hooks/usePolling';
import { cn, formatRelativeTime } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function AdminLeadersClient() {
  const router = useRouter();
  const { user } = useUserStore();
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignDisplayName, setAssignDisplayName] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchLeaders = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/admin/leaders?telegram_id=${user.telegram_id}`);
      const data = await res.json();
      if (!res.ok) { if (data.error === 'Unauthorized') { router.replace('/home'); return; } }
      setLeaders(data.leaders || []);
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  };

  usePolling(fetchLeaders, [user?.telegram_id], { interval: 30000, enabled: !!user });

  const fetchUsersForAssign = async () => {
    const res = await fetch(`/api/admin/users?telegram_id=${user!.telegram_id}&role=user&page=0`);
    const data = await res.json();
    setAllUsers(data.users || []);
  };

  const handleAssign = async () => {
    if (!selectedUserId || !assignDisplayName.trim()) { toast.error('Select a user and enter display name'); return; }
    setAssigning(true);
    try {
      const res = await fetch('/api/admin/leaders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: user!.telegram_id, user_id: selectedUserId, display_name: assignDisplayName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Leader assigned successfully');
      setShowAssign(false);
      setSelectedUserId(''); setAssignDisplayName(''); setAssignSearch('');
      fetchLeaders();
    } catch (e: any) { toast.error(e.message || 'Failed to assign leader'); }
    finally { setAssigning(false); }
  };

  const handleRemove = async (leaderId: string, userId: string, name: string) => {
    if (!confirm(`Remove leader role from ${name}?`)) return;
    setDeleting(leaderId);
    try {
      const res = await fetch('/api/admin/leaders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: user!.telegram_id, leader_id: leaderId, user_id: userId }),
      });
      if (!res.ok) throw new Error();
      setLeaders(prev => prev.filter(l => l.id !== leaderId));
      toast.success('Leader removed');
    } catch { toast.error('Failed to remove leader'); }
    finally { setDeleting(null); }
  };

  const filteredUsers = allUsers.filter(u =>
    u.name?.toLowerCase().includes(assignSearch.toLowerCase()) ||
    u.city?.toLowerCase().includes(assignSearch.toLowerCase())
  );

  return (
    <AppShell showNav={false}>
      <PageHeader title="Manage Leaders" subtitle={`${leaders.length} leaders`} showBack />

      <div className="px-4 pb-6 max-w-lg mx-auto space-y-3">

        {/* Assign new leader button */}
        <button onClick={() => { setShowAssign(true); fetchUsersForAssign(); }}
          className="w-full rounded-2xl p-4 flex items-center gap-3 transition-all"
          style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.15)' }}>
            <Plus className="w-4 h-4 text-gold" />
          </div>
          <span className="text-sm font-medium text-gold">Assign New Leader</span>
          <ChevronRight className="w-4 h-4 ml-auto text-gold" />
        </button>

        {/* Leaders list */}
        {loading ? (
          <>{[0,1].map(i => <SkeletonRow key={i} />)}</>
        ) : leaders.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <Shield className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No leaders assigned yet</p>
          </div>
        ) : (
          leaders.map((leader, i) => {
            const activeQueue = leader.queues?.find((q: any) => q.is_open);
            const userName = leader.users?.name;
            return (
              <motion.div key={leader.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-gold"
                    style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.2)' }}>
                    {leader.display_name?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{leader.display_name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{userName} · {leader.users?.city}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className={cn('flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border',
                      activeQueue ? 'bg-green-500/10 text-green-400 border-green-500/25' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]')}>
                      <Power className="w-2.5 h-2.5" />
                      {activeQueue ? 'Open' : 'Closed'}
                    </div>
                    <button onClick={() => handleRemove(leader.id, leader.users?.id, leader.display_name)}
                      disabled={deleting === leader.id}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 transition-all disabled:opacity-50"
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {activeQueue && (
                  <div className="rounded-xl px-3 py-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                    <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                      <span>Queue progress</span>
                      <span>{activeQueue.messages_received}/{activeQueue.message_limit}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                      <div className="h-full rounded-full bg-gradient-to-r from-[#C9A84C] to-[#E8C97A]"
                        style={{ width: `${Math.min(100, (activeQueue.messages_received / activeQueue.message_limit) * 100)}%` }} />
                    </div>
                  </div>
                )}
                <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
                  Leader since {formatRelativeTime(leader.created_at)}
                </p>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Assign Leader Sheet */}
      <AnimatePresence>
        {showAssign && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAssign(false)} className="fixed inset-0 bg-black/60 z-50" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl max-h-[80vh] flex flex-col"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div className="p-5 flex items-center justify-between flex-shrink-0">
                <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Assign Leader</h3>
                <button onClick={() => setShowAssign(false)} className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-5 pb-5 flex-1 overflow-y-auto space-y-3">
                {/* Display name input */}
                <div>
                  <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Display Name (e.g. "Rajesh ji")</p>
                  <input value={assignDisplayName} onChange={e => setAssignDisplayName(e.target.value)}
                    placeholder="Enter display name..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />
                </div>

                {/* User search */}
                <div>
                  <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Select User</p>
                  <input value={assignSearch} onChange={e => setAssignSearch(e.target.value)}
                    placeholder="Search users..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none mb-2"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />

                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {filteredUsers.map(u => (
                      <button key={u.id} onClick={() => setSelectedUserId(u.id)}
                        className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all')}
                        style={{
                          background: selectedUserId === u.id ? 'rgba(201,168,76,0.12)' : 'var(--bg-secondary)',
                          border: `1px solid ${selectedUserId === u.id ? 'rgba(201,168,76,0.3)' : 'var(--border-subtle)'}`,
                        }}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-gold flex-shrink-0"
                          style={{ background: 'rgba(201,168,76,0.1)' }}>
                          {u.name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{u.name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.city}</p>
                        </div>
                        {selectedUserId === u.id && <div className="w-4 h-4 rounded-full bg-[#C9A84C] flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={handleAssign} disabled={assigning || !selectedUserId || !assignDisplayName.trim()}
                  className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all bg-gradient-to-r from-[#C9A84C] to-[#E8C97A] text-[#0A0A0F] disabled:opacity-50">
                  {assigning ? 'Assigning...' : 'Assign as Leader'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AppShell>
  );
}

function SkeletonRow() {
  return (
    <div className="rounded-2xl p-4 flex items-center gap-3 animate-pulse" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      <div className="w-10 h-10 rounded-xl" style={{ background: 'var(--bg-elevated)' }} />
      <div className="flex-1 space-y-2">
        <div className="h-3 rounded w-28" style={{ background: 'var(--bg-elevated)' }} />
        <div className="h-2 rounded w-20" style={{ background: 'var(--bg-elevated)' }} />
      </div>
    </div>
  );
}
