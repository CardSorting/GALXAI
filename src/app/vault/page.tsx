import type { Metadata } from 'next';
import { VaultClient } from '@/components/vault/VaultClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createSoftwareAppSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'Cryptographic Account Vault & Shard Manager — AES-256-GCM',
  description: 'Manage connected upstream provider accounts, cooperative pooling shards, 1-click credential retraction, and real-time token lease metrics.',
  canonicalPath: '/vault',
  keywords: [
    'AI Shard Manager',
    'Cooperative AI Pooling',
    'Encrypted Account Vault',
    'OpenAI Account Pooling',
    '1-Click Credential Retraction',
  ],
});

export default function VaultPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createSoftwareAppSchema({
        name: 'GALXAI Shard Vault Manager',
        description: 'Cryptographic account vault and cooperative upstream provider pooling substrate.',
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Vault', url: '/vault' },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <VaultClient />
    </>
  );
}
