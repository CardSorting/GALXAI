import type { MetadataRoute } from 'next';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';
import { PUBLIC_READING_PATHS } from '@/lib/public-content/routes';
import { PUBLIC_PROGRAMME_PATHS } from '@/lib/exhibitions/paths';
import { STAR_QUALIFICATION_HANDLES } from '@/lib/stars/star-cohort';
export default function sitemap(): MetadataRoute.Sitemap {
  const profilePaths = STAR_QUALIFICATION_HANDLES.map((handle) => `/profile/${handle}`);
  return ['/', '/about', '/explore', '/stars', ...profilePaths, ...PUBLIC_READING_PATHS, ...PUBLIC_PROGRAMME_PATHS, '/privacy', '/terms'].map(path => ({ url: `${SITE_CONFIG.url}${path}`, changeFrequency: 'weekly', priority: path === '/' ? 1 : 0.8 }));
}
