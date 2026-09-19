import type { PoolClient } from 'pg';
import { BillingError } from './account';
import { USAGE_PRICING } from './usage-pricing';
/**
 * There is no usage quote endpoint for Developer access. The access fee is a
 * recurring subscription; usage remains a separate commercial path.
 */
export async function readTopUpQuote(db: Pick<PoolClient,'query'>, userId: string, amount: number): Promise<never> {
  void db;
  void userId;
  void amount;
  throw new BillingError(
    `GALX Nova Developer Access is $50/month recurring. Usage is billed separately; no usage credits are included. Review ${USAGE_PRICING.path} before starting access.`,
    410,
  );
}
