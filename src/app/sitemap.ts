import type { MetadataRoute } from 'next';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';
import { PUBLIC_READING_PATHS } from '@/lib/public-content/routes';
export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', '/images', '/developers', ...PUBLIC_READING_PATHS, '/privacy', '/terms'].map(path => ({ url: `${SITE_CONFIG.url}${path}`, changeFrequency: 'weekly', priority: path === '/' ? 1 : 0.8 }));
}
