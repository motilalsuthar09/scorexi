// ============================================================
// GET /api/innings/[inningsId]/overs — over-by-over breakdown
// ============================================================
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Ball from '@/models/Ball';
import Player from '@/models/Player';
import { apiSuccess, apiError, formatBallDisplay } from '@/lib/utils';

export async function GET(
  _req: NextRequest,
  { params }: { params: { inningsId: string } }
) {
  try {
    await connectDB();

    const balls = await Ball.find({ inningsId: params.inningsId })
      .sort({ totalBallsInInnings: 1 })
      .lean();

    if (!balls.length) return apiSuccess({ overs: [] });

    // Get unique player IDs for bowler names
    const bowlerIds = [...new Set(balls.map(b => b.bowlerId.toString()))];
    const bowlers   = await Player.find({ _id: { $in: bowlerIds } })
      .select('_id name').lean();
    const bowlerMap = Object.fromEntries(bowlers.map(b => [b._id.toString(), b.name]));

    // Group by over
    const overMap = new Map<number, {
      runs: number; wickets: number;
      balls: { value: string; type: string }[];
      bowlerId: string;
    }>();

    for (const ball of balls) {
      const over = ball.overNumber;
      if (!overMap.has(over)) {
        overMap.set(over, { runs: 0, wickets: 0, balls: [], bowlerId: ball.bowlerId.toString() });
      }
      const o = overMap.get(over)!;
      o.runs    += ball.runsOffBat + ball.extras;
      if (ball.isWicket) o.wickets++;
      o.balls.push(formatBallDisplay(ball.runsOffBat, ball.extraType, ball.isWicket));
    }

    const overs = Array.from(overMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([overNumber, data]) => ({
        overNumber,
        runs:       data.runs,
        wickets:    data.wickets,
        balls:      data.balls,
        bowlerName: bowlerMap[data.bowlerId] ?? 'Unknown',
      }));

    return apiSuccess({ overs });
  } catch (err) {
    console.error('[GET /api/innings/[inningsId]/overs]', err);
    return apiError('Failed to load overs', 500);
  }
}
