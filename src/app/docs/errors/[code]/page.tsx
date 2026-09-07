import { notFound, permanentRedirect } from 'next/navigation';
import { ERROR_TROUBLESHOOT_DATA } from '@/lib/data/errorsData';
export function generateStaticParams() { return ERROR_TROUBLESHOOT_DATA.map(item => ({ code: item.code })); }
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
 const { code } = await params;
 if (!ERROR_TROUBLESHOOT_DATA.some(item => item.code === code)) notFound();
 permanentRedirect('/docs/error-handling#errors');
}
