/** Non-disruptive supplemental drill. Only uniquely owned, isolated fixtures mutate.
 * Does not replace the candidate's whole-image acceptance receipt. No dotenv.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { Pool } from 'pg';
import { ConnectRepository, connectHash } from '../src/lib/supabase/repositories/ConnectRepository';
import { BASE_IMAGE, STOP_SECONDS, composePlan, hashFile, sha256, verifyPackage, runtimeAcceptanceHash } from './lib/self-host.mjs';
import { fixtureFetch as fetch } from './fixtures/self-host-http';

const [packageArg, inputsArg, outputArg] = process.argv.slice(2);
if (!packageArg || !inputsArg || !outputArg) throw Error('Usage: node --import tsx scripts/test-self-host-resilience.ts <accepted-package> <public-build-inputs.json> <new-evidence-directory>');
if (process.env.DATABASE_URL || process.env.GALX_INTEGRATION_DATABASE_URL) throw Error('Ambient database configuration is prohibited.');
const root = process.cwd(), packageDir = fs.realpathSync(packageArg), output = path.resolve(outputArg);
if (fs.existsSync(output)) throw Error('Evidence directory must be new.');
fs.mkdirSync(output, { recursive: true, mode: 0o700 });
const manifest = verifyPackage(packageDir), image = JSON.parse(fs.readFileSync(path.join(packageDir, 'image.json'), 'utf8'));
const receiptPath = path.join(packageDir, 'acceptance.json'), receiptHash = hashFile(receiptPath);
const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
assert.equal(receipt.status, 'PASSED'); assert.equal(receipt.image, image.image);
assert.equal(receipt.manifestSha256, hashFile(path.join(packageDir, 'manifest.json')));
assert.equal(receipt.testSha256, runtimeAcceptanceHash(root));
assert.equal(hashFile(path.join(packageDir, 'image.tar')), image.imageArchiveSha256);
const publicInputs = JSON.parse(fs.readFileSync(inputsArg, 'utf8')).publicEnvironment;
for (const [name, digest] of Object.entries(manifest.publicInputHashes)) assert.equal(sha256(publicInputs[name] || ''), digest);
const runId = randomUUID(), network = `galx-resilience-${runId}`;
const names = Object.fromEntries(['db', 'provider', 'entrance', 'app', 'pressure'].map(role => [role, network + '-' + role]));
const secret = randomBytes(32).toString('hex'), password = randomBytes(24).toString('hex');
const configFile = path.join(output, 'runtime-private.json');
const env = { PATH: process.env.PATH, HOME: process.env.HOME, POSTGRES_PASSWORD: password, FIXTURE_KEY: secret,
  FIXTURE_DATABASE: names.db, FIXTURE_PROVIDER: names.provider, FIXTURE_APPLICATION: names.provider };
const docker = (args: string[], input?: string | Buffer, timeout = 120000) => execFileSync('docker', ['--context', 'desktop-linux', ...args],
  { env, input, encoding: 'utf8', timeout, maxBuffer: 16 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
const inspect = (name: string) => JSON.parse(docker(['inspect', name]))[0];
const owned = new Set<string>(), results: any[] = [];
const mutate = (name: string, operation: string, args: string[] = []) => {
  assert(owned.has(name)); assert.equal(inspect(name).Config.Labels['galx.resilience'], runId);
  return docker([operation, ...args, name]);
};
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const report = (name: string, detail: Record<string, any> = {}) => { results.push({ name, ...detail }); console.log(JSON.stringify({ check: name, status: 'PASSED' })); };
const label = ['--label', `galx.resilience=${runId}`];
let networkOwned = false, pool: Pool | undefined, runtime: Record<string, string>, origin: string, providerOrigin: string;
const headers = { Host: 'galx.ai' };
const config = { issuer: 'https://galx.ai', resource: 'https://nova.galx.ai', clients: [
  { id: 'reference-native', name: 'Isolated recovery fixture', kind: 'native' as const, redirectUris: ['http://127.0.0.1:4401/callback'], origins: [] },
] };
let databaseName = 'galx_integration_test';
const connectPool = (binding: string) => {
  const p = new Pool({ connectionString: `postgresql://postgres:${password}@${binding}/${databaseName}`, connectionTimeoutMillis: 1000, statement_timeout: 30000, max: 4 });
  p.on('error', () => {}); // The entrance-loss drill deliberately closes idle sockets.
  return p;
};
const healthy = async () => {
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(origin + '/api/health', { headers })).status === 200) return; } catch {}
    await wait(250);
  }
  throw Error('Isolated application did not become ready');
};
const startApp = () => {
  const policy = composePlan({ image: image.image, configFile }).services.web;
  owned.add(names.app);
  docker(['run', '-d', '--name', names.app, ...label, '--platform', 'linux/amd64', '--network', `container:${names.provider}`,
    '--init', '--user', policy.user, '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
    '--memory', policy.mem_limit, '--memory-swap', policy.mem_limit, '--cpus', String(policy.cpus), '--pids-limit', String(policy.pids_limit),
    '--stop-timeout', String(STOP_SECONDS), '--restart', 'unless-stopped', '--log-driver', 'json-file', '--log-opt', 'max-size=10m', '--log-opt', 'max-file=3',
    ...policy.tmpfs.flatMap((v: string) => ['--tmpfs', v]), '--mount', `type=bind,src=${configFile},dst=/run/secrets/galx-runtime.json,readonly`, image.image]);
};
try {
  docker(['load', '--input', path.join(packageDir, 'image.tar')]);
  assert.equal(JSON.parse(docker(['image', 'inspect', image.image]))[0].Id, image.image);
  report('verified recovery archive loaded without replacing a service', { image: image.image, archiveSha256: image.imageArchiveSha256 });
  docker(['network', 'create', '--internal', ...label, network]); networkOwned = true;
  assert.equal(JSON.parse(docker(['network', 'inspect', network]))[0].Internal, true);
  owned.add(names.entrance);
  docker(['create', '--name', names.entrance, ...label, '--network', 'bridge', '-p', '127.0.0.1::5432', '-p', '127.0.0.1::7779', '-p', '127.0.0.1::3000',
    '--read-only', '--memory', '128m', '--memory-swap', '128m', '--cpus', '0.5', '--pids-limit', '32', '--cap-drop', 'ALL', '--user', '1000:1000',
    '-e', 'FIXTURE_DATABASE', '-e', 'FIXTURE_PROVIDER', '-e', 'FIXTURE_APPLICATION', '--mount', `type=bind,src=${path.join(root, 'scripts/fixtures/self-host-fixture-proxy.cjs')},dst=/fixture/proxy.cjs,readonly`, BASE_IMAGE, 'node', '/fixture/proxy.cjs']);
  docker(['network', 'connect', network, names.entrance]); mutate(names.entrance, 'start');
  owned.add(names.db);
  docker(['run', '-d', '--name', names.db, ...label, '--network', network, '--tmpfs', '/var/lib/postgresql/data:rw,nosuid,noexec,size=536870912',
    '--memory', '768m', '--memory-swap', '768m', '--cpus', '1', '--pids-limit', '128', '-e', 'POSTGRES_PASSWORD', '-e', 'POSTGRES_DB=galx_integration_test',
    'pgvector/pgvector@sha256:cf134a767f474095eeba57e0117be8e568e011a63f33fbf252f14c9b760f8e6f']);
  let binding = docker(['port', names.entrance, '5432/tcp']); assert.match(binding, /^127\.0\.0\.1:\d+$/);
  pool = connectPool(binding);
  for (let i = 0; ; i++) { try { await pool.query('SELECT 1'); break; } catch { if (i === 80) throw Error('Isolated database unavailable'); await wait(250); } }
  await pool.query(fs.readFileSync('scripts/fixtures/integration-bootstrap.sql', 'utf8'));
  const migrations = fs.readdirSync('supabase/migrations').filter(f => /^\d+_.+\.sql$/.test(f)).sort();
  for (const migration of migrations) {
    await pool.query('BEGIN');
    try { await pool.query(fs.readFileSync('supabase/migrations/' + migration, 'utf8')); await pool.query('COMMIT'); }
    catch (e) { await pool.query('ROLLBACK'); throw e; }
  }
  owned.add(names.provider);
  docker(['run', '-d', '--name', names.provider, ...label, '--network', network, '--read-only', '--memory', '128m', '--memory-swap', '128m', '--cpus', '0.5', '--pids-limit', '32',
    '--cap-drop', 'ALL', '--user', '1000:1000', '-e', 'FIXTURE_KEY', '--mount', `type=bind,src=${path.join(root, 'scripts/fixtures/self-host-provider.cjs')},dst=/fixture/provider.cjs,readonly`, BASE_IMAGE, 'node', '/fixture/provider.cjs']);
  providerOrigin = 'http://' + docker(['port', names.entrance, '7779/tcp']);
  origin = 'http://' + docker(['port', names.entrance, '3000/tcp']);
  runtime = { ...publicInputs, GALX_CONNECT_ENABLED: '1', GALX_CONNECT_ORIGIN: config.issuer, GALX_NOVA_RESOURCE: config.resource, GALX_CONNECT_CLIENTS: JSON.stringify(config.clients),
    DATABASE_URL: `postgresql://postgres:${password}@${names.db}/${databaseName}?sslmode=disable`, GALX_PREMIUM_RELAY_URL: 'http://127.0.0.1:7779', GALX_PREMIUM_RELAY_KEY: secret,
    GALX_VAULT_KEY_V1: randomBytes(32).toString('hex'), GALX_AUDIT_SIGNING_SECRET: randomBytes(32).toString('hex') };
  fs.writeFileSync(configFile, JSON.stringify(runtime), { mode: 0o600 }); const configHash = hashFile(configFile);
  startApp(); await healthy();
  const status = async () => (await fetch(providerOrigin + '/_fixture/status', { headers: { Authorization: 'Bearer ' + secret } })).json();
  const safe = (body: string) => { assert(!/PRIVATE_|postgresql:|installationId|encrypted_ciphertext/.test(body)); assert(!body.includes(secret)); };
  const invoke = (token: string, mode = 'complete', key = randomUUID()) => fetch(origin + '/v1/inference', { method: 'POST', headers: {
    Host: 'nova.galx.ai', Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', 'Idempotency-Key': key,
  }, body: JSON.stringify({ messages: [{ role: 'user', content: mode }], stream: true }) });
  const tokens = async () => {
    const user = randomUUID(); await pool!.query('INSERT INTO auth.users(id) VALUES ($1)', [user]);
    await pool!.query("INSERT INTO private.galx_inference_access(user_id,enabled,valid_until) VALUES ($1,true,now()+interval '1 day')", [user]);
    const verifier = 'v'.repeat(43), redirect = config.clients[0].redirectUris[0];
    const r = await fetch(origin + '/oauth/authorize?' + new URLSearchParams({ response_type: 'code', client_id: 'reference-native', redirect_uri: redirect,
      resource: config.resource, scope: 'inference:invoke', state: randomBytes(32).toString('base64url'), code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' }), { headers });
    assert.equal(r.status, 303); await r.body?.cancel();
    const pending = new URL(r.headers.get('location')!), cookie = r.headers.get('set-cookie')!.match(/__Host-galx_connect_flow=([A-Za-z0-9_-]{43})/)![1];
    const consent = new URL(await new ConnectRepository(config, pool!).decide(pending.searchParams.get('request')!, connectHash(cookie), user, true));
    const exchange = await fetch(origin + '/oauth/token', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({
      grant_type: 'authorization_code', client_id: 'reference-native', resource: config.resource, redirect_uri: redirect, code: consent.searchParams.get('code')!, code_verifier: verifier,
    }) }); assert.equal(exchange.status, 200); return exchange.json();
  };
  const revoke = async (token: any) => {
    const r = await fetch(origin + '/oauth/revoke', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: 'reference-native', token: token.refresh_token }) });
    assert.equal(r.status, 200); await r.text();
  };
  const denied = async (token: any) => {
    const before = await status(), r = await invoke(token.access_token); assert.equal(r.status, 401); safe(await r.text());
    const refresh = await fetch(origin + '/oauth/token', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'refresh_token', client_id: 'reference-native', resource: config.resource, refresh_token: token.refresh_token }) });
    assert.equal(refresh.status, 400); assert.equal((await refresh.json()).error, 'invalid_grant'); assert.equal((await status()).attempts, before.attempts);
  };
  const row = async (id: string) => (await pool!.query('SELECT row_to_json(n) value FROM private.galx_nova_requests n WHERE id=$1', [id])).rows[0].value;
  const first = async (token: any, key: string) => {
    const r = await invoke(token.access_token, 'hold', key); assert.equal(r.status, 200);
    const reader = r.body!.getReader(), part = await reader.read();
    const body = new TextDecoder().decode(part.value); safe(body); return { reader, id: JSON.parse(body.split('\n')[0].slice(6)).id };
  };
  const live = await tokens(), revoked = await tokens();
  let r = await invoke(live.access_token), body = await r.text(); assert.equal(r.status, 200); safe(body); assert(body.includes('[DONE]'));
  const completedId = JSON.parse(body.split('\n')[0].slice(6)).id, completed = await row(completedId);
  await revoke(revoked); await denied(revoked);
  report('baseline completion, scoped authorization and durable revocation', { completedId, state: completed.state });

  // Exercise real filesystem limits, exclusively in the replica's 128 MiB tmpfs.
  const pressure = JSON.parse(docker(['exec', names.app, 'node', '-e', `const fs=require('fs');let denied;try{fs.writeFileSync('/app/forbidden','x')}catch(e){denied=e.code}let bytes=0,code;const p='/app/.next/cache/fixture-pressure';const fd=fs.openSync(p,'w');try{for(let i=0;i<129;i++){bytes+=fs.writeSync(fd,Buffer.alloc(1048576,1));}}catch(e){code=e.code}finally{fs.closeSync(fd)}console.log(JSON.stringify({denied,bytes,code}));`]));
  assert.equal(pressure.denied, 'EROFS'); assert.equal(pressure.code, 'ENOSPC'); assert(pressure.bytes <= 128 * 1024 * 1024);
  r = await invoke(live.access_token); assert.equal(r.status, 200); safe(await r.text());
  docker(['exec', names.app, 'node', '-e', "require('fs').unlinkSync('/app/.next/cache/fixture-pressure')"]);
  report('read-only root and bounded cache exhaustion preserve inference', pressure);

  const ingressToken = await tokens(), ingressKey = randomUUID(), ingressBefore = await status(), ingress = await first(ingressToken, ingressKey);
  await pool.end(); pool = undefined;
  mutate(names.entrance, 'kill', ['--signal', 'KILL']);
  await ingress.reader.read().catch(() => {}); await ingress.reader.cancel().catch(() => {});
  mutate(names.entrance, 'start');
  binding = docker(['port', names.entrance, '5432/tcp']);
  origin = 'http://' + docker(['port', names.entrance, '3000/tcp']);
  providerOrigin = 'http://' + docker(['port', names.entrance, '7779/tcp']);
  pool = connectPool(binding); await healthy();
  let interrupted;
  for (let i = 0; i < 100; i++) { interrupted = await row(ingress.id); if (interrupted.state === 'unknown') break; await wait(50); }
  assert.equal(interrupted.state, 'unknown');
  r = await invoke(ingressToken.access_token, 'hold', ingressKey); assert.equal(r.status, 409); safe(await r.text());
  assert.equal((await status()).attempts, ingressBefore.attempts + 1); assert.equal((await status()).explicitFailures, ingressBefore.explicitFailures);
  report('isolated ingress death and restart retain neutral outcome without replay', { state: interrupted.state, newAttempts: 1, replayed: false, liveIngressTouched: false });

  const crashToken = await tokens(), crashKey = randomUUID(), crashBefore = await status(), crash = await first(crashToken, crashKey);
  const started = performance.now(); mutate(names.app, 'kill', ['--signal', 'KILL']);
  await crash.reader.read().catch(() => {}); await crash.reader.cancel().catch(() => {});
  assert.equal(inspect(names.app).State.ExitCode, 137);
  mutate(names.app, 'start'); await healthy();
  r = await invoke(crashToken.access_token, 'hold', crashKey); assert.equal(r.status, 409); assert.equal((await r.json()).error.execution_state, 'unknown');
  assert.equal((await status()).attempts, crashBefore.attempts + 1); assert.equal((await row(crash.id)).state, 'running');
  assert.equal(hashFile(configFile), configHash); await denied(revoked); assert.deepEqual(await row(completedId), completed);
  report('container death and explicit restart preserve credentials, records and revoked authority', { recoveryMs: Math.round(performance.now() - started), persistedState: 'running', clientOutcome: 'unknown', automaticReplay: false, providerFailuresAdded: (await status()).explicitFailures - crashBefore.explicitFailures });

  // Exact persisted refill oracle, independent of process/cache state.
  const shard = 'codex_sh_' + createHash('sha256').update(runId).digest('hex').slice(0, 24), t0 = 1700000000000;
  await pool.query('SELECT private.enroll_desktop_shard($1,$2,NULL)', [randomUUID(), JSON.stringify({ id: shard, user_id: 'system_admin', encrypted_ciphertext: 'synthetic', encrypted_iv: 'synthetic', encrypted_tag: 'synthetic', key_version: 'v1', credential_expires_at_ms: Date.now() + 3600000 })]);
  await pool.query(`UPDATE public.galx_shard_accounts SET status='paused',remaining_tokens=0,max_tokens=500000,refill_rate_per_minute=50000,remaining_requests=0,max_requests=40,last_refill_timestamp_ms=$2,token_refill_remainder=0,request_refill_remainder=0,token_refill_numerator=NULL,request_refill_numerator=NULL WHERE id=$1`, [shard, t0]);
  const refill = (at: number) => pool!.query('SELECT private.relay_base_acquire($1,$2,1,60000,$3,$4)', [shard, 'refill-fixture', randomUUID(), at]);
  const credit = async () => (await pool!.query('SELECT remaining_tokens::text tokens,remaining_requests::text requests,token_refill_numerator::text token_credit,request_refill_numerator::text request_credit,last_refill_timestamp_ms::text at FROM public.galx_shard_accounts WHERE id=$1', [shard])).rows[0];
  await refill(t0 + 1); const creditBefore = await credit(); assert.equal(creditBefore.token_credit, '2500000000');
  mutate(names.app, 'stop', ['--time', String(STOP_SECONDS)]);
  assert.equal(inspect(names.app).State.ExitCode, 0); mutate(names.app, 'start'); await healthy(); assert.deepEqual(await credit(), creditBefore);
  report('partial exact quota credit survives application container restart', { persisted: creditBefore });

  // Whole database is synthetic. No production export is made or required.
  mutate(names.app, 'stop', ['--time', String(STOP_SECONDS)]); assert.equal(inspect(names.app).State.ExitCode, 0);
  const dump = docker(['exec', names.db, 'pg_dump', '-U', 'postgres', '--no-owner', databaseName]);
  assert(dump.length < 8 * 1024 * 1024); const dumpHash = sha256(dump);
  databaseName = 'galx_recovery_test'; docker(['exec', names.db, 'createdb', '-U', 'postgres', '-T', 'template0', databaseName]);
  docker(['exec', '-i', names.db, 'psql', '-X', '-q', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '--single-transaction', databaseName], dump);
  await pool.end(); pool = connectPool(binding);
  assert.deepEqual(await row(completedId), completed); assert.deepEqual(await credit(), creditBefore); await refill(t0 + 6);
  const creditAfter = await credit(); assert.equal(creditAfter.tokens, '5'); assert.equal(creditAfter.token_credit, '0');
  await refill(t0 + 6); assert.deepEqual(await credit(), creditAfter);
  mutate(names.app, 'rm'); owned.delete(names.app);
  runtime.DATABASE_URL = `postgresql://postgres:${password}@${names.db}/${databaseName}?sslmode=disable`;
  fs.writeFileSync(configFile, JSON.stringify(runtime), { mode: 0o600 });
  startApp(); await healthy(); await denied(revoked);
  const attemptsBeforeReconstruction = (await status()).attempts;
  r = await invoke(crashToken.access_token, 'hold', crashKey); assert.equal(r.status, 409); assert.equal((await r.json()).error.execution_state, 'unknown');
  assert.equal((await status()).attempts, attemptsBeforeReconstruction);
  r = await invoke(live.access_token); assert.equal(r.status, 200); body = await r.text(); safe(body); assert(body.includes('[DONE]'));
  const postRecovery = await tokens(); r = await invoke(postRecovery.access_token); assert.equal(r.status, 200); safe(await r.text());
  assert.deepEqual(await row(completedId), completed); assert.equal((await row(crash.id)).state, 'running');
  report('fresh container and synthetic database reconstruction preserve authority and exact quota', { dumpSha256: dumpHash, restoredDatabase: 'disposable fixture', bytes: Buffer.byteLength(dump), quota: creditAfter, newConsent: true, revokedRefreshDenied: true, unknownReplayed: false, offDevice: false });

  // Memory pressure stays in a separate 64 MiB cgroup; no host disk/swap stress.
  owned.add(names.pressure);
  docker(['run', '-d', '--name', names.pressure, ...label, '--network', 'none', '--read-only', '--memory', '64m', '--memory-swap', '64m', '--cpus', '0.25', '--pids-limit', '16', '--cap-drop', 'ALL', '--user', '1000:1000', BASE_IMAGE,
    'node', '-e', "const b=[];for(let i=0;i<96;i++)b.push(Buffer.alloc(1048576,1));setTimeout(()=>{},1000)"]);
  docker(['wait', names.pressure]); const oom = inspect(names.pressure);
  assert.equal(oom.State.OOMKilled, true); assert.equal(oom.State.ExitCode, 137); await healthy();
  report('memory pressure confined to disposable 64 MiB cgroup', { limitBytes: oom.HostConfig.Memory, swapLimitBytes: oom.HostConfig.MemorySwap, oomKilled: true, liveHostPressureTest: false });
  assert.equal(hashFile(receiptPath), receiptHash); assert.equal((await status()).explicitFailures, 0);
  for (const route of ['/post-mortem/CURRENT_STATE.md', '/.env', '/operator/status']) { const r = await fetch(origin + route, { headers }); assert.equal(r.status, 404); safe(await r.text()); }
  report('accepted receipt, private asset boundary and neutral provider signal unchanged');
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ at: new Date().toISOString(), status: 'PASSED', image: image.image, manifestSha256: image.manifestSha256, receiptSha256: receiptHash,
    testSha256: hashFile(import.meta.filename), runId, migrations: migrations.length, realAccount: false, realProvider: false, productionDatabase: false, results, metrics: await status(),
    limits: ['Isolated same-Mac reconstruction; no off-device or hardware-loss proof.', 'Synthetic ingress restart; shared live connector was untouched.', 'No physical host, host network, Docker daemon, power policy, login or sleep mutation.', 'Memory OOM was a separate bounded cgroup; application SIGKILL covers abrupt execution loss.'] }, null, 2) + '\n');
} catch (e: any) {
  fs.writeFileSync(path.join(output, 'failure.json'), JSON.stringify({ at: new Date().toISOString(), completed: results, name: e.name, message: String(e.message).replaceAll(secret, '[redacted]').replaceAll(password, '[redacted]').slice(0, 3000) }, null, 2) + '\n');
  console.error('Isolated resilience drill failed; inspect bounded private evidence.'); process.exitCode = 1;
} finally {
  await pool?.end();
  const cleanup: any[] = [];
  for (const name of [names.pressure, names.app, names.provider, names.db, names.entrance]) if (owned.has(name)) {
    try { mutate(name, 'rm', ['--force']); cleanup.push({ role: name.slice(network.length + 1), removed: true }); }
    catch { cleanup.push({ role: name.slice(network.length + 1), removed: false }); process.exitCode = 1; }
  }
  if (networkOwned) { try { assert.equal(JSON.parse(docker(['network', 'inspect', network]))[0].Labels['galx.resilience'], runId); docker(['network', 'rm', network]); } catch { process.exitCode = 1; } }
  fs.rmSync(configFile, { force: true });
  fs.writeFileSync(path.join(output, 'cleanup.json'), JSON.stringify({ at: new Date().toISOString(), containers: cleanup, privateConfigRemoved: !fs.existsSync(configFile), completed: !process.exitCode }, null, 2) + '\n');
}
