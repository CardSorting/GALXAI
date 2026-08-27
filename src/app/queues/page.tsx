import type { Metadata } from 'next';
import { QueuesClient } from '@/components/queues/QueuesClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createSoftwareAppSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'Real-Time API & SDK Request Stream — Task Queues',
  description: 'Live programmatic monitor for AI model completions and autonomous agent execution streams with sub-15ms Anycast latency metrics.',
  canonicalPath: '/queues',
  keywords: [
    'AI Task Queue',
    'Model Router Telemetry',
    'Real-time AI API Stream',
    'Agent Workflow Monitor',
    'OpenAI SDK Request Inspector',
  ],
});

export default function QueuesPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createSoftwareAppSchema({
        name: 'GALXAI API & SDK Task Queue Stream',
        description: 'Real-time telemetry and execution monitor for programmatic AI completions.',
        url: '/queues',
        id: 'https://galx.ai/queues#software',
        includeRating: false,
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Developer Hub', url: '/docs' },
        { name: 'Task Queues', url: '/queues' },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <QueuesClient />
    </>
  );
}
