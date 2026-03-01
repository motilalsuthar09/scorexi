// ============================================================
// GET /api/leaderboard?type=batting|bowling&limit=20
// ============================================================
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Player from '@/models/Player';
import { apiSuccess, apiError } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const type  = req.nextUrl.searchParams.get('type') ?? 'batting';
    const limit = Math.min(50, parseInt(req.nextUrl.searchParams.get('limit') ?? '20'));

    await connectDB();

    let players;

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
      // Min 1 wicket and min 10 runs
      players = await Player.find({
        'stats.totalWickets': { $gt: 0 },
        'stats.totalRuns':    { $gte: 10 },
      })
        .sort({ 'stats.totalRuns': -1 })
        .limit(limit)
        .select('name username profilePic isClaimed stats')
        .lean();
    } else {
      return apiError('Invalid type. Use batting, bowling, or allround', 422);
    }

    return apiSuccess({ players, type });
  } catch (err) {
    console.error('[GET /api/leaderboard]', err);
    return apiError('Failed to fetch leaderboard', 500);
  }
}
