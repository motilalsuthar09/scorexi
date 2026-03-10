// src/components/match/MatchListClient.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link    from 'next/link';
import { Search, ChevronDown, Loader2, Trophy, Radio, Play, Eye } from 'lucide-react';
import { cn }  from '@/lib/utils';

interface LiveScore {
  runs:        number;
  wickets:     number;
  overs:       string;
  battingTeam: string;
}

interface Match {
  _id:       string;
  title?:    string;
  teamA:     { name: string };
  teamB:     { name: string };
  status:    'setup' | 'live' | 'innings_break' | 'completed';
  totalOvers: number;
  createdAt:  string;
  result?:    { summary: string };
  liveScore?: LiveScore | null;
}

interface Props {
  initialStatus?:      string;
  limit?:              number;
  showSearch?:         boolean;
  showContinueButton?: boolean;
}

export default function MatchListClient({
  initialStatus = '', limit = 10, showSearch = false, showContinueButton = false,
}: Props) {
  const [matches,     setMatches]     = useState<Match[]>([]);
  const [search,      setSearch]      = useState('');
  const [status,      setStatus]      = useState(initialStatus);
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [total,       setTotal]       = useState(0);
  const [searchInput, setSearchInput] = useState('');

  const fetchMatches = useCallback(async (
    s: string, st: string, p: number, reset = false
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page:  String(p),
        limit: String(limit),
        ...(s  ? { search: s }  : {}),
        ...(st ? { status: st } : {}),
      });
      const res  = await fetch(`/api/matches?${params}`);
      const json = await res.json();
      if (json.success) {
        setMatches(prev => reset ? json.data.items : [...prev, ...json.data.items]);
        setHasMore(json.data.hasMore);
        setTotal(json.data.total);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [limit]);

  useEffect(() => {
    setPage(1);
    fetchMatches(search, status, 1, true);
  }, [search, status, fetchMatches]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchMatches(search, status, next, false);
  };

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  return (
    <div>
      {/* Search + filter */}
      {showSearch && (
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search teams or match name..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="flex gap-2">
            {(['', 'live', 'completed'] as const).map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className={cn(
                  'px-4 py-2.5 rounded-xl text-sm font-body border transition-all',
                  status === s
                    ? 'bg-brand-500/15 border-brand-500/40 text-brand-400'
                    : 'border-pitch-border text-slate-400 hover:border-slate-600 hover:text-white'
                )}>
                {s === '' ? 'All' : s === 'live' ? '🔴 Live' : '✅ Completed'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Match list */}
      {matches.length === 0 && !loading ? (
        <div className="card p-8 text-center">
          <div className="w-12 h-12 bg-pitch-border rounded-full flex items-center justify-center mx-auto mb-3">
            <Trophy size={20} className="text-slate-500" />
          </div>
          <p className="text-slate-400">
            {initialStatus === 'live' ? 'No live matches right now' : 'No matches found'}
          </p>
          <p className="text-slate-500 text-sm mt-1">
            {search ? 'Try a different search term' : 'Be the first to create one!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map(match => (
            <MatchCard key={match._id} match={match} showContinueButton={showContinueButton} />
          ))}
        </div>
      )}

      {/* Skeletons */}
      {loading && (
        <div className="space-y-3 mt-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-4 h-24 skeleton" />
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && !loading && (
        <button onClick={loadMore}
          className="w-full mt-4 py-3 card border-dashed border-pitch-border/60
                     text-slate-400 hover:text-white hover:border-pitch-border
                     transition-all flex items-center justify-center gap-2 text-sm">
          <ChevronDown size={16} />
          Load more ({total - matches.length} remaining)
        </button>
      )}

      {loading && matches.length > 0 && (
        <div className="flex justify-center mt-4">
          <Loader2 size={20} className="animate-spin text-slate-500" />
        </div>
      )}
    </div>
  );
}

function MatchCard({ match, showContinueButton }: { match: Match; showContinueButton: boolean }) {
  const isLive      = match.status === 'live' || match.status === 'innings_break';
  const isCompleted = match.status === 'completed';
  const score       = match.liveScore;

  return (
    <Link href={`/match/${match._id}`} className="block">
      <div className={cn(
        'card p-4 animate-fade-in transition-all hover:border-pitch-muted',
        isLive && 'border-brand-500/20'
      )}>
        <div className="flex items-start gap-3">

          {/* Icon */}
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5',
            isLive ? 'bg-score-wicket/15' : 'bg-pitch-border'
          )}>
            {isLive
              ? <Radio size={18} className="text-score-wicket" />
              : <Trophy size={18} className="text-slate-500" />}
          </div>

          {/* Match info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              {isLive && (
                <span className="live-badge text-[10px] py-0.5 px-2">
                  <span className="live-dot" /> LIVE
                </span>
              )}
              {isCompleted && (
                <span className="text-[10px] font-semibold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-500/20">
                  ✅ Completed
                </span>
              )}
              <h3 className="font-display font-semibold text-white text-sm truncate">
                {match.title || `${match.teamA.name} vs ${match.teamB.name}`}
              </h3>
            </div>

            {/* Teams + overs sub-line */}
            <p className="text-slate-400 text-xs">
              {match.teamA.name} vs {match.teamB.name} · {match.totalOvers} overs
            </p>

            {/* ── Live score inline ────────────────────── */}
            {score && (isLive || isCompleted) && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <div className="flex items-baseline gap-1">
                  <span className="font-display font-bold text-white text-lg tabular leading-none">
                    {score.runs}/{score.wickets}
                  </span>
                  <span className="text-slate-500 text-xs">
                    ({score.overs})
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 bg-pitch-dark px-2 py-0.5 rounded-full border border-pitch-border truncate max-w-[120px]">
                  {score.battingTeam}
                </span>
              </div>
            )}

            {/* Result */}
            {match.result?.summary && (
              <p className="text-brand-400 text-xs mt-1 font-semibold">
                🏆 {match.result.summary}
              </p>
            )}
          </div>

          {/* CTA button */}
          <div className="flex-shrink-0 self-center ml-1">
            {showContinueButton && isLive ? (
              <span className="inline-flex items-center gap-1 bg-brand-500/15 border border-brand-500/30
                               text-brand-400 text-xs font-semibold px-2.5 py-1.5 rounded-lg">
                <Play size={11} /> Score
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-slate-500 text-xs px-2 py-1.5">
                <Eye size={13} />
              </span>
            )}
          </div>

        </div>
      </div>
    </Link>
  );
}