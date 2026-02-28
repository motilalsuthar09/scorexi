'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, ChevronDown, Loader2, Trophy, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Match {
  _id: string;
  title?: string;
  teamA: { name: string };
  teamB: { name: string };
  status: 'setup' | 'live' | 'innings_break' | 'completed';
  totalOvers: number;
  createdAt: string;
}

interface Props {
  initialStatus?: string;
  limit?: number;
  showSearch?: boolean;
}

export default function MatchListClient({ initialStatus = '', limit = 10, showSearch = false }: Props) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState(initialStatus);
  const [page, setPage]       = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [total, setTotal]     = useState(0);
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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    setPage(1);
    fetchMatches(search, status, 1, true);
  }, [search, status, fetchMatches]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMatches(search, status, nextPage, false);
  };

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  return (
    <div>
      {/* ── Controls ─────────────────────────────────── */}
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
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={cn(
                  'px-4 py-2.5 rounded-xl text-sm font-body border transition-all',
                  status === s
                    ? 'bg-brand-500/15 border-brand-500/40 text-brand-400'
                    : 'border-pitch-border text-slate-400 hover:border-slate-600 hover:text-white'
                )}
              >
                {s === '' ? 'All' : s === 'live' ? 'Live' : 'Finished'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Match cards ──────────────────────────────── */}
      {matches.length === 0 && !loading ? (
        <div className="card p-10 text-center">
          <div className="w-12 h-12 bg-pitch-border rounded-full flex items-center justify-center mx-auto mb-3">
            <Trophy size={20} className="text-slate-500" />
          </div>
          <p className="text-slate-400">No matches found</p>
          <p className="text-slate-500 text-sm mt-1">
            {search ? 'Try a different search term' : 'Be the first to create one!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map(match => (
            <MatchCard key={match._id} match={match} />
          ))}
        </div>
      )}

      {/* ── Skeletons ────────────────────────────────── */}
      {loading && (
        <div className="space-y-3 mt-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-4 h-24 skeleton" />
          ))}
        </div>
      )}

      {/* ── Load more ────────────────────────────────── */}
      {hasMore && !loading && (
        <button
          onClick={loadMore}
          className="w-full mt-4 py-3 card border-dashed border-pitch-border/60
                     text-slate-400 hover:text-white hover:border-pitch-border
                     transition-all flex items-center justify-center gap-2 text-sm"
        >
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

function MatchCard({ match }: { match: Match }) {
  const isLive = match.status === 'live';
  return (
    <Link href={`/match/${match._id}`}>
      <div className="card-hover p-4 flex items-center gap-4 cursor-pointer animate-fade-in">
        {/* Status indicator */}
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
          isLive ? 'bg-score-wicket/15' : 'bg-pitch-border'
        )}>
          {isLive
            ? <Radio size={18} className="text-score-wicket" />
            : <Trophy size={18} className="text-slate-500" />
          }
        </div>

        {/* Match info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {isLive && (
              <span className="live-badge text-[10px] py-0.5 px-2">
                <span className="live-dot" /> LIVE
              </span>
            )}
            <h3 className="font-display font-semibold text-white text-sm truncate">
              {match.title || `${match.teamA.name} vs ${match.teamB.name}`}
            </h3>
          </div>
          <p className="text-slate-400 text-xs">
            {match.teamA.name} vs {match.teamB.name} • {match.totalOvers} overs
          </p>
        </div>

        {/* Date */}
        <div className="text-right flex-shrink-0 hidden sm:block">
          <p className="text-slate-500 text-xs">
            {new Date(match.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short'
            })}
          </p>
        </div>
      </div>
    </Link>
  );
}
