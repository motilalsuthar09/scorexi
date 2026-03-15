// src/app/my-matches/page.tsx
'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import Link from 'next/link';
import {
  Play, Trophy, Clock, Plus, Loader2, Trash2,
  RefreshCw, Zap, AlertCircle, AlertTriangle, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatKeysParam, removeHostedMatch, getHostedMatchKeys } from '@/lib/hostedMatches';

// ── Delete confirmation modal ─────────────────────────────
function DeleteConfirmModal({
  match,
  onConfirm,
  onCancel,
  deleting,
}: {
  match:     { title: string; status: string };
  onConfirm: () => void;
  onCancel:  () => void;
  deleting:  boolean;
}) {
  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="relative w-full max-w-sm card border border-score-wicket/30 p-6 space-y-4 animate-slide-up">

        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-score-wicket/15 border border-score-wicket/30
                          flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertTriangle size={18} className="text-score-wicket" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-white text-lg leading-tight">Delete Match?</h3>
            <p className="text-slate-400 text-sm mt-0.5 truncate">{match.title}</p>
          </div>
          <button onClick={onCancel}
            className="text-slate-500 hover:text-white transition-colors mt-0.5 flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* What gets deleted */}
        <div className="bg-pitch-dark border border-pitch-border rounded-xl p-4 space-y-2.5">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">
            This will permanently:
          </p>
          <div className="space-y-2">
            {[
              { icon: '🗑️', text: 'Delete the match, all overs and balls' },
              { icon: '📊', text: "Roll back each player's stats from this match" },
              { icon: '👤', text: 'Remove unclaimed player profiles created only for this match' },
              { icon: '✅', text: 'Keep profiles of registered/claimed players' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="text-sm flex-shrink-0 mt-0.5">{item.icon}</span>
                <p className="text-slate-300 text-sm">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {match.status === 'live' && (
          <div className="bg-score-wide/10 border border-score-wide/30 rounded-xl px-3 py-2">
            <p className="text-score-wide text-xs font-semibold">
              ⚠ This match is currently LIVE — deleting it will end scoring immediately.
            </p>
          </div>
        )}

        <p className="text-slate-500 text-xs text-center">This cannot be undone.</p>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button onClick={onCancel} disabled={deleting}
            className="border border-pitch-border text-slate-300 py-3 rounded-xl text-sm
                       font-semibold hover:text-white hover:border-pitch-muted transition-all">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting}
            className="bg-score-wicket/15 border border-score-wicket text-score-wicket py-3 rounded-xl
                       text-sm font-bold hover:bg-score-wicket/25 transition-all
                       flex items-center justify-center gap-2">
            {deleting
              ? <><Loader2 size={14} className="animate-spin" /> Deleting...</>
              : <><Trash2 size={14} /> Yes, Delete</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MyMatchesPage() {
  const [matches,    setMatches]    = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting,     setDeleting]     = useState(false);
  const [deleteError,  setDeleteError]  = useState('');

  const load = async (showSpin = false) => {
    if (showSpin) setRefreshing(true);
    const keys = formatKeysParam();
    if (!keys) { setMatches([]); setLoading(false); setRefreshing(false); return; }
    try {
      const res  = await fetch(`/api/matches/hosted?keys=${encodeURIComponent(keys)}`);
      const json = await res.json();
      if (json.success) setMatches(json.data.matches);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  // Remove from local list only (no server delete)
  const handleRemoveLocal = (id: string) => {
    removeHostedMatch(id);
    setMatches(ms => ms.filter((m: any) => m._id.toString() !== id));
  };

  // Ask for confirmation before server delete
  const handleDeleteClick = (m: any) => {
    setDeleteError('');
    setDeleteTarget(m);
  };

  // Confirmed — actually delete on server
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');

    try {
      // Get token for this match from localStorage
      const keys = getHostedMatchKeys();
      const entry = keys.find(k => k.id === deleteTarget._id.toString());
      if (!entry?.token) {
        setDeleteError('Cannot delete — share token not found. Try removing from list instead.');
        setDeleting(false);
        return;
      }

      const res  = await fetch(
        `/api/match/${deleteTarget._id}?token=${entry.token}`,
        { method: 'DELETE' }
      );
      const json = await res.json();

      if (json.success) {
        removeHostedMatch(deleteTarget._id.toString());
        setMatches(ms => ms.filter((m: any) => m._id.toString() !== deleteTarget._id.toString()));
        setDeleteTarget(null);
      } else {
        setDeleteError(json.error || 'Delete failed. Try again.');
      }
    } catch {
      setDeleteError('Network error. Please try again.');
    }
    setDeleting(false);
  };

  const STATUS: Record<string, { label: string; dot: string }> = {
    live:          { label: 'LIVE',       dot: 'bg-score-wicket animate-pulse' },
    innings_break: { label: 'Break',      dot: 'bg-score-wide'                 },
    setup:         { label: 'Setting up', dot: 'bg-slate-500'                  },
    completed:     { label: 'Completed',  dot: 'bg-brand-500'                  },
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Confirmation modal */}
        {deleteTarget && (
          <DeleteConfirmModal
            match={{ title: deleteTarget.title, status: deleteTarget.status }}
            onConfirm={handleDeleteConfirm}
            onCancel={() => { setDeleteTarget(null); setDeleteError(''); }}
            deleting={deleting}
          />
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-display font-bold text-2xl text-white">My Matches</h1>
            <p className="text-slate-400 text-sm">Resume or review matches you've hosted</p>
          </div>
          <button onClick={() => load(true)} className="btn-ghost p-2" title="Refresh">
            <RefreshCw size={15} className={cn(refreshing && 'animate-spin')} />
          </button>
        </div>

        {/* Quick start cards */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <Link href="/new-match/quick"
            className="card-hover p-4 flex items-center gap-3 border border-brand-500/20">
            <div className="w-9 h-9 bg-brand-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap size={16} className="text-brand-400" />
            </div>
            <div>
              <p className="font-display font-semibold text-white text-sm">Quick Match</p>
              <p className="text-slate-500 text-xs">Teams + toss only</p>
            </div>
          </Link>
          <Link href="/new-match"
            className="card-hover p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-pitch-border rounded-xl flex items-center justify-center flex-shrink-0">
              <Plus size={16} className="text-slate-300" />
            </div>
            <div>
              <p className="font-display font-semibold text-white text-sm">Full Match</p>
              <p className="text-slate-500 text-xs">Custom players</p>
            </div>
          </Link>
        </div>

        {deleteError && (
          <div className="bg-score-wicket/10 border border-score-wicket/30 rounded-xl px-4 py-3 mb-4">
            <p className="text-score-wicket text-sm">{deleteError}</p>
          </div>
        )}

        {/* Match list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-brand-400" />
          </div>
        ) : matches.length === 0 ? (
          <div className="card p-10 text-center">
            <AlertCircle size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="font-display font-bold text-white mb-1">No matches yet</p>
            <p className="text-slate-400 text-sm">
              Matches you create will appear here so you can always come back and resume.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Your matches</p>
            {matches.map((m: any) => {
              const cfg    = STATUS[m.status] ?? STATUS.completed;
              const isLive = m.status === 'live' || m.status === 'innings_break';
              const isHost = m.isHost;

              return (
                <div key={m._id} className={cn('card p-4 relative overflow-hidden',
                  isLive && 'border-brand-500/20')}>
                  {isLive && <div className="absolute inset-0 bg-live-pulse pointer-events-none opacity-40" />}
                  <div className="relative">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.dot)} />
                          <span className="text-xs text-slate-400 font-semibold">{cfg.label}</span>
                          {!isHost && <span className="text-xs text-slate-600">(viewer)</span>}
                        </div>
                        <h3 className="font-display font-bold text-white text-sm truncate">{m.title}</h3>
                        <p className="text-slate-500 text-xs">{m.totalOvers} overs</p>
                      </div>
                      {m.score && (
                        <div className="text-right flex-shrink-0">
                          <p className="text-[10px] text-slate-500">{m.score.team}</p>
                          <p className="font-display font-bold text-white text-xl tabular">
                            {m.score.runs}/{m.score.wickets}
                          </p>
                          <p className="text-slate-500 text-xs">({m.score.overs})</p>
                        </div>
                      )}
                    </div>

                    {m.result && (
                      <div className="mb-3 bg-brand-500/8 border border-brand-500/20 rounded-xl px-3 py-2">
                        <p className="text-brand-400 text-sm font-semibold">🏆 {m.result.summary}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {isHost && isLive ? (
                        <Link href={m.resumeUrl}
                          className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-2.5">
                          <Play size={14} /> Resume Scoring
                        </Link>
                      ) : (
                        <Link href={m.resumeUrl}
                          className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm py-2.5">
                          {m.status === 'completed' ? <Trophy size={14} /> : <Clock size={14} />}
                          {m.status === 'completed' ? 'View Scorecard' : 'Open Match'}
                        </Link>
                      )}

                      {/* Host gets real delete; others get local remove */}
                      {isHost ? (
                        <button
                          onClick={() => handleDeleteClick(m)}
                          title="Delete match"
                          className="border border-pitch-border text-slate-500 p-2.5 rounded-xl
                                     hover:text-score-wicket hover:border-score-wicket/40 transition-all">
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRemoveLocal(m._id.toString())}
                          title="Remove from list"
                          className="border border-pitch-border text-slate-500 p-2.5 rounded-xl
                                     hover:text-slate-300 hover:border-pitch-muted transition-all">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}