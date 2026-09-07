import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { readBilling, readBillingTransactions, stripeInvoiceUrl } from '../src/lib/billing/account';
import { billingCsv } from '../src/lib/billing/csv';
import { depositAmount, hostedPaymentUrl } from '../src/lib/billing/payment';
const pool = new Pool({ host: '127.0.0.1', port: 55439, user: 'seats_test', database: 'postgres' });
const db = await pool.connect();
const schema = `billing_test_${Date.now()}`;
try {
  await db.query(`CREATE SCHEMA ${schema}`);
  await db.query(`SET search_path TO ${schema}`);
  await db.query(`CREATE TABLE galx_workspaces (id uuid PRIMARY KEY); CREATE TYPE galx_wallet_transaction_type AS ENUM ('deposit','auto_reload','usage_draw','match_grant','refund','adjustment');`);
  for (const [file, tables] of [['20260822000001_galxai_schema_core.sql', ['galx_wallets','galx_wallet_transactions']], ['20260822000013_galxai_stripe_billing_mesh.sql', ['galx_stripe_customers','galx_stripe_invoices']]] as const) {
    const sql = readFileSync(`supabase/migrations/${file}`, 'utf8');
    for (const table of tables) { const start = sql.indexOf(`CREATE TABLE IF NOT EXISTS ${table} (`); await db.query(sql.slice(start, sql.indexOf('\n);', start) + 3)); }
  }
  const ownerWallet = '00000000-0000-0000-0000-000000000001';
  await db.query('ALTER TABLE galx_wallets ADD COLUMN payment_debt_usd numeric(14,6) NOT NULL DEFAULT 0');
  const otherWallet = '00000000-0000-0000-0000-000000000002';
  await db.query('INSERT INTO galx_wallets (id,user_id,balance_usd,deposited_total_usd,lifetime_spent_usd) VALUES ($1,$2,0,25,25),($3,$4,999,999,0)', [ownerWallet,'owner',otherWallet,'other']);
  await db.query(`INSERT INTO galx_wallet_transactions (wallet_id,user_id,transaction_type,amount_usd,balance_after_usd,description,created_at) VALUES
    ($1,'owner','deposit',25,25,'Top-up',NOW()), ($1,'owner','usage_draw',-2,23,'Usage',NOW()),
    ($1,'owner','usage_draw',-23,0,'Older usage',NOW()-INTERVAL '2 months'),
    ($2,'other','deposit',999,999,'PRIVATE OTHER',NOW()), ($2,'owner','usage_draw',-100,899,'BAD ATTRIBUTION',NOW())`,[ownerWallet,otherWallet]);
  await db.query(`INSERT INTO galx_stripe_customers (id,user_id,stripe_customer_id) VALUES ('owner','owner','cus_owner'),('other','other','cus_other');
    INSERT INTO galx_stripe_invoices (id,user_id,stripe_invoice_id,amount_paid_usd,hosted_invoice_url) VALUES
    ('one','owner','in_owner',25,'https://invoice.stripe.com/i/test'),('two','other','in_other',999,'https://invoice.stripe.com/i/private');`);
  let result = await readBilling(db,'owner',new URLSearchParams({userId:'other'}));
  assert.equal(result.summary.balanceUsd,0); assert.equal(result.summary.currentMonthSpendUsd,2); assert.equal(result.summary.depositedTotalUsd,25);
  assert.equal(result.transactions.length,3); assert.equal(result.invoices.length,1); assert.equal(result.invoices[0].id,'in_owner'); assert(result.hasCustomer);
  assert(!JSON.stringify(result).includes('PRIVATE OTHER')); assert(!JSON.stringify(result).includes('BAD ATTRIBUTION'));
  result = await readBilling(db,'nobody',new URLSearchParams());
  assert.equal(result.summary.balanceUsd,0); assert.equal(result.transactions.length,0); assert.equal(result.invoices.length,0); assert.equal(result.hasCustomer,false);
  assert.equal((await readBillingTransactions(db,'owner',new URLSearchParams({type:'deposit'}))).transactions.length,1);
  await assert.rejects(readBillingTransactions(db,'owner',new URLSearchParams({cursor:'invalid'})),/cursor/);
  await assert.rejects(readBillingTransactions(db,'owner',new URLSearchParams({type:"' OR 1=1"})),/type/);
  await db.query(`INSERT INTO galx_wallet_transactions(wallet_id,user_id,transaction_type,amount_usd,balance_after_usd,description,created_at)
    SELECT $1,'pages','usage_draw',-0.000001,0,'micro',date_trunc('second',NOW())+(n%2)*INTERVAL '1 microsecond' FROM generate_series(1,102) n`,[ownerWallet]);
  // Correct the fixture wallet owner to exercise pagination's joint ownership predicate.
  await db.query("UPDATE galx_wallets SET user_id='pages' WHERE id=$1",[ownerWallet]);
  const seen = new Set<string>(); let cursor: string | null = null;
  do { const page = await readBillingTransactions(db,'pages',new URLSearchParams(cursor ? {cursor} : {})); for(const row of page.transactions){assert(!seen.has(row.id));seen.add(row.id);assert.equal(row.amountUsd,-0.000001);} cursor=page.nextCursor; } while(cursor);
  assert.equal(seen.size,102);
  assert.equal(stripeInvoiceUrl('javascript:alert(1)'),null); assert.equal(stripeInvoiceUrl('https://evil.test/'),null);
  assert.throws(()=>hostedPaymentUrl('https://checkout.stripe.com.evil.test','checkout.stripe.com'));
  for(const invalid of [NaN,Infinity,0,-5,10001,1.001,'',null,{}]) assert.throws(()=>depositAmount(invalid));
  assert.equal(depositAmount('25.50'),25.5);
  const csv=billingCsv([{id:'id',type:'usage_draw',description:'=HYPERLINK("bad")',amountUsd:-0.000001,balanceAfterUsd:0,createdAt:'2026-09-01T00:00:00Z'}]);
  assert(csv.includes("'=HYPERLINK"));assert(csv.includes('-0.000001'));
  console.log('Billing tests passed: zero balances, tenant isolation, month totals, filters, microsecond pagination, invoices, CSV safety, and payment validation.');
} finally { await db.query(`DROP SCHEMA ${schema} CASCADE`); db.release(); await pool.end(); }
