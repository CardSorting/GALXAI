import type { Metadata } from 'next';
import { GalxChatInterface } from '@/components/chat/GalxChatInterface';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createSoftwareAppSchema,
  createFAQPageSchema,
} from '@/lib/seo/jsonld';
import { FAQS } from '@/lib/data/faqData';

export const metadata: Metadata = constructMetadata({
  title: 'GALX AI — Frontier AI Chat, Codex Reasoning & Wholesale Gateway',
  description: 'ChatGPT-inspired conversational AI interface powered directly by OpenAI Codex and GPT-5.6 frontier models with sub-millisecond Anycast routing and 75% prompt caching.',
  canonicalPath: '/',
  keywords: [
    'GALX AI',
    'ChatGPT Alternative',
    'OpenAI Codex Chat',
    'GPT-5.6 Sol',
    'GPT-5.6 Terra',
    'Unified AI Chat',
    'AI Model Router',
    'Wholesale AI Tokens',
    'Sub-15ms Anycast',
    'Prompt Caching AI',
  ],
});

export default function HomePage() {
  const homeFaqSnippet = FAQS.slice(0, 4);

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createSoftwareAppSchema({
        name: 'GALX AI Chat Interface',
        description: 'ChatGPT-inspired conversational AI interface powered by OpenAI Codex and GPT-5.6 models.',
        includeRating: true,
      }),
      createFAQPageSchema(homeFaqSnippet),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <GalxChatInterface />
    </>
  );
}
