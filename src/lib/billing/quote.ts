import type { PoolClient } from 'pg';
import { BillingError } from './account';
/**
 * There is no usage quote endpoint for Developer access. The access fee is a
 * recurring subscription; usage remains a separate commercial path.
 */
export async function readTopUpQuote(db: Pick<PoolClient,'query'>, userId: string, amount: number): Promise<never> {
  void db;
  void userId;
  void amount;
  throw new BillingError(
    'Self-service developer access is no longer available.',
    410,
  );
}
