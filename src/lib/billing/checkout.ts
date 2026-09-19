import type { Pool } from 'pg';
import type Stripe from 'stripe';
import { BillingError } from './account';
import { USAGE_PRICING } from './usage-pricing';
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
    `This purchase route is retired. Start GALX Nova Developer Access at /developers: $50/month recurring, with usage billed separately and no usage credits included. Review ${USAGE_PRICING.path} for usage status.`,
    410,
  );
}
