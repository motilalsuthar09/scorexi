// src/app/api/player/[id]/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB }  from '@/lib/db';
import Player         from '@/models/Player';
import Match          from '@/models/Match';
import Innings        from '@/models/Innings';
import Ball           from '@/models/Ball';
import { apiError }   from '@/lib/utils';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const format = req.nextUrl.searchParams.get('format') ?? 'csv';

  await connectDB();

  const player = await Player.findById(params.id).lean() as any;
  if (!player) return apiError('Player not found', 404);

  // All completed matches this player participated in
  const matches = await Match.find({
    status: 'completed',
    $or: [
      { 'teamA.playerIds': params.id },
      { 'teamB.playerIds': params.id },
    ],
  }).sort({ createdAt: -1 }).limit(50).lean() as any[];

  const rows: any[] = [];

  for (const match of matches) {
    const innings = await Innings.find({ matchId: match._id })
      .sort({ inningsNumber: 1 }).lean() as any[];

    let battingRuns:      number | null = null;
    let battingBalls:     number | null = null;
    let battingFours:     number | null = null;
    let battingSixes:     number | null = null;
    let battingDismissal: string | null = null;
    let bowlingLegal:     number | null = null;
    let bowlingWickets:   number | null = null;
    let bowlingRuns:      number | null = null;

    for (const inn of innings) {
      // Ball model uses batsmanId (= striker) and bowlerId
      const balls = await Ball.find({ inningsId: inn._id }).lean() as any[];

      // ── Batting ──────────────────────────────────────────
      const batted = balls.some((b: any) => b.batsmanId?.toString() === params.id);
      if (batted) {
        // Legal balls faced (exclude wides)
        const faced = balls.filter((b: any) =>
          b.batsmanId?.toString() === params.id &&
          b.extraType !== 'wide'
        );
        battingRuns  = (battingRuns  ?? 0) + faced.reduce((s: number, b: any) => s + (b.runsOffBat ?? 0), 0);
        battingBalls = (battingBalls ?? 0) + faced.length;
        battingFours = (battingFours ?? 0) + faced.filter((b: any) => (b.runsOffBat ?? 0) === 4).length;
        battingSixes = (battingSixes ?? 0) + faced.filter((b: any) => (b.runsOffBat ?? 0) === 6).length;
        const wkt = balls.find((b: any) =>
          b.isWicket && b.dismissedPlayerId?.toString() === params.id
        );
        if (wkt) battingDismissal = wkt.dismissalType ?? 'out';
      }

      // ── Bowling ──────────────────────────────────────────
      const bowled = balls.filter((b: any) => b.bowlerId?.toString() === params.id);
      if (bowled.length > 0) {
        const legal   = bowled.filter((b: any) => b.extraType !== 'wide' && b.extraType !== 'no_ball');
        bowlingLegal   = (bowlingLegal   ?? 0) + legal.length;
        bowlingRuns    = (bowlingRuns    ?? 0) + bowled.reduce((s: number, b: any) =>
          s + (b.runsOffBat ?? 0) + (b.extras ?? 0), 0);
        bowlingWickets = (bowlingWickets ?? 0) + bowled.filter((b: any) =>
          b.isWicket && !['run_out'].includes(b.dismissalType ?? '')
        ).length;
      }
    }

    const oversStr = bowlingLegal !== null
      ? `${Math.floor(bowlingLegal / 6)}.${bowlingLegal % 6}`
      : '-';

    rows.push({
      date:         new Date(match.createdAt).toLocaleDateString('en-IN'),
      match:        match.title || `${match.teamA.name} vs ${match.teamB.name}`,
      overs:        match.totalOvers,
      bat_runs:     battingRuns  ?? '-',
      bat_balls:    battingBalls ?? '-',
      bat_4s:       battingFours ?? '-',
      bat_6s:       battingSixes ?? '-',
      dismissal:    battingDismissal ?? (battingRuns !== null ? 'not out' : '-'),
      bowl_overs:   oversStr,
      bowl_wickets: bowlingWickets ?? '-',
      bowl_runs:    bowlingRuns    ?? '-',
    });
  }

  if (format === 'csv') {
    const headers = ['Date','Match','Overs','Bat Runs','Bat Balls','4s','6s','Dismissal','Bowl Overs','Wickets','Runs Given'];
    const csvRows = [
      headers.join(','),
      ...rows.map(r =>
        [r.date, `"${r.match}"`, r.overs,
         r.bat_runs, r.bat_balls, r.bat_4s, r.bat_6s, r.dismissal,
         r.bowl_overs, r.bowl_wickets, r.bowl_runs].join(',')
      ),
      '',
      `Career Stats — ${player.name}`,
      `Matches,${player.stats?.matchesPlayed ?? 0}`,
      `Total Runs,${player.stats?.totalRuns ?? 0}`,
      `Highest Score,${player.stats?.highestScore ?? 0}`,
      `Total Wickets,${player.stats?.totalWickets ?? 0}`,
      `Batting Average,${player.stats?.battingAverage?.toFixed(2) ?? '-'}`,
    ];

    return new NextResponse(csvRows.join('\n'), {
      headers: {
        'Content-Type':        'text/csv',
        'Content-Disposition': `attachment; filename="${player.name.replace(/\s+/g, '_')}_stats.csv"`,
      },
    });
  }

  // PDF mode — return JSON for client-side rendering
  return new NextResponse(JSON.stringify({ player: { name: player.name, stats: player.stats }, matches: rows }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
