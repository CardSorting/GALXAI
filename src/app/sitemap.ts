import type { MetadataRoute } from 'next';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';
export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', '/images', '/sites', '/developers', '/privacy', '/terms'].map(path => ({ url: `${SITE_CONFIG.url}${path}`, changeFrequency: 'weekly', priority: path === '/' ? 1 : 0.8 }));
}
