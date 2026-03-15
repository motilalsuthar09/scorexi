// src/app/match/[id]/page.tsx
import { Metadata } from 'next';
import MatchViewClient from './MatchViewClient';

interface Props {
  params: { id: string };
  searchParams: { token?: string };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  try {
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/match/${params.id}${searchParams.token ? `?token=${searchParams.token}` : ''}`;
    const res  = await fetch(url, { next: { revalidate: 30 } });
    const json = await res.json();
    if (json.success) {
      const m     = json.data.match;
      const title = m.title || `${m.teamA.name} vs ${m.teamB.name}`;
      const ogImg = `${process.env.NEXT_PUBLIC_APP_URL}/api/og/match/${params.id}`;
      return {
        title,
        description: `Live cricket scorecard: ${title} · ${m.totalOvers} overs`,
        openGraph: {
          title: `🏏 ${title} | ScoreXI`,
          description: `Follow the live scorecard on ScoreXI. ${m.totalOvers} overs match.`,
          images: [{ url: ogImg, width: 1200, height: 630, alt: title }],
        },
        twitter: {
          card: 'summary_large_image',
          title: `🏏 ${title} | ScoreXI`,
          images: [ogImg],
        },
      };
    }
  } catch {}
  return { title: 'Match | ScoreXI' };
}

export default function MatchPage({ params, searchParams }: Props) {
  return <MatchViewClient id={params.id} token={searchParams.token ?? ''} />;
}
