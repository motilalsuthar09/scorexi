// src/app/api/tournament/route.ts
// ============================================================
// POST /api/tournament   — Create tournament + generate fixtures
// GET  /api/tournament   — List tournaments created by session user
// ============================================================
import { NextRequest } from 'next/server';
import { connectDB }   from '@/lib/db';
import Tournament      from '@/models/Tournament';
import { getSession }  from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/utils';
import { z } from 'zod';

const createSchema = z.object({
  name:       z.string().min(2).max(120).trim(),
  format:     z.enum(['round_robin', 'knockout', 'group_knockout']),
  teams:      z.array(z.string().min(1).max(60)).min(2).max(16),
  totalOvers: z.number().int().min(1).max(50).default(20),
  // group_knockout only
  numGroups:  z.number().int().min(2).max(4).optional(),
});

// ── Fixture generators ────────────────────────────────────

/** Round-robin: every team plays every other team once */
function roundRobinFixtures(teams: string[]) {
  const fixtures = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      fixtures.push({ teamA: teams[i], teamB: teams[j], result: 'pending' as const });
    }
  }
  return fixtures;
}

/** Single-elimination knockout bracket (teams must be power of 2 or padded with byes) */
function knockoutFixtures(teams: string[]) {
  // Pad to next power of 2 with BYE slots
  let size = 1;
  while (size < teams.length) size *= 2;
  const padded = [...teams];
  while (padded.length < size) padded.push('BYE');

  // Shuffle for seeding randomness
  for (let i = padded.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [padded[i], padded[j]] = [padded[j], padded[i]];
  }

  const fixtures = [];
  for (let i = 0; i < padded.length; i += 2) {
    fixtures.push({ teamA: padded[i], teamB: padded[i + 1], result: 'pending' as const });
  }
  return fixtures;
}

/** Group + knockout: split teams into N groups, round-robin within each */
function groupKnockoutSetup(teams: string[], numGroups: number) {
  const groupNames = ['Group A', 'Group B', 'Group C', 'Group D'];
  const shuffled   = [...teams].sort(() => Math.random() - 0.5);
  const groups = [];

  for (let g = 0; g < numGroups; g++) {
    const groupTeams: string[] = [];
    for (let i = g; i < shuffled.length; i += numGroups) {
      groupTeams.push(shuffled[i]);
    }
    groups.push({
      name:     groupNames[g] ?? `Group ${g + 1}`,
      teams:    groupTeams,
      fixtures: roundRobinFixtures(groupTeams),
    });
  }

  return groups;
}

// ── POST — Create ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) return apiError('Unauthorised', 401);

  const body   = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 422);

  const { name, format, teams, totalOvers, numGroups } = parsed.data;

  await connectDB();

  const doc: any = {
    name,
    format,
    teams,
    totalOvers,
    status: 'setup',
    organiserUserId: session.userId,
  };

  if (format === 'round_robin') {
    // Store fixtures directly on knockoutFixtures — used as flat fixture list
    doc.knockoutFixtures = roundRobinFixtures(teams);
  } else if (format === 'knockout') {
    doc.knockoutFixtures = knockoutFixtures(teams);
  } else {
    // group_knockout
    const ng = numGroups ?? Math.min(Math.ceil(teams.length / 4), 4);
    doc.groups = groupKnockoutSetup(teams, ng);
    // Knockout fixtures seeded later once group stage finishes
    doc.knockoutFixtures = [];
  }

  const tournament = await Tournament.create(doc);
  return apiSuccess({ tournament }, 201);
}

// ── GET — List mine ───────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session) return apiError('Unauthorised', 401);

  await connectDB();
  const tournaments = await Tournament.find({ organiserUserId: session.userId })
    .sort({ createdAt: -1 })
    .select('name format status teams totalOvers createdAt')
    .lean();

  return apiSuccess({ tournaments });
}