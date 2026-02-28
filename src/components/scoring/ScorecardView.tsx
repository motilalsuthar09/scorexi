'use client';

import { cn, ballsToOvers, strikeRate, economy } from '@/lib/utils';

interface Props {
  scorecard: {
    innings: any;
    battingScorecard: any[];
    bowlingScorecard: any[];
    fallOfWickets:    any[];
    recentBalls:      any[];
  };
  match: any;
}

export default function ScorecardView({ scorecard, match }: Props) {
  const { innings, battingScorecard, bowlingScorecard, fallOfWickets } = scorecard;

  const teamName = innings.battingTeam === 'teamA' ? match.teamA.name : match.teamB.name;

  return (
    <div className="card overflow-hidden">
      {/* Innings header */}
      <div className="p-4 border-b border-pitch-border bg-pitch-card/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-0.5">
              Innings {innings.inningsNumber}
            </p>
            <h3 className="font-display font-bold text-white">{teamName}</h3>
          </div>
          <div className="text-right">
            <p className="font-display font-bold text-2xl text-white tabular">
              {innings.totalRuns}/{innings.wickets}
            </p>
            <p className="text-slate-400 text-xs">
              ({ballsToOvers(innings.totalBalls)} ov)
            </p>
          </div>
        </div>
        {innings.targetRuns && (
          <p className="text-xs text-score-wide mt-1">Target: {innings.targetRuns}</p>
        )}
      </div>

      {/* Batting table */}
      <div className="overflow-x-auto">
        <table className="w-full scorecard-table">
          <thead>
            <tr className="border-b border-pitch-border bg-pitch-dark/50">
              <th className="text-left pl-4">Batter</th>
              <th>R</th>
              <th>B</th>
              <th>4s</th>
              <th>6s</th>
              <th>SR</th>
            </tr>
          </thead>
          <tbody>
            {battingScorecard.map((bs: any) => (
              <tr key={bs.player._id} className={cn(
                bs.isStriker && 'bg-brand-500/5',
              )}>
                <td className="pl-4">
                  <div className="flex items-center gap-2">
                    {bs.isStriker && (
                      <span className="text-brand-400 text-xs">*</span>
                    )}
                    <span className={cn(
                      'font-body text-sm',
                      bs.batting ? 'text-white' : 'text-slate-400'
                    )}>
                      {bs.player.name}
                    </span>
                    {bs.dismissed && (
                      <span className="text-[10px] text-slate-500 hidden sm:inline">
                        {bs.dismissalDesc}
                      </span>
                    )}
                  </div>
                </td>
                <td className={cn(
                  'font-mono font-bold',
                  bs.runs >= 50 ? 'text-score-wide' : 'text-white'
                )}>
                  {bs.runs}
                </td>
                <td className="text-slate-400 tabular">{bs.balls}</td>
                <td className="text-score-four tabular">{bs.fours}</td>
                <td className="text-score-six tabular">{bs.sixes}</td>
                <td className="text-slate-400 tabular text-xs">
                  {strikeRate(bs.runs, bs.balls).toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Extras */}
      {innings.extras && (
        <div className="px-4 py-2 border-y border-pitch-border/50 text-xs text-slate-500">
          Extras: {innings.extras.total} (w {innings.extras.wides}, nb {innings.extras.noBalls},
          b {innings.extras.byes}, lb {innings.extras.legByes})
        </div>
      )}

      {/* Bowling table */}
      <div className="overflow-x-auto mt-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 pt-3 pb-1">
          Bowling
        </p>
        <table className="w-full scorecard-table">
          <thead>
            <tr className="border-b border-pitch-border bg-pitch-dark/50">
              <th className="text-left pl-4">Bowler</th>
              <th>O</th>
              <th>M</th>
              <th>R</th>
              <th>W</th>
              <th>Eco</th>
            </tr>
          </thead>
          <tbody>
            {bowlingScorecard.map((bw: any) => (
              <tr key={bw.player._id} className={cn(
                bw.isBowling && 'bg-brand-500/5'
              )}>
                <td className="pl-4">
                  <span className={cn('font-body text-sm', bw.isBowling ? 'text-white' : 'text-slate-400')}>
                    {bw.player.name}
                    {bw.isBowling && <span className="text-brand-400 text-xs ml-1">*</span>}
                  </span>
                </td>
                <td className="tabular text-white">{ballsToOvers(bw.balls)}</td>
                <td className="tabular text-slate-400">{bw.maidens}</td>
                <td className="tabular text-white">{bw.runs}</td>
                <td className={cn('tabular font-bold', bw.wickets > 0 ? 'text-score-wicket' : 'text-slate-400')}>
                  {bw.wickets}
                </td>
                <td className="tabular text-xs text-slate-400">
                  {economy(bw.runs, bw.balls).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Fall of Wickets */}
      {fallOfWickets.length > 0 && (
        <div className="px-4 py-3 border-t border-pitch-border/50">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Fall of Wickets
          </p>
          <div className="flex flex-wrap gap-2">
            {fallOfWickets.map((fow: any) => (
              <span key={fow.wicket} className="text-xs text-slate-400 bg-pitch-dark px-2 py-1 rounded-lg">
                <span className="text-score-wicket font-bold">{fow.wicket}-{fow.runs}</span>
                <span className="text-slate-500 ml-1">({fow.over} ov, {fow.name})</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
