/** Public, same-origin billing destinations. No provider state is trusted here. */
export const BILLING_PATHS = {
  overview: '/billing', plan: '/billing/plan', credits: '/billing/credits',
  transactions: '/billing/transactions', invoices: '/billing/invoices', payments: '/billing/payment-methods',
} as const;
export const BILLING_PAGES = {
  overview: { href: BILLING_PATHS.overview, label: 'Overview', title: 'Billing overview', description: 'Your plan and existing account credit, in one place.' },
  plan: { href: BILLING_PATHS.plan, label: 'Plan', title: 'Your plan', description: 'Review your Pro access, subscription, and renewal details.' },
  credits: { href: BILLING_PATHS.credits, label: 'Account credit', title: 'Account credit', description: 'Review existing account credit and activity.' },
  transactions: { href: BILLING_PATHS.transactions, label: 'Transactions', title: 'Transactions', description: 'Review credit added, usage, and adjustments to your balance.' },
  invoices: { href: BILLING_PATHS.invoices, label: 'Invoices', title: 'Invoices', description: 'View and download invoices for your payments.' },
  payments: { href: BILLING_PATHS.payments, label: 'Payment settings', title: 'Payment settings', description: 'Manage your saved payment methods securely with Stripe.' },
} as const;
export type BillingPage = keyof typeof BILLING_PAGES;

/** Keep issued checkout URLs and saved section links working after the page split. */
export function billingReturnDestination(search: URLSearchParams, hash = ''): string | null {
  const single = (key: string) => search.getAll(key).length === 1 ? search.get(key) : null;
  const plan = single('plan_checkout');
  if (plan === 'returned' || plan === 'canceled') return `/billing/plan?plan_checkout=${plan}`;
  const checkout = single('checkout'), session = single('session_id'), amount = single('amount');
  const query = new URLSearchParams();
  if (checkout === 'returned' || checkout === 'canceled') query.set('checkout', checkout);
  if (session && /^[a-zA-Z0-9_]{1,255}$/.test(session)) query.set('session_id', session);
  if (amount && /^\d{1,5}(?:\.\d{1,2})?$/.test(amount) && Number(amount) >= 1 && Number(amount) <= 10000) query.set('amount', amount);
  if (query.size) return `/billing/credits?${query}`;
  return ({ '#plan': '/billing/plan', '#balance': '/billing/credits', '#history': '/billing/transactions', '#payments': '/billing/payment-methods' } as Record<string, string>)[hash] || null;
}
