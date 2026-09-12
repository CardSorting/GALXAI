import type { Metadata } from 'next';
import { Navigation } from '@/components/dashboard/Navigation';
import { SitesWorkspace } from '@/components/sites/SitesWorkspace';
export const metadata: Metadata = { title:'Sites',description:'Create a Site through conversation. Preview your draft, make changes, and manage your Sites in one place.',
  alternates:{canonical:'/sites'},openGraph:{title:'Sites | GALXAI',description:'Your idea, a conversation, a website.'},twitter:{title:'Sites | GALXAI',description:'Create and manage your Sites with GALX.'} };
export default function SitesPage() { return <><Navigation/><SitesWorkspace/></>; }
