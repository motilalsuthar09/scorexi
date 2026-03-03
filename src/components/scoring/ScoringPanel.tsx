'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, RotateCcw, ArrowLeftRight, ChevronDown, AlertCircle } from 'lucide-react';
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
type ModalType = 'setup' | 'wicket' | 'new_bowler' | null;

interface BallState {
  strikerId:    string;
  nonStrikerId: string;
  bowlerId:     string;
}

const DISMISSALS = [
  { val: 'bowled',     label: 'Bowled',       needsFielder: false, needsNonStriker: false },
  { val: 'caught',     label: 'Caught',        needsFielder: true,  needsNonStriker: false },
  { val: 'lbw',        label: 'LBW',           needsFielder: false, needsNonStriker: false },
  { val: 'run_out',    label: 'Run Out',        needsFielder: true,  needsNonStriker: true  },
  { val: 'stumped',    label: 'Stumped',        needsFielder: true,  needsNonStriker: false },
  { val: 'hit_wicket', label: 'Hit Wicket',     needsFielder: false, needsNonStriker: false },
  { val: 'retired',    label: 'Retired Hurt',   needsFielder: false, needsNonStriker: false },
];

export default function ScoringPanel({
  matchId, token, innings, playerMap, teamAPlayers, teamBPlayers, onBallSaved,
}: Props) {
  const [saving, setSaving]   = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [error, setError]     = useState('');
  const [modal, setModal]     = useState<ModalType>(null);
  const [showBowlerList, setShowBowlerList] = useState(false);
  const [showByeRuns, setShowByeRuns]       = useState(false);
  const [byeType, setByeType]               = useState<'bye' | 'leg_bye' | null>(null);

  const [ball, setBall] = useState<BallState>({
    strikerId:    innings.currentStrikerId?.toString()    ?? '',
    nonStrikerId: innings.currentNonStrikerId?.toString() ?? '',
    bowlerId:     innings.currentBowlerId?.toString()     ?? '',
  });

  const [wicketDismissedId,    setWicketDismissedId]    = useState('');
  const [wicketDismissalType,  setWicketDismissalType]  = useState('bowled');
  const [wicketFielderId,      setWicketFielderId]      = useState('');
  const [newBatsmanId,         setNewBatsmanId]         = useState('');
  const [dismissedIds,         setDismissedIds]         = useState<string[]>([]);

  const battingTeamIds = innings.battingTeam === 'teamA' ? teamAPlayers : teamBPlayers;
  const bowlingTeamIds = innings.battingTeam === 'teamA' ? teamBPlayers : teamAPlayers;
  const availableBatsmen = battingTeamIds.filter(
    id => id !== ball.strikerId && id !== ball.nonStrikerId && !dismissedIds.includes(id)
  );

  const p = (id: string) => playerMap[id] ?? { name: id ? `P-${id.slice(-4)}` : '?', _id: id };
  const selectedDismissal = DISMISSALS.find(d => d.val === wicketDismissalType);

  useEffect(() => {
    setBall(prev => ({
      strikerId:    innings.currentStrikerId?.toString()    ?? prev.strikerId,
      nonStrikerId: innings.currentNonStrikerId?.toString() ?? prev.nonStrikerId,
      bowlerId:     innings.currentBowlerId?.toString()     ?? prev.bowlerId,
    }));
  }, [innings.currentStrikerId, innings.currentNonStrikerId, innings.currentBowlerId]);

  useEffect(() => {
    const needsSetup = !ball.strikerId || !ball.nonStrikerId || !ball.bowlerId;
    if (needsSetup) setModal('setup');
  }, []);

  const submitBall = useCallback(async (opts: {
    runsOffBat: number; extraType: ExtraType; isWicket: boolean;
    dismissalType?: string; dismissedPlayerId?: string;
    fielderPlayerId?: string; newBatsmanId?: string;
  }) => {
    if (!ball.strikerId || !ball.nonStrikerId || !ball.bowlerId) {
      setModal('setup'); return;
    }
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/match/${matchId}/ball?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inningsId:         innings._id,
          batsmanId:         ball.strikerId,
          bowlerId:          ball.bowlerId,
          runsOffBat:        opts.runsOffBat,
          extraType:         opts.extraType ?? null,
          isWicket:          opts.isWicket,
          dismissalType:     opts.dismissalType   ?? null,
          dismissedPlayerId: opts.dismissedPlayerId ?? null,
          fielderPlayerId:   opts.fielderPlayerId  ?? null,
          newBatsmanId:      opts.newBatsmanId     ?? null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        const data = json.data;
        setBall(b => ({
          strikerId:    data.newStrikerId    ?? b.strikerId,
          nonStrikerId: data.newNonStrikerId ?? b.nonStrikerId,
          bowlerId:     data.newBowlerId     ?? b.bowlerId,
        }));
        if (opts.dismissedPlayerId) {
          setDismissedIds(d => [...d, opts.dismissedPlayerId!]);
        }
        if (data.overComplete && !data.inningsOver) setModal('new_bowler');
        onBallSaved(data);
      } else {
        setError(json.error || 'Failed to save ball');
      }
    } catch { setError('Network error. Please retry.'); }
    finally { setSaving(false); }
  }, [ball, innings._id, matchId, token, onBallSaved]);

  const handleRun = (runs: number) => {
    submitBall({ runsOffBat: runs, extraType: null, isWicket: false });
  };

  const handleExtra = (type: ExtraType) => {
    if (type === 'wide' || type === 'no_ball') {
      submitBall({ runsOffBat: 0, extraType: type, isWicket: false });
    } else {
      setByeType(type as 'bye' | 'leg_bye');
      setShowByeRuns(true);
    }
  };

  const handleByeSubmit = (runs: number) => {
    if (!byeType) return;
    submitBall({ runsOffBat: runs, extraType: byeType, isWicket: false });
    setShowByeRuns(false); setByeType(null);
  };

  const handleWicketTap = () => {
    setWicketDismissedId(ball.strikerId);
    setWicketDismissalType('bowled');
    setWicketFielderId('');
    setNewBatsmanId(availableBatsmen[0] ?? '');
    setModal('wicket');
  };

  const confirmWicket = (runsOnBall: number = 0) => {
    submitBall({
      runsOffBat:        runsOnBall,
      extraType:         null,
      isWicket:          true,
      dismissalType:     wicketDismissalType,
      dismissedPlayerId: wicketDismissedId,
      fielderPlayerId:   selectedDismissal?.needsFielder ? wicketFielderId : undefined,
      newBatsmanId:      newBatsmanId || undefined,
    });
    setModal(null);
  };

  const handleUndo = async () => {
    setUndoing(true);
    try {
      const res  = await fetch(`/api/match/${matchId}/ball?inningsId=${innings._id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) onBallSaved(json.data);
    } catch { setError('Undo failed'); }
    finally { setUndoing(false); }
  };

  const handleSwap = () => setBall(b => ({ ...b, strikerId: b.nonStrikerId, nonStrikerId: b.strikerId }));

  // ── SETUP MODAL ──────────────────────────────────────────
  if (modal === 'setup') {
    const canStart = ball.strikerId && ball.nonStrikerId && ball.bowlerId && ball.strikerId !== ball.nonStrikerId;
    return (
      <div className="card p-5 space-y-4 animate-fade-in">
        <div>
          <h3 className="font-display font-bold text-white text-lg mb-0.5">
            {innings.inningsNumber === 1 ? 'Start Match' : 'Start Innings 2'}
          </h3>
          <p className="text-slate-400 text-sm">Select opening players to begin</p>
        </div>
        {innings.inningsNumber === 2 && innings.targetRuns && (
          <div className="bg-brand-500/10 border border-brand-500/25 rounded-xl p-3 text-center">
            <p className="text-slate-400 text-xs">Chasing</p>
            <p className="font-display font-bold text-3xl text-white">{innings.targetRuns}</p>
            <p className="text-slate-400 text-xs">runs to win in {innings.totalOvers ?? ''} overs</p>
          </div>
        )}
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block font-semibold uppercase tracking-wide">Striker (facing first ball)</label>
          <select className="input-field" value={ball.strikerId}
            onChange={e => setBall(b => ({ ...b, strikerId: e.target.value }))}>
            <option value="">-- Choose Striker --</option>
            {battingTeamIds.filter(id => id !== ball.nonStrikerId).map(id => (
              <option key={id} value={id}>{p(id).name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block font-semibold uppercase tracking-wide">Non-Striker</label>
          <select className="input-field" value={ball.nonStrikerId}
            onChange={e => setBall(b => ({ ...b, nonStrikerId: e.target.value }))}>
            <option value="">-- Choose Non-Striker --</option>
            {battingTeamIds.filter(id => id !== ball.strikerId).map(id => (
              <option key={id} value={id}>{p(id).name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block font-semibold uppercase tracking-wide">Opening Bowler</label>
          <select className="input-field" value={ball.bowlerId}
            onChange={e => setBall(b => ({ ...b, bowlerId: e.target.value }))}>
            <option value="">-- Choose Bowler --</option>
            {bowlingTeamIds.map(id => (
              <option key={id} value={id}>{p(id).name}</option>
            ))}
          </select>
        </div>
        <button disabled={!canStart} onClick={() => setModal(null)}
          className={cn('btn-primary w-full py-3 text-base', !canStart && 'opacity-40')}>
          Start Scoring
        </button>
      </div>
    );
  }

  // ── WICKET MODAL ─────────────────────────────────────────
  if (modal === 'wicket') {
    return (
      <div className="card p-5 space-y-4 animate-slide-up border border-score-wicket/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-score-wicket/20 rounded-xl flex items-center justify-center">
            <span className="text-score-wicket font-bold text-lg">W</span>
          </div>
          <h3 className="font-display font-bold text-white text-lg">Wicket!</h3>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-2 block font-semibold uppercase tracking-wide">Who is OUT?</label>
          <div className="grid grid-cols-2 gap-2">
            {[ball.strikerId, ball.nonStrikerId].filter(Boolean).map(id => (
              <button key={id} onClick={() => setWicketDismissedId(id)}
                className={cn('py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all',
                  wicketDismissedId === id
                    ? 'bg-score-wicket/20 border-score-wicket text-score-wicket'
                    : 'border-pitch-border text-slate-300 hover:border-score-wicket/40')}>
                {p(id).name}
                {id === ball.strikerId && <span className="ml-1 text-[10px] text-slate-500">(striker)</span>}
                {id === ball.nonStrikerId && <span className="ml-1 text-[10px] text-slate-500">(non-str)</span>}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-2 block font-semibold uppercase tracking-wide">How OUT?</label>
          <div className="grid grid-cols-2 gap-1.5">
            {DISMISSALS.map(d => (
              <button key={d.val} onClick={() => setWicketDismissalType(d.val)}
                className={cn('py-2 px-3 rounded-xl border text-sm transition-all text-left',
                  wicketDismissalType === d.val
                    ? 'bg-score-wicket/15 border-score-wicket text-white'
                    : 'border-pitch-border text-slate-400 hover:border-score-wicket/30')}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
        {selectedDismissal?.needsFielder && (
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block font-semibold uppercase tracking-wide">
              {wicketDismissalType === 'caught' ? 'Caught by' :
               wicketDismissalType === 'stumped' ? 'Stumped by' : 'Fielder'} (optional)
            </label>
            <select className="input-field" value={wicketFielderId}
              onChange={e => setWicketFielderId(e.target.value)}>
              <option value="">-- Select fielder --</option>
              {bowlingTeamIds.map(id => (
                <option key={id} value={id}>{p(id).name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="text-xs text-slate-400 mb-2 block font-semibold uppercase tracking-wide">
            Runs on this ball
          </label>
          <div className="grid grid-cols-5 gap-2">
            {[0, 1, 2, 3, 4].map(r => (
              <button key={r} onClick={() => confirmWicket(r)}
                className="scoring-btn border-pitch-border text-slate-300 hover:border-brand-500/50 hover:text-white font-display font-bold text-lg">
                {r}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 text-center mt-1.5">Tap runs to confirm wicket</p>
        </div>
        {availableBatsmen.length > 0 && (
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block font-semibold uppercase tracking-wide">Next Batsman</label>
            <select className="input-field" value={newBatsmanId}
              onChange={e => setNewBatsmanId(e.target.value)}>
              <option value="">-- Choose next batsman --</option>
              {availableBatsmen.map(id => (
                <option key={id} value={id}>{p(id).name}</option>
              ))}
            </select>
          </div>
        )}
        {availableBatsmen.length === 0 && (
          <p className="text-score-wide text-sm text-center">Last wicket — innings ends after this.</p>
        )}
        <button onClick={() => setModal(null)}
          className="w-full border border-pitch-border text-slate-400 py-2 rounded-xl text-sm hover:text-white">
          Cancel
        </button>
      </div>
    );
  }

  // ── NEW BOWLER MODAL ──────────────────────────────────────
  if (modal === 'new_bowler') {
    return (
      <div className="card p-5 space-y-4 animate-fade-in">
        <div>
          <h3 className="font-display font-bold text-white text-lg">Over Complete!</h3>
          <p className="text-slate-400 text-sm">Select bowler for next over</p>
        </div>
        <div className="space-y-1.5">
          {bowlingTeamIds.filter(id => id !== ball.bowlerId).map(id => (
            <button key={id}
              onClick={() => { setBall(b => ({ ...b, bowlerId: id })); setModal(null); }}
              className="w-full text-left px-4 py-3 rounded-xl border border-pitch-border
                         text-slate-300 hover:border-brand-500/50 hover:text-white
                         font-display font-semibold text-sm transition-all">
              {p(id).name}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-600 text-center">Tap to start next over</p>
      </div>
    );
  }

  // ── BYE/LEG-BYE RUNS ─────────────────────────────────────
  if (showByeRuns) {
    return (
      <div className="card p-5 space-y-4 animate-fade-in">
        <div>
          <h3 className="font-display font-bold text-white">
            {byeType === 'bye' ? 'Bye' : 'Leg Bye'}
          </h3>
          <p className="text-slate-400 text-sm">How many runs?</p>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {[0, 1, 2, 3, 4].map(r => (
            <button key={r} onClick={() => handleByeSubmit(r)}
              className="scoring-btn border-pitch-border text-slate-300 font-display font-bold text-xl
                         hover:border-brand-500/50 hover:text-white">
              {r}
            </button>
          ))}
        </div>
        <button onClick={() => setShowByeRuns(false)}
          className="w-full border border-pitch-border text-slate-400 py-2 rounded-xl text-sm">
          Cancel
        </button>
      </div>
    );
  }

  // ── MAIN SCORING VIEW ─────────────────────────────────────
  return (
    <div className="space-y-3">

      {/* Current Players */}
      <div className="card p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-pitch-dark rounded-xl px-3 py-2 border border-brand-500/30">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Striker</p>
            <p className="text-white font-display font-semibold text-sm truncate">{p(ball.strikerId).name}</p>
          </div>
          <button onClick={handleSwap} title="Swap striker/non-striker"
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-pitch-border
                       text-slate-400 hover:text-white hover:border-brand-500/50 transition-all flex-shrink-0">
            <ArrowLeftRight size={15} />
          </button>
          <div className="flex-1 bg-pitch-dark rounded-xl px-3 py-2 border border-pitch-border">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Non-Striker</p>
            <p className="text-slate-300 font-display font-semibold text-sm truncate">{p(ball.nonStrikerId).name}</p>
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setShowBowlerList(s => !s)}
            className="w-full flex items-center gap-2 bg-pitch-dark rounded-xl px-3 py-2
                       border border-pitch-border hover:border-score-wicket/30 transition-all">
            <div className="flex-1 text-left">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Bowler</p>
              <p className="text-slate-300 font-display font-semibold text-sm">{p(ball.bowlerId).name}</p>
            </div>
            <ChevronDown size={13} className={cn('text-slate-500 transition-transform flex-shrink-0',
              showBowlerList && 'rotate-180')} />
          </button>
          {showBowlerList && (
            <div className="absolute z-20 left-0 right-0 top-full mt-1 card p-2 shadow-xl border border-pitch-border">
              {bowlingTeamIds.map(id => (
                <button key={id}
                  onClick={() => { setBall(b => ({ ...b, bowlerId: id })); setShowBowlerList(false); }}
                  className={cn('w-full text-left text-sm px-3 py-2.5 rounded-lg transition-colors',
                    ball.bowlerId === id
                      ? 'bg-score-wicket/10 text-score-wicket font-semibold'
                      : 'text-slate-300 hover:bg-white/5')}>
                  {p(id).name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Run Buttons - auto save */}
      <div className="card p-3">
        <p className="text-[10px] text-slate-500 mb-2.5 font-semibold uppercase tracking-wider text-center">
          Tap run to score — saves instantly
        </p>
        <div className="grid grid-cols-7 gap-1.5">
          {[0, 1, 2, 3, 4, 5, 6].map(r => (
            <button key={r} onClick={() => handleRun(r)} disabled={saving}
              className={cn('scoring-btn font-display font-bold text-xl transition-all active:scale-90',
                r === 4 ? 'border-score-four/40 text-score-four hover:bg-score-four/15 hover:border-score-four' :
                r === 6 ? 'border-score-six/40 text-score-six hover:bg-score-six/15 hover:border-score-six' :
                r === 0 ? 'border-pitch-border text-slate-500 hover:border-brand-500/30 hover:text-white' :
                'border-pitch-border text-slate-300 hover:border-brand-500/50 hover:text-white')}>
              {saving ? <Loader2 size={14} className="animate-spin mx-auto" /> : r}
            </button>
          ))}
        </div>
      </div>

      {/* Extras */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { val: 'wide',    label: 'Wd', sub: '+1 auto' },
          { val: 'no_ball', label: 'Nb', sub: '+1 auto' },
          { val: 'bye',     label: 'B',  sub: '+ runs'  },
          { val: 'leg_bye', label: 'Lb', sub: '+ runs'  },
        ].map(e => (
          <button key={e.val} onClick={() => handleExtra(e.val as ExtraType)} disabled={saving}
            className="card-hover py-2.5 px-2 rounded-xl border border-pitch-border text-center
                       text-slate-400 hover:text-white hover:border-pitch-muted transition-all active:scale-90">
            <p className="font-display font-bold text-base">{e.label}</p>
            <p className="text-[10px] text-slate-600">{e.sub}</p>
          </button>
        ))}
      </div>

      {/* Wicket */}
      <button onClick={handleWicketTap} disabled={saving}
        className="w-full py-3 border-2 border-score-wicket/50 text-score-wicket rounded-xl
                   font-display font-bold text-xl hover:bg-score-wicket/10 transition-all active:scale-95">
        W — Wicket
      </button>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-score-wicket/10 border border-score-wicket/30 rounded-xl px-4 py-2.5">
          <AlertCircle size={14} className="text-score-wicket flex-shrink-0" />
          <p className="text-score-wicket text-sm">{error}</p>
        </div>
      )}

      {/* Undo + Change Players */}
      <div className="flex items-center gap-2">
        <button onClick={handleUndo} disabled={undoing}
          className="btn-secondary flex-1 flex items-center justify-center gap-1.5 text-sm py-2.5">
          {undoing ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
          Undo Last Ball
        </button>
        <button onClick={() => setModal('setup')}
          className="border border-pitch-border text-slate-400 px-3 py-2.5 rounded-xl text-xs
                     hover:text-white hover:border-pitch-muted transition-all">
          Change Players
        </button>
      </div>

      {saving && (
        <p className="text-center text-brand-400 text-xs flex items-center justify-center gap-1.5">
          <Loader2 size={11} className="animate-spin" /> Saving...
        </p>
      )}
    </div>
  );
}
