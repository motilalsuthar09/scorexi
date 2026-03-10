// src/app/api/match/[id]/route.ts
// ============================================================
// GET   /api/match/[id]  — full match + scorecard
// PATCH /api/match/[id]  — update status / visibility
// DELETE /api/match/[id] — delete match, rollback player stats
//   Auth: shareToken (host only)
//   - Deletes: Match, all Innings, all Balls, Commentary
//   - Rolls back: Player.stats (subtracts this match's contribution)
//   - Deletes player profile only if: unclaimed AND this was their only match
// ============================================================
import { NextRequest } from 'next/server';
import { connectDB }   from '@/lib/db';
import Match           from '@/models/Match';
import Innings         from '@/models/Innings';
import Ball            from '@/models/Ball';
import Player          from '@/models/Player';
import Commentary      from '@/models/Commentary';
import { apiSuccess, apiError, formatBallDisplay } from '@/lib/utils';
import mongoose        from 'mongoose';

function buildDismissalDesc(
  dismissalType: string | null,
  bowlerName:    string,
  fielderName:   string | null,
): string {
  if (!dismissalType) return 'out';
  switch (dismissalType) {
    case 'bowled':     return `b ${bowlerName}`;
    case 'caught':     return fielderName ? `c ${fielderName} b ${bowlerName}` : `c & b ${bowlerName}`;
    case 'lbw':        return `lbw b ${bowlerName}`;
    case 'stumped':    return fielderName ? `st ${fielderName} b ${bowlerName}` : `st b ${bowlerName}`;
    case 'run_out':    return fielderName ? `run out (${fielderName})` : 'run out';
    case 'hit_wicket': return `hit wkt b ${bowlerName}`;
    case 'retired':    return 'retired hurt';
    default:           return dismissalType.replace(/_/g, ' ');
  }
}

// ─── GET /api/match/[id] ──────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id }  = params;
    const token   = req.nextUrl.searchParams.get('token');

    await connectDB();

    const match = await Match.findById(id).lean();
    if (!match) return apiError('Match not found', 404);

    if (match.visibility === 'private') {
      if (!token || token !== match.shareToken) {
        return apiError('Access denied. Share link required.', 403);
      }
    }

    const inningsArr = await Innings.find({ matchId: id })
      .sort({ inningsNumber: 1 })
      .lean();

    const allPlayerIds = [
      ...match.teamA.playerIds,
      ...match.teamB.playerIds,
    ].map(String);

    const players = await Player.find({ _id: { $in: allPlayerIds } })
      .select('name username profilePic')
      .lean();

    const playerMap = Object.fromEntries(players.map(p => [p._id.toString(), p]));

    const scorecards = await Promise.all(
      inningsArr.map(async (innings) => {
        const balls = await Ball.find({ inningsId: innings._id })
          .sort({ totalBallsInInnings: 1 })
          .lean();

        const battingMap = new Map<string, {
          runs: number; balls: number; fours: number; sixes: number;
          dismissed: boolean; dismissalDesc: string;
        }>();

        const battingTeamPlayerIds = (
          innings.battingTeam === 'teamA' ? match.teamA.playerIds : match.teamB.playerIds
        ).map(String);

        for (const pid of battingTeamPlayerIds) {
          battingMap.set(pid, { runs: 0, balls: 0, fours: 0, sixes: 0, dismissed: false, dismissalDesc: '' });
        }

        const bowlingMap = new Map<string, {
          runs: number; balls: number; wickets: number; maidens: number;
        }>();
        const overRunMap         = new Map<string, number>();
        const fowList: { wicket: number; runs: number; over: string; name: string }[] = [];
        let wicketCount = 0;

        for (const ball of balls) {
          const bid  = ball.batsmanId.toString();
          const bwid = ball.bowlerId.toString();

          const bs = battingMap.get(bid);
          if (bs) {
            if (ball.isLegalDelivery) bs.balls++;
            if (!ball.extraType || ball.extraType === 'no_ball') {
              bs.runs += ball.runsOffBat;
              if (ball.runsOffBat === 4) bs.fours++;
              if (ball.runsOffBat === 6) bs.sixes++;
            }
            if (ball.isWicket && ball.dismissedPlayerId?.toString() === bid) {
              bs.dismissed = true;
              const bowlerName = playerMap[bwid]?.name ?? 'Unknown';
              const fielderName = ball.fielderIds?.[0]
                ? (playerMap[ball.fielderIds[0].toString()]?.name ?? null)
                : null;
              bs.dismissalDesc = buildDismissalDesc(ball.dismissalType, bowlerName, fielderName);
            }
          }

          if (!bowlingMap.has(bwid)) {
            bowlingMap.set(bwid, { runs: 0, balls: 0, wickets: 0, maidens: 0 });
          }
          const bw = bowlingMap.get(bwid)!;
          bw.runs += ball.runsOffBat + ball.extras;
          if (ball.isLegalDelivery) bw.balls++;
          if (ball.isWicket) bw.wickets++;

          if (ball.isLegalDelivery) {
            const overKey = `${bwid}:${ball.overNumber}`;
            overRunMap.set(overKey, (overRunMap.get(overKey) ?? 0) + ball.runsOffBat + ball.extras);
          }

          if (ball.isWicket) {
            wicketCount++;
            const over      = `${ball.overNumber}.${ball.ballInOver + 1}`;
            const dismissed = ball.dismissedPlayerId
              ? playerMap[ball.dismissedPlayerId.toString()]?.name ?? 'Unknown'
              : '';
            fowList.push({ wicket: wicketCount, runs: ball.inningsRunsAfter, over, name: dismissed });
          }
        }

        const ballsPerOverByBowler = new Map<string, number>();
        for (const ball of balls) {
          if (!ball.isLegalDelivery) continue;
          const k = `${ball.bowlerId.toString()}:${ball.overNumber}`;
          ballsPerOverByBowler.set(k, (ballsPerOverByBowler.get(k) ?? 0) + 1);
        }
        for (const [key, ballCount] of ballsPerOverByBowler.entries()) {
          if (ballCount === 6) {
            const runsInOver = overRunMap.get(key) ?? 0;
            if (runsInOver === 0) {
              const bwid = key.split(':')[0];
              const bw   = bowlingMap.get(bwid);
              if (bw) bw.maidens++;
            }
          }
        }

        const recentBalls = balls.slice(-12).map(b => formatBallDisplay(
          b.runsOffBat, b.extraType, b.isWicket
        ));

        return {
          innings,
          battingScorecard: battingTeamPlayerIds.map(pid => ({
            player: playerMap[pid] ?? { _id: pid, name: 'Unknown' },
            ...battingMap.get(pid) ?? { runs: 0, balls: 0, fours: 0, sixes: 0, dismissed: false, dismissalDesc: '' },
            isStriker: innings.currentStrikerId?.toString() === pid,
            batting:   [innings.currentStrikerId?.toString(), innings.currentNonStrikerId?.toString()].includes(pid),
          })),
          bowlingScorecard: Array.from(bowlingMap.entries()).map(([pid, stats]) => ({
            player: playerMap[pid] ?? { _id: pid, name: 'Unknown' },
            ...stats,
            isBowling: innings.currentBowlerId?.toString() === pid,
          })),
          fallOfWickets: fowList,
          recentBalls,
        };
      })
    );

    const { shareToken: _st, ...matchSafe } = match as typeof match & { shareToken: string };

    return apiSuccess({
      match: {
        ...matchSafe,
        shareToken: match.visibility === 'private' ? match.shareToken : undefined,
        shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/match/${match._id}?token=${match.shareToken}`,
      },
      playerMap,
      scorecards,
    });

  } catch (err) {
    console.error('[GET /api/match/[id]]', err);
    return apiError('Failed to load match', 500);
  }
}

// ─── PATCH /api/match/[id] ────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id }  = params;
    const body    = await req.json();
    const { visibility, status } = body;

    await connectDB();

    const match = await Match.findById(id);
    if (!match) return apiError('Match not found', 404);

    if (visibility && ['public', 'private'].includes(visibility)) {
      match.visibility = visibility;
    }
    if (status === 'completed') {
      match.status = 'completed';
      match.completedAt = new Date();
    }
    if (status === 'innings_break') {
      match.status = 'innings_break';
      match.currentInnings = 2;
    }
    if (status === 'live') {
      match.status = 'live';
    }

    await match.save();
    return apiSuccess({ updated: true });
  } catch (err) {
    console.error('[PATCH /api/match/[id]]', err);
    return apiError('Failed to update match', 500);
  }
}

// ─── DELETE /api/match/[id] ───────────────────────────────
// Auth: shareToken passed as query param (same as scoring page)
// Steps:
//   1. Verify shareToken
//   2. Aggregate each player's contribution from Ball collection
//   3. Subtract from Player.stats (floor at 0)
//   4. If unclaimed player was ONLY in this match → delete profile
//   5. Delete Balls, Innings, Commentary, Match
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id }  = params;
    const token   = req.nextUrl.searchParams.get('token');

    if (!token) return apiError('Share token required', 401);
    if (!mongoose.Types.ObjectId.isValid(id)) return apiError('Invalid match ID', 400);

    await connectDB();

    const match = await Match.findById(id).lean();
    if (!match)                    return apiError('Match not found', 404);
    if (match.shareToken !== token) return apiError('Unauthorised', 403);

    // ── All innings + balls for this match ────────────────
    const inningsArr = await Innings.find({ matchId: id }).lean();
    const inningsIds = inningsArr.map(i => i._id);
    const balls      = await Ball.find({ inningsId: { $in: inningsIds } }).lean();

    // ── Aggregate per-player stats from balls ─────────────
    // batting: runs, ballsFaced, fours, sixes, wickets (times dismissed)
    // bowling: ballsBowled, runsConceded, wicketsTaken
    type PlayerStats = {
      runs: number; ballsFaced: number; fours: number; sixes: number;
      timesOut: number; notOut: boolean;
      ballsBowled: number; runsConceded: number; wicketsTaken: number;
    };
    const statsMap = new Map<string, PlayerStats>();

    const getOrInit = (pid: string): PlayerStats => {
      if (!statsMap.has(pid)) {
        statsMap.set(pid, {
          runs: 0, ballsFaced: 0, fours: 0, sixes: 0,
          timesOut: 0, notOut: false,
          ballsBowled: 0, runsConceded: 0, wicketsTaken: 0,
        });
      }
      return statsMap.get(pid)!;
    };

    for (const ball of balls) {
      const bid  = ball.batsmanId.toString();
      const bwid = ball.bowlerId.toString();

      // batting
      const bs = getOrInit(bid);
      if (ball.isLegalDelivery) bs.ballsFaced++;
      if (!ball.extraType || ball.extraType === 'no_ball') {
        bs.runs  += ball.runsOffBat;
        if (ball.runsOffBat === 4) bs.fours++;
        if (ball.runsOffBat === 6) bs.sixes++;
      }
      if (ball.isWicket && ball.dismissedPlayerId?.toString() === bid) {
        bs.timesOut++;
      }

      // bowling
      const bw = getOrInit(bwid);
      if (ball.isLegalDelivery) bw.ballsBowled++;
      bw.runsConceded += ball.runsOffBat + ball.extras;
      if (ball.isWicket) bw.wicketsTaken++;
    }

    // Mark who batted and wasn't dismissed (not out)
    const allMatchPlayerIds = [
      ...match.teamA.playerIds.map(String),
      ...match.teamB.playerIds.map(String),
    ];
    for (const pid of allMatchPlayerIds) {
      const s = statsMap.get(pid);
      if (s && s.ballsFaced > 0 && s.timesOut === 0) s.notOut = true;
    }

    // ── Subtract stats from each player ───────────────────
    // We floor at 0 to avoid negative numbers from any edge cases
    const clamp = (n: number) => Math.max(0, n);

    for (const [pid, s] of statsMap.entries()) {
      const player = await Player.findById(pid);
      if (!player) continue;

      player.stats.totalRuns          = clamp(player.stats.totalRuns          - s.runs);
      player.stats.totalBallsFaced    = clamp(player.stats.totalBallsFaced    - s.ballsFaced);
      player.stats.totalFours         = clamp(player.stats.totalFours         - s.fours);
      player.stats.totalSixes         = clamp(player.stats.totalSixes         - s.sixes);
      player.stats.notOuts            = clamp(player.stats.notOuts            - (s.notOut ? 1 : 0));
      player.stats.totalWickets       = clamp(player.stats.totalWickets       - s.wicketsTaken);
      player.stats.totalBallsBowled   = clamp(player.stats.totalBallsBowled   - s.ballsBowled);
      player.stats.totalRunsConceded  = clamp(player.stats.totalRunsConceded  - s.runsConceded);
      player.stats.matchesPlayed      = clamp(player.stats.matchesPlayed      - 1);

      await player.save();
    }

    // ── Delete unclaimed orphan profiles ──────────────────
    // An orphan = unclaimed player whose ONLY match was this one.
    // We check by searching for their player ID in any OTHER match's playerIds.
    for (const pid of allMatchPlayerIds) {
      const player = await Player.findById(pid).lean();
      if (!player || player.isClaimed) continue; // keep claimed profiles always

      const otherMatch = await Match.findOne({
        _id: { $ne: match._id },
        $or: [
          { 'teamA.playerIds': new mongoose.Types.ObjectId(pid) },
          { 'teamB.playerIds': new mongoose.Types.ObjectId(pid) },
        ],
      }).lean();

      if (!otherMatch) {
        // No other match references this player — safe to delete
        await Player.findByIdAndDelete(pid);
      }
    }

    // ── Delete all match data ──────────────────────────────
    await Ball.deleteMany({ inningsId: { $in: inningsIds } });
    await Innings.deleteMany({ matchId: id });

    // Delete commentary if model exists
    try {
      await Commentary.deleteMany({ matchId: id });
    } catch { /* Commentary model may not exist in all setups */ }

    await Match.findByIdAndDelete(id);

    return apiSuccess({ deleted: true, matchId: id });

  } catch (err) {
    console.error('[DELETE /api/match/[id]]', err);
    return apiError('Failed to delete match', 500);
  }
}