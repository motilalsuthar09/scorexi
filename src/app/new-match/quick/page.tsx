'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { Loader2, Play, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { saveHostedMatch } from '@/lib/hostedMatches';

const OVER_OPTIONS = [2, 4, 5, 6, 8, 10, 12, 15, 20];

export default function QuickMatchPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    teamAName:  '',
    teamBName:  '',
    totalOvers: 6,
    tossWonBy:  'teamA' as 'teamA' | 'teamB',
    tossChoice: 'bat' as 'bat' | 'bowl',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  const update = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleStart = async () => {
    if (!form.teamAName.trim() || !form.teamBName.trim()) {
      setError('Enter both team names'); return;
    }
    setSubmitting(true); setError('');
    try {
      // Auto-generate numbered players (Player 1–11 for each team)
      const makePlayers = (teamName: string) =>
        Array.from({ length: 11 }, (_, i) => ({ name: `${teamName} ${i + 1}` }));

      const res  = await fetch('/api/matches', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          teamAName:   form.teamAName.trim(),
          teamBName:   form.teamBName.trim(),
          totalOvers:  form.totalOvers,
          visibility:  'private',
          tossWonBy:   form.tossWonBy,
          tossChoice:  form.tossChoice,
          teamAPlayers: makePlayers(form.teamAName.trim()),
          teamBPlayers: makePlayers(form.teamBName.trim()),
          isQuickMatch: true,
        }),
      });
      const json = await res.json();
      if (json.success) {
        const { matchId, shareToken } = json.data;
        const title = `${form.teamAName} vs ${form.teamBName}`;
        saveHostedMatch(matchId, shareToken, title);
        router.push(`/scoring/${matchId}?token=${shareToken}`);
      } else {
        setError(json.error || 'Failed to create match');
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const battingTeam   = form.tossWonBy === 'teamA'
    ? (form.tossChoice === 'bat' ? form.teamAName || 'Team A' : form.teamBName || 'Team B')
    : (form.tossChoice === 'bat' ? form.teamBName || 'Team B' : form.teamAName || 'Team A');

  return (
    <AppShell>
      <div className="max-w-md mx-auto px-4 py-6">

        {/* Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/25
                          rounded-full px-4 py-2 mb-3">
            <Zap size={14} className="text-brand-400" />
            <span className="text-brand-400 text-sm font-semibold">Quick Match</span>
          </div>
          <h1 className="font-display font-bold text-2xl text-white mb-1">
            Start in 30 seconds
          </h1>
          <p className="text-slate-400 text-sm">
            Players are auto-numbered. You can rename them while scoring.
          </p>
        </div>

        <div className="space-y-4">
          {/* Team names */}
          <div className="card p-4 space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-semibold uppercase tracking-wide">
                Team A Name
              </label>
              <input
                type="text"
                className="input-field text-base"
                placeholder="e.g. Warriors"
                value={form.teamAName}
                onChange={e => update('teamAName', e.target.value)}
                maxLength={30}
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-semibold uppercase tracking-wide">
                Team B Name
              </label>
              <input
                type="text"
                className="input-field text-base"
                placeholder="e.g. Lions"
                value={form.teamBName}
                onChange={e => update('teamBName', e.target.value)}
                maxLength={30}
              />
            </div>
          </div>

          {/* Overs */}
          <div className="card p-4">
            <label className="text-xs text-slate-400 mb-2 block font-semibold uppercase tracking-wide">
              Overs
            </label>
            <div className="flex flex-wrap gap-2">
              {OVER_OPTIONS.map(o => (
                <button
                  key={o}
                  onClick={() => update('totalOvers', o)}
                  className={cn(
                    'px-3 py-2 rounded-xl border text-sm font-display font-bold transition-all',
                    form.totalOvers === o
                      ? 'bg-brand-500 border-brand-500 text-white'
                      : 'border-pitch-border text-slate-400 hover:border-brand-500/50 hover:text-white'
                  )}
                >
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
                  <button
                    key={t}
                    onClick={() => update('tossWonBy', t)}
                    className={cn(
                      'py-2 px-3 rounded-xl border text-sm font-semibold transition-all',
                      form.tossWonBy === t
                        ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                        : 'border-pitch-border text-slate-400 hover:border-brand-500/30'
                    )}
                  >
                    {t === 'teamA'
                      ? (form.teamAName || 'Team A')
                      : (form.teamBName || 'Team B')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1.5">Chose to</p>
              <div className="grid grid-cols-2 gap-2">
                {(['bat', 'bowl'] as const).map(c => (
                  <button
                    key={c}
                    onClick={() => update('tossChoice', c)}
                    className={cn(
                      'py-2 px-3 rounded-xl border text-sm font-semibold capitalize transition-all',
                      form.tossChoice === c
                        ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                        : 'border-pitch-border text-slate-400 hover:border-brand-500/30'
                    )}
                  >
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

          {error && (
            <div className="bg-score-wicket/10 border border-score-wicket/30 rounded-xl px-4 py-3">
              <p className="text-score-wicket text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={submitting || !form.teamAName || !form.teamBName}
            className={cn(
              'btn-primary w-full flex items-center justify-center gap-2 py-4 text-lg',
              (!form.teamAName || !form.teamBName) && 'opacity-40'
            )}
          >
            {submitting
              ? <><Loader2 size={20} className="animate-spin" /> Creating...</>
              : <><Play size={20} /> Start Scoring Now</>
            }
          </button>

          <p className="text-center text-slate-500 text-xs">
            Players will be "Team A 1", "Team A 2" etc.
            You can add real names in full match setup.
          </p>
        </div>

      </div>
    </AppShell>
  );
}
