'use client';

import { useState } from 'react';
import { Loader2, ChevronRight, Users } from 'lucide-react';
import { ballsToOvers } from '@/lib/utils';

interface Props {
  matchId:     string;
  token:       string;
  match:       any;
  innings1:    any;
  onStartInn2: (target: number) => void;
}

export default function InningsBreak({ matchId, token, match, innings1, onStartInn2 }: Props) {
  const [openingBatsmen, setOpeningBatsmen] = useState({ striker: '', nonStriker: '', bowler: '' });
  const [starting, setStarting] = useState(false);
  const [error, setError]       = useState('');

  const teamA        = match.teamA;
  const teamB        = match.teamB;
  const bat1Name     = innings1.battingTeam === 'teamA' ? teamA.name : teamB.name;
  const bat2Name     = innings1.battingTeam === 'teamA' ? teamB.name : teamA.name;
  const bat2PlayerIds = innings1.battingTeam === 'teamA' ? teamB.playerIds : teamA.playerIds;
  const bowl2PlayerIds = innings1.battingTeam === 'teamA' ? teamA.playerIds : teamB.playerIds;
  const target       = innings1.totalRuns + 1;

  const handleStart = async () => {
    if (!openingBatsmen.striker || !openingBatsmen.nonStriker || !openingBatsmen.bowler) {
      setError('Select opening striker, non-striker, and bowler');
      return;
    }
    setStarting(true);
    try {
      // Start innings 2
      const res  = await fetch(`/api/match/${matchId}/complete`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'start_innings2' }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error); return; }

      // Set opening players
      const inn2Res  = await fetch(`/api/match/${matchId}/innings2-setup`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(openingBatsmen),
      });

      onStartInn2(target);
    } catch {
      setError('Failed to start innings 2');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="card p-6 space-y-5 animate-fade-in">

      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-score-wide/15 border border-score-wide/30
                        text-score-wide px-4 py-2 rounded-full text-sm font-display font-semibold mb-3">
          ☕ Innings Break
        </div>
        <h2 className="font-display font-bold text-2xl text-white mb-1">
          {bat1Name} Innings Complete
        </h2>
        <p className="text-slate-400 text-sm">
          {innings1.totalRuns}/{innings1.wickets} in {ballsToOvers(innings1.totalBalls)} overs
        </p>
      </div>

      {/* Target banner */}
      <div className="bg-brand-500/10 border border-brand-500/25 rounded-2xl p-4 text-center">
        <p className="text-slate-400 text-sm mb-1">{bat2Name} need</p>
        <p className="font-display font-bold text-5xl text-white mb-1">{target}</p>
        <p className="text-slate-400 text-sm">runs to win in {match.totalOvers} overs</p>
      </div>

      {/* Opening players for innings 2 */}
      <div className="space-y-3">
        <h3 className="font-display font-semibold text-white flex items-center gap-2">
          <Users size={16} className="text-brand-400" />
          {bat2Name} — Select Opening Batsmen
        </h3>
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Striker (facing first ball)</label>
          <select
            className="input-field"
            value={openingBatsmen.striker}
            onChange={e => setOpeningBatsmen(p => ({ ...p, striker: e.target.value }))}
          >
            <option value="">-- Choose striker --</option>
            {bat2PlayerIds.map((id: string) => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Non-striker</label>
          <select
            className="input-field"
            value={openingBatsmen.nonStriker}
            onChange={e => setOpeningBatsmen(p => ({ ...p, nonStriker: e.target.value }))}
          >
            <option value="">-- Choose non-striker --</option>
            {bat2PlayerIds.filter((id: string) => id !== openingBatsmen.striker).map((id: string) => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Opening Bowler ({bat1Name})</label>
          <select
            className="input-field"
            value={openingBatsmen.bowler}
            onChange={e => setOpeningBatsmen(p => ({ ...p, bowler: e.target.value }))}
          >
            <option value="">-- Choose bowler --</option>
            {bowl2PlayerIds.map((id: string) => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-score-wicket text-sm text-center">{error}</p>}

      <button
        onClick={handleStart}
        disabled={starting}
        className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
      >
        {starting
          ? <><Loader2 size={18} className="animate-spin" /> Starting Innings 2...</>
          : <><ChevronRight size={18} /> Start Innings 2 — Target {target}</>
        }
      </button>
    </div>
  );
}
