// ============================================================
// POST /api/player/[id]/claim
// Authenticated user claims an unclaimed placeholder profile
// ============================================================
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Player from '@/models/Player';
import User from '@/models/User';
import { getSession } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/utils';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = getSession(req);
  if (!session || session.isGuest) {
    return apiError('You must be logged in to claim a profile', 401);
  }

  try {
    await connectDB();

    const player = await Player.findById(params.id);
    if (!player) return apiError('Player not found', 404);

    if (player.isClaimed) {
      return apiError('This profile has already been claimed', 409);
    }

    // Check user doesn't already have a claimed profile
    const user = await User.findById(session.userId);
    if (!user) return apiError('User not found', 404);

    if (user.claimedPlayerId) {
      return apiError('You already have a player profile linked', 409);
    }

    // Claim it
    player.isClaimed = true;
    player.userId    = user._id as typeof player.userId;
    player.email     = user.email;
    await player.save();

    await User.findByIdAndUpdate(user._id, {
      claimedPlayerId: player._id,
    });

    return apiSuccess({
      claimed: true,
      playerId: player._id.toString(),
      playerName: player.name,
    });

  } catch (err) {
    console.error('[POST /api/player/[id]/claim]', err);
    return apiError('Claim failed', 500);
  }
}
