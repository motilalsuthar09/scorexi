// src/app/api/matches/hosted/route.ts
// ============================================================
// GET /api/matches/hosted?keys=id1:token1:isQuick1,...
// Returns live/setup/completed matches by IDs stored in client.
// Keys format: "matchId:shareToken:isQuick(0|1)"
// isQuick flag is used to rebuild the correct resumeUrl (?quick=1)
// ============================================================
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Match from '@/models/Match';
import Innings from '@/models/Innings';
import { apiSuccess, apiError, ballsToOvers } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const keysParam = req.nextUrl.searchParams.get('keys');
    if (!keysParam?.trim()) return apiSuccess({ matches: [] });

    // Parse "id:token:isQuick" triples (also supports legacy "id:token" pairs)
    const pairs = keysParam.split(',')
      .map(k => {
        const parts = k.split(':');
        return {
          id:      parts[0]?.trim(),
          token:   parts[1]?.trim(),
          isQuick: parts[2] === '1',
        };
      })
      .filter(p => p.id && p.id.length > 10);

    if (!pairs.length) return apiSuccess({ matches: [] });

    await connectDB();

    const matches = await Match.find({ _id: { $in: pairs.map(p => p.id) } })
      .sort({ updatedAt: -1 })
      .select('_id title teamA teamB totalOvers status visibility shareToken currentInnings createdAt updatedAt result isQuickMatch')
      .lean();

    const results = await Promise.all(matches.map(async (m) => {
      const innings = await Innings.findOne({
        matchId:       m._id,
        inningsNumber: m.currentInnings ?? 1,
      }).select('totalRuns wickets totalBalls battingTeam').lean();

      const pair    = pairs.find(p => p.id === m._id.toString());
      const isHost  = !!pair?.token && pair.token === m.shareToken;
      // isQuickMatch: check DB field first, fall back to localStorage flag
      const isQuick = !!(m.isQuickMatch || pair?.isQuick);

      return {
        _id:        m._id,
        title:      m.title || `${m.teamA.name} vs ${m.teamB.name}`,
        teamA:      m.teamA.name,
        teamB:      m.teamB.name,
        totalOvers: m.totalOvers,
        status:     m.status,
        result:     m.result,
        shareToken: m.shareToken,
        createdAt:  m.createdAt,
        score: innings ? {
          runs:    innings.totalRuns,
          wickets: innings.wickets,
          overs:   ballsToOvers(innings.totalBalls),
          team:    innings.battingTeam === 'teamA' ? m.teamA.name : m.teamB.name,
        } : null,
        // Correct resumeUrl — adds ?quick=1 if this was a quick match
        resumeUrl: isHost
          ? `/scoring/${m._id}?token=${m.shareToken}${isQuick ? '&quick=1' : ''}`
          : `/match/${m._id}?token=${m.shareToken}`,
        isHost,
        isQuick,
      };
    }));

    return apiSuccess({ matches: results });
  } catch (err) {
    console.error('[GET /api/matches/hosted]', err);
    return apiError('Failed to load matches', 500);
  }
}