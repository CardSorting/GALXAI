'use client';

import Link from 'next/link';

/**
 * Compatibility component for account pages that still import the former
 * prepaid form. Developer Access uses the subscription checkout on /developers;
 * this compatibility component cannot create a payment or infer usage terms.
 */
export function TopUpForm(_props: {
  token?: string;
  available: boolean;
  accountId: string;
  draft?: { amount: string; onChange: (value: string) => void };
}) {
  return (
    <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.02] p-4 text-sm leading-6 text-zinc-400">
      <p>GALX Nova Developer Access is a $50/month API access membership. Usage is billed separately; no usage credits are included.</p>
      <Link href="/developers" className="mt-4 inline-flex min-h-11 items-center text-indigo-300 underline underline-offset-4 hover:text-indigo-200">
        Subscribe to Developer Access
      </Link>
      <Link href="/pricing/usage" className="ml-5 mt-4 inline-flex min-h-11 items-center text-indigo-300 underline underline-offset-4 hover:text-indigo-200">
        View usage pricing and terms
      </Link>
    </div>
  );
}
