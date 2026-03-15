'use client';
// src/app/tournament/page.tsx
import { useState, useEffect } from 'react';
import AppShell  from '@/components/layout/AppShell';
import Link      from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  Trophy, Plus, Loader2, AlertCircle, Calendar,
  ChevronRight, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TournamentListPage() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    fetch('/api/tournament')
      .then(r => r.json())
      .then(j => {
        if (j.success) setTournaments(j.data.tournaments ?? []);
        else setError(j.error ?? 'Failed to load tournaments');
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-bold text-2xl text-white">Tournaments</h1>
            <p className="text-slate-400 text-sm mt-0.5">Your organised competitions</p>
          </div>
          {user && !user.isGuest && (
            <Link href="/new-match?tab=tournament"
              className="btn-primary flex items-center gap-1.5 py-2 px-3 text-sm">
              <Plus size={15} /> New
            </Link>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-brand-400" />
          </div>
        )}

        {error && (
          <div className="card p-6 text-center">
            <AlertCircle size={28} className="text-score-wicket mx-auto mb-2" />
            <p className="text-slate-400 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && tournaments.length === 0 && (
          <div className="card p-10 text-center">
            <Trophy size={36} className="text-slate-600 mx-auto mb-3" />
            <p className="text-white font-display font-bold text-lg mb-1">No tournaments yet</p>
            <p className="text-slate-400 text-sm mb-4">
              Create a tournament to organise multi-match competitions with automatic fixtures.
            </p>
            {user && !user.isGuest && (
              <Link href="/new-match?tab=tournament" className="btn-primary inline-flex items-center gap-2">
                <Plus size={15} /> Create Tournament
              </Link>
            )}
          </div>
        )}

        <div className="space-y-3">
          {tournaments.map((t: any) => (
            <Link key={t._id} href={`/tournament/${t._id}`} className="block">
              <div className="card-hover p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-brand-500/20 border border-brand-500/30
                                rounded-xl flex items-center justify-center flex-shrink-0">
                  <Trophy size={18} className="text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-white truncate">{t.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Users size={11} /> {t.teams?.length ?? 0} teams
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar size={11} /> {t.matches?.length ?? 0} matches
                    </span>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded-full border',
                      t.status === 'active'    ? 'text-score-wide border-score-wide/30 bg-score-wide/10' :
                      t.status === 'completed' ? 'text-brand-400 border-brand-500/30 bg-brand-500/10' :
                                                 'text-slate-400 border-pitch-border'
                    )}>{t.status}</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
