// src/app/api/match/[id]/ball/route.ts
// ============================================================
// POST /api/match/[id]/ball  — Record a delivery (atomic)
// DELETE /api/match/[id]/ball — Undo last ball
//
// FIX (Bug 1): Accept currentNonStrikerId in payload so DB is
// bootstrapped on the very first ball — prevents the setup modal
// from reappearing when the user switches tabs and comes back.
// ============================================================
import { NextRequest } from 'next/server';
import { connectDB }   from '@/lib/db';
import Match           from '@/models/Match';
import Innings         from '@/models/Innings';
import Ball            from '@/models/Ball';
import {
  apiSuccess, apiError, isLegalDelivery,
  getClientIp, checkRateLimit,
} from '@/lib/utils';
import { z } from 'zod';

const ballSchema = z.object({
  inningsId:            z.string(),
  batsmanId:            z.string(),
  bowlerId:             z.string(),
  // NEW: the current non-striker's ID (always sent from frontend)
  currentNonStrikerId:  z.string().nullable().default(null),
  runsOffBat:           z.number().int().min(0).max(6),
  extraType:            z.enum(['wide', 'no_ball', 'bye', 'leg_bye']).nullable().default(null),
  isWicket:             z.boolean().default(false),
  dismissalType:        z.string().nullable().default(null),
  dismissedPlayerId:    z.string().nullable().default(null),
  fielderPlayerId:      z.string().nullable().default(null),
  newBatsmanId:         z.string().nullable().default(null),
  newStrikerId:         z.string().nullable().default(null),
  newNonStrikerId:      z.string().nullable().default(null),
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
    const body   = await req.json();
    const parsed = ballSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.errors[0].message, 422);

    const d = parsed.data;
    await connectDB();

    const [match, innings] = await Promise.all([
      Match.findById(params.id),
      Innings.findById(d.inningsId),
    ]);

    if (!match)                        return apiError('Match not found', 404);
    if (!innings)                      return apiError('Innings not found', 404);
    if (innings.isCompleted)           return apiError('Innings is completed', 400);
    if (match.status === 'completed')  return apiError('Match is completed', 400);

    // ── Same-player guards ──────────────────────────────
    if (d.batsmanId === d.bowlerId) {
      return apiError('Batsman and bowler cannot be the same player', 422);
    }

    const allowSingleBat = match.settings?.allowSinglePlayerBat ?? false;

    // FIX (Bug 1): Bootstrap striker/nonStriker from payload if DB is null.
    // This happens on the very first ball of a new innings — DB has nulls because
    // the setup modal only wrote to CLIENT STATE, not server.
    const currentStriker    = innings.currentStrikerId?.toString()    || d.batsmanId;
    const currentNonStriker = innings.currentNonStrikerId?.toString() || d.currentNonStrikerId || '';

    if (!allowSingleBat && currentStriker && currentNonStriker && currentStriker === currentNonStriker) {
      return apiError('Striker and non-striker cannot be the same player', 422);
    }

    const legal      = isLegalDelivery(d.extraType);
    const wideRuns   = match.settings?.wideRuns ?? 1;

    // ── Compute extras runs ─────────────────────────────
    let extrasRuns = 0;
    if (d.extraType === 'wide')    extrasRuns = wideRuns;
    if (d.extraType === 'no_ball') extrasRuns = 1;
    if (d.extraType === 'bye')     extrasRuns = d.runsOffBat;
    if (d.extraType === 'leg_bye') extrasRuns = d.runsOffBat;

    // Runs credited to batsman (0 for wides/byes/leg-byes)
    const runsForBatsman = (d.extraType === 'bye' || d.extraType === 'leg_bye' || d.extraType === 'wide')
      ? 0
      : d.runsOffBat;
    const totalBallRuns = runsForBatsman + extrasRuns;

    // ── New totals ──────────────────────────────────────
    const newTotalRuns  = innings.totalRuns  + totalBallRuns;
    const newWickets    = innings.wickets    + (d.isWicket ? 1 : 0);
    const newTotalBalls = innings.totalBalls + (legal ? 1 : 0);
    const newTotalDeliv = innings.totalDeliveries + 1;

    const overNumber = Math.floor(innings.totalBalls / 6);
    const ballInOver = innings.totalBalls % 6;

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
      runsOffBat:          runsForBatsman,
      extras:              extrasRuns,
      extraType:           d.extraType,
      isWicket:            d.isWicket,
      dismissalType:       d.dismissalType,
      dismissedPlayerId:   d.dismissedPlayerId || undefined,
      fielderIds:          d.fielderPlayerId ? [d.fielderPlayerId] : [],
      isLegalDelivery:     legal,
      inningsRunsAfter:    newTotalRuns,
      inningsWicketsAfter: newWickets,
      timestamp:           new Date(),
    });

    // ── Extras breakdown ────────────────────────────────
    const extrasUpdate: Record<string, number> = {};
    if (d.extraType === 'wide')    extrasUpdate['extras.wides']   = (innings.extras.wides   || 0) + 1;
    if (d.extraType === 'no_ball') extrasUpdate['extras.noBalls'] = (innings.extras.noBalls || 0) + 1;
    if (d.extraType === 'bye')     extrasUpdate['extras.byes']    = (innings.extras.byes    || 0) + extrasRuns;
    if (d.extraType === 'leg_bye') extrasUpdate['extras.legByes'] = (innings.extras.legByes || 0) + extrasRuns;

    // ── Strike rotation ─────────────────────────────────
    // Use bootstrapped values (may differ from DB if this is first ball)
    let newStrikerId:    string | undefined = currentStriker;
    let newNonStrikerId: string | undefined = currentNonStriker || undefined;

    if (d.isWicket && (d.newBatsmanId || d.newStrikerId)) {
      newStrikerId = (d.newBatsmanId ?? d.newStrikerId) as string;
    } else if (!d.isWicket && d.extraType !== 'wide') {
      // Rotate on odd runs off bat (works for no-ball too)
      const totalRunsForRotation = runsForBatsman
        + (d.extraType === 'bye' || d.extraType === 'leg_bye' ? extrasRuns : 0);
      if (totalRunsForRotation % 2 !== 0) {
        [newStrikerId, newNonStrikerId] = [newNonStrikerId, newStrikerId];
      }
    }

    // End-of-over: swap after every completed legal over
    const completedOver = legal && newTotalBalls % 6 === 0;
    if (completedOver && !d.isWicket) {
      [newStrikerId, newNonStrikerId] = [newNonStrikerId, newStrikerId];
    }

    // ── Innings end conditions ──────────────────────────
    const maxBalls  = match.totalOvers * 6;
    const teamSize  = innings.battingTeam === 'teamA'
      ? match.teamA.playerIds.length
      : match.teamB.playerIds.length;
    const allOut    = newWickets >= teamSize - 1;

    let targetChased = false;
    if (innings.inningsNumber === 2 && innings.targetRuns) {
      targetChased = newTotalRuns >= innings.targetRuns;
    }

    const inningsOver = (legal && newTotalBalls >= maxBalls) || allOut || targetChased;

    // ── innings_break → live transition ─────────────────
    const matchStatusUpdate: Record<string, unknown> = {};
    if (match.status === 'innings_break' && innings.inningsNumber === 2) {
      matchStatusUpdate.status = 'live';
    }

    // ── Update innings ──────────────────────────────────
    await Innings.findByIdAndUpdate(innings._id, {
      totalRuns:           newTotalRuns,
      wickets:             newWickets,
      totalBalls:          newTotalBalls,
      totalDeliveries:     newTotalDeliv,
      'extras.total':      (innings.extras.total || 0) + extrasRuns,
      ...extrasUpdate,
      currentStrikerId:    newStrikerId    ?? null,
      currentNonStrikerId: newNonStrikerId ?? null,
      currentBowlerId:     d.bowlerId,
      isCompleted:         inningsOver,
    });

    // ── Innings / match completion ──────────────────────
    let matchStatus: string = match.status;
    let result = null;

    if (inningsOver) {
      if (innings.inningsNumber === 1) {
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
        const innings1 = await Innings.findOne({ matchId: match._id, inningsNumber: 1 }).lean();
        const inn1Runs = innings1?.totalRuns ?? 0;
        const inn1Team = innings1?.battingTeam ?? 'teamA';

        let winner: string, winnerName: string, margin: string;
        const teamAName = match.teamA.name;
        const teamBName = match.teamB.name;

        if (targetChased) {
          winner     = innings.battingTeam;
          winnerName = winner === 'teamA' ? teamAName : teamBName;
          const wicketsLeft = teamSize - 1 - newWickets;
          margin = `${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''}`;
        } else if (newTotalRuns > inn1Runs) {
          winner     = innings.battingTeam;
          winnerName = winner === 'teamA' ? teamAName : teamBName;
          margin     = `${newTotalRuns - inn1Runs} run${newTotalRuns - inn1Runs !== 1 ? 's' : ''}`;
        } else if (inn1Runs > newTotalRuns) {
          winner     = inn1Team;
          winnerName = winner === 'teamA' ? teamAName : teamBName;
          margin     = `${inn1Runs - newTotalRuns} run${inn1Runs - newTotalRuns !== 1 ? 's' : ''}`;
        } else {
          winner = 'tie'; winnerName = 'Tie'; margin = '';
        }

        result = {
          winner, winnerName, margin,
          summary: winner === 'tie' ? 'Match tied!' : `${winnerName} won by ${margin}`,
        };

        matchStatus = 'completed';
        await Match.findByIdAndUpdate(match._id, {
          status: 'completed', result, completedAt: new Date(),
        });

        fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/stats/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchId: match._id.toString() }),
        }).catch(e => console.error('Stats sync failed:', e));
      }
    } else if (Object.keys(matchStatusUpdate).length > 0) {
      await Match.findByIdAndUpdate(match._id, matchStatusUpdate);
      matchStatus = 'live';
    }

    const nextBatsmanRequired = d.isWicket && !inningsOver && !d.newBatsmanId && !d.newStrikerId;

    return apiSuccess({
      ball:                ball._id.toString(),
      inningsRuns:         newTotalRuns,
      inningsWickets:      newWickets,
      totalBalls:          newTotalBalls,
      overNumber,
      ballInOver:          ballInOver + (legal ? 1 : 0),
      inningsOver,
      overComplete:        completedOver && !inningsOver,
      nextBatsmanRequired,
      matchStatus,
      result,
      newStrikerId,
      newNonStrikerId,
      newBowlerId: null,
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
    const inningsId = req.nextUrl.searchParams.get('inningsId');
    if (!inningsId) return apiError('inningsId required', 422);

    await connectDB();

    const innings = await Innings.findById(inningsId);
    if (!innings)  return apiError('Innings not found', 404);

    const lastTwoBalls = await Ball.find({ inningsId })
      .sort({ totalBallsInInnings: -1, _id: -1 })
      .limit(2)
      .lean();

    if (lastTwoBalls.length === 0) return apiError('No balls to undo', 400);

    const lastBall = lastTwoBalls[0];

    const runsToRemove = lastBall.runsOffBat + lastBall.extras;
    const legalDec     = lastBall.isLegalDelivery ? 1 : 0;

    const extrasRevert: Record<string, number> = {};
    if (lastBall.extraType === 'wide')    extrasRevert['extras.wides']   = Math.max(0, (innings.extras.wides   || 0) - 1);
    if (lastBall.extraType === 'no_ball') extrasRevert['extras.noBalls'] = Math.max(0, (innings.extras.noBalls || 0) - 1);
    if (lastBall.extraType === 'bye')     extrasRevert['extras.byes']    = Math.max(0, (innings.extras.byes    || 0) - lastBall.extras);
    if (lastBall.extraType === 'leg_bye') extrasRevert['extras.legByes'] = Math.max(0, (innings.extras.legByes || 0) - lastBall.extras);

    // Restore: the batsmanId on the last ball WAS the striker for that ball
    const restoredStrikerId = lastBall.batsmanId.toString();
    const restoredBowlerId  = lastBall.bowlerId.toString();

    await Innings.findByIdAndUpdate(inningsId, {
      $inc: {
        totalRuns:       -runsToRemove,
        wickets:         lastBall.isWicket ? -1 : 0,
        totalBalls:      -legalDec,
        totalDeliveries: -1,
        'extras.total':  -lastBall.extras,
      },
      ...extrasRevert,
      currentStrikerId:    restoredStrikerId,
      currentBowlerId:     restoredBowlerId,
    });

    await Ball.findByIdAndDelete(lastBall._id);

    return apiSuccess({
      undone: true,
      ballId: lastBall._id.toString(),
      restoredStrikerId,
      restoredBowlerId,
    });

  } catch (err) {
    console.error('[DELETE /api/match/[id]/ball]', err);
    return apiError('Failed to undo ball', 500);
  }
}