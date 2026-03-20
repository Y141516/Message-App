'use client';
import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Users, Shield, UserCheck, UserX,
  ChevronDown, CheckCircle2, MapPin, X, Check,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { useUserStore } from '@/store/userStore';
import { usePolling } from '@/hooks/usePolling';
import { cn, formatRelativeTime } from '@/lib/utils';
import toast from 'react-hot-toast';

type RoleFilter = 'all' | 'user' | 'leader' | 'admin';

export default function AdminUsersClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUserStore();

  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>((searchParams.get('role') as RoleFilter) || 'all');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!user) return;
    try {
      const params = new URLSearchParams({
        telegram_id: user.telegram_id,
        page: '0',
        ...(search && { search }),
        ...(roleFilter !== 'all' && { role: roleFilter }),
      });
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      if (err.message === 'Unauthorized') { router.replace('/home'); return; }
    } finally { setLoading(false); }
  }, [user, search, roleFilter]);

  usePolling(fetchUsers, [user?.telegram_id, search, roleFilter], { interval: 30000, enabled: !!user });

  const updateUser = async (targetId: string, updates: Record<string, any>) => {
    if (!user) return;
    setUpdating(targetId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: user.telegram_id, target_user_id: targetId, updates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('User updated');
      fetchUsers();
      setExpandedUser(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    } finally { setUpdating(null); }
  };

  const roleColor = (role: string) => ({
    admin: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    leader: 'text-gold bg-[#C9A84C]/10 border-[#C9A84C]/30',
    user: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  }[role] || 'text-gray-400 bg-gray-500/10 border-gray-500/30');

  return (
    <AppShell showNav={false}>
      <PageHeader title="Manage Users" subtitle={`${total} total`} showBack />

      <div className="px-4 pb-6 max-w-lg mx-auto space-y-3">

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, city, Telegram ID..."
            className="w-full rounded-2xl pl-10 pr-4 py-3 text-sm outline-none transition-all"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </button>
          )}
        </div>

        {/* Role filter */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'user', 'leader', 'admin'] as RoleFilter[]).map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all capitalize"
              style={{
                background: roleFilter === r ? 'var(--accent-gold)' : 'var(--bg-card)',
                color: roleFilter === r ? '#0A0A0F' : 'var(--text-secondary)',
                border: `1px solid ${roleFilter === r ? 'transparent' : 'var(--border-subtle)'}`,
              }}>
              {r}
            </button>
          ))}
        </div>

        {/* Users list */}
        {loading ? (
          <>{[0,1,2,3].map(i => <SkeletonRow key={i} />)}</>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No users found</p>
          </div>
        ) : (
          users.map((u, i) => {
            const groups = u.user_groups?.map((ug: any) => ug.groups?.name).filter(Boolean) || [];
            const isExpanded = expandedUser === u.id;
            return (
              <motion.div key={u.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--bg-card)', border: `1px solid ${!u.is_active ? 'rgba(224,82,82,0.3)' : 'var(--border-subtle)'}` }}>

                {/* Main row */}
                <button onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                  className="w-full flex items-center gap-3 p-4 text-left">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
                    style={{
                      background: !u.is_active ? 'rgba(224,82,82,0.1)' : 'rgba(201,168,76,0.12)',
                      color: !u.is_active ? '#E05252' : 'var(--accent-gold)',
                    }}>
                    {u.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{u.name}</p>
                      <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full border capitalize flex-shrink-0', roleColor(u.role))}>
                        {u.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {u.city && <span className="text-[10px] flex items-center gap-0.5" style={{ color: 'var(--text-muted)' }}>
                        <MapPin className="w-2.5 h-2.5" />{u.city}
                      </span>}
                      {groups[0] && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>· {groups[0]}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!u.is_active && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Inactive</span>}
                    <ChevronDown className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-180')}
                      style={{ color: 'var(--text-muted)' }} />
                  </div>
                </button>

                {/* Expanded actions */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                      style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <div className="p-4 space-y-3">
                        {/* Info */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <InfoItem label="Telegram ID" value={u.telegram_id} />
                          <InfoItem label="Joined" value={formatRelativeTime(u.created_at)} />
                          <InfoItem label="Phone" value={u.phone || 'Not provided'} />
                          <InfoItem label="Onboarded" value={u.onboarding_complete ? 'Yes' : 'No'} />
                        </div>

                        {groups.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {groups.map((g: string) => (
                              <span key={g} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(76,175,120,0.1)', color: '#4CAF78', border: '1px solid rgba(76,175,120,0.2)' }}>
                                <CheckCircle2 className="w-2.5 h-2.5" /> {g}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {/* Role buttons */}
                          {['user', 'leader', 'admin'].filter(r => r !== u.role).map(r => (
                            <ActionBtn key={r}
                              label={`Make ${r}`}
                              loading={updating === u.id}
                              color={r === 'leader' ? 'gold' : r === 'admin' ? 'purple' : 'blue'}
                              onClick={() => updateUser(u.id, { role: r })} />
                          ))}
                          {/* Toggle active */}
                          <ActionBtn
                            label={u.is_active ? 'Deactivate' : 'Activate'}
                            loading={updating === u.id}
                            color={u.is_active ? 'red' : 'green'}
                            onClick={() => updateUser(u.id, { is_active: !u.is_active })} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </AppShell>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{value}</p>
    </div>
  );
}

function ActionBtn({ label, loading, color, onClick }: {
  label: string; loading: boolean;
  color: 'gold' | 'blue' | 'purple' | 'green' | 'red'; onClick: () => void;
}) {
  const colors = {
    gold: 'rgba(201,168,76,0.1) border-[rgba(201,168,76,0.3)] var(--accent-gold)',
    blue: 'rgba(74,144,217,0.1) border-[rgba(74,144,217,0.3)] #4A90D9',
    purple: 'rgba(168,85,247,0.1) border-[rgba(168,85,247,0.3)] #a855f7',
    green: 'rgba(76,175,120,0.1) border-[rgba(76,175,120,0.3)] #4CAF78',
    red: 'rgba(224,82,82,0.1) border-[rgba(224,82,82,0.3)] #E05252',
  };
  const [bg, , textColor] = colors[color].split(' ');
  return (
    <button onClick={onClick} disabled={loading}
      className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all disabled:opacity-50 border"
      style={{ background: bg, color: textColor, borderColor: textColor + '50' }}>
      {loading ? '...' : label}
    </button>
  );
}

function SkeletonRow() {
  return (
    <div className="rounded-2xl p-4 animate-pulse" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl" style={{ background: 'var(--bg-elevated)' }} />
        <div className="flex-1 space-y-2">
          <div className="h-3 rounded w-32" style={{ background: 'var(--bg-elevated)' }} />
          <div className="h-2 rounded w-24" style={{ background: 'var(--bg-elevated)' }} />
        </div>
      </div>
    </div>
  );
}
