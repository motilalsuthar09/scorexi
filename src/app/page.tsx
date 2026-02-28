import { Metadata } from 'next';
import AppShell from '@/components/layout/AppShell';
import MatchListClient from '@/components/match/MatchListClient';
import Link from 'next/link';
import { PlusCircle, Zap, Shield, BarChart3 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'ScoreXI — Free Live Cricket Scoring App',
  description: 'Score ball-by-ball cricket, track player stats, share live scorecards. Perfect for gully cricket. Free forever.',
};

export default function HomePage() {
  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* ── Hero ───────────────────────────────────── */}
        <section className="mb-10 relative overflow-hidden rounded-3xl bg-pitch-card border border-pitch-border p-6 sm:p-10">
          <div className="absolute inset-0 bg-live-pulse pointer-events-none" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/25
                            text-brand-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
              Free Ball-by-Ball Cricket Scoring
            </div>
            <h1 className="font-display font-bold text-3xl sm:text-5xl text-white mb-3 text-balance">
              Every Run. Every Wicket.{' '}
              <span className="text-brand-400">Forever Tracked.</span>
            </h1>
            <p className="text-slate-400 text-base sm:text-lg max-w-xl mb-6">
              Create a match in seconds, score ball by ball, share the live link on WhatsApp.
              Player stats follow them across every team, every match.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/new-match" className="btn-primary flex items-center gap-2">
                <PlusCircle size={18} />
                Start Scoring Now
              </Link>
              <Link href="/matches" className="btn-secondary">
                Browse Live Matches
              </Link>
            </div>
          </div>
        </section>

        {/* ── Features strip ─────────────────────────── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: Zap, title: 'Instant Setup', desc: 'Create match & start scoring in under 60 seconds.' },
            { icon: Shield, title: 'Private by Default', desc: 'Share with a secret link. Public when you choose.' },
            { icon: BarChart3, title: 'Permanent Stats', desc: 'Player stats accumulate across all matches forever.' },
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

        {/* ── Live & recent matches ───────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-xl text-white">
              Live & Recent Matches
            </h2>
            <Link href="/matches" className="text-brand-400 text-sm hover:text-brand-300 transition-colors">
              View all →
            </Link>
          </div>
          <MatchListClient initialStatus="live" limit={6} />
        </section>

      </div>
    </AppShell>
  );
}
