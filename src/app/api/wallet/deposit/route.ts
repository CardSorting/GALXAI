// Deposits begin a hosted payment; only verified payment fulfillment credits the wallet.
export { POST } from '../../stripe/checkout/route';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
