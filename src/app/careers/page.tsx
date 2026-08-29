import React from 'react';
import type { Metadata } from 'next';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { CareersClient } from '@/components/careers/CareersClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createBreadcrumbSchema, createOrganizationSchema } from '@/lib/seo/jsonld';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';

export const metadata: Metadata = constructMetadata({
  title: 'Careers at GALX AI — Join Our Core Distributed Engineering Team',
  description: 'Explore engineering, research, security, and product roles at GALX AI. Help build the universal Anycast routing, caching, and reasoning substrate for autonomous intelligence.',
  canonicalPath: '/careers',
  keywords: [
    'GALX AI Careers',
    'AI Engineering Jobs',
    'Distributed Systems Engineer',
    'LLM Research Jobs',
    'Remote AI Jobs',
    'OpenAI Codex Infrastructure Careers',
    'Zero Data Retention Security Careers',
  ],
});

export default function CareersPage() {
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Careers', href: '/careers' },
  ];

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createOrganizationSchema(),
      createBreadcrumbSchema([
        { name: 'Home', url: SITE_CONFIG.url },
        { name: 'Careers', url: `${SITE_CONFIG.url}/careers` },
      ]),
    ],
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-foreground flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      <JsonLd data={pageSchema} />
      <Navigation />

      <main id="main-content" className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 w-full space-y-12">
        <Breadcrumbs items={breadcrumbs} />
        <CareersClient />
      </main>
    </div>
  );
}
