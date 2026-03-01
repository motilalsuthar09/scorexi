'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import Link from 'next/link';
import { Trophy, Target, Star, Loader2, CheckCircle } from 'lucide-react';
import { cn, ballsToOvers } from '@/lib/utils';

type LeaderType = 'batting' | 'bowling' | 'allround';

export default function LeaderboardPage() {
  const [type, setType]       = useState<LeaderType>('batting');
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard?type=${type}&limit=25`)
      .then(r => r.json())
      .then(j => { if (j.success) setPlayers(j.data.players); })
      .finally(() => setLoading(false));
  }, [type]);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-white mb-1 flex items-center gap-2">
            <Trophy size={24} className="text-score-wide" /> Leaderboard
          </h1>
          <p className="text-slate-400 text-sm">Top performers across all matches</p>
        </div>

        {/* Type selector */}
        <div className="flex gap-1 p-1 bg-pitch-card rounded-xl border border-pitch-border mb-5">
          {([
            { val: 'batting',  label: '🏏 Batting',   },
            { val: 'bowling',  label: '⚾ Bowling',   },
            { val: 'allround', label: '⚡ All-round', },
          ] as const).map(t => (
            <button
              key={t.val}
              onClick={() => setType(t.val)}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-display font-semibold transition-all',
                type === t.val ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-brand-400" />
          </div>
        ) : players.length === 0 ? (
          <div className="card p-10 text-center">
            <Trophy size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No stats yet. Complete some matches!</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-pitch-border bg-pitch-dark/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-8">
                    #
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Player
                  </th>
                  {type === 'batting' && <>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">M</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Runs</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Avg</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">SR</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">HS</th>
                  </>}
                  {type === 'bowling' && <>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">M</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Wkts</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Eco</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Avg</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">BB</th>
                  </>}
                  {type === 'allround' && <>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Runs</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Wkts</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">M</th>
                  </>}
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => {
                  const dismissals = p.stats.matchesPlayed - p.stats.notOuts;
                  const avg = dismissals > 0 ? (p.stats.totalRuns / dismissals).toFixed(1) : p.stats.totalRuns;
                  const sr  = p.stats.totalBallsFaced > 0 ? ((p.stats.totalRuns / p.stats.totalBallsFaced) * 100).toFixed(1) : '—';
                  const overs = p.stats.totalBallsBowled > 0 ? (p.stats.totalBallsBowled / 6) : 0;
                  const eco = overs > 0 ? (p.stats.totalRunsConceded / overs).toFixed(2) : '—';
                  const bAvg = p.stats.totalWickets > 0 ? (p.stats.totalRunsConceded / p.stats.totalWickets).toFixed(1) : '—';
                  const bb  = p.stats.bestBowlingWickets > 0 ? `${p.stats.bestBowlingWickets}/${p.stats.bestBowlingRuns}` : '—';

                  return (
                    <tr key={p._id}
                      className={cn(
                        'border-t border-pitch-border/50 hover:bg-white/[0.02] transition-colors',
                        i < 3 && 'bg-brand-500/[0.02]'
                      )}>
                      {/* Rank */}
                      <td className="px-4 py-3">
                        {i === 0 ? <span className="text-lg">🥇</span>
                          : i === 1 ? <span className="text-lg">🥈</span>
                          : i === 2 ? <span className="text-lg">🥉</span>
                          : <span className="text-slate-500 text-sm tabular font-mono">{i + 1}</span>
                        }
                      </td>
                      {/* Name */}
                      <td className="px-4 py-3">
                        <Link href={`/player/${p._id}`} className="flex items-center gap-2 group">
                          <div className="w-8 h-8 bg-gradient-to-br from-brand-600 to-brand-400 rounded-lg
                                          flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {p.name[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="font-body text-sm text-white group-hover:text-brand-400 transition-colors">
                                {p.name}
                              </span>
                              {p.isClaimed && <CheckCircle size={10} className="text-brand-400" />}
                            </div>
                            {p.username && (
                              <span className="text-[10px] text-slate-500">@{p.username}</span>
                            )}
                          </div>
                        </Link>
                      </td>
                      {/* Batting cols */}
                      {type === 'batting' && <>
                        <td className="px-3 py-3 text-right text-sm text-slate-400 tabular">{p.stats.matchesPlayed}</td>
                        <td className="px-3 py-3 text-right font-display font-bold text-score-wide tabular">{p.stats.totalRuns}</td>
                        <td className="px-3 py-3 text-right text-sm text-slate-300 tabular hidden sm:table-cell">{avg}</td>
                        <td className="px-3 py-3 text-right text-sm text-slate-300 tabular hidden sm:table-cell">{sr}</td>
                        <td className="px-3 py-3 text-right text-sm text-slate-300 tabular">{p.stats.highestScore}</td>
                      </>}
                      {/* Bowling cols */}
                      {type === 'bowling' && <>
                        <td className="px-3 py-3 text-right text-sm text-slate-400 tabular">{p.stats.matchesPlayed}</td>
                        <td className="px-3 py-3 text-right font-display font-bold text-score-wicket tabular">{p.stats.totalWickets}</td>
                        <td className="px-3 py-3 text-right text-sm text-slate-300 tabular hidden sm:table-cell">{eco}</td>
                        <td className="px-3 py-3 text-right text-sm text-slate-300 tabular hidden sm:table-cell">{bAvg}</td>
                        <td className="px-3 py-3 text-right text-sm text-slate-300 tabular">{bb}</td>
                      </>}
                      {/* Allround cols */}
                      {type === 'allround' && <>
                        <td className="px-3 py-3 text-right font-display font-bold text-score-wide tabular">{p.stats.totalRuns}</td>
                        <td className="px-3 py-3 text-right font-display font-bold text-score-wicket tabular">{p.stats.totalWickets}</td>
                        <td className="px-3 py-3 text-right text-sm text-slate-400 tabular hidden sm:table-cell">{p.stats.matchesPlayed}</td>
                      </>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
