import { notFound } from 'next/navigation';
import { SitesWorkspace } from '@/components/sites/SitesWorkspace';
export const metadata = { title:'Your Site',robots:{index:false,follow:false},description:'Review and edit your Site.' };
export default async function SitePage({params}: {params:Promise<{id:string}>}) {
  const {id} = await params; if (!/^[a-f0-9-]{36}$/.test(id)) notFound();
  return <SitesWorkspace initialId={id}/>;
}
