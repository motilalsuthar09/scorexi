// src/components/scoring/ScorecardView.tsx
// ============================================================
// FIX 2: Cricbuzz-style scorecard layout matching reference image:
//   - "Batting" plain header (no box)
//   - Player name + dismissal text on separate line below
//   - Extras row (W 7, LB 5 etc.)
//   - Total runs row
//   - "Yet to bat" section
//   - Fall of wickets compact inline text
//   - "Bowling" section header
//   - O M R W Econ columns
// ============================================================
'use client';

import { cn, ballsToOvers, strikeRate, economy } from '@/lib/utils';

interface Props {
  scorecard: {
    innings:          any;
    battingScorecard: any[];
    bowlingScorecard: any[];
    fallOfWickets:    any[];
    recentBalls:      any[];
  };
  match: any;
}

export default function ScorecardView({ scorecard, match }: Props) {
  const { innings, battingScorecard, bowlingScorecard, fallOfWickets } = scorecard;

  const teamName    = innings.battingTeam === 'teamA' ? match.teamA.name : match.teamB.name;
  const bowlingTeam = innings.battingTeam === 'teamA' ? match.teamB.name : match.teamA.name;

  // Split batsmen: those who batted vs yet to bat
  const batted    = battingScorecard.filter((b: any) => b.balls > 0 || b.dismissed);
  const yetToBat  = battingScorecard.filter((b: any) => b.balls === 0 && !b.dismissed && !b.batting);

  // Extras breakdown string e.g. "(W 7, NB 0, B 2, LB 5)"
  const ext = innings.extras;
  const extrasBreakdown = ext
    ? `(W ${ext.wides ?? 0}, NB ${ext.noBalls ?? 0}, B ${ext.byes ?? 0}, LB ${ext.legByes ?? 0})`
    : '';

  return (
    <div className="bg-pitch-card rounded-2xl overflow-hidden border border-pitch-border">

      {/* ── Innings title ───────────────────────────────── */}
      <div className="px-4 py-3 border-b border-pitch-border bg-pitch-dark/40 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-0.5">
            Innings {innings.inningsNumber}
          </p>
          <h3 className="font-display font-bold text-white text-base">{teamName}</h3>
        </div>
        <div className="text-right">
          <p className="font-display font-black text-3xl text-white tabular leading-none">
            {innings.totalRuns}
            <span className="text-slate-400 font-bold text-2xl">/{innings.wickets}</span>
          </p>
          <p className="text-slate-500 text-xs mt-0.5">
            {ballsToOvers(innings.totalBalls)} ov
            {innings.targetRuns && (
              <span className="ml-2 text-score-wide font-semibold">
                Target: {innings.targetRuns}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* ── BATTING section ─────────────────────────────── */}
      <div>
        {/* Column headers */}
        <div className="grid scorecard-grid px-4 py-1.5 border-b border-pitch-border/60 bg-pitch-dark/20">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Batting</span>
          <span className="text-[11px] font-bold text-slate-500 text-right">R</span>
          <span className="text-[11px] font-bold text-slate-500 text-right">B</span>
          <span className="text-[11px] font-bold text-slate-500 text-right">4s</span>
          <span className="text-[11px] font-bold text-slate-500 text-right">6s</span>
          <span className="text-[11px] font-bold text-slate-500 text-right">S/R</span>
        </div>

        {/* Batted rows */}
        {battingScorecard.map((bs: any) => {
          const sr          = strikeRate(bs.runs, bs.balls);
          const isAtCrease  = bs.batting && !bs.dismissed;
          const isStriker   = bs.isStriker;
          const notBatted   = bs.balls === 0 && !bs.dismissed && !bs.batting;

          if (notBatted) return null; // rendered in "Yet to bat" section

          return (
            <div key={bs.player._id}
              className={cn(
                'grid scorecard-grid px-4 py-2.5 border-b border-pitch-border/30 transition-colors',
                isStriker ? 'bg-brand-500/[0.05]' : 'hover:bg-white/[0.02]'
              )}>

              {/* Name + status */}
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1 flex-wrap">
                  {isStriker && <span className="text-brand-400 font-bold text-sm leading-none">*</span>}
                  <span className={cn(
                    'font-body text-sm leading-tight',
                    isAtCrease ? 'text-white font-semibold' :
                    bs.dismissed ? 'text-slate-300' : 'text-slate-500'
                  )}>
                    {bs.player.name}
                  </span>
                </div>
                {/* Dismissal text — below name, smaller */}
                {bs.dismissed && bs.dismissalDesc && (
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-tight truncate">
                    {bs.dismissalDesc}
                  </p>
                )}
                {isAtCrease && !bs.dismissed && (
                  <p className="text-[11px] text-slate-500 mt-0.5">not out</p>
                )}
              </div>

              {/* Stats */}
              <span className={cn(
                'text-right font-mono font-bold text-sm tabular self-start pt-0.5',
                bs.runs >= 100 ? 'text-score-six' :
                bs.runs >= 50  ? 'text-score-wide' : 'text-white'
              )}>
                {bs.dismissed || bs.balls > 0 ? bs.runs : '-'}
              </span>
              <span className="text-right font-mono text-sm text-slate-400 tabular self-start pt-0.5">
                {bs.balls > 0 ? bs.balls : '-'}
              </span>
              <span className="text-right font-mono text-sm text-score-four tabular self-start pt-0.5">
                {bs.balls > 0 ? bs.fours : '-'}
              </span>
              <span className="text-right font-mono text-sm text-score-six tabular self-start pt-0.5">
                {bs.balls > 0 ? bs.sixes : '-'}
              </span>
              <span className={cn(
                'text-right font-mono text-xs tabular self-start pt-1',
                sr >= 150 ? 'text-score-six font-semibold' :
                sr >= 100 ? 'text-score-wide' : 'text-slate-400'
              )}>
                {bs.balls > 0 ? sr.toFixed(1) : '-'}
              </span>
            </div>
          );
        })}

        {/* Extras row */}
        <div className="grid scorecard-grid px-4 py-2.5 border-b border-pitch-border/30">
          <div className="col-span-2">
            <span className="text-sm text-slate-400">Extras</span>
            <span className="text-xs text-slate-500 ml-2">{extrasBreakdown}</span>
          </div>
          <span /> <span /> <span />
          <span className="text-right font-mono text-sm text-white font-semibold tabular">
            {ext?.total ?? 0}
          </span>
        </div>

        {/* Total row */}
        <div className="grid scorecard-grid px-4 py-2.5 border-b border-pitch-border/60 bg-pitch-dark/20">
          <div className="col-span-3">
            <span className="text-sm font-bold text-white">Total</span>
            <span className="text-xs text-slate-500 ml-2">
              ({innings.wickets} wkt{innings.wickets !== 1 ? 's' : ''}, {ballsToOvers(innings.totalBalls)} ov)
            </span>
          </div>
          <span /><span />
          <span className="text-right font-mono font-black text-base text-white tabular">
            {innings.totalRuns}
          </span>
        </div>

        {/* Yet to bat */}
        {yetToBat.length > 0 && (
          <div className="px-4 py-3 border-b border-pitch-border/30">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1.5">Yet to bat</p>
            <p className="text-sm text-slate-400 leading-relaxed">
              {yetToBat.map((bs: any) => bs.player.name).join(' · ')}
            </p>
          </div>
        )}

        {/* Fall of wickets */}
        {fallOfWickets.length > 0 && (
          <div className="px-4 py-3 border-b border-pitch-border/30">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1.5">
              Fall of wickets
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              {fallOfWickets.map((fow: any, i: number) => (
                <span key={fow.wicket}>
                  {i > 0 && <span className="text-slate-600 mx-1">·</span>}
                  <span className="font-bold text-white">{fow.runs}/{fow.wicket}</span>
                  <span className="text-slate-500 ml-1">({fow.name}, {fow.over} ov)</span>
                </span>
              ))}
            </p>
          </div>
        )}
      </div>

      {/* ── BOWLING section ─────────────────────────────── */}
      <div>
        {/* Column headers */}
        <div className="grid scorecard-bowl-grid px-4 py-1.5 border-b border-pitch-border/60 bg-pitch-dark/30">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Bowling</span>
          <span className="text-[11px] font-bold text-slate-500 text-right">O</span>
          <span className="text-[11px] font-bold text-slate-500 text-right">M</span>
          <span className="text-[11px] font-bold text-slate-500 text-right">R</span>
          <span className="text-[11px] font-bold text-slate-500 text-right">W</span>
          <span className="text-[11px] font-bold text-slate-500 text-right">Econ</span>
        </div>

        {bowlingScorecard.map((bw: any) => {
          const eco = economy(bw.runs, bw.balls);
          return (
            <div key={bw.player._id}
              className={cn(
                'grid scorecard-bowl-grid px-4 py-2.5 border-b border-pitch-border/30 transition-colors',
                bw.isBowling ? 'bg-brand-500/[0.04]' : 'hover:bg-white/[0.02]'
              )}>
              <div className="flex items-center gap-1 min-w-0">
                <span className={cn(
                  'font-body text-sm truncate',
                  bw.isBowling ? 'text-white font-semibold' : 'text-slate-300'
                )}>
                  {bw.player.name}
                </span>
                {bw.isBowling && <span className="text-brand-400 text-[10px] flex-shrink-0">●</span>}
              </div>
              <span className="text-right font-mono text-sm text-slate-300 tabular">
                {ballsToOvers(bw.balls)}
              </span>
              <span className="text-right font-mono text-sm text-slate-500 tabular">
                {bw.maidens}
              </span>
              <span className="text-right font-mono text-sm text-white tabular">
                {bw.runs}
              </span>
              <span className={cn(
                'text-right font-mono font-bold text-sm tabular',
                bw.wickets > 0 ? 'text-score-wicket' : 'text-slate-500'
              )}>
                {bw.wickets}
              </span>
              <span className={cn(
                'text-right font-mono text-xs tabular',
                eco <= 6  ? 'text-score-four font-semibold' :
                eco <= 8  ? 'text-slate-300' :
                eco <= 11 ? 'text-score-wide' : 'text-score-wicket'
              )}>
                {bw.balls > 0 ? eco.toFixed(2) : '-'}
              </span>
            </div>
          );
        })}
      </div>

    </div>
  );
}