// src/app/tournament/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams }   from 'next/navigation';
import AppShell        from '@/components/layout/AppShell';
import Link            from 'next/link';
import { useAuth }     from '@/components/auth/AuthProvider';
import {
  Trophy, Loader2, AlertCircle, ArrowLeft,
  ChevronRight, CheckCircle, Clock, Swords,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────
interface Fixture {
  teamA: string;
  teamB: string;
  result: 'teamA' | 'teamB' | 'tie' | 'pending';
  matchId?: string;
}

interface Group {
  name: string;
  teams: string[];
  fixtures: Fixture[];
}

interface Tournament {
  _id: string;
  name: string;
  format: 'round_robin' | 'knockout' | 'group_knockout';
  status: 'setup' | 'live' | 'completed';
  organiserUserId: string;
  teams: string[];
  totalOvers: number;
  groups?: Group[];
  knockoutFixtures?: Fixture[];
  winnerId?: string;
}

interface PointsRow {
  team: string; p: number; w: number; l: number; t: number; pts: number;
}

// ── Sub-components ────────────────────────────────────────

function StatusBadge({ status }: { status: Tournament['status'] }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border',
      status === 'live'      && 'bg-score-wicket/15 border-score-wicket/30 text-score-wicket',
      status === 'completed' && 'bg-brand-500/15 border-brand-500/30 text-brand-400',
      status === 'setup'     && 'bg-white/5 border-pitch-border text-slate-400',
    )}>
      {status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-score-wicket animate-pulse" />}
      {status === 'live' ? 'Live' : status === 'completed' ? 'Completed' : 'Setup'}
    </span>
  );
}

function FixtureCard({
  fixture, index, isGroup, groupIndex, canEdit, onRecordResult,
}: {
  fixture: Fixture;
  index: number;
  isGroup: boolean;
  groupIndex?: number;
  canEdit: boolean;
  onRecordResult: (i: number, isGroup: boolean, gi?: number) => void;
}) {
  const done = fixture.result !== 'pending';
  const winner = done
    ? (fixture.result === 'teamA' ? fixture.teamA : fixture.result === 'teamB' ? fixture.teamB : null)
    : null;

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl border transition-all',
      done ? 'bg-pitch-card border-pitch-border' : 'bg-pitch-card/50 border-dashed border-pitch-border/60',
    )}>
      {/* Teams */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-sm font-display font-semibold truncate',
            winner === fixture.teamA ? 'text-brand-400' : done ? 'text-slate-400' : 'text-white',
          )}>
            {fixture.teamA}
          </span>
          {fixture.result === 'teamA' && <CheckCircle size={12} className="text-brand-400 flex-shrink-0" />}
        </div>
        <div className="flex items-center gap-1 my-1">
          <Swords size={10} className="text-slate-600" />
          <span className="text-[10px] text-slate-600 font-display uppercase tracking-wider">vs</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-sm font-display font-semibold truncate',
            winner === fixture.teamB ? 'text-brand-400' : done ? 'text-slate-400' : 'text-white',
            fixture.teamB === 'BYE' && 'text-slate-600 italic',
          )}>
            {fixture.teamB}
          </span>
          {fixture.result === 'teamB' && <CheckCircle size={12} className="text-brand-400 flex-shrink-0" />}
        </div>
      </div>

      {/* Right side */}
      <div className="flex-shrink-0 text-right">
        {done ? (
          <div className="space-y-1">
            <span className={cn(
              'text-xs font-semibold block',
              fixture.result === 'tie' ? 'text-score-wide' : 'text-brand-400',
            )}>
              {fixture.result === 'tie' ? 'Tied' : `${winner} won`}
            </span>
            {fixture.matchId && (
              <Link href={`/match/${fixture.matchId}`}
                className="text-[10px] text-slate-500 hover:text-brand-400 flex items-center gap-0.5 justify-end">
                View match <ChevronRight size={10} />
              </Link>
            )}
          </div>
        ) : canEdit && fixture.teamB !== 'BYE' ? (
          <button
            onClick={() => onRecordResult(index, isGroup, groupIndex)}
            className="text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1
                       bg-brand-500/10 border border-brand-500/20 px-2.5 py-1.5 rounded-lg"
          >
            Result <ChevronRight size={11} />
          </button>
        ) : (
          <div className="flex items-center gap-1 text-slate-500 text-xs">
            <Clock size={11} /> Pending
          </div>
        )}
      </div>
    </div>
  );
}

function PointsTable({ table, groupName }: { table: PointsRow[]; groupName: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{groupName} — Standings</p>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-slate-500">
            <th className="text-left pb-2 font-semibold">Team</th>
            <th className="text-center pb-2 font-semibold w-8">P</th>
            <th className="text-center pb-2 font-semibold w-8">W</th>
            <th className="text-center pb-2 font-semibold w-8">L</th>
            <th className="text-center pb-2 font-semibold w-8">T</th>
            <th className="text-center pb-2 font-semibold w-10 text-brand-400">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-pitch-border/40">
          {table.map((row, i) => (
            <tr key={row.team} className={cn(i < 2 && 'text-white', i >= 2 && 'text-slate-400')}>
              <td className="py-2 font-display font-semibold flex items-center gap-1.5">
                {i < 2 && <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />}
                {row.team}
              </td>
              <td className="text-center py-2">{row.p}</td>
              <td className="text-center py-2">{row.w}</td>
              <td className="text-center py-2">{row.l}</td>
              <td className="text-center py-2">{row.t}</td>
              <td className="text-center py-2 font-bold text-brand-400">{row.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-slate-600 mt-2">Top 2 qualify for knockout stage.</p>
    </div>
  );
}

// ── Record Result Modal ───────────────────────────────────
function RecordResultModal({
  fixture, onClose, onSave,
}: {
  fixture: Fixture;
  onClose: () => void;
  onSave: (result: 'teamA' | 'teamB' | 'tie', matchId?: string) => void;
}) {
  const [result,  setResult]  = useState<'teamA' | 'teamB' | 'tie' | null>(null);
  const [matchId, setMatchId] = useState('');
  const [saving,  setSaving]  = useState(false);

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    onSave(result, matchId.trim() || undefined);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="card w-full max-w-sm p-5 space-y-4">
        <h3 className="font-display font-bold text-white text-lg">Record Result</h3>
        <p className="text-slate-400 text-sm">
          <span className="text-white font-semibold">{fixture.teamA}</span>
          {' vs '}
          <span className="text-white font-semibold">{fixture.teamB}</span>
        </p>

        {/* Winner picker */}
        <div className="space-y-2">
          {[
            { val: 'teamA' as const, label: `${fixture.teamA} won` },
            { val: 'teamB' as const, label: `${fixture.teamB} won` },
            { val: 'tie'   as const, label: 'Tied / No result' },
          ].map(opt => (
            <button
              key={opt.val}
              onClick={() => setResult(opt.val)}
              className={cn(
                'w-full text-left px-4 py-3 rounded-xl border text-sm font-display font-semibold transition-all',
                result === opt.val
                  ? 'bg-brand-500/20 border-brand-500/50 text-brand-400'
                  : 'bg-pitch-card border-pitch-border text-slate-300 hover:border-brand-500/30',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Optional match link */}
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Link to ScoreXI Match (optional)</label>
          <input
            type="text"
            value={matchId}
            onChange={e => setMatchId(e.target.value)}
            placeholder="Match ID (from the match URL)"
            className="input-field text-sm"
          />
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 py-2.5">Cancel</button>
          <button
            onClick={handleSave}
            disabled={!result || saving}
            className="btn-primary flex-1 py-2.5 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function TournamentPage() {
  const params = useParams();
  const id     = params.id as string;
  const { user } = useAuth();

  const [data,    setData]    = useState<{ tournament: Tournament; pointsTables: any[] | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [modal,   setModal]   = useState<{
    fixture: Fixture; index: number; isGroup: boolean; groupIndex?: number;
  } | null>(null);

  const fetchTournament = useCallback(async () => {
    try {
      const res  = await fetch(`/api/tournament/${id}`);
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.error || 'Failed to load');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchTournament(); }, [fetchTournament]);

  const handleRecordResult = (i: number, isGroup: boolean, groupIndex?: number) => {
    if (!data) return;
    const fixture = isGroup
      ? data.tournament.groups![groupIndex!].fixtures[i]
      : data.tournament.knockoutFixtures![i];
    setModal({ fixture, index: i, isGroup, groupIndex });
  };

  const handleSaveResult = async (result: 'teamA' | 'teamB' | 'tie', matchId?: string) => {
    if (!modal) return;
    await fetch(`/api/tournament/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fixtureIndex: modal.index,
        result,
        matchId,
        isGroup:    modal.isGroup,
        groupIndex: modal.groupIndex,
      }),
    });
    setModal(null);
    fetchTournament();
  };

  if (loading) return (
    <AppShell>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="animate-spin text-brand-400" />
      </div>
    </AppShell>
  );

  if (error || !data) return (
    <AppShell>
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <AlertCircle size={36} className="text-score-wicket mx-auto mb-3" />
        <p className="text-white font-display font-bold text-xl mb-2">Not Found</p>
        <Link href="/my-matches" className="btn-secondary mt-3 inline-block">← Back</Link>
      </div>
    </AppShell>
  );

  const { tournament, pointsTables } = data;
  const isOrganiser = user && (user as any).userId === tournament.organiserUserId;
  const formatLabel = {
    round_robin:     'Round Robin',
    knockout:        'Knockout',
    group_knockout:  'Group + Knockout',
  }[tournament.format];

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-5">
        <Link href="/my-matches" className="btn-ghost flex items-center gap-1.5 text-sm mb-4 w-fit">
          <ArrowLeft size={15} /> My Matches
        </Link>

        {/* Header */}
        <div className="card p-5 mb-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-live-pulse pointer-events-none opacity-40" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-brand-600 to-brand-400 rounded-xl
                              flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-500/30">
                <Trophy size={22} className="text-white" />
              </div>
              <div>
                <h1 className="font-display font-bold text-xl text-white">{tournament.name}</h1>
                <p className="text-slate-400 text-sm mt-0.5">
                  {formatLabel} · {tournament.teams.length} teams · {tournament.totalOvers} overs
                </p>
              </div>
            </div>
            <StatusBadge status={tournament.status} />
          </div>

          {tournament.winnerId && (
            <div className="relative mt-4 p-3 bg-brand-500/10 border border-brand-500/25 rounded-xl text-center">
              <p className="text-brand-400 font-display font-bold text-base">
                🏆 {tournament.winnerId} — Champions!
              </p>
            </div>
          )}
        </div>

        {/* Group Stage */}
        {tournament.format === 'group_knockout' && tournament.groups?.map((group, gi) => (
          <div key={gi} className="mb-6 space-y-3">
            <h2 className="text-sm font-display font-bold text-slate-300 uppercase tracking-wider px-1">
              {group.name}
            </h2>

            {/* Points table */}
            {pointsTables?.[gi] && (
              <PointsTable table={pointsTables[gi].table} groupName={group.name} />
            )}

            {/* Fixtures */}
            <div className="space-y-2">
              {group.fixtures.map((f, i) => (
                <FixtureCard
                  key={i}
                  fixture={f}
                  index={i}
                  isGroup
                  groupIndex={gi}
                  canEdit={!!isOrganiser && tournament.status !== 'completed'}
                  onRecordResult={handleRecordResult}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Round Robin table */}
        {tournament.format === 'round_robin' && (() => {
          // Build points table from knockoutFixtures (used as flat list for RR)
          const table: Record<string, PointsRow> = {};
          tournament.teams.forEach(t => { table[t] = { team: t, p: 0, w: 0, l: 0, t: 0, pts: 0 }; });
          tournament.knockoutFixtures?.forEach(f => {
            if (f.result === 'pending') return;
            const a = table[f.teamA]; const b = table[f.teamB];
            if (!a || !b) return;
            a.p++; b.p++;
            if (f.result === 'teamA') { a.w++; a.pts += 2; b.l++; }
            else if (f.result === 'teamB') { b.w++; b.pts += 2; a.l++; }
            else { a.t++; a.pts++; b.t++; b.pts++; }
          });
          const sorted = Object.values(table).sort((x, y) => y.pts - x.pts || y.w - x.w);
          return <PointsTable table={sorted} groupName="Standings" />;
        })()}

        {/* Knockout / RR Fixtures */}
        {tournament.knockoutFixtures && tournament.knockoutFixtures.length > 0 && (
          <div className="mt-6 space-y-3">
            <h2 className="text-sm font-display font-bold text-slate-300 uppercase tracking-wider px-1">
              {tournament.format === 'round_robin' ? 'Fixtures' :
               tournament.format === 'group_knockout' ? 'Knockout Stage' : 'Bracket'}
            </h2>
            <div className="space-y-2">
              {tournament.knockoutFixtures.map((f, i) => (
                <FixtureCard
                  key={i}
                  fixture={f}
                  index={i}
                  isGroup={false}
                  canEdit={!!isOrganiser && tournament.status !== 'completed'}
                  onRecordResult={handleRecordResult}
                />
              ))}
            </div>
          </div>
        )}

        {/* Teams list */}
        <div className="mt-6 card p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            {tournament.teams.length} Teams
          </p>
          <div className="flex flex-wrap gap-2">
            {tournament.teams.map(team => (
              <span key={team}
                className="text-xs bg-pitch-card border border-pitch-border text-slate-300 px-3 py-1 rounded-full">
                {team}
              </span>
            ))}
          </div>
        </div>
      </div>

      {modal && (
        <RecordResultModal
          fixture={modal.fixture}
          onClose={() => setModal(null)}
          onSave={handleSaveResult}
        />
      )}
    </AppShell>
  );
}