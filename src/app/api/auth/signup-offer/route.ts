import { getPostgresPool } from '@/lib/db/postgres';
import { readSignupCreditOffer } from '@/lib/supabase/repositories/SignupCreditRepository';
import { createSignupOfferHandler } from '@/lib/billing/signup-offer-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = createSignupOfferHandler(async () => {
  const pool = getPostgresPool();
  if (!pool) throw new Error('Storage unavailable');
  return readSignupCreditOffer(pool);
});
