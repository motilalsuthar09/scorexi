'use client';
// src/app/admin/page.tsx
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  BarChart3, Users, Trophy, Activity, Loader2,
  Shield, Trash2, Eye, Lock, Search, Ban,
  CheckCircle, TrendingUp, UserCheck,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface DailyCount { date: string; count: number }
interface Stats {
  totalMatches: number; liveMatches: number; completedMatches: number;
  totalPlayers: number; claimedPlayers: number; totalBalls: number;
  totalUsers: number; usersThisWeek: number; matchesThisWeek: number;
  dailyMatchCounts: DailyCount[]; topPlayers: any[];
}

function MiniBarChart({ data }: { data: DailyCount[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Matches — Last 7 Days</p>
      <div className="flex items-end gap-2 h-24">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            {d.count > 0 && <span className="text-[10px] text-slate-500">{d.count}</span>}
            <div
              className="w-full rounded-t bg-brand-500 transition-all"
              style={{ height: `${Math.max((d.count / max) * 72, d.count > 0 ? 4 : 2)}px` }}
            />
            <span className="text-[9px] text-slate-600">{d.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfirmBanner({ msg, onConfirm, onCancel }: { msg: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-x-4 bottom-6 z-50 max-w-sm mx-auto card border-score-wicket/40 bg-pitch-dark p-4 shadow-xl">
      <p className="text-sm text-white mb-3">{msg}</p>
      <div className="flex gap-2">
        <button onClick={onCancel} className="btn-secondary flex-1 py-2 text-xs">Cancel</button>
        <button onClick={onConfirm} className="flex-1 py-2 text-xs rounded-xl bg-score-wicket text-white font-display font-semibold">Confirm</button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [confirm, setConfirm] = useState<{ msg: string; fn: () => void } | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.push('/');
  }, [user, loading, router]);

  const fetchData = useCallback(async () => {
    if (!user || user.role !== 'admin') return;
    const [s, m] = await Promise.all([
      fetch('/api/admin/stats').then(r => r.json()),
      fetch('/api/matches?limit=20').then(r => r.json()),
    ]);
    if (s.success) setStats(s.data);
    if (m.success) setMatches(m.data.items);
    setFetching(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (userQuery.length < 2) { setUserResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(userQuery)}`);
      const json = await res.json();
      if (json.success) setUserResults(json.data.users);
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [userQuery]);

  const deleteMatch = (matchId: string) => {
    setConfirm({
      msg: 'Delete this match? All ball data will be removed.',
      fn: async () => {
        await fetch(`/api/match/${matchId}`, { method: 'DELETE' });
        setMatches(ms => ms.filter(m => m._id !== matchId));
        setConfirm(null);
      },
    });
  };

  const forceComplete = (matchId: string) => {
    setConfirm({
      msg: 'Force-complete this live match?',
      fn: async () => {
        await fetch(`/api/match/${matchId}/complete`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'no_result' }),
        });
        setMatches(ms => ms.map(m => m._id === matchId ? { ...m, status: 'completed' } : m));
        setConfirm(null);
      },
    });
  };

  const toggleBan = (userId: string, isBanned: boolean) => {
    setConfirm({
      msg: `${isBanned ? 'Unban' : 'Ban'} this user?`,
      fn: async () => {
        await fetch(`/api/admin/users/${userId}/ban`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ban: !isBanned }),
        });
        setUserResults(r => r.map(u => u._id === userId ? { ...u, isBanned: !isBanned } : u));
        setConfirm(null);
      },
    });
  };

  if (loading || fetching) return (
    <AppShell><div className="flex items-center justify-center min-h-[60vh]"><Loader2 size={28} className="animate-spin text-brand-400" /></div></AppShell>
  );
  if (!user || user.role !== 'admin') return null;

  const statCards = [
    { label: 'Total Matches',  value: stats?.totalMatches,   icon: Trophy,    color: 'text-score-wide'   },
    { label: 'Live Now',        value: stats?.liveMatches,    icon: Activity,  color: 'text-score-wicket' },
    { label: 'Players',         value: stats?.totalPlayers,   icon: Users,     color: 'text-brand-400'    },
    { label: 'Users',           value: stats?.totalUsers,     icon: UserCheck, color: 'text-score-four'   },
    { label: 'Claimed',         value: stats?.claimedPlayers, icon: Shield,    color: 'text-brand-300'    },
    { label: 'Balls Bowled',    value: stats?.totalBalls,     icon: BarChart3, color: 'text-score-six'    },
    { label: 'New Users (7d)',  value: stats?.usersThisWeek,  icon: TrendingUp,color: 'text-score-wide'   },
    { label: 'Matches (7d)',    value: stats?.matchesThisWeek,icon: Activity,  color: 'text-brand-400'    },
  ];

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-score-wicket/20 border border-score-wicket/30 rounded-xl flex items-center justify-center">
            <Shield size={18} className="text-score-wicket" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-white">Admin Dashboard</h1>
            <p className="text-slate-400 text-sm">Manage matches, users, platform stats</p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {statCards.map(s => (
            <div key={s.label} className="card p-4 text-center">
              <s.icon size={15} className={cn('mx-auto mb-1', s.color)} />
              <p className={cn('font-display font-bold text-xl tabular', s.color)}>{s.value?.toLocaleString() ?? '—'}</p>
              <p className="text-slate-500 text-[11px] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* 7-day bar chart */}
        {stats?.dailyMatchCounts && (
          <div className="card p-4 mb-6"><MiniBarChart data={stats.dailyMatchCounts} /></div>
        )}

        {/* Top players */}
        {stats?.topPlayers && stats.topPlayers.length > 0 && (
          <div className="card p-4 mb-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Top Players</p>
            <div className="space-y-2">
              {stats.topPlayers.map((p: any, i: number) => (
                <div key={p._id} className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 w-4 text-right font-display">{i+1}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <Link href={`/player/${p._id}`} className="text-sm font-display font-semibold text-white hover:text-brand-400 transition-colors">{p.name}</Link>
                    {p.isClaimed && <CheckCircle size={11} className="text-brand-400" />}
                  </div>
                  <span className="text-xs text-slate-500">{p.stats.matchesPlayed}m · {p.stats.totalRuns}r · {p.stats.totalWickets}w</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User search */}
        <div className="card p-4 mb-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">User Search</p>
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            {searching && <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 animate-spin" />}
            <input
              type="text" value={userQuery} onChange={e => setUserQuery(e.target.value)}
              placeholder="Search name or email…" className="input-field pl-9 text-sm"
            />
          </div>
          {userResults.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-pitch-border">
                    <th className="text-left py-2 font-semibold">User</th>
                    <th className="text-center py-2 font-semibold">Role</th>
                    <th className="text-center py-2 font-semibold">Status</th>
                    <th className="text-right py-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {userResults.map((u: any) => (
                    <tr key={u._id} className="border-t border-pitch-border/40">
                      <td className="py-2.5">
                        <p className="font-semibold text-white">{u.name}</p>
                        <p className="text-slate-500">{u.email}</p>
                      </td>
                      <td className="text-center py-2.5">
                        <span className={cn('px-2 py-0.5 rounded-full border text-[10px] font-semibold',
                          u.role === 'admin' ? 'text-score-wicket border-score-wicket/30 bg-score-wicket/10' : 'text-slate-400 border-pitch-border'
                        )}>{u.role}</span>
                      </td>
                      <td className={cn('text-center py-2.5 text-[10px] font-semibold', u.isBanned ? 'text-score-wicket' : 'text-brand-400')}>
                        {u.isBanned ? 'Banned' : 'Active'}
                      </td>
                      <td className="text-right py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          {u.claimedPlayerId && (
                            <Link href={`/player/${u.claimedPlayerId}`} className="btn-ghost p-1.5"><Eye size={13} /></Link>
                          )}
                          {u.role !== 'admin' && (
                            <button onClick={() => toggleBan(u._id, u.isBanned)} className={cn('btn-ghost p-1.5', u.isBanned ? 'text-brand-400' : 'text-score-wicket')} title={u.isBanned ? 'Unban' : 'Ban'}>
                              <Ban size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {userQuery.length >= 2 && !searching && userResults.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-4">No users found.</p>
          )}
        </div>

        {/* Matches table */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-pitch-border flex items-center justify-between">
            <h2 className="font-display font-bold text-white">All Matches</h2>
            <span className="text-slate-500 text-xs">{matches.length} shown</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-pitch-border bg-pitch-dark/50">
                  <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-semibold uppercase tracking-wider">Match</th>
                  <th className="px-3 py-2.5 text-xs text-slate-500 font-semibold uppercase text-center">Status</th>
                  <th className="px-3 py-2.5 text-xs text-slate-500 font-semibold uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {matches.map(m => (
                  <tr key={m._id} className="border-t border-pitch-border/50 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <p className="text-sm text-white font-body">{m.title || `${m.teamA.name} vs ${m.teamB.name}`}</p>
                      <p className="text-xs text-slate-500">{new Date(m.createdAt).toLocaleDateString('en-IN')} · {m.totalOvers}ov</p>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border',
                        m.status === 'live'      ? 'text-score-wicket border-score-wicket/30 bg-score-wicket/10' :
                        m.status === 'completed' ? 'text-brand-400 border-brand-500/30 bg-brand-500/10' :
                                                   'text-slate-400 border-pitch-border'
                      )}>{m.status}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/match/${m._id}`} className="btn-ghost p-1.5"><Eye size={13} /></Link>
                        {m.status === 'live' && (
                          <button onClick={() => forceComplete(m._id)} className="btn-ghost p-1.5 text-score-wide" title="Force complete"><Lock size={13} /></button>
                        )}
                        <button onClick={() => deleteMatch(m._id)} className="btn-ghost p-1.5 text-score-wicket" title="Delete"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {confirm && <ConfirmBanner msg={confirm.msg} onConfirm={confirm.fn} onCancel={() => setConfirm(null)} />}
    </AppShell>
  );
}
