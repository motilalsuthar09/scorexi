'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, UserCheck, Loader2 } from 'lucide-react';

interface Player {
  _id: string;
  name: string;
  username?: string;
  isClaimed: boolean;
  stats?: { matchesPlayed: number; totalRuns: number };
}

interface Props {
  onAdd: (entry: { name: string; existingPlayerId?: string }) => void;
  placeholder?: string;
}

export default function PlayerSearchInput({ onAdd, placeholder = 'Type player name...' }: Props) {
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState<Player[]>([]);
  const [loading, setLoading]     = useState(false);
  const [showDrop, setShowDrop]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef  = useRef<HTMLDivElement>(null);

  // Search debounce
  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res  = await fetch(`/api/players?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setResults(json.data?.players ?? []);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // Close on outside click
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

  const handleSelect = (player: Player) => {
    onAdd({ name: player.name, existingPlayerId: player._id });
    setQuery('');
    setResults([]);
    setShowDrop(false);
    inputRef.current?.focus();
  };

  const handleAddNew = () => {
    if (!query.trim()) return;
    onAdd({ name: query.trim() });
    setQuery('');
    setResults([]);
    setShowDrop(false);
    inputRef.current?.focus();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddNew();
    if (e.key === 'Escape') setShowDrop(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setShowDrop(true); }}
          onFocus={() => setShowDrop(true)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          className="input-field pl-9 pr-20 text-sm"
          autoComplete="off"
        />
        {query.trim() && (
          <button
            type="button"
            onClick={handleAddNew}
            className="absolute right-2 top-1/2 -translate-y-1/2
                       bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold
                       px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
          >
            <Plus size={12} /> Add
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDrop && (query.length >= 2) && (
        <div
          ref={dropRef}
          className="absolute z-50 w-full mt-1.5 card border-pitch-border shadow-xl
                     overflow-hidden animate-slide-up"
        >
          {loading ? (
            <div className="flex items-center gap-2 px-4 py-3 text-slate-500 text-sm">
              <Loader2 size={14} className="animate-spin" /> Searching...
            </div>
          ) : (
            <>
              {/* Existing players */}
              {results.map(p => (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => handleSelect(p)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5
                             transition-colors text-left border-b border-pitch-border/50 last:border-0"
                >
                  <div className="w-7 h-7 bg-pitch-border rounded-full flex items-center justify-center text-xs font-bold text-slate-400">
                    {p.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-white font-body">{p.name}</span>
                      {p.isClaimed && <UserCheck size={11} className="text-brand-400" />}
                    </div>
                    {p.username && (
                      <span className="text-[11px] text-slate-500">@{p.username}</span>
                    )}
                  </div>
                  {p.stats && (
                    <span className="text-xs text-slate-500 tabular">
                      {p.stats.totalRuns}R
                    </span>
                  )}
                </button>
              ))}

              {/* Add new entry */}
              <button
                type="button"
                onClick={handleAddNew}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-brand-500/5
                           transition-colors text-left"
              >
                <div className="w-7 h-7 bg-brand-500/20 rounded-full flex items-center justify-center">
                  <Plus size={14} className="text-brand-400" />
                </div>
                <div>
                  <span className="text-sm text-brand-400 font-body">Add &ldquo;{query}&rdquo;</span>
                  <p className="text-[11px] text-slate-500">Create new player profile</p>
                </div>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
