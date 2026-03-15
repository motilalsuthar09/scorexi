// ============================================================
// POST /api/stats/sync  — sync match stats to player profiles
// Called automatically after match completion
// ============================================================
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { syncStatsToPlayers } from '@/lib/stats';
import { apiSuccess, apiError } from '@/lib/utils';
import { z } from 'zod';

const schema = z.object({ matchId: z.string() });

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiError('matchId required', 422);

    await connectDB();
    await syncStatsToPlayers(parsed.data.matchId);

    return apiSuccess({ synced: true });
  } catch (err) {
    console.error('[POST /api/stats/sync]', err);
    return apiError('Stats sync failed', 500);
  }
}
