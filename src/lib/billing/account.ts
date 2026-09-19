import type { PoolClient } from 'pg';

type Db = Pick<PoolClient, 'query'>;
export class BillingError extends Error { constructor(message: string, public status = 400) { super(message); } }
export interface BillingTransaction { id: string; type: string; description: string; amountUsd: number; balanceAfterUsd: number; createdAt: string }
export interface BillingInvoice { id: string; amountDueUsd: number; amountPaidUsd: number; status: string; url: string | null; createdAt: string }
export interface BillingSummary {
  balanceUsd: number;
  paymentDebtUsd: number;
  depositedTotalUsd: number;
  lifetimeSpentUsd: number;
  currentMonthSpendUsd: number;
  proofOfDepositVerified: boolean;
  autoReloadEnabled: boolean;
}
export interface BillingData { summary: BillingSummary; transactions: BillingTransaction[]; nextCursor: string | null; invoices: BillingInvoice[]; hasCustomer: boolean; paymentsAvailable: boolean }

const publicTransactionDescriptions: Record<string, string> = {
  deposit: 'Account credit added.', auto_reload: 'Historical account reload.',
  usage_draw: 'Compute usage.', match_grant: 'Historical credit adjustment.',
  refund: 'Payment refund.', adjustment: 'Account balance adjustment.',
};

export async function readBillingSummary(db: Db, userId: string): Promise<BillingSummary> {
  const { rows } = await db.query(`SELECT w.balance_usd, w.payment_debt_usd, w.deposited_total_usd, w.lifetime_spent_usd, w.proof_of_deposit_verified, w.auto_reload_enabled,
    (SELECT coalesce(-sum(t.amount_usd), 0) FROM galx_wallet_transactions t
      WHERE t.user_id = $1 AND t.wallet_id = w.id AND t.transaction_type = 'usage_draw'
      AND t.created_at >= date_trunc('month', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') AS month_spend
    FROM galx_wallets w WHERE w.user_id = $1`, [userId]);
  const row = rows[0];
  return { balanceUsd: Number(row?.balance_usd ?? 0), paymentDebtUsd: Number(row?.payment_debt_usd ?? 0), depositedTotalUsd: Number(row?.deposited_total_usd ?? 0),
    lifetimeSpentUsd: Number(row?.lifetime_spent_usd ?? 0), currentMonthSpendUsd: Number(row?.month_spend ?? 0),
    proofOfDepositVerified: row?.proof_of_deposit_verified === true, autoReloadEnabled: row?.auto_reload_enabled === true };
}

export async function readBillingTransactions(db: Db, userId: string, params: URLSearchParams) {
  const filter = params.get('type') || 'all';
  if (!['all', 'deposit', 'usage', 'grant', 'refund'].includes(filter)) throw new BillingError('Choose a valid transaction type.');
  let cursor: { time: string; id: string } | null = null;
  const raw = params.get('cursor');
  if (raw) {
    try {
      if (raw.length > 512) throw new Error();
      cursor = JSON.parse(Buffer.from(raw, 'base64url').toString());
      if (!cursor || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(cursor.time) || !Number.isFinite(Date.parse(cursor.time)) ||
        !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(cursor.id)) throw new Error();
    } catch { throw new BillingError('Invalid page cursor. Refresh the history.'); }
  }
  const { rows } = await db.query(`SELECT t.id, t.transaction_type AS type, t.description, t.amount_usd AS "amountUsd", t.balance_after_usd AS "balanceAfterUsd",
    to_char(t.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "createdAt"
    FROM galx_wallet_transactions t JOIN galx_wallets w ON w.id = t.wallet_id AND w.user_id = $1
    WHERE t.user_id = $1 AND ($2 = 'all' OR ($2 = 'deposit' AND t.transaction_type IN ('deposit', 'auto_reload'))
      OR ($2 = 'usage' AND t.transaction_type = 'usage_draw') OR ($2 = 'grant' AND t.transaction_type = 'match_grant')
      OR ($2 = 'refund' AND t.transaction_type = 'refund'))
    AND ($3::timestamptz IS NULL OR (t.created_at, t.id) < ($3::timestamptz, $4::uuid))
    ORDER BY t.created_at DESC, t.id DESC LIMIT 51`, [userId, filter, cursor?.time || null, cursor?.id || null]);
  // Ledger notes remain private operational records, including for the account owner.
  const transactions: BillingTransaction[] = rows.slice(0, 50).map(row => {
    const known = Object.hasOwn(publicTransactionDescriptions, row.type);
    return { id: row.id, type: known ? row.type : 'adjustment',
      description: known ? publicTransactionDescriptions[row.type] : 'Account activity.',
      amountUsd: Number(row.amountUsd), balanceAfterUsd: Number(row.balanceAfterUsd), createdAt: row.createdAt };
  });
  const last = transactions.at(-1);
  return { transactions, nextCursor: rows.length > 50 && last ? Buffer.from(JSON.stringify({ time: last.createdAt, id: last.id })).toString('base64url') : null };
}

export function stripeInvoiceUrl(value: unknown) {
  if (typeof value !== 'string') return null;
  try { const url = new URL(value); return url.protocol === 'https:' && ['invoice.stripe.com', 'pay.stripe.com'].includes(url.hostname) && !url.port && !url.username && !url.password ? url.href : null; } catch { return null; }
}

export async function readBilling(db: Db, userId: string, params: URLSearchParams) {
  const summary = await readBillingSummary(db, userId);
  const history = await readBillingTransactions(db, userId, params);
  const { rows } = await db.query(`SELECT stripe_invoice_id AS id, amount_due_usd AS "amountDueUsd", amount_paid_usd AS "amountPaidUsd", status, hosted_invoice_url AS url, created_at AS "createdAt"
    FROM galx_stripe_invoices WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT 20`, [userId]);
  const invoices: BillingInvoice[] = rows.map(row => ({ id: row.id,
    amountDueUsd: Number(row.amountDueUsd), amountPaidUsd: Number(row.amountPaidUsd),
    status: ['draft','open','paid','uncollectible','void'].includes(row.status) ? row.status : 'unknown',
    url: stripeInvoiceUrl(row.url), createdAt: new Date(row.createdAt).toISOString() }));
  const { rows: customers } = await db.query('SELECT stripe_customer_id FROM galx_stripe_customers WHERE user_id = $1', [userId]);
  return { summary, ...history, invoices, hasCustomer: Boolean(customers[0]?.stripe_customer_id?.startsWith('cus_') && !customers[0].stripe_customer_id.startsWith('cus_mock_')) };
}
