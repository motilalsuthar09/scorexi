// ============================================================
// GET  /api/match/[id]   — get full match + scorecard
// PATCH /api/match/[id]  — update match (visibility, complete)
// ============================================================
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Match from '@/models/Match';
import Innings from '@/models/Innings';
import Ball from '@/models/Ball';
import Player from '@/models/Player';
import { apiSuccess, apiError, formatBallDisplay } from '@/lib/utils';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const token = req.nextUrl.searchParams.get('token');

    await connectDB();

    const match = await Match.findById(id).lean();
    if (!match) return apiError('Match not found', 404);

    // Access control: private matches need token
    if (match.visibility === 'private') {
      if (!token || token !== match.shareToken) {
        return apiError('Access denied. Share link required.', 403);
      }
    }

    // Load both innings
    const inningsArr = await Innings.find({ matchId: id })
      .sort({ inningsNumber: 1 })
      .lean();

    // Load all players referenced in match
    const allPlayerIds = [
      ...match.teamA.playerIds,
      ...match.teamB.playerIds,
    ].map(String);

    const players = await Player.find({ _id: { $in: allPlayerIds } })
      .select('name username profilePic')
      .lean();

    const playerMap = Object.fromEntries(players.map(p => [p._id.toString(), p]));

    // Build scorecard for each innings
    const scorecards = await Promise.all(
      inningsArr.map(async (innings) => {
        const balls = await Ball.find({ inningsId: innings._id })
          .sort({ totalBallsInInnings: 1 })
          .lean();

        // ── Batting scorecard ─────────────────────────────
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

        // ── Bowling scorecard ─────────────────────────────
        const bowlingMap = new Map<string, {
          runs: number; balls: number; wickets: number; maidens: number; currentOverRuns: number; currentOverBalls: number;
        }>();

        // Fall of wickets
        const fowList: { wicket: number; runs: number; over: string; name: string }[] = [];
        let wicketCount = 0;

        for (const ball of balls) {
          const bid = ball.batsmanId.toString();
          const bwid = ball.bowlerId.toString();

          // Batting
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
              bs.dismissalDesc = ball.dismissalType || 'out';
            }
          }

          // Bowling
          if (!bowlingMap.has(bwid)) {
            bowlingMap.set(bwid, { runs: 0, balls: 0, wickets: 0, maidens: 0, currentOverRuns: 0, currentOverBalls: 0 });
          }
          const bw = bowlingMap.get(bwid)!;
          bw.runs += ball.runsOffBat + ball.extras;
          if (ball.isLegalDelivery) {
            bw.balls++;
            bw.currentOverBalls++;
            bw.currentOverRuns += ball.runsOffBat + ball.extras;
            // Check maiden at end of over
            if (bw.currentOverBalls === 6) {
              if (bw.currentOverRuns === 0) bw.maidens++;
              bw.currentOverBalls = 0;
              bw.currentOverRuns = 0;
            }
          }
          if (ball.isWicket) bw.wickets++;

          // Fall of wicket
          if (ball.isWicket) {
            wicketCount++;
            const over = `${ball.overNumber}.${ball.ballInOver}`;
            const dismissed = ball.dismissedPlayerId
              ? playerMap[ball.dismissedPlayerId.toString()]?.name ?? 'Unknown'
              : '';
            fowList.push({
              wicket: wicketCount,
              runs:   ball.inningsRunsAfter,
              over,
              name:   dismissed,
            });
          }
        }

        // ── Recent balls (last 12 for over display) ───────
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

    // Omit shareToken from response for non-private (already validated above)
    const { shareToken: _st, ...matchSafe } = match as typeof match & { shareToken: string };

    return apiSuccess({
      match: {
        ...matchSafe,
        // Include token only if already validated
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

// ─── PATCH /api/match/[id] — update visibility / complete ─
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
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

    await match.save();
    return apiSuccess({ updated: true });
  } catch (err) {
    console.error('[PATCH /api/match/[id]]', err);
    return apiError('Failed to update match', 500);
  }
}
