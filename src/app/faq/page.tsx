import type { Metadata } from 'next';
import { FaqClient } from '@/components/faq/FaqClient';
import { FAQS } from '@/lib/data/faqData';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createFAQPageSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'Frequently Asked Questions & Developer Knowledge Base',
  description: 'Everything you need to know about GALXAI wholesale pricing, 75% prompt caching, 1-line OpenAI SDK drop-in integration, and enterprise zero data retention.',
  canonicalPath: '/faq',
  keywords: [
    'AI Gateway FAQ',
    'Wholesale AI Tokens FAQ',
    'Prompt Caching Explained',
    'OpenAI Drop-in Compatibility',
    'Zero Data Retention AI',
    'Cursor API Base URL Setup',
  ],
});

export default function FaqPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createFAQPageSchema(FAQS),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'FAQ', url: '/faq' },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <FaqClient />
    </>
  );
}
