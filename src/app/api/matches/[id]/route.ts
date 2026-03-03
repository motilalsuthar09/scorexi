// ============================================================
// GET /api/matches/:id — get single match with innings
// ============================================================

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Match from '@/models/Match';
import Innings from '@/models/Innings';
import { apiSuccess, apiError } from '@/lib/utils';
import mongoose from 'mongoose';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiError('Invalid match ID', 400);
    }

    const match = await Match.findById(id)
      .select('-shareToken')
      .lean();

    if (!match) {
      return apiError('Match not found', 404);
    }

    const innings = await Innings.find({ matchId: id })
      .sort({ inningsNumber: 1 })
      .lean();

    return apiSuccess({
      match,
      innings,
    });

  } catch (err) {
    console.error('[GET /api/matches/:id]', err);
    return apiError('Failed to fetch match', 500);
  }
}