// ============================================================
// POST /api/match/[id]/complete  — manually complete a match
// POST /api/match/[id]/innings   — start innings 2
// ============================================================
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Match from '@/models/Match';
import Innings from '@/models/Innings';
import { getSession } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/utils';
import { syncStatsToPlayers } from '@/lib/stats';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = getSession(req);

  try {
    const body   = await req.json().catch(() => ({}));
    const action = body.action; // 'complete' | 'start_innings2' | 'no_result'

    await connectDB();

    const match = await Match.findById(params.id);
    if (!match) return apiError('Match not found', 404);

    if (action === 'start_innings2') {
      // Get innings 1 to know the target
      const innings1 = await Innings.findOne({
        matchId:       match._id,
        inningsNumber: 1,
      });
      if (!innings1) return apiError('Innings 1 not found', 404);

      // Mark innings 1 complete
      innings1.isCompleted = true;
      await innings1.save();

      // Create innings 2
      const existing2 = await Innings.findOne({
        matchId:       match._id,
        inningsNumber: 2,
      });

      if (!existing2) {
        await Innings.create({
          matchId:       match._id,
          inningsNumber: 2,
          battingTeam:   innings1.bowlingTeam,
          bowlingTeam:   innings1.battingTeam,
          targetRuns:    innings1.totalRuns + 1,
        });
      }

      match.status         = 'live';
      match.currentInnings = 2;
      await match.save();

      return apiSuccess({ inningsStarted: 2, target: innings1.totalRuns + 1 });
    }

    if (action === 'complete' || action === 'no_result') {
      const innings1 = await Innings.findOne({ matchId: match._id, inningsNumber: 1 });
      const innings2 = await Innings.findOne({ matchId: match._id, inningsNumber: 2 });

      let result;
      if (action === 'no_result') {
        result = { winner: 'no_result', winnerName: 'No Result', margin: '', summary: 'Match abandoned — No Result' };
      } else if (innings2) {
        const inn1Runs = innings1?.totalRuns ?? 0;
        const inn2Runs = innings2.totalRuns;
        const tA = match.teamA.name;
        const tB = match.teamB.name;
        const bat2Name = innings2.battingTeam === 'teamA' ? tA : tB;
        const bat1Name = innings1?.battingTeam === 'teamA' ? tA : tB;

        if (inn2Runs > inn1Runs) {
          const wicketsLeft = (innings2.battingTeam === 'teamA'
            ? match.teamA.playerIds.length
            : match.teamB.playerIds.length) - 1 - innings2.wickets;
          result = {
            winner:     innings2.battingTeam,
            winnerName: bat2Name,
            margin:     `${wicketsLeft} wickets`,
            summary:    `${bat2Name} won by ${wicketsLeft} wickets`,
          };
        } else if (inn1Runs > inn2Runs) {
          result = {
            winner:     innings1?.battingTeam ?? 'teamA',
            winnerName: bat1Name,
            margin:     `${inn1Runs - inn2Runs} runs`,
            summary:    `${bat1Name} won by ${inn1Runs - inn2Runs} runs`,
          };
        } else {
          result = { winner: 'tie', winnerName: 'Tie', margin: '', summary: 'Match tied!' };
        }
      } else {
        result = { winner: 'no_result', winnerName: 'No Result', margin: '', summary: 'No Result' };
      }

      match.status      = 'completed';
      match.result      = result as typeof match.result;
      match.completedAt = new Date();
      await match.save();

      // Sync stats async
      syncStatsToPlayers(match._id.toString()).catch(console.error);

      return apiSuccess({ completed: true, result });
    }

    return apiError('Invalid action', 422);
  } catch (err) {
    console.error('[POST /api/match/[id]/complete]', err);
    return apiError('Action failed', 500);
  }
}
