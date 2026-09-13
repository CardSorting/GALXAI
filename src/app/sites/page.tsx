import type { Metadata } from 'next';
import { SitesWorkspace } from '@/components/sites/SitesWorkspace';
import { resolveSiteStarter } from '@/lib/sites/starters';
import { requireWorkspaceSession } from '@/lib/auth/require-workspace-session';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title:'Sites',description:'Create a Site through conversation. Preview your draft, make changes, and manage your Sites in one place.',
  robots:{index:false,follow:false},alternates:{canonical:'/sites'},openGraph:{title:'Sites | GALXAI',description:'Your idea, a conversation, a website.'},twitter:{title:'Sites | GALXAI',description:'Create and manage your Sites with GALX.'} };
export default async function SitesPage({ searchParams }: { searchParams: Promise<{ starter?: string | string[]; refine?: string | string[] }> }) {
  const params = await searchParams;
  const search = new URLSearchParams();
  for (const key of ['starter', 'refine'] as const) {
    const value = params[key];
    if (typeof value === 'string') search.set(key, value);
  }
  await requireWorkspaceSession('/sites', search);
  return <SitesWorkspace initialStarter={resolveSiteStarter(params.starter, params.refine)}/>;
}
