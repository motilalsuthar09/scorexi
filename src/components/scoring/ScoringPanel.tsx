// src/components/scoring/ScoringPanel.tsx
// ============================================================
// QUICK MATCH NAME ENTRY:
//   Setup modal  → 3 text inputs (striker, non-striker, bowler).
//                  Names saved permanently to DB via rename-player API.
//   Wicket modal → text input for next batsman name (saved to DB).
//   New bowler   → tap already-named bowlers OR type a new name.
//                  New name saved to DB.
//   All of this ONLY when match.isQuickMatch === true.
//   Normal matches keep existing dropdown behaviour.
// ============================================================
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Loader2, RotateCcw, ArrowLeftRight, ChevronDown,
  AlertCircle, UserX, Target, Plus, Search, UserCheck,
} from 'lucide-react';
import { cn, ballsToOvers, economy } from '@/lib/utils';

interface Props {
  matchId:               string;
  token:                 string;
  innings:               any;
  match:                 any;
  playerMap:             Record<string, any>;
  teamAPlayers:          string[];
  teamBPlayers:          string[];
  onBallSaved:           (result: any) => void;
  bowlingScorecard?:     any[];
  battingScorecard?:     any[];
  allowSinglePlayerBat?: boolean;
  isQuickMatch?:         boolean;   // passed from URL param ?quick=1
}

type ExtraType = 'wide' | 'no_ball' | 'bye' | 'leg_bye' | null;
type ModalType = 'setup' | 'wicket' | 'new_bowler' | 'all_out_confirm' | null;

interface BallState {
  strikerId:    string;
  nonStrikerId: string;
  bowlerId:     string;
}

const DISMISSALS = [
  { val: 'bowled',     label: 'Bowled',      needsFielder: false },
  { val: 'caught',     label: 'Caught',       needsFielder: true  },
  { val: 'lbw',        label: 'LBW',          needsFielder: false },
  { val: 'run_out',    label: 'Run Out',       needsFielder: true  },
  { val: 'stumped',    label: 'Stumped',       needsFielder: true  },
  { val: 'hit_wicket', label: 'Hit Wicket',    needsFielder: false },
  { val: 'retired',    label: 'Retired Hurt',  needsFielder: false },
];

// ── Match player entry — for matchPlayers[] memory ──────────
interface MatchPlayer {
  name:      string;
  id?:       string;   // DB player ID if linked to a profile
  isClaimed?: boolean;
}

// ── Player search input — matchPlayers FIRST, then DB profiles, then custom ──
// Priority order per master prompt:
//   1. matchPlayers (already in this match)
//   2. ScoreXI player profiles (DB search)
//   3. Allow custom typed player
function QMPlayerInput({
  label, value, onChange, placeholder, autoFocus, matchPlayers = [],
}: {
  label:         string;
  value:         string;
  onChange:      (name: string, existingId?: string) => void;
  placeholder:   string;
  autoFocus?:    boolean;
  matchPlayers?: MatchPlayer[];   // ← players already seen in this match
}) {
  const [query,     setQuery]     = useState(value);
  const [dbResults, setDbResults] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [showDrop,  setShowDrop]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef  = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!value) setQuery(''); }, [value]);

  // Search DB profiles (debounced)
  useEffect(() => {
    if (query.length < 2) { setDbResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res  = await fetch(`/api/players?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setDbResults(json.data?.players ?? []);
      } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!dropRef.current?.contains(e.target as Node) &&
          !inputRef.current?.contains(e.target as Node)) setShowDrop(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Priority 1: matchPlayers filtered by query
  const matchMatches = query.length >= 1
    ? matchPlayers.filter(mp =>
        mp.name.toLowerCase().includes(query.toLowerCase())
      )
    : matchPlayers;

  // Priority 2: DB results that are NOT already in matchPlayers (deduplicate)
  const matchPlayerIds = new Set(matchPlayers.map(mp => mp.id).filter(Boolean));
  const matchPlayerNames = new Set(matchPlayers.map(mp => mp.name.toLowerCase()));
  const dbFiltered = dbResults.filter(
    dp => !matchPlayerIds.has(dp._id) && !matchPlayerNames.has(dp.name.toLowerCase())
  );

  const selectMatchPlayer = (mp: MatchPlayer) => {
    setQuery(mp.name);
    onChange(mp.name, mp.id);
    setShowDrop(false);
  };

  const selectDbPlayer = (dp: any) => {
    setQuery(dp.name);
    onChange(dp.name, dp._id);
    setDbResults([]);
    setShowDrop(false);
  };

  const addNew = () => {
    if (!query.trim()) return;
    onChange(query.trim());
    setDbResults([]);
    setShowDrop(false);
  };

  const hasResults = matchMatches.length > 0 || dbFiltered.length > 0;

  return (
    <div>
      {label && (
        <label className="text-xs text-slate-400 mb-1.5 block font-semibold uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setShowDrop(true); onChange(''); }}
          onFocus={() => setShowDrop(true)}
          onKeyDown={e => { if (e.key === 'Enter') addNew(); if (e.key === 'Escape') setShowDrop(false); }}
          placeholder={placeholder}
          className="input-field pl-8 text-sm"
          autoComplete="off"
          maxLength={40}
        />
      </div>
      {showDrop && query.length >= 1 && (
        <div ref={dropRef}
          className="absolute z-50 left-0 right-0 mt-1 card border-pitch-border shadow-xl overflow-hidden max-h-64 overflow-y-auto">

          {/* ── Priority 1: Match players ── */}
          {matchMatches.length > 0 && (
            <>
              <p className="px-3 pt-2 pb-1 text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                In this match
              </p>
              {matchMatches.map((mp, i) => (
                <button key={`mp-${i}`} type="button" onClick={() => selectMatchPlayer(mp)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5
                             text-left border-b border-pitch-border/30 last:border-0 transition-colors">
                  <div className="w-6 h-6 bg-brand-500/20 rounded-full flex items-center justify-center
                                  text-[11px] font-bold text-brand-400 flex-shrink-0">
                    {mp.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-1.5">
                    <span className="text-sm text-white">{mp.name}</span>
                    {mp.isClaimed && <UserCheck size={10} className="text-brand-400" />}
                  </div>
                  <span className="text-[9px] text-slate-600">this match</span>
                </button>
              ))}
            </>
          )}

          {/* ── Priority 2: DB profiles ── */}
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-2.5 text-slate-500 text-sm">
              <Loader2 size={13} className="animate-spin" /> Searching...
            </div>
          ) : dbFiltered.length > 0 && (
            <>
              <p className="px-3 pt-2 pb-1 text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                ScoreXI profiles
              </p>
              {dbFiltered.map((dp: any) => (
                <button key={dp._id} type="button" onClick={() => selectDbPlayer(dp)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5
                             text-left border-b border-pitch-border/30 last:border-0 transition-colors">
                  <div className="w-6 h-6 bg-pitch-border rounded-full flex items-center justify-center
                                  text-[11px] font-bold text-slate-400 flex-shrink-0">
                    {dp.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-white">{dp.name}</span>
                      {dp.isClaimed && <UserCheck size={10} className="text-brand-400" />}
                    </div>
                    {dp.username && <span className="text-[10px] text-slate-500">@{dp.username}</span>}
                  </div>
                  {dp.stats && <span className="text-[10px] text-slate-500">{dp.stats.totalRuns}R</span>}
                </button>
              ))}
            </>
          )}

          {/* ── Priority 3: Add as new custom player ── */}
          {query.trim() && (
            <button type="button" onClick={addNew}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-brand-500/5
                         text-left border-t border-pitch-border/30 transition-colors">
              <div className="w-6 h-6 bg-brand-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Plus size={12} className="text-brand-400" />
              </div>
              <span className="text-sm text-brand-400">
                {hasResults ? `Add "${query}" as new player` : `Add "${query}"`}
              </span>
            </button>
          )}

          {/* Empty state */}
          {!loading && !hasResults && !query.trim() && (
            <div className="px-3 py-2.5 text-slate-500 text-sm text-center">
              Type a name to search
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ScoringPanel({
  matchId, token, innings, match, playerMap,
  teamAPlayers, teamBPlayers, onBallSaved,
  bowlingScorecard = [], battingScorecard = [],
  allowSinglePlayerBat = false,
  isQuickMatch = false,
}: Props) {

  const [saving,         setSaving]   = useState(false);
  const [undoing,        setUndoing]  = useState(false);
  const [renaming,       setRenaming] = useState(false);
  const [error,          setError]    = useState('');
  const [modal,          setModal]    = useState<ModalType>(null);
  const [showBowlerList, setShowBowlerList] = useState(false);
  const [showByeRuns,    setShowByeRuns]    = useState(false);
  const [byeType,        setByeType]        = useState<'bye' | 'leg_bye' | null>(null);

  const [ball, setBall] = useState<BallState>({
    strikerId:    innings.currentStrikerId?.toString()    ?? '',
    nonStrikerId: innings.currentNonStrikerId?.toString() ?? '',
    bowlerId:     innings.currentBowlerId?.toString()     ?? '',
  });

  const setupShownRef = useRef(false);

  // ── matchPlayers: dynamic list of all players seen in this match ─────────
  // Priority 1 source for QMPlayerInput suggestions.
  // Seeded from playerMap on mount, updated whenever a player is named/scored.
  const [matchPlayers, setMatchPlayers] = useState<MatchPlayer[]>(() => {
    return Object.values(playerMap)
      .filter((pl: any) => pl.name && !/\s\d+$/.test(pl.name))
      .map((pl: any) => ({
        name:      pl.name,
        id:        pl._id?.toString(),
        isClaimed: !!pl.isClaimed,
      }));
  });

  const addToMatchPlayers = useCallback((name: string, id?: string, isClaimed?: boolean) => {
    if (!name?.trim()) return;
    setMatchPlayers(prev => {
      const alreadyIn = prev.some(mp =>
        mp.name.toLowerCase() === name.toLowerCase() || (id && mp.id === id)
      );
      if (alreadyIn) return prev;
      return [{ name: name.trim(), id, isClaimed }, ...prev];
    });
  }, []);

  // ── Quick Match player-search state ─────────────────────
  // Setup modal
  const [qmStriker,    setQmStriker]    = useState({ name: '', existingId: '' });
  const [qmNonStriker, setQmNonStriker] = useState({ name: '', existingId: '' });
  const [qmBowler,     setQmBowler]     = useState({ name: '', existingId: '' });
  // Wicket modal
  const [qmNewBatsman, setQmNewBatsman] = useState({ name: '', existingId: '' });
  // Innings 2 quick match opener selection (ID-based, since players already named)
  const [inn2StrikerId,    setInn2StrikerId]    = useState('');
  const [inn2NonStrikerId, setInn2NonStrikerId] = useState('');
  // New bowler modal
  const [qmNewBowlerName,  setQmNewBowlerName]  = useState('');
  const [qmNewBowlerExId,  setQmNewBowlerExId]  = useState('');
  const [qmShowNewBowler,  setQmShowNewBowler]  = useState(false);

  const [wicketDismissedId,   setWicketDismissedId]   = useState('');
  const [wicketDismissalType, setWicketDismissalType] = useState('bowled');
  const [wicketFielderId,     setWicketFielderId]     = useState('');
  const [newBatsmanId,        setNewBatsmanId]        = useState('');

  const battingTeamIds = innings.battingTeam === 'teamA' ? teamAPlayers : teamBPlayers;
  const bowlingTeamIds = innings.battingTeam === 'teamA' ? teamBPlayers : teamAPlayers;

  // Dismissed IDs from server scorecard (survives refresh)
  const dismissedIds = battingScorecard
    .filter((bs: any) => bs.dismissed === true)
    .map((bs: any) => bs.player?._id?.toString() ?? '');

  // Slots not yet assigned to any at-crease batter and not dismissed
  const usedBattingIds = new Set([
    ball.strikerId, ball.nonStrikerId, ...dismissedIds,
  ].filter(Boolean));
  const availableBatsmen    = battingTeamIds.filter(id => !usedBattingIds.has(id));

  // Slots that have been used by the bowling team at any point (have bowl stats)
  const namedBowlers        = bowlingTeamIds.filter(id => {
    const bw = bowlingScorecard.find((b: any) => b.player?._id?.toString() === id);
    return bw && bw.balls > 0;
  });
  // Next unused bowling slot (no balls bowled yet, not current bowler)
  const unusedBowlerSlots   = bowlingTeamIds.filter(id => {
    const bw = bowlingScorecard.find((b: any) => b.player?._id?.toString() === id);
    return (!bw || bw.balls === 0) && id !== ball.bowlerId;
  });

  const teamSize         = battingTeamIds.length;
  const wicketsForAllOut = allowSinglePlayerBat ? teamSize : teamSize - 1;
  const isNearAllOut     = innings.wickets >= wicketsForAllOut - 2;

  const p = (id: string) => playerMap[id] ?? { name: id ? `P-${id.slice(-4)}` : '?', _id: id };
  const selectedDismissal = DISMISSALS.find(d => d.val === wicketDismissalType);

  const getBatStats = (id: string) => {
    const bs = battingScorecard.find((b: any) => b.player?._id?.toString() === id);
    return bs
      ? { runs: bs.runs ?? 0, balls: bs.balls ?? 0, fours: bs.fours ?? 0, sixes: bs.sixes ?? 0 }
      : { runs: 0, balls: 0, fours: 0, sixes: 0 };
  };
  const getBowlStats = (id: string) => {
    const bw = bowlingScorecard.find((b: any) => b.player?._id?.toString() === id);
    return bw
      ? { balls: bw.balls ?? 0, runs: bw.runs ?? 0, wickets: bw.wickets ?? 0, maidens: bw.maidens ?? 0 }
      : { balls: 0, runs: 0, wickets: 0, maidens: 0 };
  };

  // ── Sync from server ─────────────────────────────────────
  useEffect(() => {
    const ss = innings.currentStrikerId?.toString()    ?? '';
    const ns = innings.currentNonStrikerId?.toString() ?? '';
    const bw = innings.currentBowlerId?.toString()     ?? '';

    setBall(prev => ({
      strikerId:    ss || prev.strikerId,
      nonStrikerId: ns || prev.nonStrikerId,
      bowlerId:     bw || prev.bowlerId,
    }));

    if (!setupShownRef.current) {
      setupShownRef.current = true;
      if (!ss || !bw) setModal('setup');
    }
  }, [innings.currentStrikerId, innings.currentNonStrikerId, innings.currentBowlerId]);

  // ── Rename/link helper (Quick Match only) ────────────────
  // If existingId is given, we link the slot to an existing player profile.
  // Otherwise, just rename the placeholder.
  const renamePlayer = useCallback(async (
    slotId: string, name: string, existingId?: string
  ) => {
    if (!name.trim() || !slotId) return;
    await fetch(`/api/match/${matchId}/rename-player`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        token,
        playerId:         slotId,
        name:             name.trim(),
        linkToExistingId: existingId || undefined,
      }),
    });
  }, [matchId, token]);

  // ── Core submit ──────────────────────────────────────────
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
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inningsId:           innings._id,
          batsmanId:           ball.strikerId,
          bowlerId:            ball.bowlerId,
          currentNonStrikerId: ball.nonStrikerId,
          runsOffBat:          opts.runsOffBat,
          extraType:           opts.extraType      ?? null,
          isWicket:            opts.isWicket,
          dismissalType:       opts.dismissalType  ?? null,
          dismissedPlayerId:   opts.dismissedPlayerId ?? null,
          fielderPlayerId:     opts.fielderPlayerId   ?? null,
          newBatsmanId:        opts.newBatsmanId      ?? null,
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
        if (data.overComplete && !data.inningsOver) {
          setQmNewBowlerName('');
          setQmShowNewBowler(false);
          setModal('new_bowler');
        }
        onBallSaved(data);
      } else {
        setError(json.error || 'Failed to save ball');
      }
    } catch { setError('Network error. Please retry.'); }
    finally  { setSaving(false); }
  }, [ball, innings._id, matchId, token, onBallSaved]);

  const handleRun   = (r: number) => submitBall({ runsOffBat: r, extraType: null, isWicket: false });
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
    setQmNewBatsman({ name: '', existingId: '' });
    setModal('wicket');
  };

  const confirmWicket = async (runsOnBall = 0) => {
    let batsmanToSend = newBatsmanId;

    if (isQuickMatch) {
      const nextSlot = availableBatsmen[0] ?? '';
      if (nextSlot && qmNewBatsman.name.trim()) {
        setRenaming(true);
        await renamePlayer(nextSlot, qmNewBatsman.name.trim(), qmNewBatsman.existingId || undefined);
        setRenaming(false);
        addToMatchPlayers(qmNewBatsman.name, qmNewBatsman.existingId || undefined);
      }
      batsmanToSend = nextSlot;
    }

    submitBall({
      runsOffBat:        runsOnBall,
      extraType:         null,
      isWicket:          true,
      dismissalType:     wicketDismissalType,
      dismissedPlayerId: wicketDismissedId,
      fielderPlayerId:   selectedDismissal?.needsFielder ? wicketFielderId : undefined,
      newBatsmanId:      batsmanToSend || undefined,
    });
    setModal(null);
  };

  const handleAllOut = () => setModal('all_out_confirm');
  const confirmAllOut = () => {
    submitBall({
      runsOffBat: 0, extraType: null, isWicket: true,
      dismissalType: 'run_out', dismissedPlayerId: ball.strikerId,
    });
    setModal(null);
  };
  const handleUndo = async () => {
    setUndoing(true);
    try {
      const res  = await fetch(`/api/match/${matchId}/ball?inningsId=${innings._id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) onBallSaved(json.data);
      else setError(json.error || 'Undo failed');
    } catch { setError('Undo failed'); }
    finally  { setUndoing(false); }
  };
  const handleSwap = () => setBall(b => ({ ...b, strikerId: b.nonStrikerId, nonStrikerId: b.strikerId }));

  // ═══════════════════════════════════════════════════════════
  // SETUP MODAL
  // ═══════════════════════════════════════════════════════════
  if (modal === 'setup') {

    // ── QUICK MATCH ────────────────────────────────────────
    if (isQuickMatch) {
      const strikerSlot    = battingTeamIds[0]  ?? '';
      const nonStrikerSlot = battingTeamIds[1]  ?? '';
      const bowlerSlot     = bowlingTeamIds[0]  ?? '';

      // In innings 2, the batting team was the bowling team in innings 1.
      // Any of their players who already bowled have real names — offer
      // them as tap-to-select buttons. Unnamed slots still get a text input.
      const isInnings2 = innings.inningsNumber === 2;

      // Named batsmen available for innings 2 (have a real name = not default "TeamName N")
      // We detect "real name" = player has a name that doesn't match the placeholder pattern
      const namedBatters = isInnings2
        ? battingTeamIds.filter(id => {
            const name = p(id).name ?? '';
            // A named player has a name that isn't just "TeamName N"
            return name && !/\s\d+$/.test(name);
          })
        : [];

      // Striker is valid: tapped a real player (not __typed__) OR typed a name
      const strikerOk2  = (inn2StrikerId  !== '' && inn2StrikerId  !== '__typed__')
                        || qmStriker.name.trim().length > 0;
      // Non-striker: same logic, AND must differ from striker
      const nonStrikerOk2 = allowSinglePlayerBat
        || ((inn2NonStrikerId !== '' && inn2NonStrikerId !== '__typed__' && inn2NonStrikerId !== inn2StrikerId)
            || (qmNonStriker.name.trim().length > 0
                && qmNonStriker.name.trim().toLowerCase() !== qmStriker.name.trim().toLowerCase()));
      // Bowler: tapped (existingId) OR typed a name
      const bowlerOk = !!(qmBowler.existingId || qmBowler.name.trim());

      const namesOk = isInnings2
        ? (strikerOk2 && nonStrikerOk2 && bowlerOk)
        : (qmStriker.name.trim().length > 0
           && (allowSinglePlayerBat || qmNonStriker.name.trim().length > 0)
           && qmBowler.name.trim().length > 0
           && (allowSinglePlayerBat ||
               qmStriker.name.trim().toLowerCase() !== qmNonStriker.name.trim().toLowerCase()));

      const handleQmStart = async () => {
        if (!namesOk) return;
        setRenaming(true);
        try {
          if (isInnings2) {
            // Resolve striker ID: either tapped (real ID) or typed (rename first free slot)
            let finalStrikerId = inn2StrikerId !== '__typed__' ? inn2StrikerId : '';
            if (inn2StrikerId === '__typed__' && qmStriker.name.trim()) {
              const freeSlot = battingTeamIds.find(id => {
                const nm = p(id).name ?? '';
                return !nm || /\s\d+$/.test(nm);
              }) ?? strikerSlot;
              await renamePlayer(freeSlot, qmStriker.name, qmStriker.existingId || undefined);
              finalStrikerId = freeSlot;
            }

            // Resolve non-striker ID: either tapped or typed
            let finalNonStrikerId = inn2NonStrikerId !== '__typed__' ? inn2NonStrikerId : '';
            if (inn2NonStrikerId === '__typed__' && qmNonStriker.name.trim()) {
              const freeSlot = battingTeamIds.find(id => {
                const nm = p(id).name ?? '';
                return id !== finalStrikerId && (!nm || /\s\d+$/.test(nm));
              }) ?? nonStrikerSlot;
              await renamePlayer(freeSlot, qmNonStriker.name, qmNonStriker.existingId || undefined);
              finalNonStrikerId = freeSlot;
            }

            // Resolve bowler: tapped (existingId) or typed (rename free slot)
            let finalBowlerId = qmBowler.existingId || '';
            if (!qmBowler.existingId && qmBowler.name.trim()) {
              const bowlerName  = p(bowlerSlot).name ?? '';
              const bowlerNamed = bowlerName && !/\s\d+$/.test(bowlerName);
              if (!bowlerNamed) {
                await renamePlayer(bowlerSlot, qmBowler.name, undefined);
              }
              finalBowlerId = bowlerSlot;
            }

            setBall({
              strikerId:    finalStrikerId    || strikerSlot,
              nonStrikerId: finalNonStrikerId || nonStrikerSlot,
              bowlerId:     finalBowlerId     || bowlerSlot,
            });
          } else {
            // Innings 1 — rename all three slots
            await Promise.all([
              renamePlayer(strikerSlot,    qmStriker.name,    qmStriker.existingId    || undefined),
              renamePlayer(nonStrikerSlot, qmNonStriker.name, qmNonStriker.existingId || undefined),
              renamePlayer(bowlerSlot,     qmBowler.name,     qmBowler.existingId     || undefined),
            ]);
            setBall({ strikerId: strikerSlot, nonStrikerId: nonStrikerSlot, bowlerId: bowlerSlot });
          }
        } finally { setRenaming(false); }
        // ── Update matchPlayers memory ────────────────────
        if (isInnings2) {
          // Striker & non-striker already have names from innings 1 — they're in playerMap
          // Bowler might be new
          if (qmBowler.name.trim()) addToMatchPlayers(qmBowler.name, qmBowler.existingId || undefined);
        } else {
          addToMatchPlayers(qmStriker.name,    qmStriker.existingId    || undefined);
          addToMatchPlayers(qmNonStriker.name, qmNonStriker.existingId || undefined);
          addToMatchPlayers(qmBowler.name,     qmBowler.existingId     || undefined);
        }
        setModal(null);
      };

      // ── Helper: player tap button for innings 2 ──────────
      const PlayerTapButton = ({
        id, selected, disabled, onSelect, label,
      }: { id: string; selected: boolean; disabled?: boolean; onSelect: () => void; label?: string }) => (
        <button
          onClick={disabled ? undefined : onSelect}
          className={cn(
            'w-full flex items-center justify-between px-4 py-3 rounded-xl border',
            'font-semibold text-sm transition-all',
            disabled
              ? 'border-pitch-border/30 text-slate-600 opacity-40 cursor-not-allowed'
              : selected
                ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                : 'border-pitch-border text-slate-200 hover:border-brand-500/50 hover:bg-brand-500/5'
          )}
        >
          <span>{p(id).name}</span>
          {disabled && <span className="text-slate-600 text-xs">selected</span>}
          {!disabled && label && <span className="text-[10px] text-slate-500">{label}</span>}
          {!disabled && selected && <span className="text-brand-400 text-xs">✓</span>}
        </button>
      );

      return (
        <div className="card p-5 space-y-4 animate-fade-in">
          <div>
            <h3 className="font-display font-bold text-white text-lg mb-0.5">
              {isInnings2 ? 'Start Innings 2' : 'Start Match'}
            </h3>
            <p className="text-slate-400 text-sm">
              {isInnings2 ? 'Select your openers and opening bowler' : 'Search or type each player\'s name'}
            </p>
          </div>

          {isInnings2 && innings.targetRuns && (
            <div className="bg-brand-500/10 border border-brand-500/25 rounded-xl p-3 text-center">
              <p className="text-slate-400 text-xs mb-0.5">Target</p>
              <p className="font-display font-bold text-3xl text-white">{innings.targetRuns}</p>
              <p className="text-slate-400 text-xs">runs to win</p>
            </div>
          )}

          {/* ── INNINGS 2: tap-to-select openers + search box always visible ── */}
          {isInnings2 ? (
            <>
              {/* STRIKER — tap known players OR type a new name below */}
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">
                  Striker <span className="text-slate-600 font-normal normal-case">(facing first ball)</span>
                </p>
                <div className="space-y-1.5">
                  {namedBatters.map(id => (
                    <PlayerTapButton
                      key={id}
                      id={id}
                      selected={inn2StrikerId === id}
                      disabled={inn2NonStrikerId === id}
                      onSelect={() => setInn2StrikerId(id)}
                    />
                  ))}
                  {/* Always show search box — to find or type a name not in the list */}
                  <QMPlayerInput
                    label=""
                    value={qmStriker.name}
                    onChange={(name, existingId) => {
                      setQmStriker({ name, existingId: existingId ?? '' });
                      // Typing clears the tapped selection so typed name takes priority
                      if (name) setInn2StrikerId('__typed__');
                    }}
                    placeholder={inn2StrikerId && inn2StrikerId !== '__typed__'
                      ? `${p(inn2StrikerId).name} selected — or type to override`
                      : 'Or search / type a name...'}
                    matchPlayers={matchPlayers}
                    autoFocus={namedBatters.length === 0}
                  />
                </div>
              </div>

              {/* NON-STRIKER — always shown (optional if single-bat mode) */}
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">
                  Non-Striker
                  {allowSinglePlayerBat && (
                    <span className="text-slate-600 font-normal normal-case ml-1">(optional — single-bat mode)</span>
                  )}
                </p>
                <div className="space-y-1.5">
                  {namedBatters.map(id => (
                    <PlayerTapButton
                      key={id}
                      id={id}
                      selected={inn2NonStrikerId === id}
                      disabled={inn2StrikerId === id}
                      onSelect={() => setInn2NonStrikerId(id)}
                    />
                  ))}
                  <QMPlayerInput
                    label=""
                    value={qmNonStriker.name}
                    onChange={(name, existingId) => {
                      setQmNonStriker({ name, existingId: existingId ?? '' });
                      if (name) setInn2NonStrikerId('__typed__');
                    }}
                    placeholder={inn2NonStrikerId && inn2NonStrikerId !== '__typed__'
                      ? `${p(inn2NonStrikerId).name} selected — or type to override`
                      : 'Or search / type a name...'}
                    matchPlayers={matchPlayers}
                  />
                </div>
              </div>

              {/* OPENING BOWLER — tap known players OR type a new name below */}
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">Opening Bowler</p>
                {(() => {
                  const namedBowlers2 = bowlingTeamIds.filter(id => {
                    const nm = p(id).name ?? '';
                    return nm && !/\s\d+$/.test(nm);
                  });
                  return (
                    <div className="space-y-1.5">
                      {namedBowlers2.map(id => (
                        <PlayerTapButton
                          key={id}
                          id={id}
                          selected={qmBowler.existingId === id}
                          onSelect={() => {
                            setQmBowler({ name: p(id).name, existingId: id });
                          }}
                        />
                      ))}
                      {/* Always show search box for bowler too */}
                      <QMPlayerInput
                        label=""
                        value={qmBowler.existingId ? '' : qmBowler.name}
                        onChange={(name, existingId) => {
                          setQmBowler({ name, existingId: existingId ?? '' });
                        }}
                        placeholder={qmBowler.existingId
                          ? `${qmBowler.name} selected — or type to override`
                          : 'Or search / type a bowler name...'}
                        matchPlayers={matchPlayers}
                      />
                    </div>
                  );
                })()}
              </div>
            </>
          ) : (
            /* ── INNINGS 1: free-text / search inputs (unchanged) ── */
            <>
              <div className="relative">
                <QMPlayerInput
                  label="Striker (facing first ball)"
                  value={qmStriker.name}
                  onChange={(name, existingId) => setQmStriker({ name, existingId: existingId ?? '' })}
                  placeholder="Search or type name..."
                  matchPlayers={matchPlayers}
                  autoFocus
                />
              </div>

              <div className="relative">
                <QMPlayerInput
                  label="Non-Striker"
                  value={qmNonStriker.name}
                  onChange={(name, existingId) => setQmNonStriker({ name, existingId: existingId ?? '' })}
                  placeholder="Search or type name..."
                  matchPlayers={matchPlayers}
                />
              </div>

              {!allowSinglePlayerBat
                && qmStriker.name.trim()
                && qmNonStriker.name.trim()
                && qmStriker.name.trim().toLowerCase() === qmNonStriker.name.trim().toLowerCase() && (
                <div className="bg-score-wicket/10 border border-score-wicket/30 rounded-xl px-3 py-2">
                  <p className="text-score-wicket text-xs font-semibold">
                    ⚠ Striker and Non-Striker cannot be the same player
                  </p>
                </div>
              )}

              <div className="relative">
                <QMPlayerInput
                  label="Opening Bowler"
                  value={qmBowler.name}
                  onChange={(name, existingId) => setQmBowler({ name, existingId: existingId ?? '' })}
                  placeholder="Search or type name..."
                  matchPlayers={matchPlayers}
                />
              </div>
            </>
          )}

          <button
            disabled={!namesOk || renaming}
            onClick={handleQmStart}
            className={cn(
              'btn-primary w-full py-3 text-base font-bold flex items-center justify-center gap-2',
              (!namesOk || renaming) && 'opacity-40 cursor-not-allowed'
            )}>
            {renaming
              ? <><Loader2 size={16} className="animate-spin" /> Saving...</>
              : 'Start Scoring'}
          </button>
        </div>
      );
    }

    // ── NORMAL MATCH: dropdowns ────────────────────────────
    const canStart = ball.strikerId && ball.nonStrikerId && ball.bowlerId &&
      (allowSinglePlayerBat || ball.strikerId !== ball.nonStrikerId);

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
            <p className="text-slate-400 text-xs mb-0.5">Target</p>
            <p className="font-display font-bold text-3xl text-white">{innings.targetRuns}</p>
            <p className="text-slate-400 text-xs">runs to win</p>
          </div>
        )}

        {allowSinglePlayerBat && (
          <div className="bg-score-wide/10 border border-score-wide/30 rounded-xl px-3 py-2">
            <p className="text-score-wide text-xs font-semibold">⚡ Single-player batting mode</p>
          </div>
        )}

        <div>
          <label className="text-xs text-slate-400 mb-1.5 block font-semibold uppercase tracking-wide">
            Striker (facing first ball)
          </label>
          <select className="input-field" value={ball.strikerId}
            onChange={e => setBall(b => ({ ...b, strikerId: e.target.value }))}>
            <option value="">-- Choose Striker --</option>
            {battingTeamIds
              .filter(id => allowSinglePlayerBat || id !== ball.nonStrikerId)
              .map(id => <option key={id} value={id}>{p(id).name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1.5 block font-semibold uppercase tracking-wide">
            Non-Striker
          </label>
          <select className="input-field" value={ball.nonStrikerId}
            onChange={e => setBall(b => ({ ...b, nonStrikerId: e.target.value }))}>
            <option value="">-- Choose Non-Striker --</option>
            {battingTeamIds
              .filter(id => allowSinglePlayerBat || id !== ball.strikerId)
              .map(id => <option key={id} value={id}>{p(id).name}</option>)}
          </select>
        </div>

        {!allowSinglePlayerBat && ball.strikerId && ball.nonStrikerId && ball.strikerId === ball.nonStrikerId && (
          <div className="bg-score-wicket/10 border border-score-wicket/30 rounded-xl px-3 py-2">
            <p className="text-score-wicket text-xs font-semibold">
              ⚠ Striker and Non-Striker cannot be the same player
            </p>
          </div>
        )}

        <div>
          <label className="text-xs text-slate-400 mb-1.5 block font-semibold uppercase tracking-wide">
            Opening Bowler
          </label>
          <select className="input-field" value={ball.bowlerId}
            onChange={e => setBall(b => ({ ...b, bowlerId: e.target.value }))}>
            <option value="">-- Choose Bowler --</option>
            {bowlingTeamIds.map(id => <option key={id} value={id}>{p(id).name}</option>)}
          </select>
        </div>

        <button disabled={!canStart} onClick={() => setModal(null)}
          className={cn('btn-primary w-full py-3 text-base font-bold',
            !canStart && 'opacity-40 cursor-not-allowed')}>
          Start Scoring
        </button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // ALL OUT CONFIRM
  // ═══════════════════════════════════════════════════════════
  if (modal === 'all_out_confirm') {
    return (
      <div className="card p-5 space-y-4 animate-slide-up border border-score-wicket/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-score-wicket/20 rounded-xl flex items-center justify-center">
            <UserX size={16} className="text-score-wicket" />
          </div>
          <h3 className="font-display font-bold text-white text-lg">All Out?</h3>
        </div>
        <p className="text-slate-400 text-sm">This will end the innings.</p>
        <div className="bg-pitch-dark rounded-xl p-3 border border-pitch-border">
          <p className="text-xs text-slate-500 mb-0.5">Current score</p>
          <p className="font-display font-bold text-xl text-white">
            {innings.totalRuns}/{innings.wickets}
            <span className="text-sm font-normal text-slate-400 ml-2">
              ({ballsToOvers(innings.totalBalls)} ov)
            </span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setModal(null)}
            className="border border-pitch-border text-slate-400 py-3 rounded-xl text-sm hover:text-white">
            Cancel
          </button>
          <button onClick={confirmAllOut} disabled={saving}
            className="bg-score-wicket/20 border border-score-wicket text-score-wicket py-3 rounded-xl
                       text-sm font-bold hover:bg-score-wicket/30 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <UserX size={14} />}
            End Innings
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // WICKET MODAL
  // ═══════════════════════════════════════════════════════════
  if (modal === 'wicket') {
    const nextSlotAvailable = availableBatsmen.length > 0;

    return (
      <div className="card p-5 space-y-4 animate-slide-up border border-score-wicket/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-score-wicket/20 rounded-xl flex items-center justify-center">
            <span className="text-score-wicket font-bold text-lg">W</span>
          </div>
          <h3 className="font-display font-bold text-white text-lg">Wicket!</h3>
        </div>

        {/* Who's out */}
        <div>
          <label className="text-xs text-slate-400 mb-2 block font-semibold uppercase tracking-wide">
            Who is OUT?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[ball.strikerId, ball.nonStrikerId].filter(Boolean).map(id => {
              const bs = getBatStats(id);
              return (
                <button key={id} onClick={() => setWicketDismissedId(id)}
                  className={cn('py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all text-left',
                    wicketDismissedId === id
                      ? 'bg-score-wicket/20 border-score-wicket text-score-wicket'
                      : 'border-pitch-border text-slate-300 hover:border-score-wicket/40')}>
                  <p>{p(id).name}</p>
                  <p className="text-[11px] font-mono opacity-60">{bs.runs}({bs.balls})</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* How out */}
        <div>
          <label className="text-xs text-slate-400 mb-2 block font-semibold uppercase tracking-wide">
            How OUT?
          </label>
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

        {/* Fielder (normal match only for fielder dropdown) */}
        {selectedDismissal?.needsFielder && (
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block font-semibold uppercase tracking-wide">
              {wicketDismissalType === 'caught' ? 'Caught by' :
               wicketDismissalType === 'stumped' ? 'Stumped by' : 'Fielder'} (optional)
            </label>
            <select className="input-field" value={wicketFielderId}
              onChange={e => setWicketFielderId(e.target.value)}>
              <option value="">-- Select fielder --</option>
              {bowlingTeamIds.map(id => <option key={id} value={id}>{p(id).name}</option>)}
            </select>
          </div>
        )}

        {/* Runs on ball */}
        <div>
          <label className="text-xs text-slate-400 mb-2 block font-semibold uppercase tracking-wide">
            Runs on this ball
          </label>
          <div className="grid grid-cols-5 gap-2">
            {[0, 1, 2, 3, 4].map(r => (
              <button key={r} onClick={() => confirmWicket(r)} disabled={saving || renaming}
                className="scoring-btn border-pitch-border text-slate-300 hover:border-brand-500/50 hover:text-white font-display font-bold text-lg">
                {saving || renaming
                  ? <Loader2 size={12} className="animate-spin mx-auto" />
                  : r}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 text-center mt-1.5">Tap runs to confirm</p>
        </div>

        {/* Next batsman */}
        {nextSlotAvailable ? (
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block font-semibold uppercase tracking-wide">
              Next Batsman
            </label>

            {/* ── QUICK MATCH: search/type next batsman ── */}
            {isQuickMatch ? (
              <div className="relative">
                <QMPlayerInput
                  label=""
                  value={qmNewBatsman.name}
                  onChange={(name, existingId) => setQmNewBatsman({ name, existingId: existingId ?? '' })}
                  placeholder="Search or type next batsman's name"
                  matchPlayers={matchPlayers}
                  autoFocus
                />
              </div>
            ) : (
              /* ── NORMAL: dropdown ── */
              <select className="input-field" value={newBatsmanId}
                onChange={e => setNewBatsmanId(e.target.value)}>
                <option value="">-- Choose next batsman --</option>
                {availableBatsmen.map(id => <option key={id} value={id}>{p(id).name}</option>)}
              </select>
            )}
          </div>
        ) : (
          <p className="text-score-wide text-sm text-center">Last wicket — innings ends.</p>
        )}

        <button onClick={() => setModal(null)}
          className="w-full border border-pitch-border text-slate-400 py-2 rounded-xl text-sm hover:text-white">
          Cancel
        </button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // NEW BOWLER MODAL
  // ═══════════════════════════════════════════════════════════
  if (modal === 'new_bowler') {

    // ── QUICK MATCH ─────────────────────────────────────────
    if (isQuickMatch) {
      const handlePickExisting = (id: string) => {
        setBall(b => ({ ...b, bowlerId: id }));
        setModal(null);
      };

      const handleNewBowler = async () => {
        if (!qmNewBowlerName.trim()) return;
        const nextSlot = unusedBowlerSlots[0] ?? '';
        if (!nextSlot) return;
        setRenaming(true);
        try {
          await renamePlayer(nextSlot, qmNewBowlerName.trim(), qmNewBowlerExId || undefined);
          setBall(b => ({ ...b, bowlerId: nextSlot }));
          addToMatchPlayers(qmNewBowlerName.trim(), qmNewBowlerExId || undefined);
        } finally { setRenaming(false); }
        setQmNewBowlerName('');
        setQmNewBowlerExId('');
        setQmShowNewBowler(false);
        setModal(null);
      };

      return (
        <div className="card p-5 space-y-4 animate-fade-in">
          <div>
            <h3 className="font-display font-bold text-white text-lg">Over Complete!</h3>
            <p className="text-slate-400 text-sm">
              <span className="text-white font-semibold">{p(ball.bowlerId).name}</span> cannot bowl consecutive overs
            </p>
          </div>

          {/* Previously named bowlers — tap to reuse */}
          {namedBowlers.filter(id => id !== ball.bowlerId).length > 0 && (
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">
                Previously bowled
              </p>
              <div className="space-y-1.5">
                {namedBowlers.filter(id => id !== ball.bowlerId).map(id => {
                  const bw = getBowlStats(id);
                  return (
                    <button key={id} onClick={() => handlePickExisting(id)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl border
                                 border-pitch-border text-slate-200 hover:border-brand-500/50
                                 hover:bg-brand-500/5 font-semibold text-sm transition-all">
                      <span>{p(id).name}</span>
                      <span className="text-xs font-mono text-slate-500">
                        {ballsToOvers(bw.balls)} · {bw.wickets}W · {bw.runs}R
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Type a new bowler name */}
          {unusedBowlerSlots.length > 0 && (
            <div>
              {!qmShowNewBowler ? (
                <button
                  onClick={() => setQmShowNewBowler(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border
                             border-dashed border-pitch-border text-slate-400 hover:border-brand-500/50
                             hover:text-white text-sm font-semibold transition-all">
                  <Plus size={14} /> New bowler
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <QMPlayerInput
                      label="New Bowler"
                      value={qmNewBowlerName}
                      onChange={(name, existingId) => {
                        setQmNewBowlerName(name);
                        setQmNewBowlerExId(existingId ?? '');
                      }}
                      placeholder="Search or type new bowler's name"
                      matchPlayers={matchPlayers}
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setQmShowNewBowler(false)}
                      className="flex-1 border border-pitch-border text-slate-400 py-2.5 rounded-xl text-sm hover:text-white">
                      Cancel
                    </button>
                    <button
                      disabled={!qmNewBowlerName.trim() || renaming}
                      onClick={handleNewBowler}
                      className={cn(
                        'flex-1 btn-primary py-2.5 text-sm font-bold flex items-center justify-center gap-2',
                        (!qmNewBowlerName.trim() || renaming) && 'opacity-40 cursor-not-allowed'
                      )}>
                      {renaming
                        ? <><Loader2 size={14} className="animate-spin" /> Saving...</>
                        : 'Confirm'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Edge case: no previous bowlers and no unused slots */}
          {namedBowlers.filter(id => id !== ball.bowlerId).length === 0
            && unusedBowlerSlots.length === 0 && (
            <p className="text-slate-500 text-sm text-center">No more bowlers available.</p>
          )}
        </div>
      );
    }

    // ── NORMAL MATCH: list all bowlers ─────────────────────
    return (
      <div className="card p-5 space-y-4 animate-fade-in">
        <div>
          <h3 className="font-display font-bold text-white text-lg">Over Complete!</h3>
          <p className="text-slate-400 text-sm">
            {p(ball.bowlerId).name} cannot bowl consecutive overs
          </p>
        </div>
        <div className="space-y-1.5">
          {bowlingTeamIds.filter(id => id !== ball.bowlerId).map(id => {
            const bw = getBowlStats(id);
            return (
              <button key={id}
                onClick={() => { setBall(b => ({ ...b, bowlerId: id })); setModal(null); }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border
                           border-pitch-border text-slate-300 hover:border-brand-500/50 hover:text-white
                           font-semibold text-sm transition-all">
                <span>{p(id).name}</span>
                {bw.balls > 0 ? (
                  <span className="text-xs font-mono text-slate-500">
                    {ballsToOvers(bw.balls)} · {bw.wickets}w · {bw.runs}r
                  </span>
                ) : (
                  <span className="text-xs text-slate-600">yet to bowl</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // BYE / LEG-BYE RUNS
  // ═══════════════════════════════════════════════════════════
  if (showByeRuns) {
    return (
      <div className="card p-5 space-y-4 animate-fade-in">
        <div>
          <h3 className="font-display font-bold text-white">{byeType === 'bye' ? 'Bye' : 'Leg Bye'}</h3>
          <p className="text-slate-400 text-sm">How many runs?</p>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {[0, 1, 2, 3, 4].map(r => (
            <button key={r} onClick={() => handleByeSubmit(r)}
              className="scoring-btn border-pitch-border text-slate-300 font-display font-bold text-xl hover:border-brand-500/50 hover:text-white">
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

  // ═══════════════════════════════════════════════════════════
  // MAIN SCORING VIEW
  // ═══════════════════════════════════════════════════════════
  const ballsThisOver = innings.totalBalls % 6;
  const midOver       = ballsThisOver > 0;

  const strikerStats    = getBatStats(ball.strikerId);
  const nonStrikerStats = getBatStats(ball.nonStrikerId);
  const bowlerStats     = getBowlStats(ball.bowlerId);
  const bowlerEco       = economy(bowlerStats.runs, bowlerStats.balls);

  const isChasing  = innings.inningsNumber === 2 && innings.targetRuns;
  const runsNeeded = isChasing ? Math.max(0, innings.targetRuns - innings.totalRuns) : null;
  const ballsLeft  = isChasing ? Math.max(0, (match?.totalOvers ?? 20) * 6 - innings.totalBalls) : null;
  const rrr        = isChasing && ballsLeft && ballsLeft > 0
    ? ((runsNeeded! / ballsLeft) * 6).toFixed(2)
    : null;
  const crr        = innings.totalBalls > 0
    ? ((innings.totalRuns / innings.totalBalls) * 6).toFixed(2)
    : '0.00';

  return (
    <div className="space-y-3">

      {/* ── At-crease live panel ── */}
      <div className="bg-pitch-dark border border-pitch-border rounded-2xl overflow-hidden">

        {/* Chase bar */}
        {isChasing && runsNeeded !== null && (
          <div className="px-4 py-2 border-b border-pitch-border/60 bg-brand-500/5
                          flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <Target size={12} className="text-brand-400" />
              <span className="text-xs text-slate-400">Need</span>
              <span className="font-display font-bold text-white text-sm">{runsNeeded}</span>
              <span className="text-xs text-slate-500">
                off {ballsLeft} ball{ballsLeft !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {rrr && (
                <span className="text-xs text-slate-500">
                  RRR <span className="text-score-wide font-bold">{rrr}</span>
                </span>
              )}
              <span className="text-xs text-slate-500">
                CRR <span className="text-white font-bold">{crr}</span>
              </span>
            </div>
          </div>
        )}

        {/* Batsmen */}
        <div className="grid grid-cols-2 divide-x divide-pitch-border/60">
          <div className="px-4 py-3 bg-brand-500/[0.04]">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-brand-400 font-bold uppercase tracking-widest">Striker ●</p>
              <button onClick={handleSwap} title="Swap"
                className="w-6 h-6 flex items-center justify-center rounded-lg border border-pitch-border
                           text-slate-500 hover:text-white hover:border-brand-500/50 transition-all">
                <ArrowLeftRight size={11} />
              </button>
            </div>
            <p className="font-display font-bold text-white text-sm truncate leading-tight">
              {p(ball.strikerId).name}
            </p>
            <p className="font-display font-bold text-xl text-white leading-none mt-1 tabular">
              {strikerStats.runs}
              <span className="text-slate-400 text-sm font-normal ml-0.5">({strikerStats.balls})</span>
            </p>
            {(strikerStats.fours > 0 || strikerStats.sixes > 0) && (
              <p className="text-[10px] text-slate-500 mt-0.5">
                {strikerStats.fours > 0 && <span className="text-score-four mr-1.5">{strikerStats.fours}×4</span>}
                {strikerStats.sixes > 0 && <span className="text-score-six">{strikerStats.sixes}×6</span>}
              </p>
            )}
          </div>

          <div className="px-4 py-3">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mb-1">
              Non-Striker
            </p>
            <p className="font-display font-semibold text-slate-300 text-sm truncate leading-tight">
              {p(ball.nonStrikerId).name}
            </p>
            <p className="font-display font-bold text-lg text-slate-300 leading-none mt-1 tabular">
              {nonStrikerStats.runs}
              <span className="text-slate-500 text-sm font-normal ml-0.5">({nonStrikerStats.balls})</span>
            </p>
            {(nonStrikerStats.fours > 0 || nonStrikerStats.sixes > 0) && (
              <p className="text-[10px] text-slate-500 mt-0.5">
                {nonStrikerStats.fours > 0 && <span className="text-score-four mr-1.5">{nonStrikerStats.fours}×4</span>}
                {nonStrikerStats.sixes > 0 && <span className="text-score-six">{nonStrikerStats.sixes}×6</span>}
              </p>
            )}
          </div>
        </div>

        {/* Bowler row */}
        <div className="border-t border-pitch-border/60">
          <div className="relative">
            <button
              onClick={() => { if (!midOver && !isQuickMatch) setShowBowlerList(s => !s); }}
              disabled={midOver}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 transition-all',
                midOver ? 'cursor-not-allowed' : (!isQuickMatch ? 'hover:bg-white/[0.02] cursor-pointer' : '')
              )}>
              <div className="flex-1 min-w-0 flex items-center gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mb-0.5 flex items-center gap-1.5">
                    Bowler
                    {midOver && (
                      <span className="text-score-wide text-[9px] bg-score-wide/10 px-1.5 py-0.5 rounded-full">
                        🔒 {ballsThisOver}/6
                      </span>
                    )}
                  </p>
                  <p className="font-display font-semibold text-slate-200 text-sm truncate">
                    {p(ball.bowlerId).name}
                  </p>
                </div>
                {bowlerStats.balls > 0 && (
                  <div className="flex items-center gap-2 ml-auto pr-2">
                    <span className="text-xs font-mono text-slate-400">
                      {ballsToOvers(bowlerStats.balls)}-{bowlerStats.maidens}-{bowlerStats.runs}-{bowlerStats.wickets}
                    </span>
                    <span className={cn('text-xs font-bold',
                      bowlerEco <= 6  ? 'text-score-four' :
                      bowlerEco <= 9  ? 'text-slate-400' :
                      bowlerEco <= 12 ? 'text-score-wide' : 'text-score-wicket'
                    )}>
                      {bowlerEco.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
              {!midOver && !isQuickMatch && (
                <ChevronDown size={13} className={cn('text-slate-600 transition-transform flex-shrink-0',
                  showBowlerList && 'rotate-180')} />
              )}
            </button>

            {/* Dropdown — normal match mid-over change */}
            {!midOver && showBowlerList && !isQuickMatch && (
              <div className="absolute z-20 left-0 right-0 top-full card p-2 shadow-xl border border-pitch-border">
                {bowlingTeamIds.map(id => {
                  const bw = getBowlStats(id);
                  return (
                    <button key={id}
                      onClick={() => { setBall(b => ({ ...b, bowlerId: id })); setShowBowlerList(false); }}
                      className={cn('w-full flex items-center justify-between text-sm px-3 py-2.5 rounded-lg transition-colors',
                        ball.bowlerId === id
                          ? 'bg-brand-500/10 text-brand-400 font-semibold'
                          : 'text-slate-300 hover:bg-white/5')}>
                      <span>{p(id).name}</span>
                      {bw.balls > 0 && (
                        <span className="text-xs font-mono text-slate-500">
                          {ballsToOvers(bw.balls)}-{bw.maidens}-{bw.runs}-{bw.wickets}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Run buttons ── */}
      <div className="card p-3">
        <p className="text-[10px] text-slate-500 mb-2.5 font-semibold uppercase tracking-wider text-center">
          Tap to score — saves instantly
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

      {/* ── Extras ── */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { val: 'wide',    label: 'Wd', sub: '+1 run'  },
          { val: 'no_ball', label: 'Nb', sub: 'free hit' },
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

      {/* ── Wicket ── */}
      <button onClick={handleWicketTap} disabled={saving}
        className="w-full py-3 border-2 border-score-wicket/50 text-score-wicket rounded-xl
                   font-display font-bold text-xl hover:bg-score-wicket/10 transition-all active:scale-95">
        W — Wicket
      </button>

      {/* ── All Out ── */}
      {isNearAllOut && (
        <button onClick={handleAllOut} disabled={saving}
          className="w-full py-2.5 border border-score-wicket/40 text-score-wicket/80 rounded-xl
                     font-semibold text-base hover:bg-score-wicket/10 hover:border-score-wicket
                     transition-all active:scale-95 flex items-center justify-center gap-2">
          <UserX size={16} /> All Out — End Innings
        </button>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-score-wicket/10 border border-score-wicket/30 rounded-xl px-4 py-2.5">
          <AlertCircle size={14} className="text-score-wicket flex-shrink-0" />
          <p className="text-score-wicket text-sm">{error}</p>
        </div>
      )}

      {/* ── Undo + Change Players ── */}
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