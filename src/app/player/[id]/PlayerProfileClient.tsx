'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  Loader2, AlertCircle, Shield, ArrowLeft,
  Trophy, Target, Zap, Star, TrendingUp, CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props { id: string }

export default function PlayerProfileClient({ id }: Props) {
  const { user }  = useAuth();
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState('');
  const [tab, setTab]           = useState<'batting' | 'bowling' | 'matches'>('batting');

  useEffect(() => {
    fetch(`/api/player/${id}`)
      .then(r => r.json())
      .then(j => { if (j.success) setData(j.data); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleClaim = async () => {
    setClaiming(true);
    const res  = await fetch(`/api/player/${id}/claim`, { method: 'POST' });
    const json = await res.json();
    if (json.success) {
      setClaimMsg('Profile claimed! Your stats are now linked.');
      setData((d: any) => ({ ...d, player: { ...d.player, isClaimed: true } }));
    } else {
      setClaimMsg(json.error || 'Claim failed');
    }
    setClaiming(false);
  };

  if (loading) return (
    <AppShell>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="animate-spin text-brand-400" />
      </div>
    </AppShell>
  );

  if (!data) return (
    <AppShell>
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <AlertCircle size={36} className="text-score-wicket mx-auto mb-3" />
        <p className="text-white font-display font-bold text-xl mb-2">Player Not Found</p>
        <Link href="/players" className="btn-secondary mt-3 inline-block">← Players</Link>
      </div>
    </AppShell>
  );

  const { player, derived, recentMatches } = data;
  const { batting, bowling } = derived;

  const isOwner = user?.claimedPlayerId === id || user?.claimedPlayerId === player._id;
  const canClaim = user && !user.isGuest && !player.isClaimed && !user.claimedPlayerId;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-5">

        {/* Back */}
        <Link href="/players" className="btn-ghost flex items-center gap-1.5 text-sm mb-4 w-fit">
          <ArrowLeft size={15} /> Players
        </Link>

        {/* Profile header */}
        <div className="card p-5 mb-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-live-pulse pointer-events-none opacity-50" />
          <div className="relative flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 bg-gradient-to-br from-brand-600 to-brand-400 rounded-2xl
                            flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-500/30">
              <span className="font-display font-bold text-white text-2xl">
                {player.name[0].toUpperCase()}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display font-bold text-xl sm:text-2xl text-white">
                  {player.name}
                </h1>
                {player.isClaimed && (
                  <span className="inline-flex items-center gap-1 text-brand-400 text-xs
                                   bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded-full">
                    <CheckCircle size={10} /> Verified
                  </span>
                )}
                {isOwner && (
                  <span className="inline-flex items-center gap-1 text-score-wide text-xs
                                   bg-score-wide/10 border border-score-wide/20 px-2 py-0.5 rounded-full">
                    <Shield size={10} /> You
                  </span>
                )}
              </div>
              {player.username && (
                <p className="text-slate-400 text-sm mt-0.5">@{player.username}</p>
              )}
              <p className="text-slate-500 text-xs mt-1">
                {player.stats.matchesPlayed} matches played
              </p>
            </div>

            {/* Edit button for owner */}
            {isOwner && (
              <Link href="/profile" className="btn-secondary py-1.5 px-3 text-xs flex-shrink-0">
                Edit Profile
              </Link>
            )}
          </div>

          {/* Claim CTA */}
          {canClaim && (
            <div className="mt-4 p-3 bg-score-wide/10 border border-score-wide/25 rounded-xl">
              <p className="text-sm text-white font-semibold mb-1">Is this you?</p>
              <p className="text-xs text-slate-400 mb-2">
                Claim this profile to own your stats and career history.
              </p>
              {claimMsg ? (
                <p className={cn('text-sm font-semibold',
                  claimMsg.includes('claimed') ? 'text-brand-400' : 'text-score-wicket'
                )}>{claimMsg}</p>
              ) : (
                <button onClick={handleClaim} disabled={claiming}
                  className="btn-primary py-1.5 px-4 text-sm flex items-center gap-1.5">
                  {claiming
                    ? <><Loader2 size={14} className="animate-spin" /> Claiming...</>
                    : <><CheckCircle size={14} /> Claim Profile</>
                  }
                </button>
              )}
            </div>
          )}

          {!user && !player.isClaimed && (
            <div className="mt-4 p-3 bg-pitch-border/50 rounded-xl flex items-center justify-between">
              <p className="text-xs text-slate-400">This profile is unclaimed.</p>
              <Link href={`/auth/register?claim=${id}`}
                className="text-brand-400 text-xs font-semibold hover:text-brand-300">
                Claim it →
              </Link>
            </div>
          )}
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Runs',      value: player.stats.totalRuns,    icon: Trophy,    color: 'text-score-wide' },
            { label: 'Wickets',   value: player.stats.totalWickets, icon: Target,    color: 'text-score-wicket' },
            { label: 'Best Score',value: player.stats.highestScore, icon: Star,      color: 'text-score-six' },
            { label: 'Matches',   value: player.stats.matchesPlayed,icon: TrendingUp, color: 'text-brand-400' },
          ].map(s => (
            <div key={s.label} className="card p-4 text-center">
              <s.icon size={16} className={cn('mx-auto mb-1', s.color)} />
              <p className={cn('font-display font-bold text-2xl tabular', s.color)}>{s.value}</p>
              <p className="text-slate-500 text-xs">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-pitch-card rounded-xl border border-pitch-border mb-4">
          {(['batting', 'bowling', 'matches'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-display font-semibold capitalize transition-all',
                tab === t ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Batting stats */}
        {tab === 'batting' && (
          <div className="card p-5 animate-fade-in">
            <h3 className="font-display font-bold text-white mb-4 flex items-center gap-2">
              <Trophy size={16} className="text-score-wide" /> Batting Career
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'Total Runs',    value: player.stats.totalRuns },
                { label: 'Average',       value: batting.average || '—' },
                { label: 'Strike Rate',   value: batting.strikeRate ? `${batting.strikeRate}` : '—' },
                { label: 'Highest Score', value: player.stats.highestScore },
                { label: 'Fours (4s)',    value: player.stats.totalFours },
                { label: 'Sixes (6s)',    value: player.stats.totalSixes },
                { label: 'Balls Faced',   value: player.stats.totalBallsFaced },
                { label: 'Not Outs',      value: player.stats.notOuts },
                { label: 'Innings',       value: batting.innings },
              ].map(s => (
                <div key={s.label} className="bg-pitch-dark rounded-xl p-3">
                  <p className="text-slate-500 text-xs mb-1">{s.label}</p>
                  <p className="font-display font-bold text-lg text-white tabular">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bowling stats */}
        {tab === 'bowling' && (
          <div className="card p-5 animate-fade-in">
            <h3 className="font-display font-bold text-white mb-4 flex items-center gap-2">
              <Zap size={16} className="text-score-wicket" /> Bowling Career
            </h3>
            {player.stats.totalWickets === 0 ? (
              <p className="text-slate-500 text-sm">No bowling stats yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Wickets',      value: player.stats.totalWickets },
                  { label: 'Best Bowling', value: bowling.bestBowling },
                  { label: 'Economy',      value: bowling.economy || '—' },
                  { label: 'Average',      value: bowling.average || '—' },
                  { label: 'Strike Rate',  value: bowling.strikeRate || '—' },
                  { label: 'Overs',        value: bowling.overs },
                  { label: 'Runs Conceded',value: player.stats.totalRunsConceded },
                ].map(s => (
                  <div key={s.label} className="bg-pitch-dark rounded-xl p-3">
                    <p className="text-slate-500 text-xs mb-1">{s.label}</p>
                    <p className="font-display font-bold text-lg text-white tabular">{s.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Match history */}
        {tab === 'matches' && (
          <div className="space-y-3 animate-fade-in">
            {recentMatches.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-slate-400">No public match history yet.</p>
              </div>
            ) : recentMatches.map((m: any) => (
              <Link key={m._id} href={`/match/${m._id}`}>
                <div className="card-hover p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-display font-semibold text-white text-sm">
                        {m.title || `${m.teamA.name} vs ${m.teamB.name}`}
                      </p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {m.teamA.name} vs {m.teamB.name} · {m.totalOvers} overs
                      </p>
                    </div>
                    {m.result && (
                      <span className="text-xs text-brand-400 font-semibold">
                        {m.result.winnerName} won
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </AppShell>
  );
}
