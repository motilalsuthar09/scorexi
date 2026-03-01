// ============================================================
// ScoreXI — Stats Aggregation Engine
// Runs after every match completion to update player careers
// ============================================================
import mongoose from 'mongoose';
import Ball from '@/models/Ball';
import Innings from '@/models/Innings';
import Player from '@/models/Player';

export interface MatchPlayerStats {
  playerId: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isNotOut: boolean;
  wickets: number;
  ballsBowled: number;
  runsConceded: number;
}

/**
 * Aggregate all ball data for a match into per-player stats
 */
export async function computeMatchStats(matchId: string): Promise<MatchPlayerStats[]> {
  const innings = await Innings.find({ matchId }).lean();
  if (!innings.length) return [];

  const statsMap = new Map<string, MatchPlayerStats>();

  const ensure = (id: string) => {
    if (!statsMap.has(id)) {
      statsMap.set(id, {
        playerId: id,
        runs: 0, balls: 0, fours: 0, sixes: 0,
        isNotOut: true,
        wickets: 0, ballsBowled: 0, runsConceded: 0,
      });
    }
    return statsMap.get(id)!;
  };

  for (const inns of innings) {
    const balls = await Ball.find({ inningsId: inns._id }).lean();

    for (const ball of balls) {
      const bid  = ball.batsmanId.toString();
      const bwid = ball.bowlerId.toString();

      // ── Batting stats ─────────────────────────────────
      const bs = ensure(bid);
      if (ball.isLegalDelivery) bs.balls++;
      if (!ball.extraType || ball.extraType === 'no_ball') {
        bs.runs += ball.runsOffBat;
        if (ball.runsOffBat === 4) bs.fours++;
        if (ball.runsOffBat === 6) bs.sixes++;
      }
      // Mark dismissed
      if (ball.isWicket && ball.dismissedPlayerId?.toString() === bid) {
        bs.isNotOut = false;
      }

      // ── Bowling stats ─────────────────────────────────
      const bw = ensure(bwid);
      if (ball.isLegalDelivery) bw.ballsBowled++;
      bw.runsConceded += ball.runsOffBat + ball.extras;
      if (ball.isWicket && ball.dismissalType !== 'run_out') {
        bw.wickets++;
      }
    }
  }

  return Array.from(statsMap.values());
}

/**
 * Write aggregated match stats to player career profiles
 * Safe to call multiple times (idempotent via matchId tracking not implemented yet — Phase 3)
 */
export async function syncStatsToPlayers(matchId: string): Promise<void> {
  const perPlayer = await computeMatchStats(matchId);

  const bulkOps = perPlayer.map(ps => {
    const inc: Record<string, number> = {
      'stats.matchesPlayed':     1,
      'stats.totalRuns':         ps.runs,
      'stats.totalBallsFaced':   ps.balls,
      'stats.totalFours':        ps.fours,
      'stats.totalSixes':        ps.sixes,
      'stats.totalWickets':      ps.wickets,
      'stats.totalBallsBowled':  ps.ballsBowled,
      'stats.totalRunsConceded': ps.runsConceded,
    };
    if (ps.isNotOut) inc['stats.notOuts'] = 1;

    return {
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(ps.playerId) },
        update: [
          {
            $set: {
              'stats.matchesPlayed':     { $add: ['$stats.matchesPlayed',     inc['stats.matchesPlayed']] },
              'stats.totalRuns':         { $add: ['$stats.totalRuns',         inc['stats.totalRuns']] },
              'stats.totalBallsFaced':   { $add: ['$stats.totalBallsFaced',   inc['stats.totalBallsFaced']] },
              'stats.totalFours':        { $add: ['$stats.totalFours',        inc['stats.totalFours']] },
              'stats.totalSixes':        { $add: ['$stats.totalSixes',        inc['stats.totalSixes']] },
              'stats.notOuts':           { $add: ['$stats.notOuts',           ps.isNotOut ? 1 : 0] },
              'stats.totalWickets':      { $add: ['$stats.totalWickets',      inc['stats.totalWickets']] },
              'stats.totalBallsBowled':  { $add: ['$stats.totalBallsBowled',  inc['stats.totalBallsBowled']] },
              'stats.totalRunsConceded': { $add: ['$stats.totalRunsConceded', inc['stats.totalRunsConceded']] },
              // Update highest score if this innings score is higher
              'stats.highestScore': {
                $cond: {
                  if:   { $gt: [ps.runs, '$stats.highestScore'] },
                  then: ps.runs,
                  else: '$stats.highestScore',
                },
              },
              // Update best bowling if better (more wickets, or same wickets fewer runs)
              'stats.bestBowlingWickets': {
                $cond: {
                  if:   { $gt: [ps.wickets, '$stats.bestBowlingWickets'] },
                  then: ps.wickets,
                  else: '$stats.bestBowlingWickets',
                },
              },
              'stats.bestBowlingRuns': {
                $cond: {
                  if: {
                    $and: [
                      { $eq:  [ps.wickets, '$stats.bestBowlingWickets'] },
                      { $lt:  [ps.runsConceded, '$stats.bestBowlingRuns'] },
                      { $gt:  [ps.wickets, 0] },
                    ],
                  },
                  then: ps.runsConceded,
                  else: '$stats.bestBowlingRuns',
                },
              },
            },
          },
        ],
      },
    };
  });

  if (bulkOps.length > 0) {
    await Player.bulkWrite(bulkOps as Parameters<typeof Player.bulkWrite>[0]);
  }
}

/**
 * Compute derived stats from raw career numbers
 */
export function derivedBattingStats(stats: {
  totalRuns: number;
  totalBallsFaced: number;
  matchesPlayed: number;
  notOuts: number;
  highestScore: number;
  totalFours: number;
  totalSixes: number;
}) {
  const innings    = stats.matchesPlayed;
  const dismissals = innings - stats.notOuts;
  const avg        = dismissals > 0 ? (stats.totalRuns / dismissals) : stats.totalRuns;
  const sr         = stats.totalBallsFaced > 0 ? (stats.totalRuns / stats.totalBallsFaced) * 100 : 0;

  return {
    average:     Math.round(avg * 100) / 100,
    strikeRate:  Math.round(sr * 10)   / 10,
    innings,
    notOuts:     stats.notOuts,
    highestScore: stats.highestScore,
    totalFours:  stats.totalFours,
    totalSixes:  stats.totalSixes,
  };
}

export function derivedBowlingStats(stats: {
  totalWickets: number;
  totalBallsBowled: number;
  totalRunsConceded: number;
  bestBowlingWickets: number;
  bestBowlingRuns: number;
}) {
  const overs   = stats.totalBallsBowled / 6;
  const avg     = stats.totalWickets > 0 ? stats.totalRunsConceded / stats.totalWickets : 0;
  const eco     = overs > 0 ? stats.totalRunsConceded / overs : 0;
  const sr      = stats.totalWickets > 0 ? stats.totalBallsBowled / stats.totalWickets : 0;

  return {
    wickets:     stats.totalWickets,
    overs:       Math.round(overs * 10) / 10,
    average:     Math.round(avg * 100)  / 100,
    economy:     Math.round(eco * 100)  / 100,
    strikeRate:  Math.round(sr * 10)    / 10,
    bestBowling: stats.bestBowlingWickets > 0
      ? `${stats.bestBowlingWickets}/${stats.bestBowlingRuns}`
      : '—',
  };
}
