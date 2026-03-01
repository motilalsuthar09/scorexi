// ============================================================
// ScoreXI — Root Layout
// ============================================================
import type { Metadata, Viewport } from 'next';
import { Rajdhani, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-rajdhani',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://scorexi.com'),
  title: {
    default: 'ScoreXI — Live Cricket Scoring & Player Stats',
    template: '%s | ScoreXI',
  },
  description:
    'Free ball-by-ball cricket scoring for gully cricket. Track player stats, create matches, share live scorecards instantly. No app download needed.',
  keywords: [
    'cricket scoring app', 'live cricket score', 'gully cricket', 'ball by ball cricket',
    'cricket scorecard', 'cricket stats tracker', 'local cricket', 'cricket score keeper',
  ],
  authors: [{ name: 'ScoreXI' }],
  creator: 'ScoreXI',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: '/',
    siteName: 'ScoreXI',
    title: 'ScoreXI — Live Cricket Scoring & Stats',
    description: 'Free ball-by-ball cricket scoring. Track stats, share live scorecards.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'ScoreXI Cricket Scoring' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ScoreXI — Live Cricket Scoring',
    description: 'Free ball-by-ball cricket scoring for gully cricket.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/favicon.ico' }, { url: '/icon-192.png', sizes: '192x192' }],
    apple: '/apple-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a1628',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

import { AuthProvider } from '@/components/auth/AuthProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${rajdhani.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body className="bg-pitch-dark text-white font-body antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
