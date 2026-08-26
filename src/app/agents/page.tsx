import type { Metadata } from 'next';
import { AgentDirectivesClient } from '@/components/agents/AgentDirectivesClient';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTechArticleSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'AI Coding Agent Directives & Skills — Zero-Boilerplate Setup for Cursor, Claude Code, Windsurf & Devin',
  description: 'Authoritative implementation directives for AI coding agents. 1-click clipboard prompt, npx skills installer, zero user-facing API key modals, and native React 19 Server Actions.',
  canonicalPath: '/agents',
  keywords: [
    'AI Coding Agent Directives',
    'Cursor Rules GALXAI',
    'Claude Code System Prompt',
    'Windsurf Cascade Rules',
    'Devin AI Integration',
    'Roo Code Directives',
    'Zero Boilerplate AI Integration',
    'npx galxai skills',
    'Anti-MCP Deterministic Directives'
  ],
});

export default function AgentDirectivesPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createTechArticleSchema({
        headline: 'Authoritative Directives & Skills for AI Coding Agents',
        description: 'Complete guide and copyable prompt directives for AI coding assistants to build zero-boilerplate GALXAI integrations.',
        path: '/agents',
        keywords: ['AI Coding Agents', 'Cursor Rules', 'Claude Code', 'Directives', 'Skills'],
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Agent Directives', url: '/agents' },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={pageSchema} />
      <AgentDirectivesClient />
    </>
  );
}
