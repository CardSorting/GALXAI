import Link from 'next/link';
export function BillingSubNav() {
  return <nav aria-label="Billing" className="flex flex-wrap gap-5 border-b border-white/10 py-3 text-sm text-indigo-300">{[['/billing#balance', 'Balance'], ['/billing#history', 'Transactions'], ['/billing#payments', 'Invoices and payments'], ['/teams/seats', 'Team members']].map(([href, label]) => <Link href={href} key={href} className="underline underline-offset-4 hover:text-indigo-200">{label}</Link>)}</nav>;
}
