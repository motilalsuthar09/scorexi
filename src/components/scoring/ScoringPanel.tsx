'use client';

import { useState } from 'react';
import { Loader2, RotateCcw, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  matchId:      string;
  token:        string;
  innings:      any;
  playerMap:    Record<string, any>;
  teamAPlayers: string[];
  teamBPlayers: string[];
  onBallSaved:  (result: any) => void;
}

type ExtraType = 'wide' | 'no_ball' | 'bye' | 'leg_bye' | null;

interface BallState {
  runsOffBat:   number | null;
  extraType:    ExtraType;
  isWicket:     boolean;
  dismissalType: string | null;
  strikerId:    string;
  nonStrikerId: string;
  bowlerId:     string;
}

const RUN_BTNS  = [0, 1, 2, 3, 4, 5, 6] as const;
const DISMISSALS = ['bowled', 'caught', 'lbw', 'run_out', 'stumped', 'hit_wicket', 'retired'];

export default function ScoringPanel({
  matchId, token, innings, playerMap, teamAPlayers, teamBPlayers, onBallSaved
}: Props) {
  const [saving, setSaving]         = useState(false);
  const [undoing, setUndoing]       = useState(false);
  const [error, setError]           = useState('');
  const [showSelectBowler, setShowSelectBowler] = useState(false);

  const [ball, setBall] = useState<BallState>({
    runsOffBat:    null,
    extraType:     null,
    isWicket:      false,
    dismissalType: null,
    strikerId:     innings.currentStrikerId ?? '',
    nonStrikerId:  innings.currentNonStrikerId ?? '',
    bowlerId:      innings.currentBowlerId ?? '',
  });

  // Players for this innings
  const battingTeamIds  = innings.battingTeam === 'teamA' ? teamAPlayers : teamBPlayers;
  const bowlingTeamIds  = innings.battingTeam === 'teamA' ? teamBPlayers : teamAPlayers;

  const p = (id: string) => playerMap[id] ?? { name: id?.slice(-6) ?? '?', _id: id };

  const setRun = (r: number) => {
    setBall(b => ({ ...b, runsOffBat: r, isWicket: false, extraType: null }));
  };
  const toggleExtra = (e: ExtraType) => {
    setBall(b => ({ ...b, extraType: b.extraType === e ? null : e, runsOffBat: null }));
  };
  const toggleWicket = () => {
    setBall(b => ({ ...b, isWicket: !b.isWicket, dismissalType: b.isWicket ? null : 'bowled' }));
  };

  const canSubmit = () => {
    if (!ball.strikerId || !ball.bowlerId) return false;
    if (ball.extraType === 'wide' || ball.extraType === 'no_ball') return true;
    return ball.runsOffBat !== null;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;
    setSaving(true);
    setError('');

    try {
      const payload = {
        inningsId:         innings._id,
        batsmanId:         ball.strikerId,
        bowlerId:          ball.bowlerId,
        runsOffBat:        ball.runsOffBat ?? 0,
        extraType:         ball.extraType,
        isWicket:          ball.isWicket,
        dismissalType:     ball.isWicket ? ball.dismissalType : null,
        dismissedPlayerId: ball.isWicket ? ball.strikerId : null,
      };

      const res  = await fetch(`/api/match/${matchId}/ball?token=${token}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        onBallSaved(json.data);
        // Reset ball state but keep bowler
        setBall(b => ({
          ...b,
          runsOffBat:    null,
          extraType:     null,
          isWicket:      false,
          dismissalType: null,
          strikerId:     json.data.newStrikerId    ?? b.strikerId,
          nonStrikerId:  json.data.newNonStrikerId ?? b.nonStrikerId,
        }));
      } else {
        setError(json.error || 'Failed to save ball');
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleUndo = async () => {
    setUndoing(true);
    try {
      await fetch(`/api/match/${matchId}/ball?inningsId=${innings._id}`, { method: 'DELETE' });
      onBallSaved(null);
    } finally {
      setUndoing(false);
    }
  };

  // ── Batsman not yet selected prompt ──────────────────────
  if (!ball.strikerId || !ball.nonStrikerId) {
    return (
      <div className="card p-5 space-y-3">
        <h3 className="font-display font-semibold text-white">Select Opening Batsmen</h3>
        <div>
          <p className="text-xs text-slate-400 mb-1.5">Striker</p>
          <select
            className="input-field"
            value={ball.strikerId}
            onChange={e => setBall(b => ({ ...b, strikerId: e.target.value }))}
          >
            <option value="">-- Choose --</option>
            {battingTeamIds.map(id => (
              <option key={id} value={id}>{p(id).name}</option>
            ))}
          </select>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1.5">Non-striker</p>
          <select
            className="input-field"
            value={ball.nonStrikerId}
            onChange={e => setBall(b => ({ ...b, nonStrikerId: e.target.value }))}
          >
            <option value="">-- Choose --</option>
            {battingTeamIds.filter(id => id !== ball.strikerId).map(id => (
              <option key={id} value={id}>{p(id).name}</option>
            ))}
          </select>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1.5">Opening Bowler</p>
          <select
            className="input-field"
            value={ball.bowlerId}
            onChange={e => setBall(b => ({ ...b, bowlerId: e.target.value }))}
          >
            <option value="">-- Choose --</option>
            {bowlingTeamIds.map(id => (
              <option key={id} value={id}>{p(id).name}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Current players ─────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-3">
          <p className="text-xs text-slate-500 mb-1">🏏 Striker</p>
          <p className="font-display font-semibold text-white text-sm truncate">
            {p(ball.strikerId).name}
          </p>
          <button
            className="text-xs text-brand-400 mt-1"
            onClick={() => {
              const next = battingTeamIds.find(id => id !== ball.strikerId && id !== ball.nonStrikerId);
              if (next) setBall(b => ({ ...b, strikerId: next }));
            }}
          >
            Change
          </button>
        </div>
        <div className="card p-3">
          <p className="text-xs text-slate-500 mb-1">⚾ Bowler</p>
          <p className="font-display font-semibold text-white text-sm truncate">
            {p(ball.bowlerId).name}
          </p>
          <button
            className="text-xs text-brand-400 mt-1"
            onClick={() => setShowSelectBowler(s => !s)}
          >
            Change <ChevronDown size={10} className="inline" />
          </button>
          {showSelectBowler && (
            <div className="mt-2 space-y-1">
              {bowlingTeamIds.map(id => (
                <button
                  key={id}
                  onClick={() => { setBall(b => ({ ...b, bowlerId: id })); setShowSelectBowler(false); }}
                  className={cn(
                    'block w-full text-left text-xs px-2 py-1 rounded transition-colors',
                    ball.bowlerId === id
                      ? 'bg-brand-500/20 text-brand-400'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  {p(id).name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Run buttons ─────────────────────────────── */}
      <div className="card p-4">
        <p className="text-xs text-slate-500 mb-3 font-semibold uppercase tracking-wider">Runs off bat</p>
        <div className="grid grid-cols-7 gap-2">
          {RUN_BTNS.map(r => (
            <button
              key={r}
              onClick={() => setRun(r)}
              className={cn(
                'scoring-btn',
                r === 4 ? (
                  ball.runsOffBat === 4 && !ball.extraType
                    ? 'bg-score-four border-score-four text-white shadow-lg shadow-score-four/30'
                    : 'border-score-four/30 text-score-four hover:bg-score-four/10'
                ) : r === 6 ? (
                  ball.runsOffBat === 6 && !ball.extraType
                    ? 'bg-score-six border-score-six text-white shadow-lg shadow-score-six/30'
                    : 'border-score-six/30 text-score-six hover:bg-score-six/10'
                ) : (
                  ball.runsOffBat === r && !ball.extraType
                    ? 'bg-brand-500 border-brand-500 text-white'
                    : 'border-pitch-border text-slate-300 hover:border-brand-500/50 hover:text-white'
                )
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* ── Extras & Wicket ─────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-3 font-semibold uppercase tracking-wider">Extras</p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { val: 'wide',    label: 'Wd', color: 'score-wide'   },
              { val: 'no_ball', label: 'Nb', color: 'score-noball' },
              { val: 'bye',     label: 'B',  color: 'slate-400'    },
              { val: 'leg_bye', label: 'Lb', color: 'slate-400'    },
            ] as const).map(e => (
              <button
                key={e.val}
                onClick={() => toggleExtra(e.val)}
                className={cn(
                  'scoring-btn text-base',
                  ball.extraType === e.val
                    ? `bg-${e.color}/20 border-${e.color} text-${e.color}`
                    : `border-pitch-border text-slate-400 hover:border-${e.color}/40`
                )}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-3 font-semibold uppercase tracking-wider">Wicket</p>
          <button
            onClick={toggleWicket}
            className={cn(
              'scoring-btn w-full text-xl',
              ball.isWicket
                ? 'bg-score-wicket border-score-wicket text-white shadow-lg shadow-score-wicket/30 animate-score-pop'
                : 'border-score-wicket/30 text-score-wicket hover:bg-score-wicket/10'
            )}
          >
            W
          </button>
          {ball.isWicket && (
            <select
              className="input-field mt-2 text-xs"
              value={ball.dismissalType ?? 'bowled'}
              onChange={e => setBall(b => ({ ...b, dismissalType: e.target.value }))}
            >
              {DISMISSALS.map(d => (
                <option key={d} value={d}>{d.replace('_', ' ')}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ── Submit ──────────────────────────────────── */}
      {error && (
        <p className="text-score-wicket text-sm text-center bg-score-wicket/10 rounded-xl py-2 px-4">
          {error}
        </p>
      )}

      <div className="grid grid-cols-4 gap-3">
        <button
          onClick={handleUndo}
          disabled={undoing}
          className="btn-secondary flex items-center justify-center gap-1.5 text-sm col-span-1"
        >
          {undoing ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
          Undo
        </button>

        <button
          onClick={handleSubmit}
          disabled={saving || !canSubmit()}
          className={cn(
            'col-span-3 btn-primary flex items-center justify-center gap-2 text-base py-3',
            !canSubmit() && 'opacity-40'
          )}
        >
          {saving ? (
            <><Loader2 size={18} className="animate-spin" /> Saving...</>
          ) : (
            <>
              Save Ball
              {ball.runsOffBat !== null && (
                <span className={cn(
                  'ml-1 px-2 py-0.5 rounded-lg font-mono text-sm',
                  ball.isWicket ? 'bg-score-wicket/20' :
                  ball.runsOffBat === 4 ? 'bg-score-four/20 text-score-four' :
                  ball.runsOffBat === 6 ? 'bg-score-six/20 text-score-six' :
                  'bg-white/10'
                )}>
                  {ball.isWicket ? 'W' : `+${ball.runsOffBat}`}
                  {ball.extraType && ` ${ball.extraType.replace('_','-').slice(0,2).toUpperCase()}`}
                </span>
              )}
              {ball.extraType && ball.runsOffBat === null && (
                <span className="ml-1 px-2 py-0.5 rounded-lg font-mono text-sm bg-score-wide/20 text-score-wide">
                  {ball.extraType === 'wide' ? 'WD' : 'NB'}+1
                </span>
              )}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
