import { Navigation } from '@/components/dashboard/Navigation';
import { KeysSubNav } from '@/components/dashboard/KeysSubNav';
import { QuickTopUpClient } from '@/components/keys/QuickTopUpClient';
import { constructMetadata } from '@/lib/seo/metadata';
export const metadata = constructMetadata({ title: 'Top up', description: 'Add credit to your API account.', canonicalPath: '/keys/top-up', noIndex: true });
export default function TopUpPage() {
  return <div className="min-h-screen bg-[#090b10] text-zinc-100"><Navigation /><main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
    <KeysSubNav />
    <section className="max-w-xl space-y-6"><header><h1 className="text-3xl font-semibold tracking-tight">Top up</h1><p className="mt-3 text-sm leading-6 text-zinc-400">Add credit, then get back to your API keys.</p></header><QuickTopUpClient /></section>
  </main></div>;
}
