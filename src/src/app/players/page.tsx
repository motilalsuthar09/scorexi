'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import Link from 'next/link';
import { Search, Users, CheckCircle, Loader2, Trophy } from 'lucide-react';

export default function PlayersPage() {
  const [query, setQuery]     = useState('');
  const [search, setSearch]   = useState('');
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setSearch(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (search.length < 2) { setPlayers([]); return; }
    setLoading(true);
    fetch(`/api/players?q=${encodeURIComponent(search)}`)
      .then(r => r.json())
      .then(j => { if (j.success) setPlayers(j.data.players ?? []); })
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-6">

        <div className="mb-6">
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-white mb-1 flex items-center gap-2">
            <Users size={22} className="text-brand-400" /> Players
          </h1>
          <p className="text-slate-400 text-sm">Search for any player by name or username</p>
        </div>

        {/* Search box */}
        <div className="relative mb-6">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search player name or @username..."
            className="input-field pl-11 py-4 text-base"
            autoFocus
          />
        </div>

        {/* Results */}
        {loading && (
          <div className="flex justify-center py-10">
            <Loader2 size={24} className="animate-spin text-brand-400" />
          </div>
        )}

        {!loading && search.length >= 2 && players.length === 0 && (
          <div className="card p-8 text-center">
            <Users size={32} className="text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400">No players found for &ldquo;{search}&rdquo;</p>
            <p className="text-slate-500 text-sm mt-1">
              Players are auto-created when added to matches.
            </p>
          </div>
        )}

        {!loading && players.length > 0 && (
          <div className="space-y-2">
            {players.map((p: any) => (
              <Link key={p._id} href={`/player/${p._id}`}>
                <div className="card-hover p-4 flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-11 h-11 bg-gradient-to-br from-brand-600 to-brand-400 rounded-xl
                                  flex items-center justify-center text-white font-bold flex-shrink-0">
                    {p.name[0].toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-display font-semibold text-white">{p.name}</span>
                      {p.isClaimed && (
                        <CheckCircle size={12} className="text-brand-400 flex-shrink-0" />
                      )}
                    </div>
                    {p.username && (
                      <p className="text-slate-500 text-xs">@{p.username}</p>
                    )}
                  </div>

                  {/* Mini stats */}
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="text-center hidden sm:block">
                        <p className="font-display font-bold text-score-wide text-sm tabular">
                          {p.stats?.totalRuns ?? 0}
                        </p>
                        <p className="text-slate-500 text-[10px]">runs</p>
                      </div>
                      <div className="text-center hidden sm:block">
                        <p className="font-display font-bold text-score-wicket text-sm tabular">
                          {p.stats?.totalWickets ?? 0}
                        </p>
                        <p className="text-slate-500 text-[10px]">wkts</p>
                      </div>
                      <div className="text-center">
                        <p className="font-display font-bold text-slate-300 text-sm tabular">
                          {p.stats?.matchesPlayed ?? 0}
                        </p>
                        <p className="text-slate-500 text-[10px]">M</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Hint when no search */}
        {search.length < 2 && !loading && (
          <div className="text-center py-16">
            <Search size={40} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500">Type at least 2 characters to search</p>
            <div className="mt-6">
              <Link href="/leaderboard"
                className="inline-flex items-center gap-2 text-brand-400 hover:text-brand-300 text-sm">
                <Trophy size={14} /> View Leaderboard →
              </Link>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
