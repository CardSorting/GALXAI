'use client';


/**
 * Compatibility component for account pages that still import the former
 * prepaid form. Private integration allocations are administered separately;
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
      <p>Self-service developer access is not available. GALX manages private integration allocations directly when it authorizes them.</p>
    </div>
  );
}
