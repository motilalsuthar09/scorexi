// src/app/api/match/[id]/rename-player/route.ts
// ============================================================
// PATCH /api/match/[id]/rename-player
// Rename OR link an unclaimed placeholder player slot.
// Authorised by shareToken — no login required.
//
// Body:
//   token:             string  — shareToken (required)
//   playerId:          string  — placeholder slot to act on (required)
//   name:              string  — display name to set (required)
//   linkToExistingId?: string  — if present, SWAP the placeholder
//                                with an existing player profile
//
// linkToExistingId flow:
//   1. Validate the existing player exists & is not already in match
//   2. Swap placeholder ID → existing player ID in teamA/B.playerIds
//   3. Delete placeholder if unclaimed AND only referenced by this match
//   4. Return { playerId: existingId, name: existingName, linked: true }
//
// Simple rename flow (no linkToExistingId):
//   1. Find player, assert unclaimed
//   2. Set player.name = sanitized name
//   3. Return { playerId, name, linked: false }
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
    const { token, playerId, name, linkToExistingId } = (body ?? {}) as {
      token?:            string;
      playerId?:         string;
      name?:             string;
      linkToExistingId?: string;
    };

    // ── Validate required fields ──────────────────────────
    if (!token || !playerId || !name?.trim()) {
      return apiError('token, playerId, and name are required', 400);
    }
    if (
      !mongoose.Types.ObjectId.isValid(params.id) ||
      !mongoose.Types.ObjectId.isValid(playerId)
    ) {
      return apiError('Invalid match or player ID', 400);
    }
    if (linkToExistingId && !mongoose.Types.ObjectId.isValid(linkToExistingId)) {
      return apiError('Invalid linkToExistingId', 400);
    }

    await connectDB();

    // ── Verify shareToken ─────────────────────────────────
    // Use findById + check token — findOne with both fields is fine too
    const match = await Match.findOne({
      _id:        params.id,
      shareToken: token,
    });
    if (!match) return apiError('Invalid token or match not found', 403);

    // ── Verify placeholder slot belongs to this match ─────
    const teamAIds = match.teamA.playerIds.map((id: mongoose.Types.ObjectId) => id.toString());
    const teamBIds = match.teamB.playerIds.map((id: mongoose.Types.ObjectId) => id.toString());
    const allIds   = [...teamAIds, ...teamBIds];

    if (!allIds.includes(playerId)) {
      return apiError('Player slot not in this match', 403);
    }

    // ── PATH A: Link to an existing player profile ────────
    if (linkToExistingId) {
      // Can't link to a player already in the match
      if (allIds.includes(linkToExistingId)) {
        return apiError('That player is already in this match', 409);
      }

      const existingPlayer = await Player.findById(linkToExistingId).lean();
      if (!existingPlayer) return apiError('Existing player not found', 404);

      const placeholderOid = new mongoose.Types.ObjectId(playerId);
      const existingOid    = new mongoose.Types.ObjectId(linkToExistingId);
      const inTeamA        = teamAIds.includes(playerId);

      // Swap placeholder ID → existing player ID in the correct team array
      if (inTeamA) {
        match.teamA.playerIds = match.teamA.playerIds.map(
          (id: mongoose.Types.ObjectId) => id.toString() === playerId ? existingOid : id
        );
      } else {
        match.teamB.playerIds = match.teamB.playerIds.map(
          (id: mongoose.Types.ObjectId) => id.toString() === playerId ? existingOid : id
        );
      }
      await match.save();

      // Clean up placeholder: delete only if unclaimed AND not in any other match
      const placeholder = await Player.findById(playerId).lean();
      if (placeholder && !placeholder.isClaimed) {
        const usedElsewhere = await Match.findOne({
          _id: { $ne: match._id },
          $or: [
            { 'teamA.playerIds': placeholderOid },
            { 'teamB.playerIds': placeholderOid },
          ],
        }).lean();
        if (!usedElsewhere) {
          await Player.findByIdAndDelete(playerId);
        }
      }

      return apiSuccess({
        playerId: linkToExistingId,
        name:     existingPlayer.name,
        linked:   true,
      });
    }

    // ── PATH B: Simple rename ─────────────────────────────
    const player = await Player.findById(playerId);
    if (!player)          return apiError('Player not found', 404);
    if (player.isClaimed) return apiError('Cannot rename a claimed player profile', 403);

    const newName = sanitizeString(name.trim());
    if (newName.length < 1 || newName.length > 60) {
      return apiError('Name must be 1–60 characters', 422);
    }

    player.name = newName;
    await player.save();

    return apiSuccess({ playerId, name: newName, linked: false });

  } catch (err) {
    console.error('[PATCH /api/match/[id]/rename-player]', err);
    return apiError('Rename failed', 500);
  }
}