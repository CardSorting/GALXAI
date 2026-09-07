import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PostgresCircuitBreaker, executePostgresQuery, executePostgresTransaction, executePostgresTransactionAsUser } from '../src/lib/db/postgres';

const unavailable = Object.assign(new Error('connection reset'), { code: 'ECONNRESET' });
function opened() {
  let now = 100000;
  const breaker = new PostgresCircuitBreaker(() => now);
  const stale = breaker.acquirePermit()!;
  for (let i = 0; i < 3; i++) breaker.recordFailure(unavailable, breaker.acquirePermit()!);
  assert.equal(breaker.getStatus().state, 'OPEN');
  return { breaker, stale, advance: () => { now += 5000; } };
}

test('one recovery permit under a 1000-request burst; stale completions cannot close or extend an outage', () => {
  const { breaker, stale, advance } = opened();
  const deadline = breaker.getStatus().openUntil;
  breaker.recordSuccess(stale);
  breaker.recordFailure(unavailable, stale);
  breaker.recordSuccess();
  assert.equal(breaker.getStatus().state, 'OPEN');
  assert.equal(breaker.getStatus().openUntil, deadline);
  advance();
  const permits = Array.from({ length: 1000 }, () => breaker.acquirePermit()).filter(p => p !== null);
  assert.equal(permits.length, 1);
  breaker.recordSuccess(permits[0]);
  assert.equal(breaker.getStatus().state, 'CLOSED');
  breaker.recordFailure(unavailable, permits[0]);
  assert.equal(breaker.getStatus().failures, 0, 'duplicate completion ignored');
});

test('neutral recovery releases its slot and old failures cannot poison a newer success', () => {
  const { breaker, advance } = opened();
  advance();
  const probe = breaker.acquirePermit()!;
  breaker.recordFailure({ code: '23505', message: 'duplicate' }, probe);
  const next = breaker.acquirePermit();
  assert(next);
  breaker.recordSuccess(next);
  const old = breaker.acquirePermit()!;
  breaker.recordSuccess(breaker.acquirePermit()!);
  breaker.recordFailure(unavailable, old);
  assert.equal(breaker.getStatus().failures, 0);
  for (let i = 0; i < 10; i++) breaker.recordFailure({ code: '57014', message: 'statement timeout' }, breaker.acquirePermit()!);
  assert.equal(breaker.getStatus().state, 'CLOSED');
});

test('pool overload rejects locally, SQL is executed once, and rolled-back validation errors reuse connections', async () => {
  const previousPool = globalThis.__galx_pg_pool;
  const previousBreaker = globalThis.__galx_pg_breaker;
  const previousUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'postgres://fixture';
  let calls = 0;
  const released: boolean[] = [];
  const queries: string[] = [];
  const client = { query: async (sql: string, params?: any[]) => {
    queries.push(sql);
    if (params) {
      assert.equal(sql.split(';').filter(part => part.trim()).length, 1, 'bound parameters require one SQL command');
      const claims = JSON.parse(params[3]);
      assert.equal(claims.sub, 'user');
      assert.equal(claims.role, 'authenticated');
    }
    return { rows: [] };
  }, release: (destroy: boolean) => released.push(destroy) };
  const pool: any = { waitingCount: 25, query: async () => { calls++; throw Object.assign(new Error('query read timeout'), {}); }, connect: async () => client };
  globalThis.__galx_pg_pool = pool;
  globalThis.__galx_pg_breaker = new PostgresCircuitBreaker();
  try {
    for (let i = 0; i < 20; i++) assert.equal(await executePostgresQuery('SELECT 1'), null);
    assert.equal(calls, 0);
    assert.equal(globalThis.__galx_pg_breaker.getStatus().state, 'CLOSED');
    pool.waitingCount = 0;
    assert.equal(await executePostgresQuery('SELECT write_with_side_effect()'), null);
    assert.equal(calls, 1, 'timeout must not replay arbitrary SQL');
    assert.equal(await executePostgresTransaction(async () => { throw { code: '23505', message: 'duplicate' }; }), null);
    assert.deepEqual(released, [false]);
    assert(queries.includes('ROLLBACK;'));
    assert.equal(await executePostgresTransactionAsUser('user', async () => 42, { metadata: { sub: 'other', role: 'service_role' } }), 42);
    assert.deepEqual(released, [false, false]);
    const { breaker, advance } = opened();
    globalThis.__galx_pg_breaker = breaker;
    advance();
    const circular: any = {};
    circular.self = circular;
    await assert.rejects(executePostgresTransactionAsUser('user', async () => 42, { metadata: circular }));
    assert.equal(breaker.getStatus().state, 'OPEN', 'invalid metadata must not reserve the only recovery permit');
    let resolve!: (value: any) => void;
    pool.query = () => { calls++; return new Promise(r => { resolve = r; }); };
    const recovery = executePostgresQuery('SELECT 1');
    const rejected = await Promise.all(Array.from({ length: 1000 }, () => executePostgresQuery('SELECT 1')));
    assert(rejected.every(r => r === null));
    resolve({ rows: [{ alive: 1 }] });
    assert(await recovery);
    assert.equal(breaker.getStatus().state, 'CLOSED');
  } finally {
    globalThis.__galx_pg_pool = previousPool;
    globalThis.__galx_pg_breaker = previousBreaker;
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
  }
});
