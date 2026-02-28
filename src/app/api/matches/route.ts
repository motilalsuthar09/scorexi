// ============================================================
// GET  /api/matches  — paginated public match list + search
// POST /api/matches  — create a new match
// ============================================================
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Match from '@/models/Match';
import Innings from '@/models/Innings';
import Player from '@/models/Player';
import {
  apiSuccess, apiError, generateShareToken,
  getClientIp, checkRateLimit, sanitizeString,
} from '@/lib/utils';
import { z } from 'zod';
import crypto from 'crypto';

// ─── GET /api/matches ──────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const page   = Math.max(1, parseInt(searchParams.get('page')  ?? '1'));
    const limit  = Math.min(20, parseInt(searchParams.get('limit') ?? '10'));
    const search = searchParams.get('search')?.trim() ?? '';
    const status = searchParams.get('status') ?? '';  // 'live' | 'completed' | ''

    await connectDB();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = { visibility: 'public' };

    if (search) {
      query.$or = [
        { 'teamA.name': { $regex: search, $options: 'i' } },
        { 'teamB.name': { $regex: search, $options: 'i' } },
        { title:        { $regex: search, $options: 'i' } },
      ];
    }

    if (status === 'live' || status === 'completed') {
      query.status = status;
    }

    const skip  = (page - 1) * limit;
    const total = await Match.countDocuments(query);
    const matches = await Match.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-shareToken')  // never expose token in lists
      .lean();

    return apiSuccess({
      items: matches,
      total,
      page,
      limit,
      hasMore: skip + matches.length < total,
    });
  } catch (err) {
    console.error('[GET /api/matches]', err);
    return apiError('Failed to fetch matches', 500);
  }
}

// ─── POST /api/matches ─────────────────────────────────────
const createMatchSchema = z.object({
  title:       z.string().max(100).optional(),
  teamAName:   z.string().min(1).max(60),
  teamBName:   z.string().min(1).max(60),
  totalOvers:  z.number().int().min(1).max(50).default(6),
  visibility:  z.enum(['public', 'private']).default('private'),
  tossWonBy:   z.enum(['teamA', 'teamB']),
  tossChoice:  z.enum(['bat', 'bowl']),
  teamAPlayers: z.array(z.object({
    name:             z.string().min(1).max(80),
    existingPlayerId: z.string().optional(),
  })).min(1).max(15),
  teamBPlayers: z.array(z.object({
    name:             z.string().min(1).max(80),
    existingPlayerId: z.string().optional(),
  })).min(1).max(15),
});

export async function POST(req: NextRequest) {
  // Rate limit: 10 match creations per 15 min per IP
  const ip = getClientIp(req);
  if (!checkRateLimit(`create_match_${ip}`, 10, 15 * 60 * 1000)) {
    return apiError('Too many requests. Please wait a moment.', 429);
  }

  try {
    const body = await req.json();
    const parsed = createMatchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message, 422);
    }

    const data = parsed.data;
    await connectDB();

    // ── Resolve or create players ──────────────────────────
    async function resolvePlayers(
      entries: { name: string; existingPlayerId?: string }[]
    ): Promise<string[]> {
      const ids: string[] = [];
      for (const entry of entries) {
        if (entry.existingPlayerId) {
          // Validate existing player exists
          const exists = await Player.findById(entry.existingPlayerId).select('_id').lean();
          if (exists) { ids.push(entry.existingPlayerId); continue; }
        }
        // Auto-create new minimal player profile
        const player = await Player.create({ name: sanitizeString(entry.name) });
        ids.push(player._id.toString());
      }
      return ids;
    }

    const [teamAPlayerIds, teamBPlayerIds] = await Promise.all([
      resolvePlayers(data.teamAPlayers),
      resolvePlayers(data.teamBPlayers),
    ]);

    // ── Determine batting/bowling order from toss ──────────
    let battingTeam: 'teamA' | 'teamB';
    let bowlingTeam: 'teamA' | 'teamB';

    if (data.tossWonBy === 'teamA') {
      battingTeam = data.tossChoice === 'bat' ? 'teamA' : 'teamB';
    } else {
      battingTeam = data.tossChoice === 'bat' ? 'teamB' : 'teamA';
    }
    bowlingTeam = battingTeam === 'teamA' ? 'teamB' : 'teamA';

    // ── Create match ───────────────────────────────────────
    const shareToken = generateShareToken();
    const match = await Match.create({
      title:       data.title ? sanitizeString(data.title) : undefined,
      teamA:       { name: sanitizeString(data.teamAName), playerIds: teamAPlayerIds },
      teamB:       { name: sanitizeString(data.teamBName), playerIds: teamBPlayerIds },
      totalOvers:  data.totalOvers,
      visibility:  data.visibility,
      shareToken,
      tossWonBy:   data.tossWonBy,
      tossChoice:  data.tossChoice,
      status:      'setup',
    });

    // ── Create innings 1 ──────────────────────────────────
    const innings1 = await Innings.create({
      matchId:       match._id,
      inningsNumber: 1,
      battingTeam,
      bowlingTeam,
    });

    // ── Set match to live ─────────────────────────────────
    await Match.findByIdAndUpdate(match._id, { status: 'live' });

    return apiSuccess({
      matchId:    match._id.toString(),
      shareToken: shareToken,
      shareUrl:   `${process.env.NEXT_PUBLIC_APP_URL}/match/${match._id}?token=${shareToken}`,
      inningsId:  innings1._id.toString(),
      battingTeam,
      bowlingTeam,
    }, 201);

  } catch (err) {
    console.error('[POST /api/matches]', err);
    return apiError('Failed to create match', 500);
  }
}
