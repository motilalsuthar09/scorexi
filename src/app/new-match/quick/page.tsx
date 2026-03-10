// src/app/new-match/quick/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import {
  Loader2, Play, Zap, Settings, ChevronDown,
  Search, Plus, UserCheck, X, Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { saveHostedMatch } from '@/lib/hostedMatches';

const OVER_OPTIONS = [2, 4, 5, 6, 8, 10, 12, 15, 20];
const PLAYER_COUNT = 11;

// ── Inline player search input ────────────────────────────
function PlayerSearchInput({
  value, onChange, onClear, placeholder, autoFocus,
}: {
  value: string;
  onChange: (name: string, existingId?: string) => void;
  onClear: () => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const [query,    setQuery]    = useState(value);
  const [results,  setResults]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef  = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!value) setQuery(''); }, [value]);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res  = await fetch(`/api/players?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setResults(json.data?.players ?? []);
      } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!dropRef.current?.contains(e.target as Node) &&
          !inputRef.current?.contains(e.target as Node)) {
        setShowDrop(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (p: any) => {
    setQuery(p.name);
    onChange(p.name, p._id);
    setResults([]);
    setShowDrop(false);
  };

  const handleAddNew = () => {
    if (!query.trim()) return;
    onChange(query.trim());
    setResults([]);
    setShowDrop(false);
  };

  const handleClear = () => {
    setQuery('');
    onClear();
    setResults([]);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setShowDrop(true); onChange(''); }}
          onFocus={() => setShowDrop(true)}
          onKeyDown={e => { if (e.key === 'Enter') handleAddNew(); if (e.key === 'Escape') setShowDrop(false); }}
          placeholder={placeholder}
          className="input-field pl-8 pr-7 text-sm py-2"
          autoComplete="off"
        />
        {query ? (
          <button type="button" onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
            <X size={13} />
          </button>
        ) : null}
      </div>
      {showDrop && query.length >= 2 && (
        <div ref={dropRef}
          className="absolute z-50 w-full mt-1 card border-pitch-border shadow-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-2.5 text-slate-500 text-sm">
              <Loader2 size={13} className="animate-spin" /> Searching...
            </div>
          ) : (
            <>
              {results.map(p => (
                <button key={p._id} type="button" onClick={() => handleSelect(p)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5
                             text-left border-b border-pitch-border/50 last:border-0 transition-colors">
                  <div className="w-6 h-6 bg-pitch-border rounded-full flex items-center justify-center
                                  text-[11px] font-bold text-slate-400 flex-shrink-0">
                    {p.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-white">{p.name}</span>
                      {p.isClaimed && <UserCheck size={10} className="text-brand-400" />}
                    </div>
                    {p.username && <span className="text-[10px] text-slate-500">@{p.username}</span>}
                  </div>
                  {p.stats && <span className="text-[10px] text-slate-500">{p.stats.totalRuns}R</span>}
                </button>
              ))}
              <button type="button" onClick={handleAddNew}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-brand-500/5 text-left transition-colors">
                <div className="w-6 h-6 bg-brand-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Plus size={12} className="text-brand-400" />
                </div>
                <span className="text-sm text-brand-400">Add &ldquo;{query}&rdquo; as new player</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

type PlayerEntry = { name: string; existingId?: string };
const makeEntries = (n: number): PlayerEntry[] => Array(n).fill(null).map(() => ({ name: '' }));

export default function QuickMatchPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    teamAName:   '',
    teamBName:   '',
    totalOvers:  6,
    tossWonBy:   'teamA' as 'teamA' | 'teamB',
    tossChoice:  'bat'   as 'bat' | 'bowl',
    wideRuns:    1       as 0 | 1,
    allowSinglePlayerBat: false,
    visibility:  'private' as 'private' | 'public',
    tournamentName: '',
  });

  const [showPlayerNames, setShowPlayerNames] = useState(false);
  const [advancedOpen,    setAdvancedOpen]    = useState(false);
  const [teamAEntries,    setTeamAEntries]    = useState<PlayerEntry[]>(makeEntries(PLAYER_COUNT));
  const [teamBEntries,    setTeamBEntries]    = useState<PlayerEntry[]>(makeEntries(PLAYER_COUNT));
  const [submitting,      setSubmitting]      = useState(false);
  const [error,           setError]           = useState('');

  const update = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const updateEntry = (team: 'A' | 'B', idx: number, name: string, existingId?: string) => {
    const setter = team === 'A' ? setTeamAEntries : setTeamBEntries;
    setter(prev => { const n = [...prev]; n[idx] = { name, existingId }; return n; });
  };
  const clearEntry = (team: 'A' | 'B', idx: number) => {
    const setter = team === 'A' ? setTeamAEntries : setTeamBEntries;
    setter(prev => { const n = [...prev]; n[idx] = { name: '' }; return n; });
  };

  const handleStart = async () => {
    if (!form.teamAName.trim() || !form.teamBName.trim()) {
      setError('Enter both team names'); return;
    }
    setSubmitting(true); setError('');
    try {
      const makePlayers = (teamName: string, entries: PlayerEntry[]) =>
        entries.map((e, i) => ({
          name:             e.name.trim() || `${teamName} ${i + 1}`,
          existingPlayerId: e.existingId,
        }));

      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamAName:    form.teamAName.trim(),
          teamBName:    form.teamBName.trim(),
          totalOvers:   form.totalOvers,
          visibility:   form.visibility,
          tossWonBy:    form.tossWonBy,
          tossChoice:   form.tossChoice,
          teamAPlayers: makePlayers(form.teamAName.trim(), teamAEntries),
          teamBPlayers: makePlayers(form.teamBName.trim(), teamBEntries),
          isQuickMatch: true,
          title: form.tournamentName.trim()
            ? `${form.tournamentName.trim()} — ${form.teamAName.trim()} vs ${form.teamBName.trim()}`
            : undefined,
          settings: {
            wideRuns:             form.wideRuns,
            allowSinglePlayerBat: form.allowSinglePlayerBat,
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        const { matchId, shareToken } = json.data;
        saveHostedMatch(matchId, shareToken, `${form.teamAName} vs ${form.teamBName}`);
        router.push(`/scoring/${matchId}?token=${shareToken}&quick=1`);
      } else {
        setError(json.error || 'Failed to create match');
      }
    } catch { setError('Network error'); }
    finally  { setSubmitting(false); }
  };

  const battingTeam =
    form.tossWonBy === 'teamA'
      ? (form.tossChoice === 'bat' ? form.teamAName || 'Team A' : form.teamBName || 'Team B')
      : (form.tossChoice === 'bat' ? form.teamBName || 'Team B' : form.teamAName || 'Team A');

  return (
    <AppShell>
      <div className="max-w-md mx-auto px-4 py-6">

        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/25
                          rounded-full px-4 py-2 mb-3">
            <Zap size={14} className="text-brand-400" />
            <span className="text-brand-400 text-sm font-semibold">Quick Match</span>
          </div>
          <h1 className="font-display font-bold text-2xl text-white mb-1">Start in 30 seconds</h1>
          <p className="text-slate-400 text-sm">Enter team names and go. Add players optionally.</p>
        </div>

        <div className="space-y-4">

          {/* Team names */}
          <div className="card p-4 space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-semibold uppercase tracking-wide">
                Team A Name
              </label>
              <input type="text" className="input-field text-base" placeholder="e.g. Warriors"
                value={form.teamAName} onChange={e => update('teamAName', e.target.value)}
                maxLength={30} autoFocus />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-semibold uppercase tracking-wide">
                Team B Name
              </label>
              <input type="text" className="input-field text-base" placeholder="e.g. Lions"
                value={form.teamBName} onChange={e => update('teamBName', e.target.value)}
                maxLength={30} />
            </div>
          </div>

          {/* Tournament name */}
          <div className="card p-4">
            <label className="text-xs text-slate-400 mb-1.5 block font-semibold uppercase tracking-wide">
              Tournament / Series Name <span className="text-slate-600 normal-case font-normal">(optional)</span>
            </label>
            <div className="relative">
              <Trophy size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input type="text" className="input-field pl-8 text-sm" placeholder="e.g. Gully World Cup 2025"
                value={form.tournamentName} onChange={e => update('tournamentName', e.target.value)}
                maxLength={60} />
            </div>
            {form.tournamentName.trim() && (
              <p className="text-[11px] text-slate-500 mt-1.5">
                Saved as: &ldquo;{form.tournamentName.trim()} — {form.teamAName || 'Team A'} vs {form.teamBName || 'Team B'}&rdquo;
              </p>
            )}
          </div>

          {/* Overs */}
          <div className="card p-4">
            <label className="text-xs text-slate-400 mb-2 block font-semibold uppercase tracking-wide">Overs</label>
            <div className="flex flex-wrap gap-2">
              {OVER_OPTIONS.map(o => (
                <button key={o} onClick={() => update('totalOvers', o)}
                  className={cn('px-3 py-2 rounded-xl border text-sm font-display font-bold transition-all',
                    form.totalOvers === o
                      ? 'bg-brand-500 border-brand-500 text-white'
                      : 'border-pitch-border text-slate-400 hover:border-brand-500/50 hover:text-white')}>
                  {o}
                </button>
              ))}
            </div>
          </div>

          {/* Toss */}
          <div className="card p-4 space-y-3">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Toss</p>
            <div>
              <p className="text-xs text-slate-500 mb-1.5">Won by</p>
              <div className="grid grid-cols-2 gap-2">
                {(['teamA', 'teamB'] as const).map(t => (
                  <button key={t} onClick={() => update('tossWonBy', t)}
                    className={cn('py-2 px-3 rounded-xl border text-sm font-semibold transition-all',
                      form.tossWonBy === t
                        ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                        : 'border-pitch-border text-slate-400 hover:border-brand-500/30')}>
                    {t === 'teamA' ? (form.teamAName || 'Team A') : (form.teamBName || 'Team B')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1.5">Chose to</p>
              <div className="grid grid-cols-2 gap-2">
                {(['bat', 'bowl'] as const).map(c => (
                  <button key={c} onClick={() => update('tossChoice', c)}
                    className={cn('py-2 px-3 rounded-xl border text-sm font-semibold capitalize transition-all',
                      form.tossChoice === c
                        ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                        : 'border-pitch-border text-slate-400 hover:border-brand-500/30')}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            {form.teamAName && form.teamBName && (
              <p className="text-xs text-brand-400 bg-brand-500/10 rounded-xl px-3 py-2">
                🏏 <strong>{battingTeam}</strong> bats first
              </p>
            )}
          </div>

          {/* Visibility */}
          <div className="card p-4">
            <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wide">Visibility</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: 'private', label: '🔒 Private', desc: 'Share link only' },
                { val: 'public',  label: '🌐 Public',  desc: 'Listed publicly'  },
              ].map(v => (
                <button key={v.val} onClick={() => update('visibility', v.val)}
                  className={cn('py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all text-left',
                    form.visibility === v.val
                      ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                      : 'border-pitch-border text-slate-400 hover:border-brand-500/30')}>
                  <p>{v.label}</p>
                  <p className="text-[10px] font-normal text-slate-500">{v.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Player names (search + link profiles) */}
          <div className="border border-pitch-border rounded-xl overflow-hidden">
            <button type="button"
              onClick={() => setShowPlayerNames(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3
                         text-slate-400 hover:text-white hover:bg-white/5 transition-all">
              <span className="flex items-center gap-2 text-sm font-semibold">
                👤 Add Player Names <span className="text-slate-600 font-normal text-xs">(optional — or fill live during scoring)</span>
              </span>
              <ChevronDown size={14} className={cn('transition-transform', showPlayerNames && 'rotate-180')} />
            </button>

            {showPlayerNames && (
              <div className="border-t border-pitch-border bg-pitch-dark/40 px-4 py-4 space-y-5">
                <p className="text-xs text-slate-500">
                  Type to search existing profiles or add a new name. ✓ icon = linked to a registered account.
                </p>

                <div>
                  <p className="text-sm font-semibold text-white mb-2">{form.teamAName || 'Team A'}</p>
                  <div className="space-y-2">
                    {teamAEntries.map((entry, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-brand-500/10 border border-brand-500/20
                                        flex items-center justify-center text-[9px] font-bold text-brand-400 flex-shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <PlayerSearchInput
                            value={entry.name}
                            onChange={(name, existingId) => updateEntry('A', i, name, existingId)}
                            onClear={() => clearEntry('A', i)}
                            placeholder={`${form.teamAName || 'Team A'} ${i + 1}`}
                          />
                        </div>
                        {entry.existingId && (
                          <span title="Linked profile"><UserCheck size={14} className="text-brand-400 flex-shrink-0" /></span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-white mb-2">{form.teamBName || 'Team B'}</p>
                  <div className="space-y-2">
                    {teamBEntries.map((entry, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-brand-500/10 border border-brand-500/20
                                        flex items-center justify-center text-[9px] font-bold text-brand-400 flex-shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <PlayerSearchInput
                            value={entry.name}
                            onChange={(name, existingId) => updateEntry('B', i, name, existingId)}
                            onClear={() => clearEntry('B', i)}
                            placeholder={`${form.teamBName || 'Team B'} ${i + 1}`}
                          />
                        </div>
                        {entry.existingId && (
                          <span title="Linked profile"><UserCheck size={14} className="text-brand-400 flex-shrink-0" /></span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Advanced settings */}
          <div className="border border-pitch-border rounded-xl overflow-hidden">
            <button type="button"
              onClick={() => setAdvancedOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3
                         text-slate-400 hover:text-white hover:bg-white/5 transition-all">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Settings size={14} /> Advanced Settings
              </span>
              <ChevronDown size={14} className={cn('transition-transform', advancedOpen && 'rotate-180')} />
            </button>
            {advancedOpen && (
              <div className="border-t border-pitch-border bg-pitch-dark/40 px-4 py-4 space-y-4">
                <div>
                  <label className="text-sm text-slate-300 font-semibold block mb-1">Wide Ball Runs</label>
                  <div className="flex gap-2">
                    {([0, 1] as const).map(v => (
                      <button key={v} type="button" onClick={() => update('wideRuns', v)}
                        className={cn('flex-1 py-2 rounded-xl border-2 font-display font-bold text-lg transition-all',
                          form.wideRuns === v
                            ? 'border-brand-500 bg-brand-500/15 text-white'
                            : 'border-pitch-border text-slate-500 hover:border-pitch-muted hover:text-slate-300')}>
                        +{v}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm text-slate-300 font-semibold block">Allow Single-Player Batting</label>
                    <p className="text-xs text-slate-500">One person can bat alone</p>
                  </div>
                  <button type="button"
                    onClick={() => update('allowSinglePlayerBat', !form.allowSinglePlayerBat)}
                    className={cn('w-12 h-6 rounded-full transition-all flex-shrink-0 relative',
                      form.allowSinglePlayerBat ? 'bg-brand-500' : 'bg-pitch-border')}>
                    <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all',
                      form.allowSinglePlayerBat ? 'left-[26px]' : 'left-0.5')} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-score-wicket/10 border border-score-wicket/30 rounded-xl px-4 py-3">
              <p className="text-score-wicket text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={submitting || !form.teamAName.trim() || !form.teamBName.trim()}
            className={cn('btn-primary w-full flex items-center justify-center gap-2 py-4 text-lg',
              (!form.teamAName || !form.teamBName) && 'opacity-40')}>
            {submitting
              ? <><Loader2 size={20} className="animate-spin" /> Creating...</>
              : <><Play size={20} /> Start Scoring Now</>
            }
          </button>

          <p className="text-center text-slate-500 text-xs">
            Players without names will be filled in live during scoring.
          </p>
        </div>
      </div>
    </AppShell>
  );
}