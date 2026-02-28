// ============================================================
// POST /api/match/[id]/ball  — Record a delivery
// DELETE /api/match/[id]/ball — Undo last ball
// ============================================================
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Match from '@/models/Match';
import Innings from '@/models/Innings';
import Ball from '@/models/Ball';
import Player from '@/models/Player';
import {
  apiSuccess, apiError, isLegalDelivery,
  getClientIp, checkRateLimit,
} from '@/lib/utils';
import { z } from 'zod';

const ballSchema = z.object({
  inningsId:         z.string(),
  batsmanId:         z.string(),
  bowlerId:          z.string(),
  runsOffBat:        z.number().int().min(0).max(6),
  extraType:         z.enum(['wide', 'no_ball', 'bye', 'leg_bye']).nullable().default(null),
  isWicket:          z.boolean().default(false),
  dismissalType:     z.string().nullable().default(null),
  dismissedPlayerId: z.string().nullable().default(null),
  newStrikerId:      z.string().nullable().default(null),  // new batsman after wicket
  newNonStrikerId:   z.string().nullable().default(null),  // strike rotation
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`ball_${ip}`, 200, 15 * 60 * 1000)) {
    return apiError('Rate limit exceeded', 429);
  }

  try {
    const body = await req.json();
    const parsed = ballSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.errors[0].message, 422);

    const d = parsed.data;
    await connectDB();

    const [match, innings] = await Promise.all([
      Match.findById(params.id),
      Innings.findById(d.inningsId),
    ]);

    if (!match)  return apiError('Match not found', 404);
    if (!innings) return apiError('Innings not found', 404);
    if (innings.isCompleted) return apiError('Innings is completed', 400);
    if (match.status === 'completed') return apiError('Match is completed', 400);

    const legal = isLegalDelivery(d.extraType);

    // ── Compute extras runs ─────────────────────────────
    let extrasRuns = 0;
    if (d.extraType === 'wide')   extrasRuns = 1;
    if (d.extraType === 'no_ball') extrasRuns = 1;

    const totalBallRuns = d.runsOffBat + extrasRuns;

    // ── Compute new totals ──────────────────────────────
    const newTotalRuns    = innings.totalRuns + totalBallRuns;
    const newWickets      = innings.wickets + (d.isWicket ? 1 : 0);
    const newTotalBalls   = innings.totalBalls + (legal ? 1 : 0);
    const newTotalDeliv   = innings.totalDeliveries + 1;

    // ── Over and ball numbers ───────────────────────────
    const overNumber  = Math.floor(innings.totalBalls / 6);
    const ballInOver  = innings.totalBalls % 6;

    // ── Build ball document ─────────────────────────────
    const ball = await Ball.create({
      matchId:             match._id,
      inningsId:           innings._id,
      inningsNumber:       innings.inningsNumber,
      overNumber,
      ballInOver:          legal ? ballInOver : innings.totalBalls % 6,
      totalBallsInInnings: innings.totalBalls,
      batsmanId:           d.batsmanId,
      bowlerId:            d.bowlerId,
      runsOffBat:          d.runsOffBat,
      extras:              extrasRuns,
      extraType:           d.extraType,
      isWicket:            d.isWicket,
      dismissalType:       d.dismissalType,
      dismissedPlayerId:   d.dismissedPlayerId || undefined,
      isLegalDelivery:     legal,
      inningsRunsAfter:    newTotalRuns,
      inningsWicketsAfter: newWickets,
      timestamp:           new Date(),
    });

    // ── Extras breakdown update ─────────────────────────
    const extrasUpdate: Record<string, number> = {};
    if (d.extraType === 'wide')    extrasUpdate['extras.wides']   = (innings.extras.wides   || 0) + 1;
    if (d.extraType === 'no_ball') extrasUpdate['extras.noBalls'] = (innings.extras.noBalls || 0) + 1;
    if (d.extraType === 'bye')     extrasUpdate['extras.byes']    = (innings.extras.byes    || 0) + extrasRuns;
    if (d.extraType === 'leg_bye') extrasUpdate['extras.legByes'] = (innings.extras.legByes || 0) + extrasRuns;

    // ── Determine strike rotation ───────────────────────
    let newStrikerId    = innings.currentStrikerId?.toString();
    let newNonStrikerId = innings.currentNonStrikerId?.toString();

    if (d.isWicket && d.newStrikerId) {
      // Dismissed batsman replaced
      newStrikerId = d.newStrikerId;
    } else if (d.runsOffBat % 2 !== 0 && legal && !d.isWicket) {
      // Odd runs rotate strike (unless wide/no-ball)
      [newStrikerId, newNonStrikerId] = [newNonStrikerId!, newStrikerId!];
    }
    // End of over: rotate strike
    const completedOver = legal && newTotalBalls % 6 === 0;
    if (completedOver && !d.isWicket) {
      [newStrikerId, newNonStrikerId] = [newNonStrikerId!, newStrikerId!];
    }

    // ── Check innings end conditions ───────────────────
    const maxBalls = match.totalOvers * 6;
    const allOut   = newWickets >= (innings.battingTeam === 'teamA'
      ? match.teamA.playerIds.length
      : match.teamB.playerIds.length) - 1;

    // In innings 2: check if target is chased
    let targetChased = false;
    if (innings.inningsNumber === 2 && innings.targetRuns) {
      targetChased = newTotalRuns >= innings.targetRuns;
    }

    const inningsOver = (legal && newTotalBalls >= maxBalls) || allOut || targetChased;

    // ── Update innings ──────────────────────────────────
    await Innings.findByIdAndUpdate(innings._id, {
      totalRuns:           newTotalRuns,
      wickets:             newWickets,
      totalBalls:          newTotalBalls,
      totalDeliveries:     newTotalDeliv,
      'extras.total':      (innings.extras.total || 0) + extrasRuns,
      ...extrasUpdate,
      currentStrikerId:    newStrikerId || null,
      currentNonStrikerId: newNonStrikerId || null,
      isCompleted:         inningsOver,
    });

    // ── Handle innings/match completion ────────────────
    let matchStatus: string = match.status;
    let result = null;

    if (inningsOver) {
      if (innings.inningsNumber === 1) {
        // Prepare innings 2
        const target = newTotalRuns + 1;
        await Innings.create({
          matchId:       match._id,
          inningsNumber: 2,
          battingTeam:   innings.bowlingTeam,
          bowlingTeam:   innings.battingTeam,
          targetRuns:    target,
        });
        matchStatus = 'innings_break';
        await Match.findByIdAndUpdate(match._id, {
          status: 'innings_break',
          currentInnings: 2,
        });
      } else {
        // Match complete — compute result
        const innings1 = await Innings.findOne({ matchId: match._id, inningsNumber: 1 }).lean();
        const inn1Runs = innings1?.totalRuns ?? 0;
        const inn1Team = innings1?.battingTeam ?? 'teamA';

        let winner: string, winnerName: string, margin: string;
        const teamAName = match.teamA.name;
        const teamBName = match.teamB.name;

        if (targetChased) {
          // Innings 2 batting team won
          const wTeam = innings.battingTeam;
          winnerName = wTeam === 'teamA' ? teamAName : teamBName;
          winner = wTeam;
          const wicketsLeft = (innings.battingTeam === 'teamA'
            ? match.teamA.playerIds.length
            : match.teamB.playerIds.length) - 1 - newWickets;
          margin = `${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''}`;
        } else if (newTotalRuns > inn1Runs) {
          winnerName = innings.battingTeam === 'teamA' ? teamAName : teamBName;
          winner = innings.battingTeam;
          margin = `${newTotalRuns - inn1Runs} runs`;
        } else if (inn1Runs > newTotalRuns) {
          winnerName = inn1Team === 'teamA' ? teamAName : teamBName;
          winner = inn1Team;
          margin = `${inn1Runs - newTotalRuns} runs`;
        } else {
          winner = 'tie';
          winnerName = 'Tie';
          margin = '';
        }

        result = {
          winner,
          winnerName,
          margin,
          summary: winner === 'tie'
            ? 'Match tied!'
            : `${winnerName} won by ${margin}`,
        };

        matchStatus = 'completed';
        await Match.findByIdAndUpdate(match._id, {
          status: 'completed',
          result,
          completedAt: new Date(),
        });
      }
    }

    return apiSuccess({
      ball:          ball._id.toString(),
      inningsRuns:   newTotalRuns,
      inningsWickets: newWickets,
      totalBalls:    newTotalBalls,
      overNumber,
      ballInOver:    ballInOver + (legal ? 1 : 0),
      inningsOver,
      matchStatus,
      result,
      newStrikerId,
      newNonStrikerId,
    }, 201);

  } catch (err) {
    console.error('[POST /api/match/[id]/ball]', err);
    return apiError('Failed to record ball', 500);
  }
}

// ─── DELETE — Undo last ball ────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = req.nextUrl;
    const inningsId = searchParams.get('inningsId');

    if (!inningsId) return apiError('inningsId required', 422);

    await connectDB();

    const innings = await Innings.findById(inningsId);
    if (!innings) return apiError('Innings not found', 404);

    // Get last ball
    const lastBall = await Ball.findOne({ inningsId })
      .sort({ totalBallsInInnings: -1, _id: -1 })
      .lean();

    if (!lastBall) return apiError('No balls to undo', 400);

    // Revert innings totals
    const runsToRemove = lastBall.runsOffBat + lastBall.extras;
    const legalDec     = lastBall.isLegalDelivery ? 1 : 0;

    await Innings.findByIdAndUpdate(inningsId, {
      $inc: {
        totalRuns:       -runsToRemove,
        wickets:         lastBall.isWicket ? -1 : 0,
        totalBalls:      -legalDec,
        totalDeliveries: -1,
        'extras.total':  -lastBall.extras,
      },
    });

    await Ball.findByIdAndDelete(lastBall._id);

    return apiSuccess({ undone: true, ballId: lastBall._id.toString() });

  } catch (err) {
    console.error('[DELETE /api/match/[id]/ball]', err);
    return apiError('Failed to undo ball', 500);
  }
}
