import type { Pool } from 'pg';
import type Stripe from 'stripe';
import { BillingError } from './account';
/**
 * The former endpoint created one-time prepaid Developer/compute checkouts.
 * Developer access now uses the subscription checkout on /api/billing/plan.
 * This guard is deliberately side-effect free. Historical sessions remain
 * fulfillable by the webhook ledger; no new legacy session can be created here.
 */
export async function createAccountCheckout(
  _pool: Pool,
  _stripe: Stripe,
  _input: {
    userId: string;
    email: string;
    amount: number;
    requestId: string;
    surface?: unknown;
    origin: string;
  },
): Promise<never> {
  throw new BillingError(
    'This purchase route is retired. GALX does not offer self-service developer access.',
    410,
  );
}
