import type { NextRequest } from 'next/server';
import { BillingError } from './account';

export function depositAmount(value: unknown) {
  const amount = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(amount) || amount < 1 || amount > 10000 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001) throw new BillingError('Enter an amount from $1 to $10,000, with at most two decimal places.');
  return amount;
}
export function checkPaymentOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (origin && origin !== req.nextUrl.origin) throw new BillingError('Open billing on this site to continue.', 403);
}
export function hostedPaymentUrl(value: unknown, host: 'checkout.stripe.com' | 'billing.stripe.com') {
  if (typeof value !== 'string') throw new BillingError('Payment service did not return a valid link.', 503);
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== host || url.username || url.password) throw new BillingError('Payment service did not return a valid link.', 503);
  return url.href;
}
