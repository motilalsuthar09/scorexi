import { Metadata } from 'next';
import PlayerProfileClient from './PlayerProfileClient';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const res  = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/player/${params.id}`,
      { next: { revalidate: 60 } }
    );
    const json = await res.json();
    if (json.success) {
      const p = json.data.player;
      return {
        title: `${p.name} — Cricket Stats`,
        description: `${p.name}'s cricket career stats: ${p.stats.totalRuns} runs, ${p.stats.totalWickets} wickets in ${p.stats.matchesPlayed} matches.`,
        openGraph: {
          title: `${p.name} | ScoreXI`,
          description: `${p.stats.matchesPlayed} matches · ${p.stats.totalRuns} runs · ${p.stats.totalWickets} wickets`,
        },
      };
    }
  } catch {}
  return { title: 'Player Profile | ScoreXI' };
}

export default function PlayerPage({ params }: Props) {
  return <PlayerProfileClient id={params.id} />;
}
