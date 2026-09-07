import { notFound, permanentRedirect } from 'next/navigation';
import { SDK_LANG_GUIDES } from '@/lib/data/sdksData';
export function generateStaticParams() { return SDK_LANG_GUIDES.map(item => ({ lang: item.slug })); }
export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
 const { lang } = await params;
 if (!SDK_LANG_GUIDES.some(item => item.slug === lang)) notFound();
 permanentRedirect(lang === 'python' ? '/docs/sdks#python' : ['typescript', 'javascript', 'node'].includes(lang) ? '/docs/sdks#typescript' : '/docs/sdks#http');
}
