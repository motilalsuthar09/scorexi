// ============================================================
// GET /api/share/[matchId]  — get share-ready match summary
// Used by share sheet and WhatsApp preview
// ============================================================
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Match from '@/models/Match';
import Innings from '@/models/Innings';
import { apiSuccess, apiError, ballsToOvers } from '@/lib/utils';

export async function GET(
  req: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const token = req.nextUrl.searchParams.get('token');
    await connectDB();

    const match = await Match.findById(params.matchId).lean();
    if (!match) return apiError('Match not found', 404);

    if (match.visibility === 'private') {
      if (!token || token !== match.shareToken) {
        return apiError('Access denied', 403);
      }
    }

    const innings = await Innings.find({ matchId: match._id })
      .sort({ inningsNumber: 1 })
      .lean();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const shareUrl = `${appUrl}/match/${match._id}?token=${match.shareToken}`;

    // Build WhatsApp-friendly text
    const lines: string[] = [];
    lines.push(`🏏 *${match.title || `${match.teamA.name} vs ${match.teamB.name}`}*`);
    lines.push(`${match.totalOvers} overs · ${match.status === 'live' ? '🔴 LIVE' : '✅ Completed'}`);
    lines.push('');

    for (const inn of innings) {
      const teamName = inn.battingTeam === 'teamA' ? match.teamA.name : match.teamB.name;
      lines.push(`*${teamName}:* ${inn.totalRuns}/${inn.wickets} (${ballsToOvers(inn.totalBalls)} ov)`);
    }

    if (match.result) {
      lines.push('');
      lines.push(`🏆 ${match.result.summary}`);
    }

    lines.push('');
    lines.push(`📲 Live scorecard: ${shareUrl}`);
    lines.push('_Scored with ScoreXI_');

    return apiSuccess({
      match: {
        id:       match._id,
        title:    match.title || `${match.teamA.name} vs ${match.teamB.name}`,
        teamA:    match.teamA.name,
        teamB:    match.teamB.name,
        status:   match.status,
        result:   match.result,
        innings:  innings.map(i => ({
          number:   i.inningsNumber,
          team:     i.battingTeam === 'teamA' ? match.teamA.name : match.teamB.name,
          runs:     i.totalRuns,
          wickets:  i.wickets,
          overs:    ballsToOvers(i.totalBalls),
          target:   i.targetRuns,
        })),
      },
      shareUrl,
      whatsappText: lines.join('\n'),
      whatsappUrl:  `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`,
    });
  } catch (err) {
    console.error('[GET /api/share]', err);
    return apiError('Share failed', 500);
  }
}
