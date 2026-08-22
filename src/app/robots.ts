import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/models',
          '/models/*',
          '/models/compare',
          '/models/resolver',
          '/vault',
          '/vault/*',
          '/vault/simulator',
          '/architecture',
          '/how-it-works',
          '/playground',
          '/playground/battle',
          '/pricing',
          '/faq',
          '/docs',
          '/docs/*',
          '/keys',
          '/keys/*',
          '/status',
          '/telemetry',
          '/auth/connect'
        ],
        disallow: ['/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
