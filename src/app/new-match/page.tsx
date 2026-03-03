'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import PlayerSearchInput from '@/components/scoring/PlayerSearchInput';
import {
  ChevronRight, ChevronLeft, Loader2, Globe, Lock,
  Plus, X, Users, Trophy, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { saveHostedMatch } from '@/lib/hostedMatches';

type PlayerEntry = { name: string; existingPlayerId?: string };

interface FormData {
  title: string;
  teamAName: string;
  teamBName: string;
  totalOvers: number;
  visibility: 'public' | 'private';
  tossWonBy: 'teamA' | 'teamB';
  tossChoice: 'bat' | 'bowl';
  teamAPlayers: PlayerEntry[];
  teamBPlayers: PlayerEntry[];
}

const OVER_OPTIONS = [2, 4, 5, 6, 8, 10, 12, 15, 20];

export default function NewMatchPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<FormData>({
    title: '',
    teamAName: '',
    teamBName: '',
    totalOvers: 6,
    visibility: 'private',
    tossWonBy: 'teamA',
    tossChoice: 'bat',
    teamAPlayers: [],
    teamBPlayers: [],
  });

  // ── Helpers ──────────────────────────────────────────────
  const update = (patch: Partial<FormData>) => setForm(f => ({ ...f, ...patch }));

  const addPlayer = (team: 'teamAPlayers' | 'teamBPlayers', entry: PlayerEntry) => {
    update({ [team]: [...form[team], entry] });
  };
  const removePlayer = (team: 'teamAPlayers' | 'teamBPlayers', idx: number) => {
    update({ [team]: form[team].filter((_, i) => i !== idx) });
  };

  // ── Submit ───────────────────────────────────────────────
  const handleSubmit = async () => {
    if (form.teamAPlayers.length === 0 || form.teamBPlayers.length === 0) {
      setError('Add at least 1 player to each team');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:       form.title || undefined,
          teamAName:   form.teamAName,
          teamBName:   form.teamBName,
          totalOvers:  form.totalOvers,
          visibility:  form.visibility,
          tossWonBy:   form.tossWonBy,
          tossChoice:  form.tossChoice,
          teamAPlayers: form.teamAPlayers,
          teamBPlayers: form.teamBPlayers,
        }),
      });
      const json = await res.json();
      if (json.success) {
        const title = form.title || `${form.teamAName} vs ${form.teamBName}`;
        saveHostedMatch(json.data.matchId, json.data.shareToken, title);
        router.push(`/scoring/${json.data.matchId}?token=${json.data.shareToken}`);
      } else {
        setError(json.error || 'Failed to create match');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-white mb-1">
            New Match
          </h1>
          <p className="text-slate-400 text-sm">Set up teams and start scoring in seconds</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {(['Match Setup', 'Players', 'Toss & Go'] as const).map((label, i) => {
            const n = (i + 1) as 1 | 2 | 3;
            const active = step === n;
            const done   = step > n;
            return (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={cn(
                  'flex items-center gap-2',
                  active ? 'text-white' : done ? 'text-brand-400' : 'text-slate-600'
                )}>
                  <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                    active ? 'bg-brand-500 text-white' :
                    done   ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' :
                             'bg-pitch-border text-slate-600'
                  )}>
                    {done ? '✓' : n}
                  </div>
                  <span className="text-xs font-body hidden sm:block">{label}</span>
                </div>
                {i < 2 && <div className={cn('flex-1 h-px', done ? 'bg-brand-500/30' : 'bg-pitch-border')} />}
              </div>
            );
          })}
        </div>

        {/* ── Step 1: Match Setup ─────────────────────── */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Match Title (optional)</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Saturday Gully Cup Final"
                value={form.title}
                onChange={e => update({ title: e.target.value })}
                maxLength={100}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">Team A Name *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Street Lions"
                  value={form.teamAName}
                  onChange={e => update({ teamAName: e.target.value })}
                  maxLength={60}
                  required
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">Team B Name *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Colony Kings"
                  value={form.teamBName}
                  onChange={e => update({ teamBName: e.target.value })}
                  maxLength={60}
                  required
                />
              </div>
            </div>

            {/* Overs */}
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Total Overs *</label>
              <div className="flex flex-wrap gap-2">
                {OVER_OPTIONS.map(o => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => update({ totalOvers: o })}
                    className={cn(
                      'w-12 h-12 rounded-xl font-display font-bold text-sm border-2 transition-all',
                      form.totalOvers === o
                        ? 'bg-brand-500 border-brand-500 text-white'
                        : 'border-pitch-border text-slate-400 hover:border-brand-500/50 hover:text-white'
                    )}
                  >
                    {o}
                  </button>
                ))}
                <input
                  type="number"
                  min={1} max={50}
                  className="input-field w-20"
                  placeholder="Own"
                  onChange={e => { if (e.target.value) update({ totalOvers: parseInt(e.target.value) }); }}
                />
              </div>
            </div>

            {/* Visibility */}
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Visibility</label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { val: 'private', icon: Lock,   label: 'Private',  desc: 'Share with secret link only' },
                  { val: 'public',  icon: Globe,   label: 'Public',   desc: 'Listed on matches page' },
                ] as const).map(v => (
                  <button
                    key={v.val}
                    type="button"
                    onClick={() => update({ visibility: v.val })}
                    className={cn(
                      'p-4 rounded-xl border-2 text-left transition-all',
                      form.visibility === v.val
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-pitch-border hover:border-pitch-muted'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <v.icon size={15} className={form.visibility === v.val ? 'text-brand-400' : 'text-slate-500'} />
                      <span className={cn('font-semibold text-sm font-display',
                        form.visibility === v.val ? 'text-white' : 'text-slate-300'
                      )}>{v.label}</span>
                    </div>
                    <p className="text-xs text-slate-500">{v.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                if (!form.teamAName.trim() || !form.teamBName.trim()) {
                  setError('Both team names are required');
                  return;
                }
                setError('');
                setStep(2);
              }}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              Next: Add Players <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── Step 2: Players ─────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            {(
              [
                { key: 'teamAPlayers', name: form.teamAName, color: 'blue'  as const },
                { key: 'teamBPlayers', name: form.teamBName, color: 'green' as const },
              ] as const
            ).map(({ key, name, color }) => (
              <div key={key} className="card p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Users size={16} className={color === 'blue' ? 'text-score-four' : 'text-brand-400'} />
                  <h3 className="font-display font-semibold text-white">{name}</h3>
                  <span className="ml-auto text-xs text-slate-500 tabular">
                    {form[key].length} player{form[key].length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Player list */}
                {form[key].length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {form[key].map((p, i) => (
                      <div key={i} className="flex items-center gap-2 bg-pitch-dark rounded-lg px-3 py-2">
                        <div className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                          color === 'blue' ? 'bg-score-four/20 text-score-four' : 'bg-brand-500/20 text-brand-400'
                        )}>
                          {i + 1}
                        </div>
                        <span className="flex-1 text-sm text-white">{p.name}</span>
                        {p.existingPlayerId && (
                          <span className="text-[10px] bg-brand-500/10 text-brand-400 px-1.5 py-0.5 rounded">
                            linked
                          </span>
                        )}
                        <button onClick={() => removePlayer(key, i)} className="text-slate-600 hover:text-score-wicket transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add player input */}
                <PlayerSearchInput
                  onAdd={(entry) => addPlayer(key, entry)}
                  placeholder={`Add player to ${name}...`}
                />
              </div>
            ))}

            {error && <p className="text-score-wicket text-sm text-center">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-secondary flex items-center gap-2">
                <ChevronLeft size={16} /> Back
              </button>
              <button
                onClick={() => {
                  if (form.teamAPlayers.length === 0 || form.teamBPlayers.length === 0) {
                    setError('Add at least 1 player per team');
                    return;
                  }
                  setError('');
                  setStep(3);
                }}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                Next: Toss <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Toss ───────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="card p-6">
              <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
                <Trophy size={16} className="text-score-wide" /> Toss Result
              </h3>
              <div>
                <p className="text-sm text-slate-400 mb-2">Who won the toss?</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['teamA', 'teamB'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => update({ tossWonBy: t })}
                      className={cn(
                        'py-3 px-4 rounded-xl border-2 font-display font-semibold text-sm transition-all',
                        form.tossWonBy === t
                          ? 'border-score-wide bg-score-wide/10 text-score-wide'
                          : 'border-pitch-border text-slate-400 hover:border-pitch-muted'
                      )}
                    >
                      {t === 'teamA' ? form.teamAName : form.teamBName}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm text-slate-400 mb-2">Elected to?</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['bat', 'bowl'] as const).map(c => (
                    <button
                      key={c}
                      onClick={() => update({ tossChoice: c })}
                      className={cn(
                        'py-3 px-4 rounded-xl border-2 font-display font-semibold text-sm transition-all capitalize',
                        form.tossChoice === c
                          ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                          : 'border-pitch-border text-slate-400 hover:border-pitch-muted'
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="card p-4 bg-brand-500/5 border-brand-500/20">
              <p className="text-sm text-slate-300">
                <span className="text-brand-400 font-semibold">
                  {form.tossWonBy === 'teamA' ? form.teamAName : form.teamBName}
                </span>{' '}
                won the toss and elected to{' '}
                <span className="text-white font-semibold">{form.tossChoice}</span> first.
              </p>
            </div>

            {error && <p className="text-score-wicket text-sm text-center">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="btn-secondary flex items-center gap-2">
                <ChevronLeft size={16} /> Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <><Loader2 size={16} className="animate-spin" /> Creating...</>
                ) : (
                  <><Zap size={16} /> Start Match!</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
