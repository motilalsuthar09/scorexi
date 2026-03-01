// ============================================================
// GET /api/admin/stats — platform-wide stats for admin dashboard
// ============================================================
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Match from '@/models/Match';
import Player from '@/models/Player';
import Ball from '@/models/Ball';
import { getSession } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== 'admin') {
    return apiError('Admin access required', 403);
  }

  try {
    await connectDB();

    const [
      totalMatches,
      liveMatches,
      completedMatches,
      totalPlayers,
      claimedPlayers,
      totalBalls,
    ] = await Promise.all([
      Match.countDocuments(),
      Match.countDocuments({ status: 'live' }),
      Match.countDocuments({ status: 'completed' }),
      Player.countDocuments(),
      Player.countDocuments({ isClaimed: true }),
      Ball.countDocuments(),
    ]);

    // Top 5 most active matches (most balls)
    const recentMatches = await Match.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title teamA teamB status createdAt totalOvers')
      .lean();

    return apiSuccess({
      totalMatches,
      liveMatches,
      completedMatches,
      totalPlayers,
      claimedPlayers,
      totalBalls,
      recentMatches,
    });
  } catch (err) {
    console.error('[GET /api/admin/stats]', err);
    return apiError('Failed to load admin stats', 500);
  }
}
