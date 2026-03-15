import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://scorexi.com';
  return {
    rules: [
      {
        userAgent: '*',
        allow:     '/',
        disallow:  ['/api/', '/scoring/', '/new-match'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
