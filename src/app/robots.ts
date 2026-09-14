import type { MetadataRoute } from 'next';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: ['/', '/images', '/sites', '/developers'], disallow: ['/api/', '/v1/', '/keys', '/docs', '/models', '/playground', '/billing', '/auth/', '/login', '/signup'] }, sitemap: `${SITE_CONFIG.url}/sitemap.xml` };
}
