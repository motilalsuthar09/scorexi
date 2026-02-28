'use client';

import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell';
import ScorecardView from '@/components/scoring/ScorecardView';
import Link from 'next/link';
import { Loader2, AlertCircle, ArrowLeft, Share2, ExternalLink } from 'lucide-react';
import { ballsToOvers } from '@/lib/utils';

interface Props { id: string; token: string }

export default function MatchViewClient({ id, token }: Props) {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const fetch_ = useCallback(async () => {
    try {
      const url = `/api/match/${id}${token ? `?token=${token}` : ''}`;
      const res  = await fetch(url);
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.error || 'Access denied');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }, [id, token]);

  useEffect(() => { fetch_(); }, [fetch_]);
  useEffect(() => {
    if (!data || data.match?.status === 'completed') return;
    const t = setInterval(fetch_, 4000);
    return () => clearInterval(t);
  }, [data?.match?.status, fetch_]);

  const copyLink = () => navigator.clipboard.writeText(window.location.href);

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
  const innings = scorecards?.[match.currentInnings - 1]?.innings;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-5">

        {/* Back + share */}
        <div className="flex items-center justify-between mb-4">
          <Link href="/matches" className="btn-ghost flex items-center gap-1.5 text-sm">
            <ArrowLeft size={15} /> Matches
          </Link>
          <div className="flex items-center gap-2">
            {match.status === 'live' && (
              <span className="live-badge">
                <span className="live-dot" /> LIVE
              </span>
            )}
            <button onClick={copyLink} className="btn-ghost flex items-center gap-1.5 text-sm">
              <Share2 size={14} /> Share
            </button>
          </div>
        </div>

        {/* Header card */}
        <div className="card p-5 mb-4">
          <h1 className="font-display font-bold text-xl sm:text-2xl text-white mb-1">
            {match.title || `${match.teamA.name} vs ${match.teamB.name}`}
          </h1>
          <p className="text-slate-400 text-sm">{match.totalOvers} overs</p>

          {/* Live score */}
          {innings && (
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">
                  {innings.battingTeam === 'teamA' ? match.teamA.name : match.teamB.name} batting
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="score-display tabular">
                    {innings.totalRuns}/{innings.wickets}
                  </span>
                  <span className="score-sub">
                    ({ballsToOvers(innings.totalBalls)}/{match.totalOvers})
                  </span>
                </div>
              </div>
              {innings.inningsNumber === 2 && innings.targetRuns && (
                <div className="text-right">
                  <p className="text-xs text-slate-400">Target</p>
                  <p className="font-display font-bold text-2xl text-score-wide">
                    {innings.targetRuns}
                  </p>
                  <p className="text-xs text-slate-500">
                    Need {Math.max(0, innings.targetRuns - innings.totalRuns)} off{' '}
                    {Math.max(0, match.totalOvers * 6 - innings.totalBalls)} balls
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Result */}
          {match.result && (
            <div className="mt-3 bg-brand-500/10 border border-brand-500/20 rounded-xl p-3">
              <p className="font-display font-bold text-brand-400">🏆 {match.result.summary}</p>
            </div>
          )}

          {/* Recent balls */}
          {scorecards?.[match.currentInnings - 1]?.recentBalls?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-slate-500">Recent:</span>
              {scorecards[match.currentInnings - 1].recentBalls.slice(-6).map((b: any, i: number) => (
                <span key={i} className={`ball-${b.type}`}>{b.value}</span>
              ))}
            </div>
          )}
        </div>

        {/* Scorecards */}
        <div className="space-y-4">
          {scorecards?.map((sc: any) => (
            <ScorecardView key={sc.innings._id} scorecard={sc} match={match} />
          ))}
        </div>

        {/* Powered by */}
        <div className="text-center mt-8 py-4">
          <Link href="/" className="inline-flex items-center gap-1.5 text-slate-600 text-xs hover:text-slate-400 transition-colors">
            <ExternalLink size={11} />
            Scored with ScoreXI
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
