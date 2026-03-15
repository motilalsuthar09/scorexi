// // src/app/layout.tsx
// import type { Metadata, Viewport } from 'next';
// import { Rajdhani, Inter, JetBrains_Mono } from 'next/font/google';
// import './globals.css';
// import PWAInit from '@/components/layout/PWAInit';

// const rajdhani = Rajdhani({
//   subsets: ['latin'],
//   weight: ['400', '500', '600', '700'],
//   variable: '--font-rajdhani',
//   display: 'swap',
// });

// const inter = Inter({
//   subsets: ['latin'],
//   variable: '--font-inter',
//   display: 'swap',
// });

// const jetbrains = JetBrains_Mono({
//   subsets: ['latin'],
//   variable: '--font-jetbrains',
//   display: 'swap',
// });

// export const metadata: Metadata = {
//   metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://scorexi.com'),
//   title: {
//     default: 'ScoreXI — Live Cricket Scoring & Player Stats',
//     template: '%s | ScoreXI',
//   },
//   description:
//     'Free ball-by-ball cricket scoring for gully cricket. Track player stats, create matches, share live scorecards instantly.',
//   keywords: [
//     'cricket scoring app', 'live cricket score', 'gully cricket', 'ball by ball cricket',
//     'cricket scorecard', 'cricket stats tracker', 'local cricket', 'cricket score keeper',
//   ],
//   authors:  [{ name: 'ScoreXI' }],
//   creator:  'ScoreXI',
//   manifest: '/manifest.json',
//   openGraph: {
//     type:        'website',
//     locale:      'en_IN',
//     url:         '/',
//     siteName:    'ScoreXI',
//     title:       'ScoreXI — Live Cricket Scoring & Stats',
//     description: 'Free ball-by-ball cricket scoring. Track stats, share live scorecards.',
//     images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'ScoreXI Cricket Scoring' }],
//   },
//   twitter: {
//     card:        'summary_large_image',
//     title:       'ScoreXI — Live Cricket Scoring',
//     description: 'Free ball-by-ball cricket scoring for gully cricket.',
//     images:      ['/og-image.png'],
//   },
//   robots:  { index: true, follow: true, googleBot: { index: true, follow: true } },
//   icons: {
//     icon:  [{ url: '/favicon.ico' }, { url: '/icons/icon-192.png', sizes: '192x192' }],
//     apple: '/icons/apple-icon.png',
//   },
//   appleWebApp: {
//     capable:    true,
//     statusBarStyle: 'black-translucent',
//     title:      'ScoreXI',
//   },
// };

// export const viewport: Viewport = {
//   themeColor:     '#0a1628',
//   width:          'device-width',
//   initialScale:   1,
//   maximumScale:   1,
// };

// import { AuthProvider } from '@/components/auth/AuthProvider';

// export default function RootLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <html lang="en" className={`${rajdhani.variable} ${inter.variable} ${jetbrains.variable}`}>
//       <body className="bg-pitch-dark text-white font-body antialiased">
//         <AuthProvider>
//           {children}
//         </AuthProvider>
//         <PWAInit />
//       </body>
//     </html>
//   );
// }
// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Rajdhani, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import PWAInit from '@/components/layout/PWAInit';

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
    'Free ball-by-ball cricket scoring for gully cricket. Track player stats, create matches, share live scorecards instantly.',
  keywords: [
    'cricket scoring app', 'live cricket score', 'gully cricket', 'ball by ball cricket',
    'cricket scorecard', 'cricket stats tracker', 'local cricket', 'cricket score keeper',
  ],
  authors:  [{ name: 'ScoreXI' }],
  creator:  'ScoreXI',
  manifest: '/manifest.json',
  openGraph: {
    type:        'website',
    locale:      'en_IN',
    url:         '/',
    siteName:    'ScoreXI',
    title:       'ScoreXI — Live Cricket Scoring & Stats',
    description: 'Free ball-by-ball cricket scoring. Track stats, share live scorecards.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'ScoreXI Cricket Scoring' }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       'ScoreXI — Live Cricket Scoring',
    description: 'Free ball-by-ball cricket scoring for gully cricket.',
    images:      ['/og-image.png'],
  },
  robots:  { index: true, follow: true, googleBot: { index: true, follow: true } },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icons/favicon-16.png', sizes: '16x16',   type: 'image/png' },
      { url: '/icons/favicon-32.png', sizes: '32x32',   type: 'image/png' },
      { url: '/icons/icon-192.png',   sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png',   sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable:    true,
    statusBarStyle: 'black-translucent',
    title:      'ScoreXI',
  },
};

export const viewport: Viewport = {
  themeColor:     '#0a1628',
  width:          'device-width',
  initialScale:   1,
  maximumScale:   1,
};

import { AuthProvider } from '@/components/auth/AuthProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${rajdhani.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body className="bg-pitch-dark text-white font-body antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
        <PWAInit />
      </body>
    </html>
  );
}