/** Isolated PostgreSQL + simulated provider tests. Never contacts Stripe or charges money. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import Stripe from 'stripe';
import { createAccountCheckout } from '../src/lib/billing/checkout';
import { fulfillStripeEvent } from '../src/lib/billing/fulfillment';
import { isolatedIntegrationEnvironment } from './lib/integration-test-environment';
const schema = `payment_test_${Date.now()}`;
const config = process.env.GALX_INTEGRATION_DATABASE_URL
  ? { connectionString: isolatedIntegrationEnvironment(process.env).DATABASE_URL }
  : { host: '127.0.0.1', port: 55439, user: 'seats_test', database: 'postgres' };
const admin = new Pool(config);
const pool = new Pool({ ...config, options: `-c search_path=${schema}` });
let checks = 0;
const sessions = new Map<string, any>();
let creates = 0;
const stripe = {
  customers: { create: async (params: any) => ({ id: `cus_${params.metadata.userId}` }) },
  checkout: { sessions: { create: async (params: any, options: any) => {
    let entry = sessions.get(options.idempotencyKey);
    if (entry) assert.deepEqual(params, entry.params, 'Retry must use exactly the same Stripe parameters');
    else { entry = { params, session: { id: `cs_test_${++creates}`, url: 'https://checkout.stripe.com/c/pay/test' } }; sessions.set(options.idempotencyKey, entry); }
    return entry.session;
  } } },
} as unknown as Stripe;
const event = (type: string, object: any, eventId = `evt_${randomUUID()}`, created = 100) => ({ id: eventId, type, data: { object }, created, livemode: false }) as Stripe.Event;
const deliver = (value: Stripe.Event) => fulfillStripeEvent(pool, value, JSON.stringify(value));
const balance = async () => (await pool.query("SELECT balance_usd,payment_debt_usd FROM galx_wallets WHERE user_id='owner'")).rows[0];
const input = { userId: 'owner', email: 'owner@example.test', amount: 25, requestId: randomUUID(), surface: 'keys', origin: 'https://galx.ai' };
try {
  await admin.query(`CREATE SCHEMA ${schema}`);
  await pool.query(`CREATE TABLE galx_workspaces(id uuid PRIMARY KEY); CREATE TYPE galx_wallet_transaction_type AS ENUM ('deposit','auto_reload','usage_draw','match_grant','refund','adjustment')`);
  for (const [file,tables] of [['20260822000001_galxai_schema_core.sql',['galx_wallets','galx_wallet_transactions']],['20260822000013_galxai_stripe_billing_mesh.sql',['galx_stripe_customers','galx_stripe_checkout_sessions','galx_stripe_events','galx_stripe_invoices']]] as const) {
    const sql = readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url),'utf8');
    for (const table of tables) { const start = sql.indexOf(`CREATE TABLE IF NOT EXISTS ${table} (`); await pool.query(sql.slice(start,sql.indexOf('\n);',start)+3)); }
  }
  await pool.query('ALTER TABLE galx_wallets ADD CONSTRAINT balance_nonnegative CHECK (balance_usd >= 0)');
  const up = readFileSync(new URL('../supabase/migrations/20260906000001_billing_payment_recovery.sql', import.meta.url),'utf8').replaceAll('public.',`${schema}.`);
  const down = readFileSync(new URL('../supabase/rollbacks/20260906000001_billing_payment_recovery.down.sql', import.meta.url),'utf8').replaceAll('public.',`${schema}.`);
  const migrationDb = await pool.connect();
  try { await migrationDb.query('BEGIN'); await migrationDb.query(up); await migrationDb.query(down); await migrationDb.query(up); await migrationDb.query('COMMIT'); } finally { migrationDb.release(); }
  checks++;
  const [a,b] = await Promise.all([createAccountCheckout(pool,stripe,input),createAccountCheckout(pool,stripe,input)]);
  assert.equal(a.sessionId,b.sessionId); assert.equal(creates,1); checks++;
  assert.equal([...sessions.values()][0].params.success_url,'https://galx.ai/billing/credits?checkout=returned&session_id={CHECKOUT_SESSION_ID}');
  assert.equal([...sessions.values()][0].params.cancel_url,'https://galx.ai/billing/credits?checkout=canceled');checks++;
  await assert.rejects(createAccountCheckout(pool,stripe,{ ...input, amount: 50 }),/different amount/); checks++;
  await assert.rejects(createAccountCheckout(pool,stripe,{ ...input, requestId: 'invalid' }),/Refresh/); checks++;
  const paid = { id: a.sessionId, mode: 'payment', client_reference_id: 'owner', customer: 'cus_owner', currency: 'usd', amount_total: 2500, payment_status: 'paid', payment_intent: 'pi_owner' };
  await assert.rejects(deliver(event('checkout.session.completed',{ ...paid, client_reference_id: 'other' })),/stored payment terms/);
  await assert.rejects(deliver(event('checkout.session.completed',{ ...paid, amount_total: 1 })),/stored payment terms/); checks += 2;
  await deliver(event('checkout.session.completed',{ ...paid, payment_status: 'unpaid' }));
  assert.equal((await pool.query('SELECT count(*) FROM galx_wallet_transactions')).rows[0].count,'0'); checks++;
  // A ledger failure must roll back wallet, session and event together.
  await pool.query(`CREATE FUNCTION reject_test_ledger() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced ledger failure'; END $$;
    CREATE TRIGGER reject_test_ledger BEFORE INSERT ON galx_wallet_transactions FOR EACH ROW EXECUTE FUNCTION reject_test_ledger()`);
  const completed = event('checkout.session.completed',paid);
  await assert.rejects(deliver(completed),/forced ledger failure/);
  assert.equal((await pool.query('SELECT count(*) FROM galx_wallets')).rows[0].count,'0');
  assert.equal((await pool.query('SELECT count(*) FROM galx_stripe_events WHERE event_id=$1',[completed.id])).rows[0].count,'0');
  await pool.query('DROP TRIGGER reject_test_ledger ON galx_wallet_transactions'); checks++;
  await Promise.all([deliver(completed),deliver(completed),deliver(event('checkout.session.async_payment_succeeded',paid))]);
  assert.equal(Number((await balance()).balance_usd),a.creditUsd);
  assert.equal((await pool.query("SELECT count(*) FROM galx_wallet_transactions WHERE transaction_type='deposit'")).rows[0].count,'1'); checks++;
  await deliver(event('payment_intent.succeeded',{ id:'pi_owner',metadata:{ userId:'owner',depositAmount:'25' } }));
  assert.equal(Number((await balance()).balance_usd),a.creditUsd); checks++;
  await deliver(event('checkout.session.expired',paid));
  assert.equal((await pool.query('SELECT payment_status FROM galx_stripe_checkout_sessions WHERE session_id=$1',[a.sessionId])).rows[0].payment_status,'paid'); checks++;
  const invoice = { id:'in_owner',customer:'cus_owner',currency:'usd',metadata:{userId:'other'},amount_due:2500,amount_paid:2500,status:'paid',hosted_invoice_url:'https://invoice.stripe.com/i/test' };
  await deliver(event('invoice.paid',invoice,undefined,200));
  await deliver(event('invoice.payment_failed',{ ...invoice,status:'open',amount_paid:0 },undefined,100));
  assert.deepEqual((await pool.query('SELECT user_id,status FROM galx_stripe_invoices')).rows,[{ user_id:'owner',status:'paid' }]); checks++;
  // Partial cumulative refunds, duplicate ids, different ids, and out-of-order amounts.
  const refund = (amount: number) => event('charge.refunded',{ id:'ch_owner',payment_intent:'pi_owner',currency:'usd',amount_refunded:amount });
  const firstRefund = refund(500);
  await Promise.all([deliver(firstRefund),deliver(firstRefund),deliver(refund(1000))]);
  await deliver(refund(500));
  assert.equal(Number((await balance()).balance_usd),a.creditUsd * .6); checks++;
  // Spend the remainder, then refund fully: retain debt instead of losing it.
  await pool.query("UPDATE galx_wallets SET balance_usd=0 WHERE user_id='owner'");
  await deliver(refund(2500));
  assert.equal(Number((await balance()).balance_usd),0);
  assert.equal(Number((await balance()).payment_debt_usd),a.creditUsd * .6); checks++;
  const rollbackDb = await pool.connect();
  try { await rollbackDb.query('BEGIN'); await assert.rejects(rollbackDb.query(down),/Settle outstanding/); await rollbackDb.query('ROLLBACK'); } finally { rollbackDb.release(); } checks++;
  const c = await createAccountCheckout(pool,stripe,{ ...input,requestId:randomUUID(),amount:50 });
  const paidAgain = { ...paid,id:c.sessionId,amount_total:5000,payment_intent:'pi_second' };
  await deliver(event('checkout.session.completed',paidAgain));
  assert.equal(Number((await balance()).payment_debt_usd),0);
  assert.equal(Number((await balance()).balance_usd),c.creditUsd-a.creditUsd*.6); checks++;
  const beforeDispute = Number((await balance()).balance_usd);
  const dispute = { id:'dp_second',payment_intent:'pi_second',currency:'usd',amount:5000 };
  await deliver(event('charge.dispute.funds_withdrawn',dispute));
  await deliver(event('charge.dispute.funds_reinstated',dispute));
  await deliver(event('charge.dispute.funds_withdrawn',dispute));
  assert.equal(Number((await balance()).balance_usd),beforeDispute); checks++;
  await deliver(event('charge.refunded',{ payment_intent:'pi_second',currency:'usd',amount_refunded:1000 }));
  const partialDispute = { ...dispute,id:'dp_partial',amount:4000 };
  await deliver(event('charge.dispute.funds_withdrawn',partialDispute));
  assert.equal(Number((await balance()).balance_usd),0);
  await deliver(event('charge.dispute.funds_reinstated',partialDispute));
  assert.equal(Number((await balance()).balance_usd),Number((beforeDispute-c.creditUsd*.2).toFixed(6))); checks++;
  // Provider succeeded, but the final database write failed. Preserve the
  // attempt and customer so another checkout cannot invalidate its retry.
  const recoverInput = { ...input, requestId: randomUUID() };
  await pool.query(`CREATE FUNCTION reject_session_binding() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
    IF NEW.session_id LIKE 'cs_%' AND OLD.session_id LIKE 'pending_%' THEN RAISE EXCEPTION 'forced session save failure'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER reject_session_binding BEFORE UPDATE ON galx_stripe_checkout_sessions FOR EACH ROW EXECUTE FUNCTION reject_session_binding()`);
  await assert.rejects(createAccountCheckout(pool,stripe,recoverInput),/forced session save failure/);
  const createdBeforeRecovery = creates;
  await pool.query('DROP TRIGGER reject_session_binding ON galx_stripe_checkout_sessions');
  await createAccountCheckout(pool,stripe,{ ...input,requestId:randomUUID() });
  await createAccountCheckout(pool,stripe,recoverInput);
  assert.equal(creates,createdBeforeRecovery+1); checks++;
  await createAccountCheckout(pool,stripe,{ ...input,requestId:randomUUID() });
  await assert.rejects(createAccountCheckout(pool,stripe,{ ...input,requestId:randomUUID() }),/Too many checkout attempts/); checks++;
  const newcomer = { ...input,userId:'newcomer',email:'newcomer@example.test' };
  const concurrent = await Promise.all([createAccountCheckout(pool,stripe,{ ...newcomer,requestId:randomUUID() }),createAccountCheckout(pool,stripe,{ ...newcomer,requestId:randomUUID() })]);
  assert.equal(concurrent.reduce((sum,row)=>sum+row.creditUsd,0),80,'Only one welcome grant is reserved across concurrent checkouts'); checks++;
  const latePaid = { ...paid,id:concurrent[0].sessionId,client_reference_id:'newcomer',customer:'cus_newcomer',payment_intent:'pi_newcomer' };
  const recoveredEvent = event('checkout.session.completed',latePaid);
  await pool.query("INSERT INTO galx_stripe_events(event_id,event_type,status,payload_hash) VALUES ($1,$2,'failed','legacy')",[recoveredEvent.id,recoveredEvent.type]);
  await deliver(recoveredEvent); await deliver(recoveredEvent);
  assert.equal((await pool.query("SELECT count(*) FROM galx_wallet_transactions WHERE user_id='newcomer'")).rows[0].count,'1'); checks++;
  const newcomerCredit = Number((await pool.query("SELECT balance_usd FROM galx_wallets WHERE user_id='newcomer'")).rows[0].balance_usd);
  const refundSnapshot = (status: string) => event('charge.refunded',{ payment_intent:'pi_newcomer',currency:'usd',amount_refunded:status==='succeeded'?500:0,refundsSnapshot:[{id:'re_latefailure',amount:500,status}] });
  await deliver(refundSnapshot('succeeded'));
  await deliver(refundSnapshot('failed'));
  await deliver(refundSnapshot('succeeded'));
  assert.equal(Number((await pool.query("SELECT balance_usd FROM galx_wallets WHERE user_id='newcomer'")).rows[0].balance_usd),newcomerCredit); checks++;
  for (const returnPath of ['/keys/top-up','/billing']) {
    const old = { ...input, userId: 'old_'+randomUUID(), requestId: randomUUID() };
    const key = createHash('sha256').update(`${old.userId}:${old.requestId}`).digest('hex');
    await pool.query(`INSERT INTO galx_stripe_checkout_sessions(session_id,user_id,amount_usd,match_grant_usd,total_credited_usd,metadata)
      VALUES($1,$2,25,0,25,$3)`,['pending_'+key,old.userId,JSON.stringify({requestId:old.requestId,returnPath,origin:old.origin,email:old.email,key,fulfillmentVersion:2})]);
    await pool.query(`CREATE TRIGGER reject_session_binding BEFORE UPDATE ON galx_stripe_checkout_sessions FOR EACH ROW EXECUTE FUNCTION reject_session_binding()`);
    await assert.rejects(createAccountCheckout(pool,stripe,old),/forced session save failure/);
    await pool.query('DROP TRIGGER reject_session_binding ON galx_stripe_checkout_sessions');
    const count=creates;
    await createAccountCheckout(pool,stripe,{...old,surface:undefined});
    assert.equal(creates,count,'Old and canonical surfaces resume the same provider session');
    assert.equal(sessions.get('checkout:'+key).params.success_url,`https://galx.ai${returnPath}?checkout=returned&session_id={CHECKOUT_SESSION_ID}`);checks++;
  }
  const sdk = new Stripe('sk_test_localfixture');
  const raw = JSON.stringify(completed); const secret = 'whsec_localfixture';
  const signature = sdk.webhooks.generateTestHeaderString({ payload:raw,secret });
  assert.equal(sdk.webhooks.constructEvent(raw,signature,secret).id,completed.id);
  assert.throws(()=>sdk.webhooks.constructEvent(raw+' ',signature,secret));
  const stale = sdk.webhooks.generateTestHeaderString({ payload:raw,secret,timestamp:1 });
  assert.throws(()=>sdk.webhooks.constructEvent(raw,stale,secret)); checks += 3;
  console.log(`${checks} payment integration checks passed: durable retries, atomic fulfillment, ownership, refunds, debt, disputes, invoice ordering, signed webhooks, migration rollback.`);
} finally { await pool.end(); await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.end(); }
