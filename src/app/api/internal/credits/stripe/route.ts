// Both registered Stripe endpoints use exactly the same verification and ledger.
export { POST } from '@/app/api/stripe/webhook/route';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
