import type { PoolClient } from 'pg';
import type { Database } from '../supabase/types';

type WalletRow = Database['public']['Tables']['galx_wallets']['Row'];

/** Server-only: callers must resolve the account identity before provisioning.
 * Run at READ COMMITTED (or outside a transaction). Separate statements give a
 * concurrent insert a fresh snapshot without rewriting an existing balance.
 */
export async function ensureWallet(db: Pick<PoolClient, 'query'>, userId: string): Promise<WalletRow> {
  if (!userId || userId.trim() !== userId || userId.length > 255) throw new Error('Invalid wallet account');
  const existing = await db.query<WalletRow>('SELECT * FROM public.galx_wallets WHERE user_id = $1', [userId]);
  if (existing.rows[0]) return existing.rows[0];
  await db.query(`INSERT INTO public.galx_wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [userId]);
  const result = await db.query<WalletRow>('SELECT * FROM public.galx_wallets WHERE user_id = $1', [userId]);
  if (!result.rows[0]) throw new Error('Wallet provisioning did not persist');
  return result.rows[0];
}
