// src/app/api/tournament/[id]/route.ts
// ============================================================
// GET   /api/tournament/[id]  — full tournament + fixtures
// PATCH /api/tournament/[id]  — record a fixture result
//        body: { fixtureIndex, result: 'teamA'|'teamB'|'tie', matchId?, isGroup?, groupIndex? }
// ============================================================
import { NextRequest } from 'next/server';
import { connectDB }   from '@/lib/db';
import Tournament      from '@/models/Tournament';
import { getSession }  from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/utils';
import mongoose from 'mongoose';
import { z } from 'zod';

const resultSchema = z.object({
  fixtureIndex: z.number().int().min(0),
  result:       z.enum(['teamA', 'teamB', 'tie']),
  matchId:      z.string().optional(),
  isGroup:      z.boolean().default(false),
  groupIndex:   z.number().int().min(0).optional(),
});

// ── Points table helpers ──────────────────────────────────

function buildPointsTable(groups: any[]) {
  return groups.map((group) => {
    const table: Record<string, { team: string; p: number; w: number; l: number; t: number; pts: number }> = {};
    group.teams.forEach((t: string) => {
      table[t] = { team: t, p: 0, w: 0, l: 0, t: 0, pts: 0 };
    });

    group.fixtures.forEach((f: any) => {
      if (f.result === 'pending') return;
      const a = table[f.teamA];
      const b = table[f.teamB];
      if (!a || !b) return;
      a.p++; b.p++;
      if (f.result === 'teamA') { a.w++; a.pts += 2; b.l++; }
      else if (f.result === 'teamB') { b.w++; b.pts += 2; a.l++; }
      else { a.t++; a.pts += 1; b.t++; b.pts += 1; }
    });

    const sorted = Object.values(table).sort((x, y) => y.pts - x.pts || y.w - x.w);
    return { name: group.name, table: sorted };
  });
}

/** After all group fixtures are done, seed top-2 from each group into knockout */
function seedKnockout(groups: any[]) {
  const qualifiers: string[] = [];
  groups.forEach((group) => {
    const allDone = group.fixtures.every((f: any) => f.result !== 'pending');
    if (!allDone) return;

    const table: Record<string, { pts: number; w: number }> = {};
    group.teams.forEach((t: string) => { table[t] = { pts: 0, w: 0 }; });
    group.fixtures.forEach((f: any) => {
      if (f.result === 'teamA')  { table[f.teamA].pts += 2; table[f.teamA].w++; }
      if (f.result === 'teamB')  { table[f.teamB].pts += 2; table[f.teamB].w++; }
      if (f.result === 'tie')    { table[f.teamA].pts += 1; table[f.teamB].pts += 1; }
    });
    const sorted = Object.entries(table)
      .sort(([, a], [, b]) => b.pts - a.pts || b.w - a.w)
      .map(([name]) => name);

    qualifiers.push(...sorted.slice(0, 2));
  });

  if (qualifiers.length < 2) return null;
  const fixtures = [];
  for (let i = 0; i < qualifiers.length; i += 2) {
    fixtures.push({ teamA: qualifiers[i], teamB: qualifiers[i + 1] ?? 'BYE', result: 'pending' });
  }
  return fixtures;
}

// ── GET ───────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid ID', 400);
  await connectDB();

  const t = await Tournament.findById(params.id).lean();
  if (!t) return apiError('Tournament not found', 404);

  const pointsTables = t.groups?.length ? buildPointsTable(t.groups) : null;

  return apiSuccess({ tournament: t, pointsTables });
}

// ── PATCH — Record result ─────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = getSession(req);
  if (!session) return apiError('Unauthorised', 401);

  if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid ID', 400);

  const body   = await req.json();
  const parsed = resultSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 422);

  const { fixtureIndex, result, matchId, isGroup, groupIndex } = parsed.data;

  await connectDB();
  const t = await Tournament.findById(params.id);
  if (!t) return apiError('Tournament not found', 404);
  if (t.organiserUserId.toString() !== session.userId) return apiError('Forbidden', 403);

  if (isGroup && groupIndex !== undefined) {
    // Group fixture
    const group = t.groups?.[groupIndex];
    if (!group) return apiError('Group not found', 404);
    const fixture = group.fixtures[fixtureIndex];
    if (!fixture) return apiError('Fixture not found', 404);

    fixture.result  = result;
    if (matchId) fixture.matchId = new mongoose.Types.ObjectId(matchId);

    // Check if all group stages done — seed knockout
    const allGroupsDone = t.groups!.every((g: any) =>
      g.fixtures.every((f: any) => f.result !== 'pending')
    );
    if (allGroupsDone && t.format === 'group_knockout') {
      const koFixtures = seedKnockout(t.groups!);
      if (koFixtures) t.knockoutFixtures = koFixtures as any;
    }
  } else {
    // Knockout / round-robin fixture
    const fixture = t.knockoutFixtures?.[fixtureIndex];
    if (!fixture) return apiError('Fixture not found', 404);

    fixture.result = result;
    if (matchId) fixture.matchId = new mongoose.Types.ObjectId(matchId);

    // Auto-advance knockout: if both fixtures at this round done, seed next round
    if (t.format === 'knockout' || t.format === 'group_knockout') {
      const ko = t.knockoutFixtures!;
      const roundSize = ko.length;
      const allRoundDone = ko.every((f: any) => f.result !== 'pending');

      if (allRoundDone && roundSize > 1) {
        // Build next round from winners
        const nextRound: any[] = [];
        for (let i = 0; i < ko.length; i += 2) {
          const winA = ko[i].result === 'teamA' ? ko[i].teamA : ko[i].teamB;
          const winB = ko[i + 1]
            ? (ko[i + 1].result === 'teamA' ? ko[i + 1].teamA : ko[i + 1].teamB)
            : 'BYE';
          nextRound.push({ teamA: winA, teamB: winB, result: 'pending' });
        }
        // Replace with next round
        t.knockoutFixtures = nextRound;
      }

      // If only 1 fixture and it's done → tournament complete, set winner
      if (roundSize === 1 && allRoundDone) {
        const final = ko[0];
        t.winnerId = final.result === 'teamA' ? final.teamA : final.teamB;
        t.status   = 'completed';
      }
    }
  }

  // Set to live once first result recorded
  if (t.status === 'setup') t.status = 'live';

  await t.save();

  const pointsTables = t.groups?.length ? buildPointsTable(t.groups as any) : null;
  return apiSuccess({ tournament: t, pointsTables });
}