'use client';
import { Navigation } from '@/components/dashboard/Navigation';
export default function BillingError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="min-h-screen bg-[#090b10]"><Navigation /><main className="mx-auto max-w-5xl space-y-4 px-4 py-10 sm:px-6 lg:px-8"><h1 className="text-2xl font-semibold">Could not load billing</h1><p className="text-sm text-zinc-400">Please try again to load your account records.</p><button type="button" onClick={reset} className="rounded-md border border-white/15 px-3 py-2 text-sm hover:bg-white/5">Try again</button></main></div>;
}
