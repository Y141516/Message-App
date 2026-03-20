'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Map, Users, ChevronDown, X } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { useUserStore } from '@/store/userStore';
import { usePolling } from '@/hooks/usePolling';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function AdminGroupsClient() {
  const router = useRouter();
  const { user } = useUserStore();
  const [groups, setGroups] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showAddMapping, setShowAddMapping] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newTgId, setNewTgId] = useState('');
  const [newTgName, setNewTgName] = useState('');
  const [newInternalGroup, setNewInternalGroup] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchGroups = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/admin/groups?telegram_id=${user.telegram_id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGroups(data.groups || []);
      setMappings(data.mappings || []);
    } catch (err: any) {
      if (err.message === 'Unauthorized') router.replace('/home');
    } finally { setLoading(false); }
  };

  usePolling(fetchGroups, [user?.telegram_id], { interval: 60000, enabled: !!user });

  const createGroup = async () => {
    if (!newGroupName.trim()) { toast.error('Enter a group name'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: user!.telegram_id, action: 'create_group', name: newGroupName.trim(), description: newGroupDesc.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Group created!');
      setNewGroupName(''); setNewGroupDesc(''); setShowAddGroup(false);
      fetchGroups();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const addMapping = async () => {
    if (!newTgId.trim() || !newTgName.trim() || !newInternalGroup) { toast.error('Fill all fields'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: user!.telegram_id, action: 'add_mapping',
          telegram_group_id: newTgId.trim(), telegram_group_name: newTgName.trim(),
          internal_group_id: newInternalGroup,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Mapping added!');
      setNewTgId(''); setNewTgName(''); setNewInternalGroup(''); setShowAddMapping(false);
      fetchGroups();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const deleteItem = async (action: string, id: string) => {
    try {
      await fetch('/api/admin/groups', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: user!.telegram_id, action, id }),
      });
      toast.success('Deleted');
      fetchGroups();
    } catch { toast.error('Delete failed'); }
  };

  return (
    <AppShell showNav={false}>
      <PageHeader title="Manage Groups" showBack />
      <div className="px-4 pb-6 max-w-lg mx-auto space-y-4">

        {/* Internal Groups Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Internal Groups</p>
            <button onClick={() => setShowAddGroup(!showAddGroup)}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl transition-all"
              style={{ background: 'rgba(201,168,76,0.1)', color: 'var(--accent-gold)', border: '1px solid rgba(201,168,76,0.3)' }}>
              <Plus className="w-3 h-3" /> Add Group
            </button>
          </div>

          <AnimatePresence>
            {showAddGroup && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="rounded-2xl p-4 mb-3 overflow-hidden space-y-3"
                style={{ background: 'var(--bg-card)', border: '1px solid rgba(201,168,76,0.3)' }}>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>New Internal Group</p>
                <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                  placeholder="Group name (e.g. BR Members)"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />
                <input value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />
                <div className="flex gap-2">
                  <button onClick={() => setShowAddGroup(false)} className="flex-1 py-2.5 rounded-xl text-sm"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Cancel</button>
                  <button onClick={createGroup} disabled={saving}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                    style={{ background: 'var(--accent-gold)', color: '#0A0A0F' }}>
                    {saving ? 'Saving...' : 'Create'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {loading ? <>{[0,1].map(i => <SkeletonRow key={i} />)}</> : (
            <div className="space-y-2">
              {groups.map(g => (
                <div key={g.id} className="flex items-center gap-3 rounded-2xl p-4"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(76,175,120,0.1)', color: '#4CAF78' }}>
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{g.name}</p>
                    {g.description && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{g.description}</p>}
                  </div>
                  <button onClick={() => deleteItem('delete_group', g.id)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {groups.length === 0 && <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No groups yet</p>}
            </div>
          )}
        </div>

        {/* Telegram Mappings Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Telegram → Internal Mappings</p>
            <button onClick={() => setShowAddMapping(!showAddMapping)}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl transition-all"
              style={{ background: 'rgba(74,144,217,0.1)', color: '#4A90D9', border: '1px solid rgba(74,144,217,0.3)' }}>
              <Plus className="w-3 h-3" /> Add Mapping
            </button>
          </div>

          <AnimatePresence>
            {showAddMapping && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="rounded-2xl p-4 mb-3 overflow-hidden space-y-3"
                style={{ background: 'var(--bg-card)', border: '1px solid rgba(74,144,217,0.3)' }}>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>New Telegram Mapping</p>
                <input value={newTgId} onChange={e => setNewTgId(e.target.value)}
                  placeholder="Telegram Group ID (e.g. -1001234567890)"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none font-mono"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />
                <input value={newTgName} onChange={e => setNewTgName(e.target.value)}
                  placeholder="Telegram Group Name (e.g. BR MARCH 2026)"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />
                <select value={newInternalGroup} onChange={e => setNewInternalGroup(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: newInternalGroup ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  <option value="">Select internal group...</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  💡 To find a Telegram Group ID: add the bot to the group, send a message, then visit
                  api.telegram.org/bot&#123;TOKEN&#125;/getUpdates
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setShowAddMapping(false)} className="flex-1 py-2.5 rounded-xl text-sm"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Cancel</button>
                  <button onClick={addMapping} disabled={saving}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                    style={{ background: '#4A90D9', color: '#fff' }}>
                    {saving ? 'Saving...' : 'Add Mapping'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {loading ? <>{[0,1,2].map(i => <SkeletonRow key={i} />)}</> : (
            <div className="space-y-2">
              {mappings.map(m => (
                <div key={m.id} className="rounded-2xl p-4"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: 'rgba(74,144,217,0.1)', color: '#4A90D9' }}>
                      <Map className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{m.telegram_group_name}</p>
                      <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>{m.telegram_group_id}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>→</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(76,175,120,0.1)', color: '#4CAF78', border: '1px solid rgba(76,175,120,0.2)' }}>
                          {m.groups?.name || 'Unknown group'}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => deleteItem('delete_mapping', m.id)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {mappings.length === 0 && <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No mappings yet. Add your Telegram group mappings above.</p>}
            </div>
          )}
        </div>

      </div>
    </AppShell>
  );
}

function SkeletonRow() {
  return (
    <div className="rounded-2xl p-4 animate-pulse" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl" style={{ background: 'var(--bg-elevated)' }} />
        <div className="flex-1 space-y-2">
          <div className="h-3 rounded w-36" style={{ background: 'var(--bg-elevated)' }} />
          <div className="h-2 rounded w-24" style={{ background: 'var(--bg-elevated)' }} />
        </div>
      </div>
    </div>
  );
}
