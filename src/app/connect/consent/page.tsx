import type { Metadata } from 'next';
import { ConnectPanel } from '@/components/connect/ConnectPanel';
export const metadata: Metadata = { title: 'Connect with GALX', description: 'Use your GALX inference access in the tools you choose.', robots: { index: false, follow: false } };
export default async function ConsentPage({ searchParams }: { searchParams: Promise<{ request?: string | string[] }> }) {
  const value = (await searchParams).request;
  return <ConnectPanel requestId={typeof value === 'string' && /^[a-f0-9-]{36}$/i.test(value) ? value : ''} />;
}
