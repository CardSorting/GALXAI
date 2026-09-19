import type { MetadataRoute } from 'next';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/about', '/explore', '/images', '/developers', '/pricing', '/pricing/usage', '/faq'],
      disallow: ['/api/', '/v1/', '/keys', '/billing', '/auth/', '/login', '/signup', '/admin', '/postmortems', '/models', '/playground', '/tools', '/sites', '/docs'],
    },
    sitemap: `${SITE_CONFIG.url}/sitemap.xml`,
  };
}
