// src/app/leaderboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import Link from 'next/link';
import {
  Trophy, Target, Star, Loader2, CheckCircle,
  ChevronDown, Globe, Hash,
} from 'lucide-react';
import { cn, ballsToOvers } from '@/lib/utils';

type LeaderType = 'batting' | 'bowling' | 'allround';

interface MatchOption {
  _id:     string;
  title?:  string;
  teamA:   { name: string };
  teamB:   { name: string };
  status:  string;
}

export default function LeaderboardPage() {
  const [type,       setType]       = useState<LeaderType>('batting');
  const [players,    setPlayers]    = useState<any[]>([]);
  const [loading,    setLoading]    = useState(false);

  // Scope dropdown
  const [scope,      setScope]      = useState<'all' | string>('all');
  const [matches,    setMatches]    = useState<MatchOption[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [dropOpen,   setDropOpen]   = useState(false);

  // Load completed/live matches for dropdown
  useEffect(() => {
    setMatchesLoading(true);
    fetch('/api/matches?limit=50')
      .then(r => r.json())
      .then(j => { if (j.success) setMatches(j.data.items ?? []); })
      .finally(() => setMatchesLoading(false));
  }, []);

  // Load leaderboard data
  useEffect(() => {
    setLoading(true);
    const url = `/api/leaderboard?type=${type}&limit=25${scope !== 'all' ? `&matchId=${scope}` : ''}`;
    fetch(url)
      .then(r => r.json())
      .then(j => { if (j.success) setPlayers(j.data.players); })
      .finally(() => setLoading(false));
  }, [type, scope]);

  const selectedMatch = scope === 'all' ? null : matches.find(m => m._id === scope);
  const scopeLabel = selectedMatch
    ? (selectedMatch.title ?? `${selectedMatch.teamA.name} vs ${selectedMatch.teamB.name}`)
    : 'Global — All Matches';

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="mb-5">
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-white mb-1 flex items-center gap-2">
            <Trophy size={24} className="text-score-wide" /> Leaderboard
          </h1>
          <p className="text-slate-400 text-sm">Top performers across matches</p>
        </div>

        {/* ── Scope dropdown ─────────────────────────────────── */}
        <div className="relative mb-4">
          <button
            onClick={() => setDropOpen(o => !o)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl
                       border border-pitch-border bg-pitch-card text-sm font-semibold text-white
                       hover:border-brand-500/50 transition-all"
          >
            <div className="flex items-center gap-2">
              {scope === 'all'
                ? <Globe size={14} className="text-brand-400" />
                : <Hash  size={14} className="text-brand-400" />
              }
              <span className="truncate">{scopeLabel}</span>
            </div>
            <ChevronDown size={14} className={cn('text-slate-400 transition-transform flex-shrink-0',
              dropOpen && 'rotate-180')} />
          </button>

          {dropOpen && (
            <div className="absolute z-30 left-0 right-0 top-full mt-1 card p-1.5 shadow-xl
                            border border-pitch-border max-h-64 overflow-y-auto">
              {/* Global option */}
              <button
                onClick={() => { setScope('all'); setDropOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-left transition-colors',
                  scope === 'all'
                    ? 'bg-brand-500/15 text-brand-400 font-semibold'
                    : 'text-slate-300 hover:bg-white/5'
                )}
              >
                <Globe size={13} />
                <div>
                  <p className="font-semibold">Global — All Matches</p>
                  <p className="text-[10px] text-slate-500">Career stats across every match</p>
                </div>
              </button>

              {matches.length > 0 && (
                <div className="my-1 border-t border-pitch-border/50 pt-1">
                  <p className="text-[10px] text-slate-600 px-3 py-1 uppercase tracking-wider">
                    Single Match
                  </p>
                  {matches.map(m => {
                    const label = m.title ?? `${m.teamA.name} vs ${m.teamB.name}`;
                    return (
                      <button
                        key={m._id}
                        onClick={() => { setScope(m._id); setDropOpen(false); }}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-left transition-colors',
                          scope === m._id
                            ? 'bg-brand-500/15 text-brand-400 font-semibold'
                            : 'text-slate-300 hover:bg-white/5'
                        )}
                      >
                        <Hash size={12} className="flex-shrink-0 text-slate-500" />
                        <div className="min-w-0">
                          <p className="truncate">{label}</p>
                          <p className="text-[10px] text-slate-500 capitalize">{m.status}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {matchesLoading && (
                <div className="flex justify-center py-3">
                  <Loader2 size={16} className="animate-spin text-slate-500" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Type tabs ──────────────────────────────────────── */}
        <div className="flex gap-1 p-1 bg-pitch-card rounded-xl border border-pitch-border mb-5">
          {([
            { val: 'batting',  label: '🏏 Batting'   },
            { val: 'bowling',  label: '⚾ Bowling'   },
            { val: 'allround', label: '⚡ All-round' },
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

        {/* ── Table ─────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-brand-400" />
          </div>
        ) : players.length === 0 ? (
          <div className="card p-10 text-center">
            <Trophy size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">
              {scope === 'all'
                ? 'No stats yet. Complete some matches!'
                : 'No data for this match yet.'}
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-pitch-border bg-pitch-dark/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-8">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Player</th>

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
                  const dismissals = (p.stats.matchesPlayed ?? 1) - (p.stats.notOuts ?? 0);
                  const avg = dismissals > 0
                    ? (p.stats.totalRuns / dismissals).toFixed(1)
                    : p.stats.totalRuns ?? '—';
                  const sr  = p.stats.totalBallsFaced > 0
                    ? ((p.stats.totalRuns / p.stats.totalBallsFaced) * 100).toFixed(1)
                    : '—';
                  const overs = (p.stats.totalBallsBowled ?? 0) / 6;
                  const eco   = overs > 0
                    ? (p.stats.totalRunsConceded / overs).toFixed(2)
                    : '—';
                  const bAvg  = p.stats.totalWickets > 0
                    ? ((p.stats.totalRunsConceded ?? p.stats.runs ?? 0) / p.stats.totalWickets).toFixed(1)
                    : '—';
                  const bb    = p.stats.bestBowlingWickets > 0
                    ? `${p.stats.bestBowlingWickets}/${p.stats.bestBowlingRuns}`
                    : (p.stats.totalWickets > 0 ? `${p.stats.totalWickets}/${p.stats.totalRunsConceded ?? '?'}` : '—');

                  return (
                    <tr
                      key={p._id?.toString()}
                      className={cn(
                        'border-t border-pitch-border/50 hover:bg-white/[0.02] transition-colors',
                        i < 3 && 'bg-brand-500/[0.02]'
                      )}
                    >
                      {/* Rank */}
                      <td className="px-4 py-3">
                        {i === 0 ? <span className="text-lg">🥇</span>
                          : i === 1 ? <span className="text-lg">🥈</span>
                          : i === 2 ? <span className="text-lg">🥉</span>
                          : <span className="text-slate-500 text-sm tabular font-mono">{i + 1}</span>
                        }
                      </td>

                      {/* Player name */}
                      <td className="px-4 py-3">
                        <Link href={`/player/${p._id}`} className="flex items-center gap-2 group">
                          <div className="w-8 h-8 bg-gradient-to-br from-brand-600 to-brand-400 rounded-lg
                                          flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {(p.name ?? '?')[0].toUpperCase()}
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

                      {/* Batting stats */}
                      {type === 'batting' && <>
                        <td className="px-3 py-3 text-right text-sm text-slate-400 tabular">
                          {p.stats.matchesPlayed ?? 1}
                        </td>
                        <td className="px-3 py-3 text-right font-display font-bold text-score-wide tabular">
                          {p.stats.totalRuns}
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-slate-300 tabular hidden sm:table-cell">
                          {avg}
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-slate-300 tabular hidden sm:table-cell">
                          {sr}
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-slate-300 tabular">
                          {p.stats.highestScore ?? p.stats.totalRuns}
                        </td>
                      </>}

                      {/* Bowling stats */}
                      {type === 'bowling' && <>
                        <td className="px-3 py-3 text-right text-sm text-slate-400 tabular">
                          {p.stats.matchesPlayed ?? 1}
                        </td>
                        <td className="px-3 py-3 text-right font-display font-bold text-score-wicket tabular">
                          {p.stats.totalWickets}
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-slate-300 tabular hidden sm:table-cell">
                          {eco}
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-slate-300 tabular hidden sm:table-cell">
                          {bAvg}
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-slate-300 tabular">
                          {bb}
                        </td>
                      </>}

                      {/* All-round stats */}
                      {type === 'allround' && <>
                        <td className="px-3 py-3 text-right font-display font-bold text-score-wide tabular">
                          {p.stats.totalRuns}
                        </td>
                        <td className="px-3 py-3 text-right font-display font-bold text-score-wicket tabular">
                          {p.stats.totalWickets}
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-slate-400 tabular hidden sm:table-cell">
                          {p.stats.matchesPlayed ?? 1}
                        </td>
                      </>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Scope note */}
        <p className="text-center text-slate-600 text-xs mt-4">
          {scope === 'all'
            ? 'Showing career stats from all completed matches'
            : `Showing stats for this match only`}
        </p>
      </div>
    </AppShell>
  );
}