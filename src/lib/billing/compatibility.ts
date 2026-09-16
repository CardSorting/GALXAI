import { BILLING_PATHS, billingReturnDestination } from './navigation';

/** Bookmarks and already-issued payment returns only. No retired UI is rendered. */
export function billingCompatibilityPath(pathname: string, search: URLSearchParams): string | null {
  if (pathname === BILLING_PATHS.overview) return billingReturnDestination(search);
  if (pathname === '/keys/top-up' || pathname === '/vault/deposit') {
    const target = billingReturnDestination(search);
    return target?.startsWith(BILLING_PATHS.credits + '?') ? target : BILLING_PATHS.credits;
  }
  if (pathname === '/checkout/success') {
    const params = new URLSearchParams(search);
    params.delete('plan_checkout'); params.set('checkout', 'returned');
    return billingReturnDestination(params);
  }
  if (pathname === '/checkout') {
    if (search.getAll('plan').length === 1 && search.get('plan') === 'pro') return BILLING_PATHS.plan;
    if (search.has('plan')) return '/pricing';
    return billingReturnDestination(search) || BILLING_PATHS.credits;
  }
  if (pathname === '/lumi') return '/pricing';
  if (!pathname.startsWith('/billing/')) return null;
  const aliases: Record<string, string> = {
    '/billing/reports': BILLING_PATHS.transactions, '/billing/promo': BILLING_PATHS.transactions,
    '/billing/expenses': BILLING_PATHS.transactions, '/billing/audit-logs': BILLING_PATHS.transactions,
    '/billing/webhooks': BILLING_PATHS.payments, '/billing/auto-reload': BILLING_PATHS.payments,
    '/billing/tax': BILLING_PATHS.payments, '/billing/budget-alerts': BILLING_PATHS.payments,
    '/billing/teams': '/teams/seats', '/billing/seats': '/teams/seats', '/billing/enterprise': '/pricing',
  };
  if (/^\/billing\/invoices\/[^/]+$/.test(pathname)) return BILLING_PATHS.invoices;
  if (/^\/billing\/teams\/[^/]+$/.test(pathname)) return '/teams/seats';
  return aliases[pathname] || null;
}
