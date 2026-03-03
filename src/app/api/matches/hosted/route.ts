// ============================================================
// GET /api/matches/hosted?keys=id1:token1,id2:token2
// Returns live/setup/completed matches by IDs stored in client
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

    const pairs = keysParam.split(',')
      .map(k => { const [id, token] = k.split(':'); return { id: id?.trim(), token: token?.trim() }; })
      .filter(p => p.id && p.id.length > 10);

    if (!pairs.length) return apiSuccess({ matches: [] });

    await connectDB();

    const matches = await Match.find({ _id: { $in: pairs.map(p => p.id) } })
      .sort({ updatedAt: -1 })
      .select('_id title teamA teamB totalOvers status visibility shareToken currentInnings createdAt updatedAt result')
      .lean();

    const results = await Promise.all(matches.map(async (m) => {
      const innings = await Innings.findOne({
        matchId:       m._id,
        inningsNumber: m.currentInnings ?? 1,
      }).select('totalRuns wickets totalBalls battingTeam').lean();

      const pair    = pairs.find(p => p.id === m._id.toString());
      const isHost  = !!pair?.token && pair.token === m.shareToken;

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
        resumeUrl: isHost
          ? `/scoring/${m._id}?token=${m.shareToken}`
          : `/match/${m._id}?token=${m.shareToken}`,
        isHost,
      };
    }));

    return apiSuccess({ matches: results });
  } catch (err) {
    console.error('[GET /api/matches/hosted]', err);
    return apiError('Failed to load matches', 500);
  }
}
