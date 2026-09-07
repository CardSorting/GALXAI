import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the actual repository method with isolated storage adapters.
const source = readFileSync('src/lib/supabase/repositories/ApiKeyRepository.ts', 'utf8');
const method = source.slice(source.indexOf('  async revokeKey('), source.indexOf('  async deleteKey('));
let postgresResult: { rowCount: number } | null = { rowCount: 1 };
let remoteResult = { data: [{ id: 'key_test' }], error: null as unknown };
let configured = false;
const query = { update: () => query, eq: () => query, select: async () => remoteResult };
const Repository = vm.runInNewContext(ts.transpile(`class Repository { ${method} }; Repository`, { target: ts.ScriptTarget.ES2022 }), {
  executePostgresQuery: async () => postgresResult,
  isSupabaseConfigured: () => configured,
  getSupabaseAdmin: () => ({ from: () => query }),
});
const repository = new Repository();
Object.assign(repository, {
  activeKeyById: new Map(), keyTable: new Map(), negativeHashCache: new Map(), tokenHashCache: new Map(),
  keyCoalescer: { invalidate() {} }, keyDataLoader: { clearAll() {} },
});
await repository.revokeKey('key_test');
postgresResult = { rowCount: 0 };
await assert.rejects(repository.revokeKey('key_test'), /Could not persist/);
postgresResult = null;
await assert.rejects(repository.revokeKey('key_test'), /Could not persist/);
configured = true;
await repository.revokeKey('key_test');
remoteResult = { data: [], error: null };
await assert.rejects(repository.revokeKey('key_test'), /Could not persist/);
remoteResult = { data: [], error: { message: 'storage unavailable' } };
await assert.rejects(repository.revokeKey('key_test'), /Could not persist/);
console.log('Revocation: durable success, zero-row updates, unavailable storage, and fallback errors passed.');

const clientSource = readFileSync('src/lib/resilience/ResilientClient.ts', 'utf8').replace(/^import .*;$/gm, '').replace(/export /g, '');
const cached = { data: { success: true, revoked: false }, isStale: true };
const context = {
  Headers, AbortController, setTimeout, clearTimeout, console,
  fetch: async () => { throw new Error('offline'); },
  SafeStorage: { getJSON: () => null },
  BroccoliResilienceSubstrate: { getInstance: () => ({ getCachedResponse: () => cached }) },
};
const request = vm.runInNewContext(ts.transpile(`${clientSource}\nexecuteResilientFetch;`, { target: ts.ScriptTarget.ES2022 }), context);
await assert.rejects(request('/api/keys', { enableCacheFallback: false, maxRetries: 0 }), /offline/);
await assert.rejects(request('/api/keys', { method: 'DELETE', maxRetries: 0 }), /offline/);
const fallback = await request('/api/keys', { enableCacheFallback: true, maxRetries: 0 });
assert.equal(fallback.fromCache, true);
console.log('Cache: authoritative reads and failed mutations reject stale success; ordinary reads retain offline fallback.');
