import { notFound } from 'next/navigation';
import { SitesWorkspace } from '@/components/sites/SitesWorkspace';
import { WorkspacePageGate } from '@/components/auth/WorkspacePageGate';
export const dynamic = 'force-dynamic';
export const metadata = { title:'Your Site',robots:{index:false,follow:false},description:'Review and edit your Site.' };
export default async function SitePage({params}: {params:Promise<{id:string}>}) {
  const {id} = await params;
  return <WorkspacePageGate pathname={`/sites/${encodeURIComponent(id)}`}><SiteDetail id={id} /></WorkspacePageGate>;
}

function SiteDetail({ id }: { id: string }) {
  if (!/^[a-f0-9-]{36}$/.test(id)) notFound();
  return <SitesWorkspace initialId={id} />;
}
