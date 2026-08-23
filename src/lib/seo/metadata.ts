import type { Metadata } from 'next';
import { SITE_CONFIG } from './siteConfig';

export interface MetadataProps {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalPath?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  noIndex?: boolean;
}

/**
 * Constructs a fully normalized Next.js Metadata object adhering to Google/Bing
 * search best practices, OpenGraph, Twitter Cards, and canonical resolution.
 */
export function constructMetadata({
  title,
  description = SITE_CONFIG.description,
  keywords = [],
  canonicalPath = '/',
  ogImage = SITE_CONFIG.ogImage,
  ogType = 'website',
  publishedTime,
  modifiedTime,
  authors,
  noIndex = false,
}: MetadataProps = {}): Metadata {
  const cleanPath = canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`;
  const canonicalUrl = `${SITE_CONFIG.url}${cleanPath === '/' ? '' : cleanPath}`;
  const fullTitle = title ? `${title} | ${SITE_CONFIG.name}` : `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`;
  const mergedKeywords = Array.from(new Set([...keywords, ...SITE_CONFIG.keywords]));

  return {
    title: fullTitle,
    description,
    keywords: mergedKeywords,
    authors: authors ? authors.map(name => ({ name })) : SITE_CONFIG.authors,
    creator: SITE_CONFIG.creator,
    publisher: SITE_CONFIG.publisher,
    metadataBase: new URL(SITE_CONFIG.url),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: fullTitle,
      description,
      url: canonicalUrl,
      siteName: SITE_CONFIG.name,
      locale: 'en_US',
      type: ogType,
      images: [
        {
          url: ogImage.startsWith('http') ? ogImage : `${SITE_CONFIG.url}${ogImage}`,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      site: SITE_CONFIG.twitterHandle,
      creator: SITE_CONFIG.twitterHandle,
      images: [ogImage.startsWith('http') ? ogImage : `${SITE_CONFIG.url}${ogImage}`],
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      nocache: false,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}
