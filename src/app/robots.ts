import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://galx.ai';

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
          '/architecture',
          '/how-it-works',
          '/playground',
          '/playground/battle',
          '/pricing',
          '/faq',
          '/docs',
          '/docs/*',
          '/billing',
          '/billing/*',
          '/compliance',
          '/compliance/*',
          '/keys',
          '/keys/*',
          '/status',
          '/telemetry',
          '/auth/connect',
          '/favicon.svg',
          '/favicon.ico',
          '/icon.png',
          '/apple-icon.png',
          '/opengraph-image.png',
          '/twitter-image.png'
        ],
        disallow: ['/api/'],
      },
      {
        userAgent: ['Twitterbot', 'facebookexternalhit', 'LinkedInBot', 'Slackbot', 'Discordbot', 'TelegramBot', 'WhatsApp'],
        allow: ['/', '/*'],
      }
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

