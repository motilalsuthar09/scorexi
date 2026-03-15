// src/app/api/admin/stats/route.ts
import { NextRequest } from 'next/server';
import { connectDB }   from '@/lib/db';
import Match           from '@/models/Match';
import Player          from '@/models/Player';
import Ball            from '@/models/Ball';
import User            from '@/models/User';
import { getSession }  from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== 'admin') return apiError('Admin only', 403);

  await connectDB();

  const now     = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalMatches, liveMatches, completedMatches,
    totalPlayers, claimedPlayers, totalBalls,
    totalUsers, usersThisWeek, matchesThisWeek,
    dailyRaw, topPlayersRaw,
  ] = await Promise.all([
    Match.countDocuments(),
    Match.countDocuments({ status: 'live' }),
    Match.countDocuments({ status: 'completed' }),
    Player.countDocuments(),
    Player.countDocuments({ isClaimed: true }),
    Ball.countDocuments(),
    User.countDocuments({ isGuest: false }),
    User.countDocuments({ isGuest: false, createdAt: { $gte: weekAgo } }),
    Match.countDocuments({ createdAt: { $gte: weekAgo } }),
    Match.aggregate([
      { $match: { createdAt: { $gte: weekAgo } } },
      { $group: { _id: { $dateToString: { format: '%m/%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Player.find({ 'stats.matchesPlayed': { $gt: 0 } })
      .sort({ 'stats.matchesPlayed': -1 })
      .limit(5)
      .select('name isClaimed stats')
      .lean(),
  ]);

  const dayMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
    dayMap[key] = 0;
  }
  for (const r of dailyRaw) dayMap[r._id] = r.count;
  const dailyMatchCounts = Object.entries(dayMap).map(([date, count]) => ({ date, count }));

  return apiSuccess({
    totalMatches, liveMatches, completedMatches,
    totalPlayers, claimedPlayers, totalBalls,
    totalUsers, usersThisWeek, matchesThisWeek,
    dailyMatchCounts, topPlayers: topPlayersRaw,
  });
}
