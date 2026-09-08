import type { Metadata } from 'next';
import { GalxScenicHero } from '@/components/home/GalxScenicHero';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createSoftwareAppSchema,
  createFAQPageSchema,
} from '@/lib/seo/jsonld';
import { FAQS } from '@/lib/data/faqData';

export const metadata: Metadata = constructMetadata({
  title: 'GALX AI — Get Access to Frontier AI & OpenAI',
  description: 'Chat, code, and create with OpenAI GPT-5.6 reasoning models.',
  canonicalPath: '/',
  keywords: [
    'GALX AI',
    'OpenAI Chat',
    'GPT-5.6 Sol',
    'GPT-5.6 Terra',
    'AI Model Router',
    'AI Coding',
    'ChatGPT Alternative',
  ],
});

export default function HomePage() {
  const homeFaqSnippet = FAQS.slice(0, 4);

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createSoftwareAppSchema({
        name: 'GALX AI Platform',
        description: 'Chat, code, and create with OpenAI GPT-5.6 reasoning models.',
        includeRating: true,
      }),
      createFAQPageSchema(homeFaqSnippet),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <GalxScenicHero />
    </>
  );
}

