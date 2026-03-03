'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import Link from 'next/link';
import { Play, Trophy, Clock, Plus, Loader2, Trash2, RefreshCw, Zap, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatKeysParam, removeHostedMatch } from '@/lib/hostedMatches';

export default function MyMatchesPage() {
  const [matches,    setMatches]    = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (showSpin = false) => {
    if (showSpin) setRefreshing(true);
    const keys = formatKeysParam();
    if (!keys) { setMatches([]); setLoading(false); setRefreshing(false); return; }
    try {
      const res  = await fetch(`/api/matches/hosted?keys=${encodeURIComponent(keys)}`);
      const json = await res.json();
      if (json.success) setMatches(json.data.matches);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const handleRemove = (id: string) => {
    removeHostedMatch(id);
    setMatches(ms => ms.filter((m: any) => m._id.toString() !== id));
  };

  const STATUS: Record<string, { label: string; dot: string }> = {
    live:          { label: 'LIVE',       dot: 'bg-score-wicket animate-pulse' },
    innings_break: { label: 'Break',      dot: 'bg-score-wide' },
    setup:         { label: 'Setting up', dot: 'bg-slate-500'  },
    completed:     { label: 'Completed',  dot: 'bg-brand-500'  },
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-display font-bold text-2xl text-white">My Matches</h1>
            <p className="text-slate-400 text-sm">Resume or review matches you've hosted</p>
          </div>
          <button onClick={() => load(true)} className="btn-ghost p-2" title="Refresh">
            <RefreshCw size={15} className={cn(refreshing && 'animate-spin')} />
          </button>
        </div>

        {/* Quick start cards */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <Link href="/new-match/quick"
            className="card-hover p-4 flex items-center gap-3 border border-brand-500/20">
            <div className="w-9 h-9 bg-brand-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap size={16} className="text-brand-400" />
            </div>
            <div>
              <p className="font-display font-semibold text-white text-sm">Quick Match</p>
              <p className="text-slate-500 text-xs">Teams + toss only</p>
            </div>
          </Link>
          <Link href="/new-match"
            className="card-hover p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-pitch-border rounded-xl flex items-center justify-center flex-shrink-0">
              <Plus size={16} className="text-slate-300" />
            </div>
            <div>
              <p className="font-display font-semibold text-white text-sm">Full Match</p>
              <p className="text-slate-500 text-xs">Custom players</p>
            </div>
          </Link>
        </div>

        {/* Match list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-brand-400" />
          </div>
        ) : matches.length === 0 ? (
          <div className="card p-10 text-center">
            <AlertCircle size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="font-display font-bold text-white mb-1">No matches yet</p>
            <p className="text-slate-400 text-sm">
              Matches you create will appear here so you can always come back and resume.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Your matches</p>
            {matches.map((m: any) => {
              const cfg = STATUS[m.status] ?? STATUS.completed;
              const isLive = m.status === 'live' || m.status === 'innings_break';
              return (
                <div key={m._id} className={cn('card p-4 relative overflow-hidden',
                  isLive && 'border-brand-500/20')}>
                  {isLive && <div className="absolute inset-0 bg-live-pulse pointer-events-none opacity-40" />}
                  <div className="relative">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.dot)} />
                          <span className="text-xs text-slate-400 font-semibold">{cfg.label}</span>
                          {!m.isHost && <span className="text-xs text-slate-600">(viewer)</span>}
                        </div>
                        <h3 className="font-display font-bold text-white text-sm truncate">{m.title}</h3>
                        <p className="text-slate-500 text-xs">{m.totalOvers} overs</p>
                      </div>
                      {m.score && (
                        <div className="text-right flex-shrink-0">
                          <p className="text-[10px] text-slate-500">{m.score.team}</p>
                          <p className="font-display font-bold text-white text-xl tabular">
                            {m.score.runs}/{m.score.wickets}
                          </p>
                          <p className="text-slate-500 text-xs">({m.score.overs})</p>
                        </div>
                      )}
                    </div>

                    {m.result && (
                      <div className="mb-3 bg-brand-500/8 border border-brand-500/20 rounded-xl px-3 py-2">
                        <p className="text-brand-400 text-sm font-semibold">🏆 {m.result.summary}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {m.isHost && isLive ? (
                        <Link href={m.resumeUrl}
                          className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-2.5">
                          <Play size={14} /> Resume Scoring
                        </Link>
                      ) : (
                        <Link href={m.resumeUrl}
                          className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm py-2.5">
                          {m.status === 'completed' ? <Trophy size={14} /> : <Clock size={14} />}
                          {m.status === 'completed' ? 'View Scorecard' : 'Open Match'}
                        </Link>
                      )}
                      <button onClick={() => handleRemove(m._id.toString())}
                        title="Remove from list"
                        className="border border-pitch-border text-slate-500 p-2.5 rounded-xl
                                   hover:text-score-wicket hover:border-score-wicket/30 transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
