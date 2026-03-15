// src/app/scoring/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import AppShell          from '@/components/layout/AppShell';
import ScoringPanel      from '@/components/scoring/ScoringPanel';
import ScorecardView     from '@/components/scoring/ScorecardView';
import ShareSheet        from '@/components/share/ShareSheet';
import CommentaryFeed    from '@/components/scoring/CommentaryFeed';
import OverAnalysis      from '@/components/scoring/OverAnalysis';
import PartnershipTracker from '@/components/scoring/PartnershipTracker';
import Link              from 'next/link';
import {
  Share2, Loader2, AlertCircle,
  TrendingUp, Activity, ArrowRight, Trophy,
  Play,
} from 'lucide-react';
import { cn, ballsToOvers } from '@/lib/utils';

type Tab = 'score' | 'scorecard' | 'analysis' | 'commentary' | 'share';

// ── Cricbuzz-style live header (scorer view) ──────────────
function ScorerHeader({ match, scorecard }: { match: any; scorecard: any }) {
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
  const rrr = inn.targetRuns && ballsLeft > 0
    ? ((runsNeeded! / ballsLeft) * 6).toFixed(2)
    : null;

  const recentBalls = scorecard.recentBalls ?? [];

  return (
    <div className="bg-pitch-dark border border-pitch-border rounded-2xl overflow-hidden mb-4 mx-4 sm:mx-0">
      <div className="px-4 pt-3 pb-2 border-b border-pitch-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="live-badge flex-shrink-0"><span className="live-dot" /> LIVE</span>
          <span className="text-slate-400 text-xs truncate">
            {match.title ?? `${match.teamA?.name} vs ${match.teamB?.name}`}
          </span>
        </div>
        <span className="text-xs text-slate-500 flex-shrink-0">{match.totalOvers}ov</span>
      </div>

      <div className="px-4 py-4">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 mb-0.5 font-semibold uppercase tracking-wider truncate">
              {batting.name}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-black text-5xl text-white leading-none tabular">
                {inn.totalRuns}
              </span>
              <span className="font-display font-bold text-3xl text-slate-400 leading-none">
                /{inn.wickets}
              </span>
              <span className="text-slate-400 text-sm leading-none ml-1">({overs})</span>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            {inn.inningsNumber === 2 && inn.targetRuns ? (
              <div>
                <p className="text-slate-500 text-xs">Need</p>
                <p className="font-display font-black text-3xl text-score-wide leading-none tabular">
                  {runsNeeded}
                </p>
                <p className="text-slate-400 text-xs">off {ballsLeft}b</p>
              </div>
            ) : (
              <div>
                <p className="text-slate-500 text-xs">CRR</p>
                <p className="font-display font-bold text-2xl text-white tabular">{crr}</p>
                <p className="text-slate-500 text-xs truncate">{bowling.name}</p>
              </div>
            )}
          </div>
        </div>

        {inn.inningsNumber === 2 && inn.targetRuns && (
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

      {recentBalls.length > 0 && (
        <div className="px-4 pb-3 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-slate-600 uppercase tracking-wider mr-1">This over:</span>
          {recentBalls.slice(-6).map((b: any, i: number) => (
            <span key={i} className={`ball-${b.type}`}>{b.value}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Innings break screen ──────────────────────────────────
function InningsBreakScreen({
  match, scorecards, onStartInnings2,
}: { match: any; scorecards: any[]; onStartInnings2: () => void }) {
  const inn1     = scorecards?.[0]?.innings;
  const batting1 = inn1?.battingTeam === 'teamA' ? match.teamA : match.teamB;
  const batting2 = inn1?.battingTeam === 'teamA' ? match.teamB : match.teamA;
  const target   = inn1 ? inn1.totalRuns + 1 : 0;

  return (
    <div className="max-w-md mx-auto px-4 py-8 text-center">
      <div className="card p-6 mb-5">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Innings 1 Complete</p>
        <p className="font-display font-bold text-white text-xl mb-1">{batting1?.name}</p>
        <div className="flex items-baseline justify-center gap-2 mb-2">
          <span className="font-display font-black text-5xl text-white tabular">{inn1?.totalRuns}</span>
          <span className="font-display font-bold text-3xl text-slate-400">/{inn1?.wickets}</span>
          <span className="text-slate-400 text-sm">({ballsToOvers(inn1?.totalBalls ?? 0)}/{match.totalOvers}ov)</span>
        </div>
        {scorecards?.[0]?.recentBalls?.length > 0 && (
          <div className="flex justify-center gap-1.5 flex-wrap mb-3">
            {scorecards[0].recentBalls.slice(-6).map((b: any, i: number) => (
              <span key={i} className={`ball-${b.type}`}>{b.value}</span>
            ))}
          </div>
        )}
      </div>

      <div className="card p-6 mb-6 bg-brand-500/5 border-brand-500/30">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Innings 2 Target</p>
        <p className="font-display font-bold text-white text-lg mb-0.5">{batting2?.name} need</p>
        <p className="font-display font-black text-6xl text-brand-400 tabular mb-1">{target}</p>
        <p className="text-slate-400 text-sm">to win in {match.totalOvers} overs</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="bg-pitch-dark rounded-xl p-2">
            <p className="text-slate-500 mb-0.5">Required RR</p>
            <p className="font-display font-bold text-white text-lg tabular">
              {((target / (match.totalOvers * 6)) * 6).toFixed(2)}
            </p>
          </div>
          <div className="bg-pitch-dark rounded-xl p-2">
            <p className="text-slate-500 mb-0.5">Balls available</p>
            <p className="font-display font-bold text-white text-lg">{match.totalOvers * 6}</p>
          </div>
        </div>
      </div>

      <button onClick={onStartInnings2}
        className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-lg">
        <Play size={20} /> Start Innings 2
      </button>
      <p className="text-xs text-slate-600 mt-2">Tap to select opening players for Innings 2</p>
    </div>
  );
}

// ── Match result screen ───────────────────────────────────
function MatchResultScreen({
  result, match, onViewScorecard,
}: { result: any; match: any; onViewScorecard: () => void }) {
  return (
    <div className="max-w-md mx-auto px-4 py-10 text-center">
      <div className="text-6xl mb-4">🏆</div>
      <h2 className="font-display font-black text-3xl text-white mb-2">{result.summary}</h2>
      <p className="text-slate-400 text-sm mb-6">
        {match.title ?? `${match.teamA?.name} vs ${match.teamB?.name}`} · {match.totalOvers} overs
      </p>
      <div className="card p-4 mb-6 bg-brand-500/5 border-brand-500/30">
        <div className="flex items-center justify-center gap-3">
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-0.5">Winner</p>
            <p className="font-display font-bold text-xl text-brand-400">{result.winnerName}</p>
          </div>
          <Trophy size={20} className="text-score-wide" />
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-0.5">Margin</p>
            <p className="font-display font-bold text-xl text-white">{result.margin}</p>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <button onClick={onViewScorecard}
          className="btn-primary w-full flex items-center justify-center gap-2">
          View Full Scorecard <ArrowRight size={16} />
        </button>
        <Link href="/my-matches" className="btn-secondary w-full flex items-center justify-center gap-2">
          My Matches
        </Link>
      </div>
    </div>
  );
}

// ── Main scoring page ─────────────────────────────────────
export default function ScoringPage() {
  const { id }       = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const token        = searchParams.get('token') ?? '';
  const isQuickMatch = searchParams.get('quick') === '1';

  const [matchData,  setMatchData]  = useState<any>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [activeTab,  setActiveTab]  = useState<Tab>('score');
  const [showResult, setShowResult] = useState(false);

  const fetchMatch = useCallback(async () => {
    try {
      const res  = await fetch(`/api/match/${id}${token ? `?token=${token}` : ''}`);
      const json = await res.json();
      if (json.success) setMatchData(json.data);
      else setError(json.error || 'Failed to load');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }, [id, token]);

  useEffect(() => { fetchMatch(); }, [fetchMatch]);

  // Live polling — only while match is live
  useEffect(() => {
    if (!matchData || matchData.match?.status === 'completed') return;
    const t = setInterval(fetchMatch, 4000);
    return () => clearInterval(t);
  }, [matchData?.match?.status, fetchMatch]);

  const handleBallSaved = async (result: any) => {
    await fetchMatch();
    if (result.matchStatus === 'completed') setShowResult(true);
  };

  const handleStartInnings2 = async () => {
    await fetchMatch();
    setActiveTab('score');
  };

  const handleToggleVisibility = async () => {
    const newVis = matchData?.match?.visibility === 'public' ? 'private' : 'public';
    await fetch(`/api/match/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibility: newVis }),
    });
    fetchMatch();
  };

  // ── Loading / error states ────────────────────────────
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
        <p className="text-slate-400 text-sm mb-4">{error}</p>
        <Link href="/" className="btn-secondary">← Home</Link>
      </div>
    </AppShell>
  );

  const { match, scorecards, playerMap } = matchData ?? {};
  const currentInnings = scorecards?.[match?.currentInnings - 1];
  const innings        = currentInnings?.innings;
  const isLive         = match?.status === 'live';
  const isBreak        = match?.status === 'innings_break';
  const allowSingleBat = match?.settings?.allowSinglePlayerBat ?? false;

  // ── Full-screen states ────────────────────────────────
  if (showResult && match?.result) {
    return (
      <AppShell>
        <MatchResultScreen
          result={match.result}
          match={match}
          onViewScorecard={() => { setShowResult(false); setActiveTab('scorecard'); }}
        />
      </AppShell>
    );
  }

  if (isBreak) {
    return (
      <AppShell>
        <InningsBreakScreen
          match={match}
          scorecards={scorecards}
          onStartInnings2={handleStartInnings2}
        />
      </AppShell>
    );
  }

  // ── Tab definitions ───────────────────────────────────
  // Score tab only visible while live; Analysis tab only when balls have been bowled
  const hasBalls  = scorecards?.some((sc: any) => sc.innings?.totalBalls > 0);
  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: 'score',       label: '🏏 Score',      show: isLive      },
    { id: 'scorecard',   label: '📋 Scorecard',  show: true        },
    { id: 'analysis',    label: '📊 Analysis',   show: !!hasBalls  },
    { id: 'commentary',  label: '💬 Commentary', show: !!hasBalls  },
    { id: 'share',       label: '📤 Share',      show: true        },
  ];
  const visibleTabs = tabs.filter(t => t.show);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-0 sm:px-4 py-4 sm:py-6">

        {/* Cricbuzz live header */}
        {isLive && innings && (
          <ScorerHeader match={match} scorecard={currentInnings} />
        )}

        {/* Completed result banner */}
        {match?.status === 'completed' && match?.result && (
          <div className="card mx-4 sm:mx-0 mb-4 p-4 bg-brand-500/5 border-brand-500/25 text-center">
            <p className="text-2xl mb-1">🏆</p>
            <p className="font-display font-bold text-brand-400 text-lg">{match.result.summary}</p>
            <p className="text-slate-400 text-xs mt-1">
              {match.title ?? `${match.teamA?.name} vs ${match.teamB?.name}`}
            </p>
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center justify-between px-4 sm:px-0 mb-4">
          <p className="text-slate-500 text-xs">
            {match?.totalOvers} overs · {match?.visibility === 'private' ? '🔒 Private' : '🌍 Public'}
          </p>
          <button onClick={() => setActiveTab('share')}
            className="btn-ghost flex items-center gap-1.5 text-xs">
            <Share2 size={13} /> Share
          </button>
        </div>

        {/* ── Tab bar ────────────────────────────────────── */}
        {/* Scrollable on mobile so all 5 tabs fit without wrapping */}
        <div className="mx-4 sm:mx-0 mb-4 overflow-x-auto">
          <div className="flex gap-1 p-1 bg-pitch-card rounded-xl border border-pitch-border min-w-max sm:min-w-0">
            {visibleTabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  'px-3 py-2 rounded-lg text-xs sm:text-sm font-display font-semibold transition-all whitespace-nowrap',
                  activeTab === t.id
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab content ────────────────────────────────── */}
        <div className="px-4 sm:px-0">

          {/* SCORE TAB */}
          {activeTab === 'score' && innings && (
            <ScoringPanel
              matchId={id}
              token={token}
              innings={innings}
              match={match}
              playerMap={playerMap}
              teamAPlayers={match.teamA.playerIds}
              teamBPlayers={match.teamB.playerIds}
              onBallSaved={handleBallSaved}
              bowlingScorecard={currentInnings?.bowlingScorecard ?? []}
              battingScorecard={currentInnings?.battingScorecard ?? []}
              allowSinglePlayerBat={allowSingleBat}
              isQuickMatch={isQuickMatch}
            />
          )}
          {activeTab === 'score' && !innings && isLive && (
            <div className="card p-8 text-center">
              <Loader2 size={24} className="animate-spin text-brand-400 mx-auto mb-3" />
              <p className="text-slate-400">Setting up innings...</p>
            </div>
          )}

          {/* SCORECARD TAB */}
          {activeTab === 'scorecard' && (
            <div className="space-y-4">
              {scorecards?.length > 0
                ? scorecards.map((sc: any) => (
                    <ScorecardView key={sc.innings._id} scorecard={sc} match={match} />
                  ))
                : (
                  <div className="card p-8 text-center">
                    <p className="text-slate-400">No balls scored yet.</p>
                  </div>
                )
              }
            </div>
          )}

          {/* ANALYSIS TAB */}
          {activeTab === 'analysis' && (
            <div className="space-y-4">
              {scorecards?.map((sc: any) => {
                const innLabel = sc.innings.inningsNumber === 1
                  ? (sc.innings.battingTeam === 'teamA' ? match.teamA.name : match.teamB.name)
                  : (sc.innings.battingTeam === 'teamA' ? match.teamA.name : match.teamB.name);

                return (
                  <div key={sc.innings._id} className="card p-4 space-y-5">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Innings {sc.innings.inningsNumber} — {innLabel}
                    </p>

                    {/* Over-by-over bar chart */}
                    <OverAnalysis
                      inningsId={sc.innings._id}
                      playerMap={playerMap}
                      totalOvers={match.totalOvers}
                    />

                    {/* Partnership bars — computed from battingScorecard fall-of-wickets */}
                    {sc.fallOfWickets?.length > 0 && (() => {
                      // Build partnerships from fall of wickets data
                      const fow = sc.fallOfWickets;
                      const partnerships = fow.map((f: any, i: number) => {
                        const prevRuns = i === 0 ? 0 : fow[i - 1].runs;
                        // Find the two batsmen involved — look at batting scorecard
                        const dismissed = sc.battingScorecard.find(
                          (b: any) => b.player?.name === f.name
                        );
                        const partner   = sc.battingScorecard.find(
                          (b: any) => b.player?.name !== f.name && !b.dismissed && b.balls > 0
                        );
                        return {
                          striker:    dismissed?.player?._id ?? f.name,
                          nonStriker: partner?.player?._id   ?? 'Unknown',
                          runs:       f.runs - prevRuns,
                          balls:      0, // balls not tracked per partnership yet
                        };
                      });

                      return (
                        <PartnershipTracker
                          partnerships={partnerships}
                          playerMap={playerMap}
                        />
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}

          {/* COMMENTARY TAB */}
          {activeTab === 'commentary' && (
            <div className="card p-4">
              <CommentaryFeed
                matchId={id}
                token={token}
                isLive={isLive}
              />
            </div>
          )}

          {/* SHARE TAB — full ShareSheet component */}
          {activeTab === 'share' && (
            <ShareSheet
              matchId={id}
              token={token}
              visibility={match?.visibility ?? 'private'}
              onToggleVisibility={handleToggleVisibility}
            />
          )}

        </div>
      </div>
    </AppShell>
  );
}