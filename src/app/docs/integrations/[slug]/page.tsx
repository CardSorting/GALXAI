import { notFound, permanentRedirect } from 'next/navigation';
import { INTEGRATION_GUIDES } from '@/lib/data/integrationsData';
export function generateStaticParams() { return INTEGRATION_GUIDES.map(item => ({ slug: item.slug })); }
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
 const { slug } = await params;
 if (!INTEGRATION_GUIDES.some(item => item.slug === slug)) notFound();
 permanentRedirect('/docs/sdks#ide');
}
