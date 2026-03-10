// src/app/match/[id]/MatchViewClient.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import AppShell      from '@/components/layout/AppShell';
import ScorecardView from '@/components/scoring/ScorecardView';
import Link          from 'next/link';
import {
  Loader2, AlertCircle, ArrowLeft, Share2,
  ExternalLink, TrendingUp, Activity, CheckCircle,
} from 'lucide-react';
import { ballsToOvers } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Props { id: string; token: string }

// ── Cricbuzz-style viewer header ──────────────────────────
function LiveHeader({ match, scorecard }: { match: any; scorecard: any }) {
  if (!scorecard) return null;
  const inn     = scorecard.innings;
  const batting = inn.battingTeam === 'teamA' ? match.teamA : match.teamB;
  const bowling = inn.battingTeam === 'teamA' ? match.teamB : match.teamA;

  const balls     = inn.totalBalls ?? 0;
  const maxBalls  = match.totalOvers * 6;
  const ballsLeft = Math.max(0, maxBalls - balls);
  const overs     = ballsToOvers(balls);
  const crr       = balls > 0 ? ((inn.totalRuns / balls) * 6).toFixed(2) : '0.00';

  const runsNeeded = inn.targetRuns ? Math.max(0, inn.targetRuns - inn.totalRuns) : null;
  const rrr        = inn.targetRuns && ballsLeft > 0
    ? ((runsNeeded! / ballsLeft) * 6).toFixed(2)
    : null;

  const recentBalls = scorecard.recentBalls ?? [];
  const isLive      = match.status === 'live';

  return (
    <div className="bg-pitch-dark border border-pitch-border rounded-2xl overflow-hidden mb-4">

      {/* Title bar */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-pitch-border/50">
        <div className="flex items-center gap-2 min-w-0">
          {isLive && (
            <span className="live-badge flex-shrink-0">
              <span className="live-dot" /> LIVE
            </span>
          )}
          {match.status === 'completed' && (
            <span className="inline-flex items-center gap-1 text-brand-400 text-xs
                             bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-500/20 flex-shrink-0">
              <CheckCircle size={10} /> Full Time
            </span>
          )}
          <span className="text-slate-400 text-xs truncate">
            {match.title ?? `${match.teamA?.name} vs ${match.teamB?.name}`}
          </span>
        </div>
        <span className="text-xs text-slate-500 flex-shrink-0">{match.totalOvers}ov</span>
      </div>

      {/* Main score */}
      <div className="px-4 py-4">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 mb-0.5 font-semibold uppercase tracking-wider truncate">
              {batting.name}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-display font-black text-5xl text-white leading-none tabular">
                {inn.totalRuns}
              </span>
              <span className="font-display font-bold text-3xl text-slate-400 leading-none">
                /{inn.wickets}
              </span>
              <span className="text-slate-400 text-sm leading-none ml-1">
                ({overs})
              </span>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            {match.result ? (
              <div>
                <p className="text-brand-400 text-xs font-bold uppercase tracking-wide">Result</p>
                <p className="text-white text-sm font-semibold">{match.result.winnerName}</p>
                <p className="text-slate-400 text-xs">won by {match.result.margin}</p>
              </div>
            ) : inn.inningsNumber === 2 && inn.targetRuns ? (
              <div>
                <p className="text-slate-500 text-xs">Need</p>
                <p className="font-display font-black text-3xl text-score-wide leading-none tabular">
                  {runsNeeded}
                </p>
                <p className="text-slate-400 text-xs">
                  off {ballsLeft} ball{ballsLeft !== 1 ? 's' : ''}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-slate-500 text-xs">CRR</p>
                <p className="font-display font-bold text-2xl text-white tabular">{crr}</p>
                <p className="text-slate-500 text-xs">{bowling.name} bowling</p>
              </div>
            )}
          </div>
        </div>

        {/* Innings 2 — target + rates */}
        {inn.inningsNumber === 2 && inn.targetRuns && !match.result && (
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs bg-score-wide/10
                             border border-score-wide/20 rounded-full px-2.5 py-1 text-score-wide font-semibold">
              Target: {inn.targetRuns}
            </span>
            {rrr && (
              <span className="inline-flex items-center gap-1 text-xs bg-pitch-card
                               border border-pitch-border rounded-full px-2.5 py-1 text-slate-400">
                <TrendingUp size={10} /> RRR: {rrr}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs bg-pitch-card
                             border border-pitch-border rounded-full px-2.5 py-1 text-slate-400">
              <Activity size={10} /> CRR: {crr}
            </span>
          </div>
        )}
      </div>

      {/* Recent balls */}
      {recentBalls.length > 0 && (
        <div className="px-4 pb-3 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-slate-600 uppercase tracking-wider mr-1">This over:</span>
          {recentBalls.slice(-6).map((b: any, i: number) => (
            <span key={i} className={`ball-${b.type}`}>{b.value}</span>
          ))}
        </div>
      )}

      {/* Current batsmen */}
      {scorecard.battingScorecard?.some((b: any) => !b.isOut && (b.balls > 0 || b.runs > 0)) && (
        <div className="border-t border-pitch-border/40 px-4 py-2">
          <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1.5">At the crease</p>
          <div className="grid grid-cols-2 gap-x-4">
            {scorecard.battingScorecard
              .filter((b: any) => !b.isOut && (b.balls > 0 || b.runs > 0))
              .slice(0, 2)
              .map((b: any) => (
                <div key={b.player?._id} className="flex items-center justify-between py-0.5">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-xs text-white font-semibold truncate">
                      {b.player?.name ?? '?'}
                    </span>
                    {b.isStriker && <span className="text-brand-400 text-[10px]">🏏</span>}
                  </div>
                  <span className="text-xs font-display font-bold text-white tabular flex-shrink-0 ml-2">
                    {b.runs}
                    <span className="text-slate-500 font-normal">({b.balls})</span>
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Current bowler */}
      {scorecard.bowlingScorecard?.length > 0 && (() => {
        const bowler = scorecard.bowlingScorecard[scorecard.bowlingScorecard.length - 1];
        return bowler ? (
          <div className="border-t border-pitch-border/40 px-4 py-2 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Bowling</span>
            <span className="text-xs text-slate-300 font-semibold">{bowler.player?.name}</span>
            <span className="text-[10px] font-mono text-slate-400">
              {ballsToOvers(bowler.balls)}–{bowler.runs}–{bowler.wickets}
            </span>
          </div>
        ) : null;
      })()}

      {/* Live update notice */}
      {isLive && (
        <div className="border-t border-pitch-border/30 px-4 py-2 flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-pulse" />
          <span className="text-[10px] text-slate-500">Auto-updating every 4 seconds</span>
        </div>
      )}
    </div>
  );
}

// ── Main viewer component ─────────────────────────────────
export default function MatchViewClient({ id, token }: Props) {
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [copied,  setCopied]  = useState(false);

  const fetch_ = useCallback(async () => {
    try {
      const url  = `/api/match/${id}${token ? `?token=${token}` : ''}`;
      const res  = await fetch(url);
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.error || 'Access denied');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }, [id, token]);

  useEffect(() => { fetch_(); }, [fetch_]);

  // Live polling every 4 s
  useEffect(() => {
    if (!data || data.match?.status === 'completed') return;
    const t = setInterval(fetch_, 4000);
    return () => clearInterval(t);
  }, [data?.match?.status, fetch_]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) return (
    <AppShell>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="animate-spin text-brand-400" />
      </div>
    </AppShell>
  );

  if (error) return (
    <AppShell>
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <AlertCircle size={40} className="text-score-wicket mx-auto mb-3" />
        <h2 className="font-display font-bold text-xl text-white mb-2">Can't Load Match</h2>
        <p className="text-slate-400 text-sm mb-4">{error}</p>
        <Link href="/" className="btn-secondary">← Back to Home</Link>
      </div>
    </AppShell>
  );

  const { match, scorecards } = data;
  const currentScorecard = scorecards?.[match.currentInnings - 1];

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-5">

        {/* Back + share row */}
        <div className="flex items-center justify-between mb-4">
          <Link href="/matches" className="btn-ghost flex items-center gap-1.5 text-sm">
            <ArrowLeft size={15} /> Matches
          </Link>
          <button
            onClick={copyLink}
            className={cn(
              'btn-ghost flex items-center gap-1.5 text-sm transition-all',
              copied && 'text-brand-400'
            )}
          >
            <Share2 size={14} /> {copied ? 'Copied!' : 'Share'}
          </button>
        </div>

        {/* ── Cricbuzz-style live header ─────────────────── */}
        <LiveHeader match={match} scorecard={currentScorecard} />

        {/* Full result banner */}
        {match.result && (
          <div className="bg-brand-500/10 border border-brand-500/20 rounded-2xl px-4 py-4 mb-4 text-center">
            <p className="text-2xl mb-1">🏆</p>
            <p className="font-display font-bold text-brand-400 text-lg">{match.result.summary}</p>
          </div>
        )}

        {/* Scorecards */}
        <div className="space-y-4">
          {scorecards?.map((sc: any) => (
            <ScorecardView key={sc.innings._id} scorecard={sc} match={match} />
          ))}
        </div>

        {/* Powered by */}
        <div className="text-center mt-8 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-slate-600 text-xs hover:text-slate-400 transition-colors"
          >
            <ExternalLink size={11} />
            Scored with ScoreXI
          </Link>
        </div>
      </div>
    </AppShell>
  );
}