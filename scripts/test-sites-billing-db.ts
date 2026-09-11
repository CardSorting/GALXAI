/** Disposable localhost PostgreSQL only; never reads DATABASE_URL or dotenv. */
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { GalxaiRelayServer } from '../src/relay/relay-server';
import { executeRelayChat, readRelayReceipt } from '../src/core/router/adapters/RelayChatTransport';
import { sitesContentRoute } from '../src/lib/billing/sites-content-route';
import { PostgresSitesBilling, createBilledRelayGenerator, reconcileBilledRelayGeneration, tokenCharge, DEFAULT_SITES_RATE_CARD, type SitesRateCard } from '../src/lib/billing/sites-generation';

const local = { host: '127.0.0.1', port: 55439, user: 'seats_test' };
const admin = new Pool({ ...local, database: 'postgres', connectionTimeoutMillis: 2000 });
const database = `sites_billing_${Date.now()}`;
await admin.query(`CREATE DATABASE ${database}`);
const pool = new Pool({ ...local, database, max: 20, connectionTimeoutMillis: 2000 });
const rate: SitesRateCard = { version: 'test-v1', model: 'test-model', inputMicroUsdPerMillion: 1000000,
  outputMicroUsdPerMillion: 2000000, maxInputTokens: 100, maxOutputTokens: 50 };
const input = (operationId = randomUUID()) => ({ operationId, requestedModel: rate.model,
  messages: [{ role: 'user' as const, content: 'A simple brief' }], signal: new AbortController().signal });
let checks = 0;
function ok() { checks++; }
try {
  await pool.query('CREATE TABLE public.galx_workspaces(id uuid PRIMARY KEY)');
  await pool.query("CREATE TYPE galx_wallet_transaction_type AS ENUM ('usage_draw')");
  const core = readFileSync('supabase/migrations/20260822000001_galxai_schema_core.sql', 'utf8');
  const holds = readFileSync('supabase/migrations/20260822000024_galxai_inference_credit_hold_and_preauth_mesh.sql', 'utf8');
  for (const [text, table] of [[core, 'galx_wallets'], [core, 'galx_wallet_transactions'], [holds, 'galx_wallet_holds']]) {
    const start = text.indexOf(`CREATE TABLE IF NOT EXISTS ${table} (`);
    assert(start >= 0); await pool.query(text.slice(start, text.indexOf('\n);', start) + 3));
    await pool.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
    await pool.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
    await pool.query(`REVOKE ALL ON ${table} FROM PUBLIC, anon, authenticated`);
  }
  await pool.query('ALTER TABLE galx_wallets ADD COLUMN payment_debt_usd numeric(14,6) NOT NULL DEFAULT 0');
  const owner = randomUUID();
  await pool.query('INSERT INTO galx_wallets(user_id, balance_usd) VALUES ($1, 1)', [owner]);
  const ledger = new PostgresSitesBilling(pool, owner, rate);
  assert.equal(ledger.reservation, 200); assert.equal(tokenCharge(rate, 10, 5), 20); ok();
  const first = input();
  const admissions = await Promise.allSettled(Array.from({ length: 20 }, () => ledger.begin(first)));
  assert.equal(admissions.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await pool.query('SELECT balance_usd FROM galx_wallets WHERE user_id=$1', [owner])).rows[0].balance_usd, '0.999800'); ok();
  await assert.rejects(ledger.begin({ ...first, messages: [{ role: 'user', content: 'changed' }] }), /billing_operation_conflict/); ok();
  const usage = { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 };
  const settled = await ledger.complete(first.operationId, 'content', usage, 'provider-1');
  assert.equal(settled.cost?.units, 20);
  assert.notEqual(settled.cost?.receipt, ledger.relayOperationId(first.operationId));
  assert.equal((await pool.query('SELECT balance_usd, lifetime_spent_usd FROM galx_wallets WHERE user_id=$1', [owner])).rows[0].balance_usd, '0.999980'); ok();
  const repeats = await Promise.all(Array.from({ length: 12 }, () => ledger.complete(first.operationId, 'content', usage, 'provider-1')));
  assert(repeats.every(r => r.cost?.receipt === settled.cost?.receipt));
  assert.equal((await pool.query('SELECT count(*)::int n FROM galx_wallet_transactions')).rows[0].n, 1); ok();
  assert.deepEqual(await new PostgresSitesBilling(pool, owner, { ...rate, version: 'new-rate' }).lookup(first.operationId), settled); ok();
  await assert.rejects(ledger.complete(first.operationId, 'changed', usage, 'provider-1'), /billing_evidence_conflict/); ok();
  const other = new PostgresSitesBilling(pool, randomUUID(), rate);
  await assert.rejects(other.lookup(first.operationId), /billing_receipt_unavailable/); ok();
  assert.notEqual(ledger.relayOperationId('same-customer-key'), other.relayOperationId('same-customer-key')); ok();
  const unknown = input(); await ledger.begin(unknown);
  assert.equal((await ledger.complete(unknown.operationId, 'pending-content', undefined, 'provider-2')).cost, null);
  await assert.rejects(ledger.begin(input()), /billing_needs_reconciliation/);
  assert.equal((await pool.query("SELECT count(*)::int n FROM galx_wallet_holds WHERE status='ACTIVE' AND expires_at < now() + interval '100 years'")).rows[0].n, 0); ok();
  const reconciled = await ledger.complete(unknown.operationId, 'pending-content', usage, 'provider-2');
  assert(reconciled.cost); assert.deepEqual(await ledger.lookup(unknown.operationId), reconciled); ok();
  const insufficientOwner = randomUUID();
  await pool.query('INSERT INTO galx_wallets(user_id, balance_usd) VALUES ($1, 0)', [insufficientOwner]);
  const poor = new PostgresSitesBilling(pool, insufficientOwner, rate);
  await assert.rejects(poor.begin(input()), /insufficient_funds/);
  assert.equal((await pool.query('SELECT count(*)::int n FROM galx_wallet_holds WHERE user_id=$1', [insufficientOwner])).rows[0].n, 0); ok();
  await pool.query('UPDATE galx_wallets SET payment_debt_usd=1 WHERE user_id=$1', [owner]);
  await assert.rejects(ledger.begin(input()), /billing_debt_outstanding/);
  await pool.query('UPDATE galx_wallets SET payment_debt_usd=0 WHERE user_id=$1', [owner]); ok();
  let dispatches = 0;
  const generator = createBilledRelayGenerator(ledger, { url: 'https://relay.example', key: 'fixture' }, async options => {
    dispatches++; assert(options.idempotencyKey); assert.equal(options.payload.model, 'test-model');
    await options.onAccepted!('provider-3');
    return { response: Response.json({ id: 'provider-3', choices: [{ message: { content: 'generated' } }], usage }), headers: {} };
  }, async () => ({ id: 'provider-3', status: 'completed', output: 'generated', usage, retainedUntil: Date.now()+86400000 }));
  const generated = input();
  assert((await generator(generated)).cost); assert((await generator(generated)).cost); assert.equal(dispatches, 1); ok();
  const lost = input();
  const failing = createBilledRelayGenerator(ledger, { url: 'https://relay.example', key: 'fixture' }, async () => { dispatches++; throw new Error('lost response'); });
  await assert.rejects(failing(lost)); await assert.rejects(failing(lost), /billing_needs_reconciliation/); assert.equal(dispatches, 2); ok();
  // Settlement rollback is atomic even after updating the wallet.
  await pool.query(`CREATE FUNCTION reject_test_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected'; END $$`);
  await pool.query('CREATE TRIGGER reject_test_receipt BEFORE INSERT ON galx_wallet_transactions FOR EACH ROW EXECUTE FUNCTION reject_test_receipt()');
  const before = (await pool.query('SELECT balance_usd FROM galx_wallets WHERE user_id=$1', [owner])).rows[0].balance_usd;
  await assert.rejects(ledger.complete(lost.operationId, 'late', usage, 'provider-4'), /billing_unavailable/);
  assert.equal((await pool.query('SELECT balance_usd FROM galx_wallets WHERE user_id=$1', [owner])).rows[0].balance_usd, before); ok();
  await pool.query('DROP TRIGGER reject_test_receipt ON galx_wallet_transactions');
  assert((await ledger.complete(lost.operationId, 'late', usage, 'provider-4')).cost); ok();
  // The database committed, but the driver lost its acknowledgement. Inference
  // must not run on an ambiguous admission; a committed charge stays readable.
  let loseCommit = true;
  const unreliable = { connect: async () => {
    const client = await pool.connect();
    return { query: async (sql: any, params?: any) => {
      const result = await client.query(sql, params);
      if (sql === 'COMMIT' && loseCommit) { loseCommit = false; throw new Error('lost commit acknowledgement'); }
      return result;
    }, release: (destroy: boolean) => client.release(destroy) } as any;
  } };
  const uncertain = new PostgresSitesBilling(unreliable, owner, rate), uncertainRequest = input();
  await assert.rejects(uncertain.begin(uncertainRequest), /billing_unavailable/);
  await assert.rejects(ledger.begin(uncertainRequest), /billing_needs_reconciliation/); ok();
  loseCommit = true;
  await assert.rejects(uncertain.complete(uncertainRequest.operationId, 'committed', usage, 'provider-commit'), /billing_unavailable/);
  assert.equal((await ledger.lookup(uncertainRequest.operationId)).cost?.units, 20); ok();
  const excess = input(); await ledger.begin(excess);
  assert.equal((await ledger.complete(excess.operationId, 'too long', { prompt_tokens: 10, completion_tokens: 100, total_tokens: 110 }, 'provider-5')).cost, null);
  await assert.rejects(ledger.begin(input()), /billing_needs_reconciliation/); ok();
  const db = await pool.connect();
  try {
    for (const role of ['anon', 'authenticated']) {
      await db.query(`SET ROLE ${role}`);
      for (const table of ['galx_wallets', 'galx_wallet_holds', 'galx_wallet_transactions']) {
        await assert.rejects(db.query(`SELECT * FROM ${table}`), /permission denied/);
        await assert.rejects(db.query(`DELETE FROM ${table}`), /permission denied/);
      }
      await db.query('RESET ROLE'); ok();
    }
  } finally { db.release(); }
  // Exercise the actual HTTP/SSE relay transport through the authenticated
  // content handler and real PostgreSQL settlement, without a supplier request.
  const wireOwner = randomUUID();
  await pool.query('INSERT INTO galx_wallets(user_id, balance_usd) VALUES ($1, 1)', [wireOwner]);
  let wireCalls = 0, reads = 0;
  let wireMode: 'complete' | 'missing' | 'disconnect' = 'complete';
  const content = JSON.stringify({ schema_version: 1, title: 'Title', summary: 'Summary', sections: [{ heading: 'Heading', body: 'Body' }] });
  const server = createServer((req, res) => {
    assert.equal(req.headers.authorization, 'Bearer wire-fixture-key');
    if (req.method === 'POST' && req.url === '/v1/chat/completions') {
      wireCalls++; req.resume();
      res.writeHead(202, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ id: 'wire-job', streamUrl: '/v1/jobs/wire-job/stream' }));
    } else if (req.url === '/v1/jobs/wire-job/receipt') {
      reads++;
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ id: 'wire-job', status: 'completed', output: content,
        usage: wireMode === 'complete' ? usage : null, retainedUntil: Date.now()+86400000 }));
    } else {
      reads++;
      assert.equal(req.url, '/v1/jobs/wire-job/stream');
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.end(`data: ${JSON.stringify({ choices: [{ delta: { content } }], ...(wireMode === 'complete' ? { usage } : {}) })}\n\n` +
        (wireMode === 'disconnect' ? '' : 'data: [DONE]\n\n'));
    }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address(); assert(address && typeof address !== 'string');
    const route = sitesContentRoute({ authenticate: async req => ({ id: req.headers.get('authorization') === 'Bearer other-session' ? owner : wireOwner }),
      configuration: () => ({ pool, rate, relay: { url: `http://127.0.0.1:${address.port}`, key: 'wire-fixture-key' } }) });
    const request = () => new Request('https://galx.example/api/sites/content', { method: 'POST', headers: {
      authorization: 'Bearer wire-session', 'content-type': 'application/json' }, body: JSON.stringify({ operationId: 'wire-operation',
      brief: 'Simple page', repair: false, quoteVersion: rate.version, maxChargeMicroUsd: 200 }) });
    const result = await route(request()); assert.equal(result.status, 200);
    const data = await result.json(); assert.equal(data.cost.units, 20); assert.equal(data.text, content);
    assert(!JSON.stringify(data).includes('wire-job')); ok();
    assert.deepEqual(await (await route(request())).json(), data); assert.equal(wireCalls, 1); ok();
    assert.equal((await route(new Request('https://galx.example/api/sites/content?operationId=wire-operation', {
      headers: { authorization: 'Bearer other-session' } }))).status, 404); ok();
    const ledger = new PostgresSitesBilling(pool, wireOwner, rate);
    const relay = { url: `http://127.0.0.1:${address.port}`, key: 'wire-fixture-key' };
    for (const mode of ['missing', 'disconnect'] as const) {
      wireMode = mode;
      const next = input();
      const generate = createBilledRelayGenerator(ledger, relay);
      if (mode === 'missing') assert.equal((await generate(next)).cost, null);
      else await assert.rejects(generate(next));
      const calls = wireCalls;
      assert.deepEqual(await ledger.pendingReference(next.operationId), { jobId: 'wire-job', origin: relay.url, model: rate.model, durable: true }); ok();
      await assert.rejects(ledger.accepted(next.operationId, 'other-job', relay.url), /billing_evidence_conflict/);
      await assert.rejects(ledger.complete(next.operationId, content, usage, 'other-job'), /billing_evidence_conflict/); ok();
      const before = reads;
      await assert.rejects(reconcileBilledRelayGeneration(ledger, next.operationId, { ...relay, url: 'https://different.example' }, next.signal), /billing_needs_reconciliation/);
      assert.equal(reads, before); ok();
      wireMode = 'complete';
      const recovery = new Request('https://galx.example/api/sites/content?operationId='+next.operationId, { headers: { authorization: 'Bearer wire-session' } });
      const recovered = await (await route(recovery)).json();
      assert.equal(recovered.cost.units, 20); assert.equal(recovered.text, content);
      assert(!JSON.stringify(recovered).includes('wire-job')); assert.equal(wireCalls, calls); ok();
      const afterReads = reads;
      assert((await reconcileBilledRelayGeneration(ledger, next.operationId, relay, next.signal)).cost);
      assert.equal(reads, afterReads); ok();
    }
    // The acceptance reference committed, but its acknowledgement was lost.
    // Stop before streaming; a later lookup can still recover the exact job.
    let loseAcceptance = false;
    const uncertainPool = { connect: async () => {
      const client = await pool.connect();
      return { query: async (sql: any, params?: any) => {
        const result = await client.query(sql, params);
        if (typeof sql === 'string' && sql.startsWith('UPDATE public.galx_wallet_holds SET metadata') && String(params?.[1]).includes('relayJobId')) loseAcceptance = true;
        if (sql === 'COMMIT' && loseAcceptance) { loseAcceptance = false; throw new Error('lost acceptance commit'); }
        return result;
      }, release: (destroy: boolean) => client.release(destroy) } as any;
    } };
    const pending = input(), beforeReads = reads, beforeCalls = wireCalls;
    await assert.rejects(createBilledRelayGenerator(new PostgresSitesBilling(uncertainPool, wireOwner, rate), relay)(pending));
    assert.equal(reads, beforeReads); assert.equal(wireCalls, beforeCalls + 1);
    assert((await reconcileBilledRelayGeneration(ledger, pending.operationId, relay, pending.signal)).cost);
    assert.equal(wireCalls, beforeCalls + 1); ok();
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
  // Real relay + real database: lose the caller before streaming, finish once,
  // replace the worker, and settle exclusively from its durable receipt.
  const directory = mkdtempSync(join(tmpdir(), 'galx-sites-db-worker-'));
  const upstream = createServer(); const sockets = new WebSocketServer({ server: upstream }); let actualRequests = 0, localPricing = false;
  sockets.on('connection', socket => socket.on('message', raw => {
    const request = JSON.parse(raw.toString());
    assert.equal(request.max_output_tokens, localPricing ? undefined : rate.maxOutputTokens);
    assert.deepEqual(request.reasoning, { effort: 'none' });
    actualRequests++;
    setTimeout(() => {
      socket.send(JSON.stringify({ type: 'response.output_text.delta', delta: content }));
      socket.send(JSON.stringify({ type: 'response.completed', response: { status: 'completed',
        ...(localPricing ? {} : { usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 } }) } }));
    }, 30);
  }));
  await new Promise<void>(r => upstream.listen(0, '127.0.0.1', r));
  const workerConfig = { port: 0, host: '127.0.0.1', assignedShard: { id: 'a', accountId: 'a', accessToken: 'fixture' },
    assignedShardId: 'a', relayId: 'receipt-test', generation: 'one', apiKeys: ['client'], adminApiKeys: ['admin'],
    registryEnabled: false, discoverHostCredentials: false, forwardOutputTokenLimit: true, stateSnapshotPath: join(directory, 'state.json'),
    shardsJsonPath: join(directory, 'absent'), drainTimeoutMs: 20, capabilityDiscovery: async () => ['test-model'],
    wsEndpoint: `ws://127.0.0.1:${(upstream.address() as any).port}` };
  let worker = new GalxaiRelayServer(workerConfig);
  try {
    await worker.start(); const port = (worker as any).server.address().port;
    const relay = { url: `http://127.0.0.1:${port}`, key: 'client' };
    const owner = randomUUID(); await pool.query('INSERT INTO galx_wallets(user_id, balance_usd) VALUES ($1, 1)', [owner]);
    const ledger = new PostgresSitesBilling(pool, owner, rate), request = input();
    const generate = createBilledRelayGenerator(ledger, relay, options => executeRelayChat({ ...options,
      onAccepted: async id => { await options.onAccepted!(id); throw new Error('Caller disappeared'); } }));
    await assert.rejects(generate(request));
    const reference = await ledger.pendingReference(request.operationId); assert(reference?.durable);
    for (let i=0; i<100; i++) {
      if ((await readRelayReceipt({ ...relay, jobId: reference.jobId, signal: AbortSignal.timeout(1000) })).status === 'completed') break;
      await new Promise(r => setTimeout(r, 10));
    }
    await worker.stop(); worker = new GalxaiRelayServer({ ...workerConfig, port, generation: 'two' }); await worker.start();
    assert.equal((await fetch(relay.url + `/v1/jobs/${reference.jobId}/stream`, { headers: { Authorization: 'Bearer client' } })).status, 404); ok();
    const recovered = await Promise.all(Array.from({ length: 12 }, () => reconcileBilledRelayGeneration(new PostgresSitesBilling(pool, owner, rate), request.operationId, relay, request.signal)));
    assert(recovered.every(r => r.cost?.units === 20 && r.text === content));
    assert.equal(actualRequests, 1);
    assert.equal((await pool.query('SELECT count(*)::int n FROM galx_wallet_transactions WHERE user_id=$1', [owner])).rows[0].n, 1); ok();
    const paused = sitesContentRoute({ authenticate: async () => ({ id: owner }), configuration: () => ({ pool, rate, relay,
      authorizeGeneration: () => { throw new Error('Generation paused'); } }) });
    const recoveredWhilePaused = await paused(new Request('https://galx.example/api/sites/content?operationId='+request.operationId,
      { headers: { authorization: 'Bearer owner-session' } }));
    assert.equal(recoveredWhilePaused.status, 200); assert.equal((await recoveredWhilePaused.json()).cost.units, 20); ok();
    localPricing = true;
    const fixedRate = { ...DEFAULT_SITES_RATE_CARD, model: rate.model };
    const fixedOwner = randomUUID(); await pool.query('INSERT INTO galx_wallets(user_id,balance_usd) VALUES($1,1)', [fixedOwner]);
    const fixedLedger = new PostgresSitesBilling(pool, fixedOwner, fixedRate), fixedRequest = input();
    const fixedGenerate = createBilledRelayGenerator(fixedLedger, relay);
    const completed = await fixedGenerate(fixedRequest);
    assert.equal(completed.cost?.units, 50_000); assert.equal(completed.text, content);
    assert.deepEqual(await fixedGenerate(fixedRequest), completed); assert.equal(actualRequests, 2); ok();
    const tx = (await pool.query('SELECT prompt_tokens,completion_tokens,metadata FROM galx_wallet_transactions WHERE user_id=$1', [fixedOwner])).rows[0];
    assert.equal(tx.prompt_tokens, null); assert.equal(tx.completion_tokens, null);
    assert.equal(tx.metadata.metering, 'fixed_completion'); ok();
    // Lost acknowledgement, then a real worker restart, still settles once without token usage.
    const lostRequest = input();
    await assert.rejects(createBilledRelayGenerator(fixedLedger, relay, options => executeRelayChat({ ...options,
      onAccepted: async id => { await options.onAccepted!(id); throw new Error('Caller disappeared'); } }))(lostRequest));
    const lostRef = await fixedLedger.pendingReference(lostRequest.operationId); assert(lostRef);
    for (let i = 0; i < 100; i++) {
      if ((await readRelayReceipt({ ...relay, jobId: lostRef.jobId, signal: AbortSignal.timeout(1000) })).status === 'completed') break;
      await new Promise(r => setTimeout(r, 10));
    }
    await worker.stop(); worker = new GalxaiRelayServer({ ...workerConfig, port, generation: 'three', forwardOutputTokenLimit: false }); await worker.start();
    const recoveredFixed = await Promise.all(Array.from({ length: 12 }, () => reconcileBilledRelayGeneration(
      new PostgresSitesBilling(pool, fixedOwner, { ...fixedRate, version: 'new-fixed-price', fixedChargeMicroUsd: 100_000 }), lostRequest.operationId, relay, lostRequest.signal)));
    assert(recoveredFixed.every(r => r.cost?.units === 50_000 && r.text === content));
    assert.equal(actualRequests, 3);
    assert.equal((await pool.query('SELECT count(*)::int n FROM galx_wallet_transactions WHERE user_id=$1', [fixedOwner])).rows[0].n, 2); ok();
  } finally {
    await worker.stop(); for (const socket of sockets.clients) socket.terminate();
    await new Promise<void>(r => sockets.close(() => r())); await new Promise<void>(r => upstream.close(() => r())); rmSync(directory, { recursive: true, force: true });
  }
  const unusedOwner = randomUUID(); await pool.query('INSERT INTO galx_wallets(user_id,balance_usd) VALUES($1,1)', [unusedOwner]);
  const unusedLedger = new PostgresSitesBilling(pool, unusedOwner, rate), unused = input();
  await unusedLedger.begin(unused); await unusedLedger.accepted(unused.operationId, 'queued-job', 'https://relay.example', true);
  await assert.rejects(unusedLedger.confirmNotStarted(unused.operationId, 'other-job'), /billing_evidence_conflict/); ok();
  const releases = await Promise.all(Array.from({ length: 12 }, () => unusedLedger.confirmNotStarted(unused.operationId, 'queued-job')));
  assert(releases.every(r => r.cost?.units === 0));
  const wallet = (await pool.query('SELECT balance_usd,lifetime_spent_usd FROM galx_wallets WHERE user_id=$1', [unusedOwner])).rows[0];
  assert.equal(wallet.balance_usd, '1.000000'); assert.equal(wallet.lifetime_spent_usd, '0.000000');
  assert.equal((await pool.query('SELECT count(*)::int n FROM galx_wallet_transactions WHERE user_id=$1', [unusedOwner])).rows[0].n, 1); ok();
  await assert.rejects(unusedLedger.complete(unused.operationId, 'unexpected late output', usage, 'queued-job'), /billing_evidence_conflict/); ok();
  const fixedOwner = randomUUID(); await pool.query('INSERT INTO galx_wallets(user_id,balance_usd) VALUES($1,1)', [fixedOwner]);
  const fixedRate = { ...DEFAULT_SITES_RATE_CARD, model: rate.model, maxDailyGenerations: 2 };
  const fixedLedger = new PostgresSitesBilling(pool, fixedOwner, fixedRate), fixedRequest = input();
  await fixedLedger.begin(fixedRequest);
  await assert.rejects(fixedLedger.complete(fixedRequest.operationId, 'content', null, 'fixed-job', true), /billing_evidence_conflict/); ok();
  await fixedLedger.accepted(fixedRequest.operationId, 'fixed-job', 'https://relay.example', true);
  assert.equal((await fixedLedger.complete(fixedRequest.operationId, 'content', usage, 'fixed-job')).cost, null);
  await assert.rejects(fixedLedger.begin(input()), /billing_needs_reconciliation/); ok();
  const settledFixed = await Promise.all(Array.from({ length: 12 }, () => fixedLedger.complete(fixedRequest.operationId, 'content', null, 'fixed-job', true)));
  assert(settledFixed.every(r => r.cost?.units === 50_000));
  assert.equal((await pool.query('SELECT count(*)::int n FROM galx_wallet_transactions WHERE user_id=$1', [fixedOwner])).rows[0].n, 1); ok();
  const finalSlot = input();
  const slots = await Promise.allSettled(Array.from({ length: 12 }, () => fixedLedger.begin(finalSlot)));
  assert.equal(slots.filter(r => r.status === 'fulfilled').length, 1); ok();
  await fixedLedger.accepted(finalSlot.operationId, 'excess-usage', 'https://relay.example', true);
  assert.equal((await fixedLedger.complete(finalSlot.operationId, 'content', { prompt_tokens: 20_000, completion_tokens: 30_000, total_tokens: 50_000 }, 'excess-usage', true)).cost?.units, 50_000); ok();
  const balance = (await pool.query('SELECT balance_usd FROM galx_wallets WHERE user_id=$1', [fixedOwner])).rows[0].balance_usd;
  assert.equal(balance, '0.900000');
  for (const operation of [input(), input()]) await assert.rejects(fixedLedger.begin(operation), /generation_allowance_exhausted/);
  assert.equal((await pool.query('SELECT balance_usd FROM galx_wallets WHERE user_id=$1', [fixedOwner])).rows[0].balance_usd, balance);
  assert.equal((await fixedLedger.begin(finalSlot)).dispatch, false); ok();
  await pool.query("UPDATE galx_wallet_holds SET created_at=now()-interval '25 hours' WHERE user_id=$1", [fixedOwner]);
  assert.equal((await fixedLedger.begin(input())).dispatch, true); ok();
  console.log(JSON.stringify({ passed: checks, database: 'disposable localhost PostgreSQL', production_writes: false }));
} finally {
  await pool.end(); await admin.query(`DROP DATABASE ${database}`); await admin.end();
}
