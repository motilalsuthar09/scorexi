'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  BarChart3, Users, Trophy, Activity,
  Loader2, Shield, Trash2, Eye, Lock
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Stats {
  totalMatches:    number;
  liveMatches:     number;
  totalPlayers:    number;
  claimedPlayers:  number;
  totalBalls:      number;
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router            = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    Promise.all([
      fetch('/api/admin/stats').then(r => r.json()),
      fetch('/api/matches?limit=20').then(r => r.json()),
    ]).then(([s, m]) => {
      if (s.success) setStats(s.data);
      if (m.success) setMatches(m.data.items);
    }).finally(() => setFetching(false));
  }, [user]);

  const forceComplete = async (matchId: string) => {
    await fetch(`/api/match/${matchId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'no_result' }),
    });
    setMatches(ms => ms.map(m => m._id === matchId ? { ...m, status: 'completed' } : m));
  };

  if (loading || fetching) return (
    <AppShell>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="animate-spin text-brand-400" />
      </div>
    </AppShell>
  );

  if (!user || user.role !== 'admin') return null;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-score-wicket/20 border border-score-wicket/30 rounded-xl
                          flex items-center justify-center">
            <Shield size={18} className="text-score-wicket" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-white">Admin Dashboard</h1>
            <p className="text-slate-400 text-sm">Manage matches, users, platform stats</p>
          </div>
        </div>

        {/* Stats grid */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {[
              { label: 'Total Matches',   value: stats.totalMatches,   icon: Trophy,   color: 'text-score-wide' },
              { label: 'Live Now',        value: stats.liveMatches,    icon: Activity, color: 'text-score-wicket' },
              { label: 'Total Players',   value: stats.totalPlayers,   icon: Users,    color: 'text-brand-400' },
              { label: 'Claimed Profiles',value: stats.claimedPlayers, icon: Shield,   color: 'text-score-four' },
              { label: 'Balls Bowled',    value: stats.totalBalls,     icon: BarChart3,color: 'text-score-six' },
            ].map(s => (
              <div key={s.label} className="card p-4 text-center">
                <s.icon size={16} className={cn('mx-auto mb-1', s.color)} />
                <p className={cn('font-display font-bold text-2xl tabular', s.color)}>{s.value}</p>
                <p className="text-slate-500 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        )}

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
                  <th className="px-3 py-2.5 text-xs text-slate-500 font-semibold uppercase text-center">Visibility</th>
                  <th className="px-3 py-2.5 text-xs text-slate-500 font-semibold uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {matches.map(m => (
                  <tr key={m._id} className="border-t border-pitch-border/50 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <p className="text-sm text-white font-body">
                        {m.title || `${m.teamA.name} vs ${m.teamB.name}`}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(m.createdAt).toLocaleDateString('en-IN')} · {m.totalOvers} ov
                      </p>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full border',
                        m.status === 'live'
                          ? 'text-score-wicket border-score-wicket/30 bg-score-wicket/10'
                          : m.status === 'completed'
                          ? 'text-brand-400 border-brand-500/30 bg-brand-500/10'
                          : 'text-slate-400 border-pitch-border'
                      )}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={cn(
                        'text-xs',
                        m.visibility === 'public' ? 'text-brand-400' : 'text-slate-500'
                      )}>
                        {m.visibility === 'public' ? '🌍 Public' : '🔒 Private'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/match/${m._id}`} className="btn-ghost p-1.5">
                          <Eye size={13} />
                        </Link>
                        {m.status === 'live' && (
                          <button
                            onClick={() => forceComplete(m._id)}
                            className="btn-ghost p-1.5 text-score-wide hover:text-score-wide"
                            title="Force complete"
                          >
                            <Lock size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
