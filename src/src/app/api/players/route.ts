// ============================================================
// GET /api/players?q=rahul  — search players (for add-by-name)
// ============================================================
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Player from '@/models/Player';
import { apiSuccess, apiError } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q')?.trim();

    if (!q || q.length < 2) {
      return apiSuccess({ players: [] });
    }

    await connectDB();

    const players = await Player.find({
      $or: [
        { name:     { $regex: q, $options: 'i' } },
        { username: { $regex: q, $options: 'i' } },
      ],
    })
      .limit(10)
      .select('_id name username profilePic isClaimed stats.matchesPlayed stats.totalRuns')
      .lean();

    return apiSuccess({ players });
  } catch (err) {
    console.error('[GET /api/players]', err);
    return apiError('Search failed', 500);
  }
}
