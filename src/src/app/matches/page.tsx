import { Metadata } from 'next';
import AppShell from '@/components/layout/AppShell';
import MatchListClient from '@/components/match/MatchListClient';

export const metadata: Metadata = {
  title: 'Match History — ScoreXI',
  description: 'Browse live and completed cricket matches.',
};

export default function MatchesPage() {
  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-white mb-1">
            Match History
          </h1>
          <p className="text-slate-400 text-sm">Browse public live and completed matches</p>
        </div>

        {/* Live section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-score-wicket animate-pulse" />
            <h2 className="font-display font-bold text-lg text-white">Live Matches</h2>
          </div>
          <MatchListClient initialStatus="live" limit={5} showContinueButton />
        </section>

        {/* Completed section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <h2 className="font-display font-bold text-lg text-white">Completed Matches</h2>
          </div>
          <MatchListClient showSearch initialStatus="completed" limit={10} />
        </section>
      </div>
    </AppShell>
  );
}