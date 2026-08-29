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
  title: 'GALX AI Chat — Frontier AI Chat, Anime Personas & Codex Reasoning',
  description: 'Conversational AI interface powered directly by OpenAI Codex and GPT-5.6 frontier models with sub-millisecond Anycast routing, custom anime personas, and 75% prompt caching.',
  canonicalPath: '/chat',
  keywords: [
    'GALX AI Chat',
    'ChatGPT Alternative',
    'Character AI Alternative',
    'OpenAI Codex Chat',
    'GPT-5.6 Sol',
    'GPT-5.6 Terra',
    'Anime AI Companions',
    'Unified AI Chat',
    'AI Model Router',
    'Prompt Caching AI',
  ],
});

export default function ChatPage() {
  const homeFaqSnippet = FAQS.slice(0, 4);

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createSoftwareAppSchema({
        name: 'GALX AI Chat Interface',
        description: 'Conversational AI interface powered by OpenAI Codex and GPT-5.6 models with custom anime personas.',
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
