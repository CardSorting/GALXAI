import type { Metadata } from 'next';
import { SitesWorkspace } from '@/components/sites/SitesWorkspace';
import { resolveSiteStarter } from '@/lib/sites/starters';
export const metadata: Metadata = { title:'Sites',description:'Create a Site through conversation. Preview your draft, make changes, and manage your Sites in one place.',
  alternates:{canonical:'/sites'},openGraph:{title:'Sites | GALXAI',description:'Your idea, a conversation, a website.'},twitter:{title:'Sites | GALXAI',description:'Create and manage your Sites with GALX.'} };
export default async function SitesPage({ searchParams }: { searchParams: Promise<{ starter?: string | string[]; refine?: string | string[] }> }) {
  const params = await searchParams;
  return <SitesWorkspace initialStarter={resolveSiteStarter(params.starter, params.refine)}/>;
}
