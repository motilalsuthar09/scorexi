// src/app/api/match/[id]/rename-player/route.ts
// ============================================================
// PATCH /api/match/[id]/rename-player
// Rename an unclaimed placeholder player during an active match.
// Authorised by shareToken — no login required.
// Used in Quick Match when players are auto-numbered.
//
// Body: { token: string; playerId: string; name: string }
//
// ⚠ FILE MUST BE SAVED AS route.ts (TypeScript), NOT route.js
//   VS Code may auto-detect as JS if the folder was created wrong.
//   Fix: delete the folder, recreate as:
//     src/app/api/match/[id]/rename-player/route.ts
// ============================================================
import { NextRequest } from 'next/server';
import { connectDB }   from '@/lib/db';
import Match           from '@/models/Match';
import Player          from '@/models/Player';
import { apiSuccess, apiError, sanitizeString } from '@/lib/utils';
import mongoose        from 'mongoose';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const body = await req.json();
    const { token, playerId, name } = (body ?? {}) as {
      token?: string;
      playerId?: string;
      name?: string;
    };

    if (!token || !playerId || !name?.trim()) {
      return apiError('token, playerId, and name are required', 400);
    }
    if (
      !mongoose.Types.ObjectId.isValid(params.id) ||
      !mongoose.Types.ObjectId.isValid(playerId)
    ) {
      return apiError('Invalid ID', 400);
    }

    const newName = sanitizeString(name.trim());
    if (newName.length < 1 || newName.length > 60) {
      return apiError('Name must be 1–60 characters', 422);
    }

    await connectDB();

    // shareToken authorises rename without requiring full login
    const match = await Match.findOne({
      _id:        params.id,
      shareToken: token,
    }).lean();

    if (!match) return apiError('Invalid token or match not found', 403);

    // Player must belong to this match
    const allIds: string[] = [
      ...match.teamA.playerIds.map((id: mongoose.Types.ObjectId) => id.toString()),
      ...match.teamB.playerIds.map((id: mongoose.Types.ObjectId) => id.toString()),
    ];
    if (!allIds.includes(playerId)) {
      return apiError('Player not in this match', 403);
    }

    // Only unclaimed profiles can be renamed by the host
    const player = await Player.findById(playerId);
    if (!player)          return apiError('Player not found', 404);
    if (player.isClaimed) return apiError('Cannot rename a claimed player profile', 403);

    player.name = newName;
    await player.save();

    return apiSuccess({ playerId, name: newName });
  } catch (err) {
    console.error('[PATCH /api/match/[id]/rename-player]', err);
    return apiError('Rename failed', 500);
  }
}