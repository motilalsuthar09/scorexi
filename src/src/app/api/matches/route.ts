// src/app/api/matches/route.ts
// ============================================================
// GET  /api/matches  — paginated public match list + search
//                      now includes live score per match
// POST /api/matches  — create a new match
// ============================================================
import { NextRequest } from 'next/server';
import { connectDB }   from '@/lib/db';
import Match           from '@/models/Match';
import Innings         from '@/models/Innings';
import Player          from '@/models/Player';
import { apiSuccess, apiError, ballsToOvers, sanitizeString } from '@/lib/utils';
import { randomBytes } from 'crypto';
import { z }           from 'zod';

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

    const skip    = (page - 1) * limit;
    const total   = await Match.countDocuments(query);
    const matches = await Match.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-shareToken')
      .lean();

    // ── Attach live score to each match ───────────────────
    // Single batched query for all current innings, then zip back
    const matchIds = matches.map(m => m._id);
    const inningsMap = new Map<string, any>();

    if (matchIds.length > 0) {
      // Fetch the current innings for every match in one query
      const inningsArr = await Innings.find({
        matchId: { $in: matchIds },
      })
        .select('matchId inningsNumber totalRuns wickets totalBalls battingTeam')
        .lean();

      // For each match keep only the innings matching currentInnings
      for (const inn of inningsArr) {
        const mid = inn.matchId.toString();
        const match = matches.find(m => m._id.toString() === mid);
        if (!match) continue;
        const current = inningsMap.get(mid);
        // Keep the innings whose number == match.currentInnings (or highest if missing)
        if (
          !current ||
          inn.inningsNumber === (match.currentInnings ?? 1) ||
          inn.inningsNumber > current.inningsNumber
        ) {
          inningsMap.set(mid, inn);
        }
      }
    }

    const items = matches.map(m => {
      const mid = m._id.toString();
      const inn = inningsMap.get(mid);
      return {
        ...m,
        // Inline score — only included when an innings exists
        liveScore: inn ? {
          runs:        inn.totalRuns,
          wickets:     inn.wickets,
          overs:       ballsToOvers(inn.totalBalls),
          battingTeam: inn.battingTeam === 'teamA' ? m.teamA.name : m.teamB.name,
        } : null,
      };
    });

    return apiSuccess({ items, total, page, limit, hasMore: skip + matches.length < total });
  } catch (err) {
    console.error('[GET /api/matches]', err);
    return apiError('Failed to fetch matches', 500);
  }
}

// ─── POST /api/matches ─────────────────────────────────────
const playerSchema = z.object({
  name:             z.string().min(1).max(60),
  existingPlayerId: z.string().optional(),
});

const settingsSchema = z.object({
  wideRuns:             z.union([z.literal(0), z.literal(1)]).default(1),
  allowSinglePlayerBat: z.boolean().default(false),
});

const createSchema = z.object({
  title:        z.string().max(100).optional(),
  teamAName:    z.string().min(1).max(60),
  teamBName:    z.string().min(1).max(60),
  totalOvers:   z.number().int().min(1).max(50).default(6),
  visibility:   z.enum(['public', 'private']).default('private'),
  tossWonBy:    z.enum(['teamA', 'teamB']),
  tossChoice:   z.enum(['bat', 'bowl']),
  teamAPlayers: z.array(playerSchema).min(2).max(15),
  teamBPlayers: z.array(playerSchema).min(2).max(15),
  isQuickMatch: z.boolean().default(false),
  settings:     settingsSchema.optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message, 422);
    }

    const data = parsed.data;
    await connectDB();

    // ── Resolve / create players ────────────────────────
    const resolveTeam = async (
      players: typeof data.teamAPlayers
    ): Promise<string[]> => {
      const ids: string[] = [];
      for (const p of players) {
        if (p.existingPlayerId) {
          const existing = await Player.findById(p.existingPlayerId).lean();
          if (existing) { ids.push(existing._id.toString()); continue; }
        }
        const created = await Player.create({ name: sanitizeString(p.name) });
        ids.push(created._id.toString());
      }
      return ids;
    };

    const [teamAPlayerIds, teamBPlayerIds] = await Promise.all([
      resolveTeam(data.teamAPlayers),
      resolveTeam(data.teamBPlayers),
    ]);

    const shareToken = randomBytes(32).toString('hex');

    const battingTeam = data.tossWonBy === 'teamA'
      ? (data.tossChoice === 'bat'  ? 'teamA' : 'teamB')
      : (data.tossChoice === 'bat'  ? 'teamB' : 'teamA');
    const bowlingTeam = battingTeam === 'teamA' ? 'teamB' : 'teamA';

    const match = await Match.create({
      title:       data.title ? sanitizeString(data.title) : undefined,
      teamA:       { name: sanitizeString(data.teamAName), playerIds: teamAPlayerIds },
      teamB:       { name: sanitizeString(data.teamBName), playerIds: teamBPlayerIds },
      totalOvers:  data.totalOvers,
      visibility:  data.visibility,
      shareToken,
      tossWonBy:   data.tossWonBy,
      tossChoice:  data.tossChoice,
      status:      'live',
      currentInnings: 1,
      isQuickMatch: data.isQuickMatch,
      settings:    data.settings ?? { wideRuns: 1, allowSinglePlayerBat: false },
    });

    const innings1 = await Innings.create({
      matchId:       match._id,
      inningsNumber: 1,
      battingTeam,
      bowlingTeam,
    });

    return apiSuccess({
      matchId:    match._id.toString(),
      shareToken,
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