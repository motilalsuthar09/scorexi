import { Metadata } from 'next';
import AppShell from '@/components/layout/AppShell';
import MatchListClient from '@/components/match/MatchListClient';

export const metadata: Metadata = {
  title: 'Live Cricket Matches — ScoreXI',
  description: 'Browse live and recent cricket matches. Filter by status, search by team name.',
};

export default function MatchesPage() {
  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-white mb-1">
            Matches
          </h1>
          <p className="text-slate-400 text-sm">
            Browse public live and completed matches
          </p>
        </div>
        <MatchListClient showSearch limit={10} />
      </div>
    </AppShell>
  );
}
