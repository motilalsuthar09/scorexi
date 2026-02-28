import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://scorexi.com';
  return [
    { url: base,              lastModified: new Date(), changeFrequency: 'daily',  priority: 1.0 },
    { url: `${base}/matches`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}/players`, lastModified: new Date(), changeFrequency: 'daily',  priority: 0.7 },
    { url: `${base}/new-match`,lastModified: new Date(), changeFrequency: 'monthly',priority: 0.8 },
  ];
}
