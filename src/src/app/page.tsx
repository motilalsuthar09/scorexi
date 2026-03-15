import { Metadata } from 'next';
import AppShell from '@/components/layout/AppShell';
import MatchListClient from '@/components/match/MatchListClient';
import Link from 'next/link';
import {
  PlusCircle, Zap, Shield, BarChart3, Users, Trophy,
  History, ClipboardList, ChevronRight, Play,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'ScoreXI — Free Live Cricket Scoring App',
  description: 'Score ball-by-ball cricket, track player stats, share live scorecards. Perfect for gully cricket.',
};

const navCards = [
  {
    href:  '/new-match',
    icon:  PlusCircle,
    label: 'New Match',
    desc:  'Full setup with players',
    bg:    'bg-brand-500/10 border-brand-500/20',
    color: 'text-brand-400',
  },
  {
    href:  '/new-match/quick',
    icon:  Zap,
    label: 'Quick Match',
    desc:  'Start in 30 seconds',
    bg:    'bg-score-wide/10 border-score-wide/20',
    color: 'text-score-wide',
  },
  {
    href:  '/my-matches',
    icon:  ClipboardList,
    label: 'My Matches',
    desc:  'Resume or review',
    bg:    'bg-score-four/10 border-score-four/20',
    color: 'text-score-four',
  },
  {
    href:  '/matches',
    icon:  History,
    label: 'History',
    desc:  'Live & completed',
    bg:    'bg-pitch-border/30 border-pitch-border',
    color: 'text-slate-300',
  },
  {
    href:  '/players',
    icon:  Users,
    label: 'Players',
    desc:  'Stats & profiles',
    bg:    'bg-score-six/10 border-score-six/20',
    color: 'text-score-six',
  },
  {
    href:  '/leaderboard',
    icon:  Trophy,
    label: 'Leaderboard',
    desc:  'Top performers',
    bg:    'bg-score-wide/10 border-score-wide/20',
    color: 'text-score-wide',
  },
];

export default function HomePage() {
  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-10">

        {/* ── Hero ─────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-3xl bg-pitch-card border border-pitch-border p-6 sm:p-10">
          <div className="absolute inset-0 bg-live-pulse pointer-events-none" />
          <div className="relative max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/25
                            text-brand-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
              Free Ball-by-Ball Cricket Scoring
            </div>
            <h1 className="font-display font-bold text-3xl sm:text-5xl text-white mb-3 text-balance">
              Every Run. Every Wicket.{' '}
              <span className="text-brand-400">Forever Tracked.</span>
            </h1>
            <p className="text-slate-400 text-base sm:text-lg mb-6">
              Create a match in seconds, score ball by ball, share the live link on WhatsApp.
              Player stats follow them across every team, every match.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/new-match" className="btn-primary flex items-center gap-2">
                <PlusCircle size={18} /> Start Full Match
              </Link>
              <Link href="/new-match/quick" className="btn-secondary flex items-center gap-2">
                <Zap size={18} /> Quick Match (30s)
              </Link>
            </div>
          </div>
        </section>

        {/* ── Navigation cards ─────────────────────────── */}
        <section>
          <h2 className="font-display font-bold text-xl text-white mb-4">What would you like to do?</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {navCards.map(c => (
              <Link key={c.href} href={c.href}
                className={`card-hover p-4 flex flex-col gap-2 border ${c.bg} group`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.bg}`}>
                  <c.icon size={18} className={c.color} />
                </div>
                <div>
                  <p className="font-display font-semibold text-white text-sm">{c.label}</p>
                  <p className="text-slate-500 text-xs">{c.desc}</p>
                </div>
                <ChevronRight size={12} className="text-slate-600 group-hover:text-slate-400 transition-colors mt-auto self-end" />
              </Link>
            ))}
          </div>
        </section>

        {/* ── Feature highlights ───────────────────────── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Zap,       title: 'Instant Setup',      desc: 'Create a match and start scoring in under 60 seconds.' },
            { icon: Shield,    title: 'Private by Default', desc: 'Share with a secret link. Public when you choose.' },
            { icon: BarChart3, title: 'Permanent Stats',    desc: 'Player stats accumulate across all matches forever.' },
          ].map(f => (
            <div key={f.title} className="card p-5 flex gap-4 items-start">
              <div className="w-10 h-10 bg-brand-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <f.icon size={20} className="text-brand-400" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-white mb-0.5">{f.title}</h3>
                <p className="text-slate-400 text-sm">{f.desc}</p>
              </div>
            </div>
          ))}
        </section>

        {/* ── How it works ─────────────────────────────── */}
        <section className="card p-6 sm:p-8">
          <h2 className="font-display font-bold text-xl text-white mb-6">How ScoreXI works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Create a match',       desc: 'Add team names, players, overs and toss result.' },
              { step: '2', title: 'Pick opener & bowler', desc: 'Choose striker, non-striker and first bowler.' },
              { step: '3', title: 'Score ball by ball',   desc: 'Tap 0–6, W, Wd, Nb — each tap saves instantly.' },
              { step: '4', title: 'Share the link',       desc: 'Friends watch live on their phone via your share link.' },
            ].map(s => (
              <div key={s.step} className="flex gap-3">
                <div className="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center font-display font-bold text-white text-sm flex-shrink-0">
                  {s.step}
                </div>
                <div>
                  <p className="font-semibold text-white text-sm mb-0.5">{s.title}</p>
                  <p className="text-slate-400 text-xs">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Live matches ─────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-xl text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-score-wicket animate-pulse" />
              Live Matches
            </h2>
            <Link href="/matches" className="text-brand-400 text-sm hover:text-brand-300 transition-colors flex items-center gap-1">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <MatchListClient initialStatus="live" limit={4} showContinueButton />
        </section>

      </div>
    </AppShell>
  );
}