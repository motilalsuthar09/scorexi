// src/app/players/compare/page.tsx
// ============================================================
// /players/compare?a=<playerId>&b=<playerId>
// Side-by-side career stat comparison for any two players.
// Accessible from player profile pages via "Compare" button.
// ============================================================
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter }        from 'next/navigation';
import AppShell    from '@/components/layout/AppShell';
import Link        from 'next/link';
import {
  Loader2, AlertCircle, ArrowLeft, ArrowLeftRight,
  Target, Zap, TrendingUp, Shield, Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────
interface DerivedBatting {
  average: number | null;
  strikeRate: number | null;
  highestScore: number;
  notOuts: number;
  fours: number;
  sixes: number;
}
interface DerivedBowling {
  average: number | null;
  economy: number | null;
  strikeRate: number | null;
  bestFigures: string;
  wickets: number;
}
interface PlayerData {
  player: {
    _id: string;
    name: string;
    isClaimed: boolean;
    stats: {
      matchesPlayed: number;
      totalRuns: number;
      totalBallsFaced: number;
      totalWickets: number;
      totalBallsBowled: number;
      totalRunsConceded: number;
      highestScore: number;
      totalSixes: number;
      totalFours: number;
      notOuts: number;
    };
  };
  derived: { batting: DerivedBatting; bowling: DerivedBowling };
}

// ── Stat row with bar comparison ─────────────────────────
function StatRow({
  label, aVal, bVal, higherIsBetter = true, format = (v: number) => String(v),
}: {
  label: string;
  aVal: number | null;
  bVal: number | null;
  higherIsBetter?: boolean;
  format?: (v: number) => string;
}) {
  const a = aVal ?? 0;
  const b = bVal ?? 0;
  const max = Math.max(a, b, 1);

  const aWins = higherIsBetter ? a > b : (a < b && a > 0);
  const bWins = higherIsBetter ? b > a : (b < a && b > 0);

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2.5 border-b border-pitch-border/50 last:border-0">
      {/* A bar */}
      <div className="flex items-center gap-2 justify-end">
        <span className={cn('text-sm font-display font-bold', aWins ? 'text-brand-400' : 'text-white')}>
          {aVal === null ? '—' : format(a)}
        </span>
        <div className="w-20 h-2 bg-pitch-border rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', aWins ? 'bg-brand-400' : 'bg-slate-600')}
            style={{ width: `${(a / max) * 100}%` }}
          />
        </div>
      </div>

      {/* Label */}
      <span className="text-[10px] text-slate-500 uppercase tracking-wider text-center font-semibold whitespace-nowrap px-1">
        {label}
      </span>

      {/* B bar */}
      <div className="flex items-center gap-2">
        <div className="w-20 h-2 bg-pitch-border rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', bWins ? 'bg-score-wide' : 'bg-slate-600')}
            style={{ width: `${(b / max) * 100}%` }}
          />
        </div>
        <span className={cn('text-sm font-display font-bold', bWins ? 'text-score-wide' : 'text-white')}>
          {bVal === null ? '—' : format(b)}
        </span>
      </div>
    </div>
  );
}

// ── Player search box ─────────────────────────────────────
function PlayerSearchBox({
  label, value, onSelect,
}: {
  label: string;
  value: string;
  onSelect: (id: string) => void;
}) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [open,    setOpen]    = useState(false);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const res  = await fetch(`/api/players/search?q=${encodeURIComponent(query)}&limit=6`);
      const json = await res.json();
      if (json.success) setResults(json.data.players ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="relative">
      <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1.5 block">{label}</label>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search player name..."
          className="input-field pl-9 text-sm"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-20 top-full mt-1 w-full bg-pitch-card border border-pitch-border rounded-xl
                        shadow-xl overflow-hidden">
          {results.map((p: any) => (
            <button
              key={p._id}
              onClick={() => {
                onSelect(p._id);
                setQuery(p.name);
                setOpen(false);
                setResults([]);
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
            >
              <span className="text-sm font-display font-semibold text-white">{p.name}</span>
              <span className="text-xs text-slate-500">{p.stats.matchesPlayed}m</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────
export default function ComparePage() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [aId, setAId] = useState(searchParams.get('a') ?? '');
  const [bId, setBId] = useState(searchParams.get('b') ?? '');
  const [aData, setAData] = useState<PlayerData | null>(null);
  const [bData, setBData] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const loadPlayer = useCallback(async (id: string): Promise<PlayerData | null> => {
    if (!id) return null;
    const res  = await fetch(`/api/player/${id}`);
    const json = await res.json();
    return json.success ? json.data : null;
  }, []);

  useEffect(() => {
    if (!aId && !bId) return;
    setLoading(true);
    setError('');
    Promise.all([loadPlayer(aId), loadPlayer(bId)])
      .then(([a, b]) => {
        setAData(a);
        setBData(b);
        if ((!a && aId) || (!b && bId)) setError('One or more players not found.');
      })
      .catch(() => setError('Failed to load player data.'))
      .finally(() => setLoading(false));
  }, [aId, bId, loadPlayer]);

  // Update URL when IDs change
  useEffect(() => {
    const params = new URLSearchParams();
    if (aId) params.set('a', aId);
    if (bId) params.set('b', bId);
    router.replace(`/players/compare?${params.toString()}`, { scroll: false });
  }, [aId, bId, router]);

  const canCompare = !!(aData && bData);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-5">

        <Link href="/players" className="btn-ghost flex items-center gap-1.5 text-sm mb-4 w-fit">
          <ArrowLeft size={15} /> Players
        </Link>

        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <ArrowLeftRight size={20} className="text-brand-400" />
            <h1 className="font-display font-bold text-2xl text-white">Compare Players</h1>
          </div>
          <p className="text-slate-400 text-sm">Side-by-side career stats for any two players.</p>
        </div>

        {/* Player pickers */}
        <div className="card p-4 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PlayerSearchBox
            label="Player A"
            value={aId}
            onSelect={id => setAId(id)}
          />
          <PlayerSearchBox
            label="Player B"
            value={bId}
            onSelect={id => setBId(id)}
          />
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-brand-400" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="card p-5 text-center">
            <AlertCircle size={28} className="text-score-wicket mx-auto mb-2" />
            <p className="text-slate-400 text-sm">{error}</p>
          </div>
        )}

        {/* Comparison */}
        {canCompare && !loading && (
          <>
            {/* Player name headers */}
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 mb-4 items-center">
              <Link href={`/player/${aData.player._id}`}
                className="card p-3 text-center hover:border-brand-500/40 transition-colors group">
                <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-brand-400 rounded-xl
                                flex items-center justify-center mx-auto mb-2 shadow-lg shadow-brand-500/30">
                  <span className="font-display font-bold text-white text-base">
                    {aData.player.name[0].toUpperCase()}
                  </span>
                </div>
                <p className="font-display font-bold text-white text-sm group-hover:text-brand-400 transition-colors">
                  {aData.player.name}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">{aData.player.stats.matchesPlayed} matches</p>
              </Link>

              <div className="text-center">
                <span className="text-slate-600 font-display font-bold text-sm">VS</span>
              </div>

              <Link href={`/player/${bData.player._id}`}
                className="card p-3 text-center hover:border-score-wide/40 transition-colors group">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-score-wide rounded-xl
                                flex items-center justify-center mx-auto mb-2 shadow-lg shadow-score-wide/30">
                  <span className="font-display font-bold text-white text-base">
                    {bData.player.name[0].toUpperCase()}
                  </span>
                </div>
                <p className="font-display font-bold text-white text-sm group-hover:text-score-wide transition-colors">
                  {bData.player.name}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">{bData.player.stats.matchesPlayed} matches</p>
              </Link>
            </div>

            {/* Batting stats */}
            <div className="card p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Target size={15} className="text-brand-400" />
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Batting</p>
              </div>
              <StatRow
                label="Runs"
                aVal={aData.player.stats.totalRuns}
                bVal={bData.player.stats.totalRuns}
              />
              <StatRow
                label="Average"
                aVal={aData.derived.batting.average}
                bVal={bData.derived.batting.average}
                format={v => v.toFixed(1)}
              />
              <StatRow
                label="Strike Rate"
                aVal={aData.derived.batting.strikeRate}
                bVal={bData.derived.batting.strikeRate}
                format={v => v.toFixed(1)}
              />
              <StatRow
                label="High Score"
                aVal={aData.player.stats.highestScore ?? 0}
                bVal={bData.player.stats.highestScore ?? 0}
              />
              <StatRow
                label="Sixes"
                aVal={aData.player.stats.totalSixes ?? 0}
                bVal={bData.player.stats.totalSixes ?? 0}
              />
              <StatRow
                label="Fours"
                aVal={aData.player.stats.totalFours ?? 0}
                bVal={bData.player.stats.totalFours ?? 0}
              />
            </div>

            {/* Bowling stats */}
            <div className="card p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={15} className="text-score-wide" />
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bowling</p>
              </div>
              <StatRow
                label="Wickets"
                aVal={aData.player.stats.totalWickets}
                bVal={bData.player.stats.totalWickets}
              />
              <StatRow
                label="Average"
                aVal={aData.derived.bowling.average}
                bVal={bData.derived.bowling.average}
                higherIsBetter={false}
                format={v => v.toFixed(1)}
              />
              <StatRow
                label="Economy"
                aVal={aData.derived.bowling.economy}
                bVal={bData.derived.bowling.economy}
                higherIsBetter={false}
                format={v => v.toFixed(2)}
              />
              <StatRow
                label="Strike Rate"
                aVal={aData.derived.bowling.strikeRate}
                bVal={bData.derived.bowling.strikeRate}
                higherIsBetter={false}
                format={v => v.toFixed(1)}
              />
            </div>

            {/* Overall */}
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={15} className="text-slate-400" />
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall</p>
              </div>
              <StatRow
                label="Matches"
                aVal={aData.player.stats.matchesPlayed}
                bVal={bData.player.stats.matchesPlayed}
              />
              <StatRow
                label="Balls Faced"
                aVal={aData.player.stats.totalBallsFaced}
                bVal={bData.player.stats.totalBallsFaced}
              />
              <StatRow
                label="Balls Bowled"
                aVal={aData.player.stats.totalBallsBowled}
                bVal={bData.player.stats.totalBallsBowled}
              />
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-brand-400" />
                <span>{aData.player.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-score-wide" />
                <span>{bData.player.name}</span>
              </div>
            </div>
          </>
        )}

        {/* Empty state */}
        {!canCompare && !loading && !error && (
          <div className="card p-10 text-center">
            <ArrowLeftRight size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Search for two players above to compare their stats.</p>
          </div>
        )}

      </div>
    </AppShell>
  );
}