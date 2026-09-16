'use client';
import { BILLING_PATHS } from '@/lib/billing/navigation';
import Link from 'next/link';

export default function BillingError({ reset }: { reset: () => void }) {
  return <section className="space-y-4 py-8"><h2 className="text-xl font-semibold">This billing page couldn’t load</h2><p role="alert" className="text-sm leading-6 text-zinc-400">Try loading it again, or return to your billing overview.</p><div className="flex flex-wrap gap-4"><button type="button" onClick={reset} className="min-h-11 rounded-md border border-white/15 px-4 py-2 text-sm hover:bg-white/5 focus-visible:outline-indigo-300">Try again</button><Link href={BILLING_PATHS.overview} className="inline-flex min-h-11 items-center text-sm text-indigo-300 underline underline-offset-4">Billing overview</Link></div></section>;
}
