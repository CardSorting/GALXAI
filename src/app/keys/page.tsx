import Link from 'next/link';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { Navigation } from '@/components/dashboard/Navigation';
import { constructMetadata } from '@/lib/seo/metadata';

export const metadata = constructMetadata({
  title: 'Credential management',
  description: 'GALX credentials are managed privately for explicitly authorized integrations.',
  canonicalPath: '/keys',
});

export default function KeysPage() {
  return <div className="min-h-screen bg-[#07090e] text-zinc-100">
    <Navigation />
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-20">
      <KeyRound size={30} aria-hidden="true" className="text-indigo-300" />
      <div className="space-y-4">
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">Private integrations</p>
        <h1 className="text-4xl font-semibold tracking-tight">Credential management is administered privately.</h1>
        <p className="max-w-2xl text-lg leading-8 text-zinc-400">This account workspace no longer creates, rotates, or subscribes to general-purpose API access. GALX administrators manage credentials for explicitly authorized cohorts and integrations.</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-zinc-300">
        <div className="flex gap-3"><ShieldCheck size={20} className="mt-1 shrink-0 text-emerald-300" aria-hidden="true" /><p>Private access remains bounded, metered, administered, and revocable. GALX products continue using the underlying infrastructure where appropriate.</p></div>
      </div>
      <Link href="/explore" className="w-fit rounded-lg border border-white/20 px-4 py-3 text-sm font-medium hover:bg-white/[0.06]">Return to Explore</Link>
    </main>
  </div>;
}
