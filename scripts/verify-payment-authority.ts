import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000, statement_timeout: 10000 });
try {
  const db = await pool.connect();
  try {
    await db.query('BEGIN READ ONLY');
    const functions = await db.query(`SELECT p.proname,has_function_privilege('anon',p.oid,'execute') AS anonymous,
      has_function_privilege('authenticated',p.oid,'execute') AS authenticated FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname IN ('fn_verify_deposit_and_match','fn_record_wallet_refund_or_adjustment','fn_record_stripe_checkout_session','fn_fulfill_stripe_checkout_session','fn_upsert_stripe_customer')`);
    console.log('Financial function browser permissions:', functions.rows);
    const constraints = await db.query(`SELECT conrelid::regclass::text AS table_name,pg_get_constraintdef(oid) AS constraint FROM pg_constraint
      WHERE conrelid IN ('public.galx_wallets'::regclass,'public.galx_wallet_transactions'::regclass) AND contype='c'`);
    console.log('Wallet constraints:', constraints.rows);
    const triggers = await db.query(`SELECT tgrelid::regclass::text AS table_name,tgname FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN
      ('public.galx_wallets'::regclass,'public.galx_wallet_transactions'::regclass,'public.galx_stripe_checkout_sessions'::regclass,'public.galx_stripe_events'::regclass,'public.galx_stripe_invoices'::regclass)`);
    console.log('Financial triggers:', triggers.rows);
    await db.query('ROLLBACK');
    if (functions.rows.some(row => row.anonymous || row.authenticated)) throw new Error('Financial mutations remain executable by browser roles');
  } finally { db.release(); }
} catch (e) { console.error((e as Error).message); process.exitCode = 1; }
finally { await pool.end(); }
