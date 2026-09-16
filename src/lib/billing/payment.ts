import type { NextRequest } from 'next/server';
import { BillingError } from './account';
import { BILLING_PATHS } from './navigation';

export function depositAmount(value: unknown) {
  const amount = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(amount) || amount < 1 || amount > 10000 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001) throw new BillingError('Enter an amount from $1 to $10,000, with at most two decimal places.');
  return amount;
}
export function checkPaymentOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (origin && origin !== req.nextUrl.origin) throw new BillingError('Open billing on this site to continue.', 403);
  if (req.headers.get('sec-fetch-site') === 'cross-site') throw new BillingError('Open billing on this site to continue.', 403);
  if (!req.headers.get('content-type')?.startsWith('application/json')) throw new BillingError('Expected a JSON request.', 415);
  if (Number(req.headers.get('content-length') || 0) > 4096) throw new BillingError('Request too large.', 413);
}

export function paymentOrigin(value: string) {
  const url = new URL(value);
  if (url.username || url.password || (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname)))) throw new BillingError('Payments are unavailable. Please try again later.', 503);
  return url.origin;
}
export function hostedPaymentUrl(value: unknown, host: 'checkout.stripe.com' | 'billing.stripe.com') {
  if (typeof value !== 'string') throw new BillingError('Payment service did not return a valid link.', 503);
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== host || url.port || url.username || url.password) throw new BillingError('Payment service did not return a valid link.', 503);
  return url.href;
}

export async function readPaymentBody(req: NextRequest) {
  const reader = req.body?.getReader();
  if (!reader) throw new BillingError('Missing payment request.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > 4096) { await reader.cancel(); throw new BillingError('Request too large.', 413); }
    chunks.push(value);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch { throw new BillingError('Invalid payment request.'); }
}

/** New checkouts use Credits. Existing attempts retain their exact provider input. */
export function checkoutReturnPath(stored?: unknown) {
  if (stored === '/keys/top-up' || stored === '/billing') return stored;
  if (stored == null || stored === BILLING_PATHS.credits) return BILLING_PATHS.credits;
  throw new BillingError('This payment attempt needs review. Contact billing support.', 503);
}
