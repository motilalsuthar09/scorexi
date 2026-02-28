'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import ScoringPanel from '@/components/scoring/ScoringPanel';
import ScorecardView from '@/components/scoring/ScorecardView';
import { Share2, Eye, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { cn, ballsToOvers } from '@/lib/utils';

type Tab = 'score' | 'scorecard' | 'share';

export default function ScoringPage() {
  const { id }         = useParams<{ id: string }>();
  const searchParams   = useSearchParams();
  const token          = searchParams.get('token') ?? '';
  const router         = useRouter();

  const [matchData, setMatchData]     = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [activeTab, setActiveTab]     = useState<Tab>('score');
  const [copied, setCopied]           = useState(false);
  const [lastBallResult, setLastBallResult] = useState<any>(null);

  const fetchMatch = useCallback(async () => {
    try {
      const url = `/api/match/${id}${token ? `?token=${token}` : ''}`;
      const res  = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setMatchData(json.data);
        if (json.data.match.status === 'completed') {
          // keep polling stopped
        }
      } else {
        setError(json.error || 'Failed to load');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  // Initial load
  useEffect(() => { fetchMatch(); }, [fetchMatch]);

  // Live polling every 4 seconds (only during live match)
  useEffect(() => {
    if (!matchData) return;
    if (matchData.match?.status === 'completed') return;
    const interval = setInterval(fetchMatch, 4000);
    return () => clearInterval(interval);
  }, [matchData?.match?.status, fetchMatch]);

  const handleBallSaved = async (result: any) => {
    setLastBallResult(result);
    await fetchMatch();   // refresh after ball
  };

  const shareUrl = matchData?.match?.shareUrl ?? '';
  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) return (
    <AppShell>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-brand-400 mx-auto mb-3" />
          <p className="text-slate-400">Loading match...</p>
        </div>
      </div>
    </AppShell>
  );

  if (error) return (
    <AppShell>
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <AlertCircle size={40} className="text-score-wicket mx-auto mb-3" />
        <h2 className="font-display font-bold text-xl text-white mb-2">Access Denied</h2>
        <p className="text-slate-400 text-sm">{error}</p>
      </div>
    </AppShell>
  );

  const { match, scorecards, playerMap } = matchData ?? {};
  const currentInnings = scorecards?.[match?.currentInnings - 1];
  const innings = currentInnings?.innings;
  const isLive  = match?.status === 'live';

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-0 sm:px-4 py-4 sm:py-6">

        {/* ── Match header ───────────────────────────── */}
        <div className="card mx-4 sm:mx-0 mb-4 p-4 sm:p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {isLive && (
                  <span className="live-badge">
                    <span className="live-dot" /> LIVE
                  </span>
                )}
                {match?.status === 'completed' && (
                  <span className="inline-flex items-center gap-1 text-brand-400 text-xs bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-500/20">
                    <CheckCircle size={11} /> Completed
                  </span>
                )}
              </div>
              <h1 className="font-display font-bold text-lg sm:text-xl text-white">
                {match?.title || `${match?.teamA?.name} vs ${match?.teamB?.name}`}
              </h1>
              <p className="text-slate-400 text-xs mt-0.5">
                {match?.totalOvers} overs · {match?.visibility === 'private' ? '🔒 Private' : '🌍 Public'}
              </p>
            </div>
            <button
              onClick={() => setActiveTab('share')}
              className="btn-ghost flex items-center gap-1.5 text-xs"
            >
              <Share2 size={14} /> Share
            </button>
          </div>

          {/* Score summary */}
          {innings && (
            <div className="flex items-end justify-between">
              <div>
                <p className="text-slate-400 text-xs mb-0.5">
                  {innings.battingTeam === 'teamA' ? match.teamA.name : match.teamB.name} batting
                  {innings.inningsNumber === 2 && innings.targetRuns && (
                    <span className="ml-1 text-score-wide">
                      · Target: {innings.targetRuns}
                    </span>
                  )}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="score-display tabular">
                    {innings.totalRuns}/{innings.wickets}
                  </span>
                  <span className="score-sub">
                    ({ballsToOvers(innings.totalBalls)} ov)
                  </span>
                </div>
              </div>
              {innings.inningsNumber === 2 && innings.targetRuns && (
                <div className="text-right">
                  <p className="text-slate-400 text-xs">Need</p>
                  <p className="font-display font-bold text-xl text-score-wide">
                    {Math.max(0, innings.targetRuns - innings.totalRuns)}
                    <span className="text-sm text-slate-400 ml-1">
                      off {Math.max(0, match.totalOvers * 6 - innings.totalBalls)} balls
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Recent balls */}
          {currentInnings?.recentBalls?.length > 0 && (
            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-500 mr-1">Last over:</span>
              {currentInnings.recentBalls.slice(-6).map((b: any, i: number) => (
                <span key={i} className={`ball-${b.type}`}>
                  {b.value}
                </span>
              ))}
            </div>
          )}

          {/* Match result */}
          {match?.result && (
            <div className="mt-3 bg-brand-500/10 border border-brand-500/20 rounded-xl p-3">
              <p className="font-display font-bold text-brand-400">
                🏆 {match.result.summary}
              </p>
            </div>
          )}
        </div>

        {/* ── Tabs ────────────────────────────────────── */}
        <div className="flex gap-1 mx-4 sm:mx-0 mb-4 p-1 bg-pitch-card rounded-xl border border-pitch-border">
          {([
            { id: 'score',     label: 'Score Now',   show: isLive },
            { id: 'scorecard', label: 'Scorecard',   show: true   },
            { id: 'share',     label: 'Share',        show: true   },
          ] as const).filter(t => t.show).map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-display font-semibold transition-all',
                activeTab === t.id
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ─────────────────────────────── */}
        <div className="px-4 sm:px-0">

          {activeTab === 'score' && innings && (
            <ScoringPanel
              matchId={id}
              token={token}
              innings={innings}
              playerMap={playerMap}
              teamAPlayers={match.teamA.playerIds}
              teamBPlayers={match.teamB.playerIds}
              onBallSaved={handleBallSaved}
            />
          )}

          {activeTab === 'scorecard' && (
            <div className="space-y-4">
              {scorecards?.map((sc: any) => (
                <ScorecardView
                  key={sc.innings._id}
                  scorecard={sc}
                  match={match}
                />
              ))}
            </div>
          )}

          {activeTab === 'share' && (
            <div className="card p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Share2 size={18} className="text-brand-400" />
                <h3 className="font-display font-bold text-white">Share Match</h3>
              </div>
              <p className="text-sm text-slate-400">
                {match?.visibility === 'private'
                  ? 'Share this private link — only people with this link can view the match.'
                  : 'This match is public and listed on the matches page.'}
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="input-field text-xs flex-1"
                  onClick={e => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={handleCopy}
                  className={cn(
                    'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex-shrink-0',
                    copied
                      ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                      : 'btn-primary'
                  )}
                >
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              {/* Toggle visibility */}
              <div className="flex items-center justify-between pt-2 border-t border-pitch-border">
                <div>
                  <p className="text-sm font-semibold text-white">Match Visibility</p>
                  <p className="text-xs text-slate-500">
                    {match?.visibility === 'public'
                      ? 'Listed on public matches page'
                      : 'Only accessible via share link'}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    const newVis = match?.visibility === 'public' ? 'private' : 'public';
                    await fetch(`/api/match/${id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ visibility: newVis }),
                    });
                    fetchMatch();
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                    match?.visibility === 'public'
                      ? 'border-score-wicket/30 text-score-wicket hover:bg-score-wicket/10'
                      : 'border-brand-500/30 text-brand-400 hover:bg-brand-500/10'
                  )}
                >
                  Make {match?.visibility === 'public' ? 'Private' : 'Public'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
