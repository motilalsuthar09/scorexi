// src/app/api/leaderboard/route.ts
// ============================================================
// GET /api/leaderboard?type=batting|bowling|allround&limit=25&matchId=xxx
//   matchId=all   → global (default)
//   matchId=<id>  → stats for that single match only
// ============================================================
import { NextRequest }   from 'next/server';
import { connectDB }     from '@/lib/db';
import Player            from '@/models/Player';
import Ball              from '@/models/Ball';
import Innings           from '@/models/Innings';
import Match             from '@/models/Match';
import { apiSuccess, apiError } from '@/lib/utils';
import mongoose          from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const sp      = req.nextUrl.searchParams;
    const type    = sp.get('type')  ?? 'batting';
    const limit   = Math.min(50, parseInt(sp.get('limit') ?? '25'));
    const matchId = sp.get('matchId') ?? 'all';   // 'all' = global

    await connectDB();

    // ── GLOBAL mode: read from Player.stats (pre-aggregated) ──────────────
    if (matchId === 'all') {
      let players: any[];

      if (type === 'batting') {
        players = await Player.find({ 'stats.matchesPlayed': { $gt: 0 } })
          .sort({ 'stats.totalRuns': -1 })
          .limit(limit)
          .select('name username profilePic isClaimed stats')
          .lean();
      } else if (type === 'bowling') {
        players = await Player.find({ 'stats.totalWickets': { $gt: 0 } })
          .sort({ 'stats.totalWickets': -1 })
          .limit(limit)
          .select('name username profilePic isClaimed stats')
          .lean();
      } else if (type === 'allround') {
        players = await Player.find({
          'stats.totalWickets': { $gt: 0 },
          'stats.totalRuns':    { $gte: 10 },
        })
          .sort({ 'stats.totalRuns': -1 })
          .limit(limit)
          .select('name username profilePic isClaimed stats')
          .lean();
      } else {
        return apiError('Invalid type', 422);
      }

      return apiSuccess({ players, type, scope: 'global' });
    }

    // ── MATCH mode: aggregate from Ball collection on-the-fly ──────────────
    if (!mongoose.Types.ObjectId.isValid(matchId)) {
      return apiError('Invalid matchId', 400);
    }

    const innings = await Innings.find({ matchId }).select('_id battingTeam bowlingTeam').lean();
    const inningsIds = innings.map(i => i._id);

    if (inningsIds.length === 0) {
      return apiSuccess({ players: [], type, scope: 'match' });
    }

    // Aggregate batting stats for this match
    const battingAgg = await Ball.aggregate([
      { $match: { inningsId: { $in: inningsIds } } },
      {
        $group: {
          _id:       '$batsmanId',
          runs:      { $sum: { $cond: [{ $in: ['$extraType', ['wide', 'no_ball']] }, 0, '$runsOffBat'] } },
          balls:     { $sum: { $cond: [{ $in: ['$extraType', ['wide']] }, 0, 1] } },
          fours:     { $sum: { $cond: [{ $eq: ['$runsOffBat', 4] }, 1, 0] } },
          sixes:     { $sum: { $cond: [{ $eq: ['$runsOffBat', 6] }, 1, 0] } },
          isOut:     { $sum: { $cond: [{ $and: ['$isWicket', { $eq: ['$dismissedPlayerId', '$batsmanId'] }] }, 1, 0] } },
        },
      },
      { $sort: { runs: -1 } },
      { $limit: limit },
    ]);

    // Aggregate bowling stats for this match
    const bowlingAgg = await Ball.aggregate([
      { $match: { inningsId: { $in: inningsIds } } },
      {
        $group: {
          _id:      '$bowlerId',
          runs:     { $sum: { $add: ['$runsOffBat', { $cond: [{ $in: ['$extraType', ['wide', 'no_ball']] }, 1, 0] }] } },
          wickets:  { $sum: { $cond: [{ $and: ['$isWicket', { $not: { $in: ['$dismissalType', ['run_out', 'retired']] } }] }, 1, 0] } },
          balls:    { $sum: { $cond: [{ $in: ['$extraType', ['wide', 'no_ball']] }, 0, 1] } },
        },
      },
      { $sort: { wickets: -1, runs: 1 } },
      { $limit: limit },
    ]);

    // Collect all player IDs we need
    const allIds = [
      ...battingAgg.map(b => b._id),
      ...bowlingAgg.map(b => b._id),
    ].filter(Boolean);

    const playerDocs = await Player
      .find({ _id: { $in: allIds } })
      .select('name username isClaimed profilePic')
      .lean();
    const pMap = Object.fromEntries(playerDocs.map(p => [p._id.toString(), p]));

    let players: any[];

    if (type === 'batting') {
      players = battingAgg
        .filter(b => b._id)
        .map(b => ({
          _id:      b._id,
          name:     pMap[b._id.toString()]?.name      ?? 'Unknown',
          username: pMap[b._id.toString()]?.username  ?? null,
          isClaimed:pMap[b._id.toString()]?.isClaimed ?? false,
          stats: {
            totalRuns:        b.runs,
            totalBallsFaced:  b.balls,
            matchesPlayed:    1,
            notOuts:          b.isOut === 0 ? 1 : 0,
            highestScore:     b.runs,
            fours:            b.fours,
            sixes:            b.sixes,
          },
        }));
    } else if (type === 'bowling') {
      players = bowlingAgg
        .filter(b => b._id)
        .map(b => ({
          _id:      b._id,
          name:     pMap[b._id.toString()]?.name      ?? 'Unknown',
          username: pMap[b._id.toString()]?.username  ?? null,
          isClaimed:pMap[b._id.toString()]?.isClaimed ?? false,
          stats: {
            totalWickets:      b.wickets,
            totalRunsConceded: b.runs,
            totalBallsBowled:  b.balls,
            matchesPlayed:     1,
            bestBowlingWickets: b.wickets,
            bestBowlingRuns:    b.runs,
          },
        }));
    } else {
      // allround — merge batting + bowling
      const bMap = Object.fromEntries(battingAgg.map(b => [b._id?.toString(), b]));
      const wMap = Object.fromEntries(bowlingAgg.map(b => [b._id?.toString(), b]));
      const allPlayerIds = [...new Set([...Object.keys(bMap), ...Object.keys(wMap)])];
      players = allPlayerIds
        .map(id => {
          const bat  = bMap[id];
          const bowl = wMap[id];
          return {
            _id:      id,
            name:     pMap[id]?.name      ?? 'Unknown',
            username: pMap[id]?.username  ?? null,
            isClaimed:pMap[id]?.isClaimed ?? false,
            stats: {
              totalRuns:    bat?.runs    ?? 0,
              totalWickets: bowl?.wickets ?? 0,
              matchesPlayed: 1,
            },
          };
        })
        .filter(p => p.stats.totalRuns > 0 || p.stats.totalWickets > 0)
        .sort((a, b) => b.stats.totalRuns - a.stats.totalRuns)
        .slice(0, limit);
    }

    return apiSuccess({ players, type, scope: 'match' });
  } catch (err) {
    console.error('[GET /api/leaderboard]', err);
    return apiError('Failed to fetch leaderboard', 500);
  }
}