// ============================================================
// GET  /api/player/[id]   — get player profile + stats
// PATCH /api/player/[id]  — update profile (auth required)
// ============================================================
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Player from '@/models/Player';
import Match from '@/models/Match';
import { getSession } from '@/lib/auth';
import { apiSuccess, apiError, sanitizeString } from '@/lib/utils';
import { derivedBattingStats, derivedBowlingStats } from '@/lib/stats';
import { z } from 'zod';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const player = await Player.findById(params.id).lean();
    if (!player) return apiError('Player not found', 404);

    // Recent matches this player appeared in
    const recentMatches = await Match.find({
      $or: [
        { 'teamA.playerIds': player._id },
        { 'teamB.playerIds': player._id },
      ],
      status: 'completed',
      visibility: 'public',
    })
      .sort({ completedAt: -1 })
      .limit(10)
      .select('title teamA teamB result completedAt totalOvers')
      .lean();

    // Compute derived stats
    const batting = derivedBattingStats({
      totalRuns:    player.stats.totalRuns,
      totalBallsFaced: player.stats.totalBallsFaced,
      matchesPlayed: player.stats.matchesPlayed,
      notOuts:      player.stats.notOuts,
      highestScore: player.stats.highestScore,
      totalFours:   player.stats.totalFours,
      totalSixes:   player.stats.totalSixes,
    });

    const bowling = derivedBowlingStats({
      totalWickets:       player.stats.totalWickets,
      totalBallsBowled:   player.stats.totalBallsBowled,
      totalRunsConceded:  player.stats.totalRunsConceded,
      bestBowlingWickets: player.stats.bestBowlingWickets,
      bestBowlingRuns:    player.stats.bestBowlingRuns,
    });

    return apiSuccess({
      player,
      derived: { batting, bowling },
      recentMatches,
    });
  } catch (err) {
    console.error('[GET /api/player/[id]]', err);
    return apiError('Failed to load player', 500);
  }
}

const patchSchema = z.object({
  name:     z.string().min(2).max(80).optional(),
  username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/).optional(),
}).strict();

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = getSession(req);
  if (!session) return apiError('Not authenticated', 401);

  try {
    const body   = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.errors[0].message, 422);

    await connectDB();

    const player = await Player.findById(params.id);
    if (!player) return apiError('Player not found', 404);

    // Only owner can edit
    if (player.userId?.toString() !== session.userId) {
      return apiError('Not authorized', 403);
    }

    if (parsed.data.name)     player.name = sanitizeString(parsed.data.name);
    if (parsed.data.username) {
      // Check uniqueness
      const taken = await Player.findOne({
        username: parsed.data.username.toLowerCase(),
        _id: { $ne: player._id },
      }).lean();
      if (taken) return apiError('Username already taken', 409);
      player.username = parsed.data.username.toLowerCase();
    }

    await player.save();
    return apiSuccess({ player });
  } catch (err) {
    console.error('[PATCH /api/player/[id]]', err);
    return apiError('Update failed', 500);
  }
}
