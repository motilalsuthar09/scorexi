// src/app/api/og/match/[id]/route.tsx  ← .tsx required for JSX
import { ImageResponse } from 'next/og';
import { NextRequest }   from 'next/server';
import { connectDB }     from '@/lib/db';
import Match             from '@/models/Match';
import Innings           from '@/models/Innings';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const match = await Match.findById(params.id).lean() as any;
    if (!match) return fallback();

    const innings = await Innings.find({ matchId: match._id }).sort({ inningsNumber: 1 }).lean() as any[];
    const inn1 = innings[0];
    const inn2 = innings[1];

    const teamA = match.teamA.name;
    const teamB = match.teamB.name;

    function score(inn: any, team: string) {
      if (!inn || inn.battingTeam !== team) return null;
      const b = inn.totalBalls ?? 0;
      return `${inn.totalRuns}/${inn.wickets} (${Math.floor(b/6)}.${b%6})`;
    }

    const scoreA = score(inn1, 'teamA') ?? score(inn2, 'teamA');
    const scoreB = score(inn1, 'teamB') ?? score(inn2, 'teamB');
    const isLive = match.status === 'live' || match.status === 'innings_break';
    const isDone = match.status === 'completed';
    const result = match.result?.summary ?? '';

    const pillBg   = isLive ? 'rgba(239,68,68,0.15)'  : isDone ? 'rgba(99,102,241,0.15)'  : 'rgba(71,85,105,0.3)';
    const pillBdr  = isLive ? 'rgba(239,68,68,0.4)'   : isDone ? 'rgba(99,102,241,0.4)'   : 'rgba(71,85,105,0.4)';
    const pillClr  = isLive ? '#ef4444'                : isDone ? '#6366f1'                : '#94a3b8';
    const pillLbl  = isLive ? 'LIVE'                   : isDone ? 'COMPLETED'              : 'UPCOMING';

    return new ImageResponse(
      <div style={{ display:'flex', flexDirection:'column', width:1200, height:630,
        background:'linear-gradient(135deg,#0f1623 0%,#1a2332 100%)', padding:'56px 72px',
        fontFamily:'system-ui,-apple-system,sans-serif' }}>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:36 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ background:'#6366f1', borderRadius:12, width:48, height:48,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:22, fontWeight:800, color:'#fff' }}>XI</div>
            <div style={{ color:'#6366f1', fontSize:22, fontWeight:700 }}>ScoreXI</div>
          </div>
          <div style={{ background:pillBg, border:`1px solid ${pillBdr}`, borderRadius:100,
            padding:'6px 20px', color:pillClr, fontSize:18, fontWeight:700,
            display:'flex', alignItems:'center', gap:8 }}>
            {isLive && <div style={{ width:10, height:10, borderRadius:'50%', background:'#ef4444' }} />}
            {pillLbl}
          </div>
        </div>

        <div style={{ color:'#64748b', fontSize:18, marginBottom:28 }}>
          {match.totalOvers} overs · {match.title ?? `${teamA} vs ${teamB}`}
        </div>

        <div style={{ display:'flex', gap:24, flex:1 }}>
          {[{ name:teamA, score:scoreA }, { name:teamB, score:scoreB }].map((t, i) => (
            <div key={i} style={{ flex:1, background:'rgba(255,255,255,0.04)',
              border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:'28px 36px',
              display:'flex', flexDirection:'column', justifyContent:'center' }}>
              <div style={{ color:'#94a3b8', fontSize:18, marginBottom:10 }}>{t.name}</div>
              <div style={{ color: t.score ? '#fff' : '#334155',
                fontSize: t.score ? 52 : 32, fontWeight:800, lineHeight:1 }}>
                {t.score ?? 'Yet to bat'}
              </div>
            </div>
          ))}
        </div>

        {isDone && result && (
          <div style={{ marginTop:24, background:'rgba(99,102,241,0.12)',
            border:'1px solid rgba(99,102,241,0.25)', borderRadius:14, padding:'12px 28px',
            color:'#a5b4fc', fontSize:20, fontWeight:700, textAlign:'center' }}>
            🏆 {result}
          </div>
        )}
      </div>,
      { width:1200, height:630, headers:{ 'Cache-Control':'public, max-age=60' } }
    );
  } catch {
    return fallback();
  }
}

function fallback() {
  return new ImageResponse(
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
      width:1200, height:630, background:'linear-gradient(135deg,#0f1623 0%,#1a2332 100%)' }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
        <div style={{ background:'#6366f1', borderRadius:16, width:72, height:72,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:36, fontWeight:800, color:'#fff' }}>XI</div>
        <div style={{ color:'#fff', fontSize:36, fontWeight:700 }}>ScoreXI</div>
        <div style={{ color:'#6366f1', fontSize:20 }}>Live Cricket Scoring</div>
      </div>
    </div>,
    { width:1200, height:630 }
  );
}
