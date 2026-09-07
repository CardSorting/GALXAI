import { Pool } from 'pg';
import { readBilling } from '../src/lib/billing/account';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000, statement_timeout: 10000 });
try {
  const db = await pool.connect();
  try {
    await db.query('BEGIN READ ONLY');
    const result = await readBilling(db, '__billing_schema_check_no_account__', new URLSearchParams());
    await db.query('ROLLBACK');
    if (result.summary.balanceUsd !== 0 || result.transactions.length || result.invoices.length || result.hasCustomer) throw new Error('Unexpected records');
    console.log('Billing storage verified: existing schema, account-scoped queries, empty account returns zero and no records.');
  } finally { db.release(); }
} catch (error) { console.error('Billing storage verification failed:', (error as { code?: string }).code || 'verification failed'); process.exitCode = 1; }
finally { await pool.end(); }
