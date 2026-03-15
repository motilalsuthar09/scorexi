// ============================================================
// GET /api/match/[id]/commentary — get live commentary feed
// ============================================================
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Commentary from '@/models/Commentary';
import Match from '@/models/Match';
import { apiSuccess, apiError } from '@/lib/utils';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.nextUrl.searchParams.get('token');
    const limit = Math.min(50, parseInt(req.nextUrl.searchParams.get('limit') ?? '20'));

    await connectDB();

    const match = await Match.findById(params.id).lean();
    if (!match) return apiError('Match not found', 404);

    if (match.visibility === 'private') {
      if (!token || token !== match.shareToken) {
        return apiError('Access denied', 403);
      }
    }

    const comments = await Commentary.find({ matchId: params.id })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    return apiSuccess({ commentary: comments.reverse() });
  } catch (err) {
    console.error('[GET /api/match/[id]/commentary]', err);
    return apiError('Failed to load commentary', 500);
  }
}
