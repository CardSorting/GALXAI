/** Disposable whole-image acceptance. No dotenv, live accounts or external egress. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync, execFile, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { Pool } from 'pg';
import { ConnectRepository, connectHash, connectSecret } from '../src/lib/supabase/repositories/ConnectRepository';
import { BASE_IMAGE, STOP_SECONDS, composePlan, hashFile, sha256, verifyPackage, runtimeAcceptanceHash } from './lib/self-host.mjs';
import { fixtureFetch as fetch } from './fixtures/self-host-http';
import { browserFixture } from './fixtures/self-host-browser';

const [packageArg, publicInputsArg, outputArg, acceptedBuildArg] = process.argv.slice(2);
if (!packageArg || !publicInputsArg || !outputArg || !acceptedBuildArg) throw Error('Usage: node --import tsx scripts/test-self-host-runtime.ts <package> <public-build-inputs.json> <new-evidence-directory> <accepted-build>');
if (process.env.DATABASE_URL || process.env.GALX_INTEGRATION_DATABASE_URL) throw Error('Remove ambient database configuration before running this disposable fixture.');
const root = process.cwd(), packageDir = fs.realpathSync(packageArg), output = path.resolve(outputArg);
if (fs.existsSync(output)) throw Error('Evidence directory must be new.');
fs.mkdirSync(output, { recursive: true, mode: 0o700 });
const manifest = verifyPackage(packageDir), image = JSON.parse(fs.readFileSync(path.join(packageDir, 'image.json'), 'utf8'));
const provenance = JSON.parse(fs.readFileSync(path.join(acceptedBuildArg, 'provenance.json'), 'utf8'));
assert.equal(provenance.sourceManifestSha256, manifest.sourceManifestSha256);
const bufferSource = path.resolve(acceptedBuildArg, 'app/src/sdk/inference-result.ts');
assert.equal(hashFile(bufferSource), provenance.source['src/sdk/inference-result.ts']);
assert.equal(image.manifestSha256, hashFile(path.join(packageDir, 'manifest.json')));
assert.equal(image.imageArchiveSha256, hashFile(path.join(packageDir, 'image.tar')));
const publicInputs = JSON.parse(fs.readFileSync(publicInputsArg, 'utf8')).publicEnvironment;
for (const [name, digest] of Object.entries(manifest.publicInputHashes)) assert.equal(sha256(publicInputs[name] || ''), digest, 'Public build identity mismatch');
const runId = randomUUID(), network = `galx-selfhost-${runId}`, dbName = network + '-db', appName = network + '-app', providerName = network + '-provider', proxyName = network + '-fixture';
const secret = randomBytes(32).toString('hex'), password = randomBytes(24).toString('hex');
const env = { PATH: process.env.PATH, HOME: process.env.HOME, POSTGRES_PASSWORD: password, FIXTURE_KEY: secret, FIXTURE_DATABASE: dbName, FIXTURE_PROVIDER: providerName, FIXTURE_APPLICATION: providerName };
const docker = (args: string[], timeout = 120000) => execFileSync('docker', ['--context', 'desktop-linux', ...args], { env, encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 2 * 1024 * 1024 }).trim();
const dockerAsync = (args: string[], timeout = 120000) => promisify(execFile)('docker', ['--context', 'desktop-linux', ...args], { env, encoding: 'utf8', timeout, maxBuffer: 2 * 1024 * 1024 });
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
const results: any[] = [], owned = new Set<string>();
let pool: Pool | undefined, networkOwned = false;
const browser = await browserFixture();
const config = { issuer: 'https://galx.ai', resource: 'https://nova.galx.ai', clients: [
  { id: 'reference-native', name: 'Native fixture', kind: 'native' as const, redirectUris: ['http://127.0.0.1:4401/callback'], origins: [] },
  { id: 'reference-browser', name: 'Browser fixture', kind: 'browser' as const, redirectUris: [browser.origin + '/callback'], origins: [browser.origin] },
] };
try {
  // Restore from the retained archive, then run precisely that immutable image.
  // Existing content-addressed layers may be reused; no installed service changes.
  docker(['load', '--input', path.join(packageDir, 'image.tar')]);
  const restored = JSON.parse(docker(['image', 'inspect', image.image]))[0];
  assert.equal(restored.Id, image.image); assert.equal(restored.Architecture, 'amd64');
  assert.equal(restored.Config.Labels['ai.galx.manifest'], image.manifestSha256);
  results.push({ name: 'verified recovery archive accepted by Docker', image: restored.Id, architecture: restored.Architecture, archiveSha256: image.imageArchiveSha256 });
  docker(['network', 'create', '--internal', '--label', `galx.fixture=${runId}`, network]); networkOwned = true;
  assert.equal(JSON.parse(docker(['network', 'inspect', network]))[0].Internal, true);
  owned.add(proxyName);
  docker(['create', '--name', proxyName, '--label', `galx.fixture=${runId}`, '--network', 'bridge', '-p', '127.0.0.1::5432', '-p', '127.0.0.1::7779', '-p', '127.0.0.1::3000', '--read-only', '--memory', '128m', '--cap-drop', 'ALL', '--user', '1000:1000', '-e', 'FIXTURE_DATABASE', '-e', 'FIXTURE_PROVIDER', '-e', 'FIXTURE_APPLICATION', '--mount', `type=bind,src=${path.join(root, 'scripts/fixtures/self-host-fixture-proxy.cjs')},dst=/fixture/proxy.cjs,readonly`, BASE_IMAGE, 'node', '/fixture/proxy.cjs']);
  docker(['network', 'connect', network, proxyName]); docker(['start', proxyName]);
  owned.add(dbName);
  docker(['run', '-d', '--name', dbName, '--label', `galx.fixture=${runId}`, '--network', network, '-p', '127.0.0.1::5432', '--tmpfs', '/var/lib/postgresql/data:rw,nosuid,noexec,size=536870912', '--memory', '768m', '-e', 'POSTGRES_PASSWORD', '-e', 'POSTGRES_DB=galx_integration_test', 'pgvector/pgvector@sha256:cf134a767f474095eeba57e0117be8e568e011a63f33fbf252f14c9b760f8e6f']);
  const binding = docker(['port', proxyName, '5432/tcp']); assert.match(binding, /^127\.0\.0\.1:\d+$/);
  pool = new Pool({ connectionString: `postgresql://postgres:${password}@${binding}/galx_integration_test`, connectionTimeoutMillis: 1000, statement_timeout: 30000, max: 5 });
  for (let i = 0; ; i++) { try { await pool.query('SELECT 1'); break; } catch { if (i === 40) throw Error('Disposable database unavailable'); await delay(250); } }
  await pool.query(fs.readFileSync('scripts/fixtures/integration-bootstrap.sql', 'utf8'));
  const migrations = fs.readdirSync('supabase/migrations').filter(f => /^\d+_.+\.sql$/.test(f)).sort();
  for (const name of migrations) {
    await pool.query('BEGIN');
    try { await pool.query(fs.readFileSync('supabase/migrations/' + name, 'utf8')); await pool.query('COMMIT'); }
    catch (e) { await pool.query('ROLLBACK'); throw e; }
  }
  owned.add(providerName);
  docker(['run', '-d', '--name', providerName, '--label', `galx.fixture=${runId}`, '--network', network, '-p', '127.0.0.1::7779', '--read-only', '--memory', '128m', '--cap-drop', 'ALL', '--user', '1000:1000', '-e', 'FIXTURE_KEY', '-e', 'FIXTURE_DATABASE', '--mount', `type=bind,src=${path.join(root, 'scripts/fixtures/self-host-provider.cjs')},dst=/fixture/provider.cjs,readonly`, BASE_IMAGE, 'node', '/fixture/provider.cjs']);
  const providerOrigin = 'http://' + docker(['port', proxyName, '7779/tcp']);
  const runtime = { ...publicInputs, GALX_CONNECT_ENABLED: '1', GALX_CONNECT_ORIGIN: config.issuer, GALX_NOVA_RESOURCE: config.resource, GALX_CONNECT_CLIENTS: JSON.stringify(config.clients), DATABASE_URL: `postgresql://postgres:${password}@127.0.0.1:55432/galx_integration_test?sslmode=disable`, GALX_PREMIUM_RELAY_URL: 'http://127.0.0.1:7779', GALX_PREMIUM_RELAY_KEY: secret, GALX_VAULT_KEY_V1: randomBytes(32).toString('hex'), GALX_AUDIT_SIGNING_SECRET: randomBytes(32).toString('hex') };
  const configFile = path.join(output, 'runtime-private.json'); fs.writeFileSync(configFile, JSON.stringify(runtime), { mode: 0o600 });
  const policy = composePlan({ image: image.image, configFile }).services.web;
  // Synthetic provider anchors an internal network namespace across application
  // restarts. HTTP is permitted only on loopback; do not relax that source rule.
  // This fixture placement is not a production sidecar or new proxy service.
  owned.add(appName);
  docker(['run', '-d', '--name', appName, '--label', `galx.fixture=${runId}`, '--platform', 'linux/amd64', '--network', `container:${providerName}`, '--init', '--user', policy.user, '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true', '--memory', policy.mem_limit, '--cpus', String(policy.cpus), '--pids-limit', String(policy.pids_limit), '--stop-timeout', String(STOP_SECONDS), '--restart', 'unless-stopped', '--log-driver', 'json-file', '--log-opt', 'max-size=10m', '--log-opt', 'max-file=3', ...policy.tmpfs.flatMap((v: string) => ['--tmpfs', v]), '--mount', `type=bind,src=${configFile},dst=/run/secrets/galx-runtime.json,readonly`, image.image]);
  const origin = 'http://' + docker(['port', proxyName, '3000/tcp']);
  const headers = { Host: 'galx.ai', 'X-Forwarded-Proto': 'https' };
  for (let i = 0; ; i++) { try { if ((await fetch(origin + '/api/health', { headers })).ok) break; } catch {} if (i === 100) throw Error('Packaged application unavailable'); await delay(250); }
  const initialHealth=await fetch(origin+'/api/health',{headers});
  assert.equal(initialHealth.status,200);
  assert.equal((await initialHealth.json()).status,'healthy','Packaged HTTP must return actual liveness, not an HTML fallback.');
  // Cold emulated startup can still occupy the event loop after the first
  // response. Match the container's bounded repeated liveness observations.
  for(let attempt=0;;attempt++){
    try{docker(['exec', appName, 'node', '/app/healthcheck.cjs']);break;}
    catch{if(attempt===2)throw Error('Packaged native liveness failed after three observations.');await delay(1000);}
  }
  const record = JSON.parse(docker(['inspect', appName]))[0];
  assert(record.HostConfig.ReadonlyRootfs); assert.equal(record.HostConfig.StopTimeout ?? record.Config.StopTimeout, STOP_SECONDS);
  assert.equal(record.Config.User, '1000:1000'); assert.equal(record.Mounts.filter((m: any) => m.Type === 'bind').length, 1);
  assert(!JSON.stringify(record.Config.Env).includes(secret)); assert(!record.Mounts.some((m: any) => m.Destination.includes('docker.sock')));
  results.push({ name: 'whole package boot under enforced runtime policy', image: record.Image, readOnly: true, uid: 1000, boundedCaches: true, secretNotInDockerEnvironment: true, fixtureProviderTransport: 'authenticated loopback in a shared internal network namespace; no external egress' });
  for (const route of ['/', '/connect', '/api/health', '/post-mortem/CURRENT_STATE.md', '/.env', '/docs/VERCEL_DEPLOYMENT.md', '/api/internal/telemetry', '/operator/status']) {
    const r = await fetch(origin + route, { headers, redirect: 'manual' }), body = await r.text();
    assert(!body.includes(secret)); assert(!/GALX_PRIVATE_(POST_MORTEM|KNOWLEDGE)_CONTENT|0\.0\.0\.0:3000|mac-loopback-v1|GALX_SELF_HOST_AUTHORITY/.test(body + JSON.stringify([...r.headers])));
    if (route === '/' || route === '/api/health') assert.equal(r.status, 200);
    if (route === '/post-mortem/CURRENT_STATE.md' || route === '/.env') assert.equal(r.status, 404);
    if (route.startsWith('/docs/')) {
      assert([404, 308].includes(r.status));
      if (r.status === 308) { const target = new URL(r.headers.get('location')!, 'https://galx.ai'); assert.equal(target.origin, 'https://galx.ai'); assert(!target.pathname.includes('VERCEL_DEPLOYMENT')); }
    }
    if (route === '/api/internal/telemetry') assert([401, 403, 404].includes(r.status));
    if (route === '/operator/status') assert.equal(r.status, 404);
    results.push({ name: 'HTTP boundary ' + route, status: r.status, sanitized: true });
  }
  const repo = new ConnectRepository(config, pool), owner = randomUUID(), ordinary = randomUUID();
  const metadata = await fetch(origin + '/.well-known/oauth-authorization-server', { headers });
  const metadataBody = await metadata.json();
  assert.equal(metadata.status, 200, 'Packaged issuer metadata: ' + JSON.stringify(metadataBody));
  assert.equal(metadataBody.issuer, config.issuer); results.push({ name: 'packaged canonical issuer metadata', status: 200, issuer: metadataBody.issuer });
  await pool.query('INSERT INTO auth.users(id) VALUES ($1),($2)', [owner, ordinary]);
  await pool.query("INSERT INTO private.galx_inference_access(user_id,enabled,valid_until) VALUES ($1,true,now()+interval '1 day')", [owner]);
  const connect = async (user = owner, client = 'reference-native') => {
    const redirectUri = config.clients.find(c => c.id === client)!.redirectUris[0], challenge = createHash('sha256').update('v'.repeat(43)).digest('base64url');
    const authorize = await fetch(origin + '/oauth/authorize?' + new URLSearchParams({ response_type: 'code', client_id: client, redirect_uri: redirectUri, resource: config.resource, scope: 'inference:invoke', state: connectSecret(), code_challenge: challenge, code_challenge_method: 'S256' }), { headers });
    assert.equal(authorize.status, 303, 'Packaged authorization: ' + (authorize.status === 303 ? '' : await authorize.text())); await authorize.body?.cancel();
    const pendingUrl = new URL(authorize.headers.get('location')!); assert.equal(pendingUrl.origin, config.issuer);
    const cookie = authorize.headers.get('set-cookie')!.match(/__Host-galx_connect_flow=([A-Za-z0-9_-]{43})/)![1];
    // Only account-session establishment is synthetic. Begin, PKCE exchange,
    // refresh, revocation and all inference go through the packaged HTTP server.
    const redirect = new URL(await repo.decide(pendingUrl.searchParams.get('request')!, connectHash(cookie), user, true));
    const exchanged = await fetch(origin + '/oauth/token', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code', client_id: client, resource: config.resource, redirect_uri: redirectUri, code: redirect.searchParams.get('code')!, code_verifier: 'v'.repeat(43) }) });
    assert.equal(exchanged.status, 200); return exchanged.json();
  };
  const refreshHttp = async (token: string, client = 'reference-native') => fetch(origin + '/oauth/token', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'refresh_token', client_id: client, resource: config.resource, refresh_token: token }) });
  const status = async () => (await fetch(providerOrigin + '/_fixture/status', { headers: { Authorization: 'Bearer ' + secret } })).json();
  const invoke = (token: string, mode = 'complete', key = randomUUID(), extra: Record<string, string> = {}, signal?: AbortSignal) => fetch(origin + '/v1/inference', { method: 'POST', signal, headers: { Host: 'nova.galx.ai', 'X-Forwarded-Proto': 'https', Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', 'Idempotency-Key': key, ...extra }, body: JSON.stringify({ messages: [{ role: 'user', content: mode }], stream: true }) });
  const safe = (body: string) => { assert(!/PRIVATE_|reasoning_content|pooler|postgresql:/.test(body)); assert(!body.includes(secret)); };
  const denied = async (name: string, token: string, expected: number, extra: Record<string, string> = {}) => {
    const before = await status(), r = await invoke(token, 'complete', randomUUID(), extra), body = await r.text();
    assert.equal(r.status, expected, name + ': ' + body); safe(body); assert.equal((await status()).attempts, before.attempts);
    results.push({ name, status: r.status, code: JSON.parse(body).error.code, providerAttempts: 0 });
  };
  await denied('browser session does not authorize Nova', 'ordinary-session', 401, { Cookie: 'sb-fixture-auth-token=ordinary-session' });
  const cookieOnly = await fetch(origin + '/v1/inference', { method: 'POST', headers: { Host: 'nova.galx.ai', Cookie: 'sb-fixture-auth-token=ordinary-session', 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() }, body: JSON.stringify({ messages: [{ role: 'user', content: 'complete' }], stream: true }) });
  assert.equal(cookieOnly.status, 401); safe(await cookieOnly.text()); results.push({ name: 'cookie without Nova credential denied', status: 401 });
  await denied('unknown grant', 'galx_connect_at_' + 'a'.repeat(43), 401);
  await denied('no explicit entitlement', (await connect(ordinary)).access_token, 403);
  const token = await connect(), independent = await connect(owner, 'reference-browser');
  const mediaProfiles = (await pool.query('SELECT count(*)::int n FROM private.galx_account_profiles')).rows[0].n;
  const accountBefore = (await pool.query('SELECT row_to_json(u) row FROM auth.users u WHERE id=$1', [owner])).rows[0].row;
  const accountDenied = await fetch(origin + '/api/connect/connections', { headers: { ...headers, Authorization: 'Bearer ' + token.access_token } });
  assert.equal(accountDenied.status, 401); safe(await accountDenied.text()); results.push({ name: 'Nova credential cannot manage the GALX account', status: 401 });
  await denied('wrong client origin', token.access_token, 401, { Origin: 'https://wrong.invalid' });
  await denied('wrong host cannot borrow forwarded Nova authority', token.access_token, 400, { Host: 'wrong.invalid', 'X-Forwarded-Host': 'nova.galx.ai' });
  for (const Host of ['nova.galx.ai:3000', '127.0.0.1:3000', '0.0.0.0:3000']) await denied('unconfigured authority ' + Host, token.access_token, 400, { Host });
  await denied('Media authority cannot invoke Nova', token.access_token, 401, { Host: 'galx.ai' });
  const requestKey = randomUUID(); let response = await invoke(token.access_token, 'complete', requestKey), text = await response.text();
  assert.equal(response.status, 200, text); assert(text.includes('[DONE]')); safe(text); assert(!response.headers.has('x-private-upstream'));
  const completedId = JSON.parse(text.split('\n')[0].slice(6)).id;
  const completed = (await pool.query('SELECT row_to_json(n) row FROM private.galx_nova_requests n WHERE id=$1', [completedId])).rows[0].row;
  assert.equal(completed.state, 'completed'); results.push({ name: 'full Next application to synthetic provider', requestId: completedId, status: 200, state: completed.state, sanitized: true });
  const beforeDuplicate = await status(); response = await invoke(token.access_token, 'complete', requestKey); assert.equal(response.status, 409); await response.text(); assert.equal((await status()).attempts, beforeDuplicate.attempts);
  results.push({ name: 'duplicate preserves original execution', status: 409, newProviderAttempts: 0 });
  response = await invoke(token.access_token, 'slow-complete', randomUUID(), { 'X-Forwarded-Host': 'wrong.invalid', 'X-Forwarded-Proto': 'http', Forwarded: 'host=wrong.invalid;proto=http' });
  const streamStart = performance.now(), streamed = response.body!.getReader(); let streamedText = '', firstChunkMs: number | undefined;
  for (;;) { const part = await streamed.read(); if (part.done) break; firstChunkMs ??= performance.now() - streamStart; streamedText += new TextDecoder().decode(part.value); }
  const streamEndMs = performance.now() - streamStart; assert(streamEndMs - firstChunkMs! > 1000); assert(streamedText.includes('[DONE]')); safe(streamedText);
  results.push({ name: 'client-visible incremental stream; forged forwarding metadata ignored', firstChunkMs: Math.round(firstChunkMs!), completionMs: Math.round(streamEndMs), bufferedByNext: false });
  const rotatedResponse = await refreshHttp(token.refresh_token); assert.equal(rotatedResponse.status, 200); const rotated = await rotatedResponse.json(); await denied('consumed access token', token.access_token, 401);
  await pool.query("UPDATE private.galx_connect_tokens SET expires_at=now()-interval '1 second' WHERE access_hash=$1", [connectHash(rotated.access_token)]); await denied('expired authorization', rotated.access_token, 401);
  const current = await connect(), grant = (await pool.query('SELECT grant_id FROM private.galx_connect_tokens WHERE access_hash=$1', [connectHash(current.access_token)])).rows[0].grant_id;
  await pool.query("UPDATE private.galx_connect_grants SET resource='https://wrong.invalid' WHERE id=$1", [grant]); await denied('wrong audience', current.access_token, 401);
  await pool.query('UPDATE private.galx_connect_grants SET resource=$2 WHERE id=$1', [grant, config.resource]);
  await assert.rejects(pool.query("UPDATE private.galx_connect_grants SET scope='' WHERE id=$1", [grant]));
  const revoke = await fetch(origin + '/oauth/revoke', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: 'reference-native', token: current.refresh_token, token_type_hint: 'refresh_token' }) });
  assert.equal(revoke.status, 200); await revoke.text(); const revokedAt = performance.now();
  const denial = await invoke(current.access_token); assert.equal(denial.status, 401); await denial.text(); const revocationMs = Math.round(performance.now() - revokedAt);
  const revokedRefresh = await refreshHttp(current.refresh_token); assert.equal(revokedRefresh.status, 400); assert.equal((await revokedRefresh.json()).error, 'invalid_grant');
  response = await invoke(independent.access_token, 'complete', randomUUID(), { Origin: browser.origin }); assert.equal(response.status, 200); assert((await response.text()).includes('[DONE]'));
  assert.deepEqual((await pool.query('SELECT row_to_json(n) row FROM private.galx_nova_requests n WHERE id=$1', [completedId])).rows[0].row, completed);
  assert.deepEqual((await pool.query('SELECT row_to_json(u) row FROM auth.users u WHERE id=$1', [owner])).rows[0].row, accountBefore);
  assert.equal((await pool.query('SELECT count(*)::int n FROM private.galx_account_profiles')).rows[0].n, mediaProfiles);
  const media = await fetch(origin + '/', { headers }); assert.equal(media.status, 200); safe(await media.text());
  results.push({ name: 'revocation', connectionId: grant, denialAfterAcknowledgementMs: revocationMs, refreshDenied: true, independentClientWorks: true, completedRecordUnchanged: true });
  results.push({ name: 'GALX identity and Media remain independent', accountRecordUnchanged: true, profilesUnchanged: true, mediaHttpStatus: 200 });
  const browserResult = await browser.run(origin, bufferSource, independent.access_token);
  assert.equal(browserResult.status, 200); assert.equal(browserResult.finish, 'stop'); assert.equal(browserResult.credentialExposed, false); assert.equal(browserResult.consoleErrors, 0);
  assert(browserResult.arrivals.some((p: any) => p.keepalive)); assert(browserResult.completedMs - browserResult.arrivals[0].ms > 15000);
  results.push({ name: 'real Chromium streaming and bounded client aggregation from accepted source', ...browserResult });

  const interrupted = await connect(), abort = new AbortController();
  response = await invoke(interrupted.access_token, 'hold', randomUUID(), {}, abort.signal); assert.equal(response.status, 200);
  const reader = response.body!.getReader(), first = await reader.read(), cancelId = JSON.parse(new TextDecoder().decode(first.value).split('\n')[0].slice(6)).id;
  abort.abort(); await reader.cancel().catch(() => {});
  let state;
  for (let i = 0; i < 100; i++) { state = (await pool.query('SELECT state FROM private.galx_nova_requests WHERE id=$1', [cancelId])).rows[0].state; if (state === 'unknown') break; await delay(25); }
  assert.equal(state, 'unknown'); results.push({ name: 'socket cancellation persists neutral terminal outcome', requestId: cancelId, state, automaticReplay: false });

  const freshAccess = async () => {
    const user = randomUUID(); await pool!.query('INSERT INTO auth.users(id) VALUES ($1)', [user]);
    await pool!.query("INSERT INTO private.galx_inference_access(user_id,enabled,valid_until) VALUES ($1,true,now()+interval '1 day')", [user]);
    return connect(user);
  };
  const inflightAccess = await freshAccess(), inflightKey = randomUUID(), inflightBefore = await status();
  response = await invoke(inflightAccess.access_token, 'slow-complete', inflightKey); assert.equal(response.status, 200);
  const inflightReader = response.body!.getReader(), inflightFirst = await inflightReader.read();
  const inflightId = JSON.parse(new TextDecoder().decode(inflightFirst.value).split('\n')[0].slice(6)).id;
  const inflightRevoke = await fetch(origin + '/oauth/revoke', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: 'reference-native', token: inflightAccess.refresh_token }) });
  assert.equal(inflightRevoke.status, 200); await inflightRevoke.text();
  await denied('revocation during execution denies new work', inflightAccess.access_token, 401);
  let inflightOutput = ''; for (;;) { const part = await inflightReader.read(); if (part.done) break; inflightOutput += new TextDecoder().decode(part.value); }
  assert(inflightOutput.includes('[DONE]')); assert.equal((await status()).attempts, inflightBefore.attempts + 1);
  assert.equal((await pool.query('SELECT state FROM private.galx_nova_requests WHERE id=$1', [inflightId])).rows[0].state, 'completed');
  results.push({ name: 'already-admitted execution can finish after disconnect', state: 'completed', providerAttempts: 1, replayed: false });
  for (const mode of ['reject', 'fail', 'drop', 'unknown']) {
    const credential = await freshAccess(), before = await status(), r = await invoke(credential.access_token, mode), body = await r.text();
    safe(body); assert.equal(r.status, mode === 'reject' ? 503 : 200);
    assert.match(body, mode === 'reject' ? /service_busy/ : /outcome_unconfirmed/); assert(!body.includes('[DONE]'));
    const after = await status(); assert.equal(after.attempts - before.attempts, mode === 'reject' ? 0 : 1);
    assert.equal(after.explicitFailures - before.explicitFailures, mode === 'fail' ? 1 : 0);
    results.push({ name: 'synthetic provider ' + mode, state: mode === 'reject' ? 'not_accepted' : 'unknown', newProviderAttempts: after.attempts - before.attempts, explicitProviderFailureSignals: after.explicitFailures - before.explicitFailures, replayed: false });
  }
  const capacityAccess = await freshAccess(), capacityBefore = await status();
  const active = [];
  for (let i = 0; i < 2; i++) { const controller = new AbortController(); const r = await invoke(capacityAccess.access_token, 'hold', randomUUID(), {}, controller.signal); assert.equal(r.status, 200); const reader = r.body!.getReader(); await reader.read(); active.push({ controller, reader }); }
  const busy = await invoke(capacityAccess.access_token); assert.equal(busy.status, 503); assert.equal((await busy.json()).error.code, 'service_busy');
  assert.equal((await status()).attempts, capacityBefore.attempts + 2);
  for (const entry of active) { entry.controller.abort(); await entry.reader.cancel().catch(() => {}); }
  results.push({ name: 'shared admission remains bounded', active: 2, excessStatus: 503, excessProviderAttempts: 0 });
  const disconnected = await freshAccess(), disconnectBefore = await status();
  response = await invoke(disconnected.access_token, 'hold'); assert.equal(response.status, 200);
  const lostReader = response.body!.getReader(), lostChunk = await lostReader.read();
  const lostId = JSON.parse(new TextDecoder().decode(lostChunk.value).split('\n')[0].slice(6)).id;
  await lostReader.cancel();
  for (let i = 0; i < 100; i++) { state = (await pool.query('SELECT state FROM private.galx_nova_requests WHERE id=$1', [lostId])).rows[0].state; if (state === 'unknown') break; await delay(25); }
  assert.equal(state, 'unknown'); assert.equal((await status()).explicitFailures, disconnectBefore.explicitFailures);
  results.push({ name: 'lost client socket', state, explicitProviderFailuresAdded: 0, replayed: false });

  // Full unchanged 300-second deadline, including SIGTERM while a request is
  // active. Keep the client attached; Next must drain its pending after work.
  const started = performance.now(), deadlineKey = randomUUID(), beforeDeadline = await status();
  response = await invoke(interrupted.access_token, 'hold', deadlineKey); assert.equal(response.status, 200);
  const deadlineReader = response.body!.getReader(), initial = await deadlineReader.read();
  const deadlineId = JSON.parse(new TextDecoder().decode(initial.value).split('\n')[0].slice(6)).id;
  console.log('Packaged application running full 300-second deadline and active SIGTERM drain fixture.');
  const stopping = dockerAsync(['stop', '--time', String(STOP_SECONDS), appName], (STOP_SECONDS + 15) * 1000);
  let terminal = '', heartbeats = 0;
  for (;;) { const part = await deadlineReader.read(); if (part.done) break; const value = new TextDecoder().decode(part.value); terminal += value; heartbeats += (value.match(/: keepalive/g) || []).length; }
  await stopping;
  const elapsedMs = Math.round(performance.now() - started);
  assert(elapsedMs >= 295000 && elapsedMs < 360000); assert(terminal.includes('outcome_unconfirmed')); assert(!terminal.includes('[DONE]')); safe(terminal);
  assert.equal((await pool.query('SELECT state FROM private.galx_nova_requests WHERE id=$1', [deadlineId])).rows[0].state, 'unknown');
  const stopped = JSON.parse(docker(['inspect', appName]))[0]; assert.equal(stopped.State.ExitCode, 0); assert.equal(stopped.State.OOMKilled, false);
  assert.equal((await status()).attempts, beforeDeadline.attempts + 1);
  assert.equal((await status()).explicitFailures, beforeDeadline.explicitFailures); assert(heartbeats >= 18);
  results.push({ name: 'unchanged 300-second deadline and active SIGTERM drain', requestId: deadlineId, elapsedMs, state: 'unknown', exitCode: stopped.State.ExitCode, heartbeats, explicitProviderFailuresAdded: 0, replayed: false });
  docker(['start', appName]);
  for (let i = 0; ; i++) { try { if ((await fetch(origin + '/api/health', { headers })).ok) break; } catch {} if (i === 100) throw Error('Restart unavailable'); await delay(250); }
  const resumedResponse = await refreshHttp(interrupted.refresh_token); assert.equal(resumedResponse.status, 200); const resumed = await resumedResponse.json();
  const restarted = await status(); response = await invoke(resumed.access_token, 'hold', deadlineKey); assert.equal(response.status, 409); assert.equal((await response.json()).error.execution_state, 'unknown'); assert.equal((await status()).attempts, restarted.attempts);
  await denied('revocation survives application restart', current.access_token, 401);
  const postRestartRefresh = await refreshHttp(current.refresh_token); assert.equal(postRestartRefresh.status, 400); await postRestartRefresh.text();
  results.push({ name: 'restart retains unknown and duplicate denial', newProviderAttempts: 0, state: 'unknown', cacheReseeded: true });

  await delay(10000); // allow Docker's successful-start restart-policy window
  const crashOwner = randomUUID(); await pool.query('INSERT INTO auth.users(id) VALUES ($1)', [crashOwner]);
  await pool.query("INSERT INTO private.galx_inference_access(user_id,enabled,valid_until) VALUES ($1,true,now()+interval '1 day')", [crashOwner]);
  const crashToken = await connect(crashOwner), crashKey = randomUUID(), beforeCrash = await status();
  response = await invoke(crashToken.access_token, 'hold', crashKey); assert.equal(response.status, 200);
  const crashReader = response.body!.getReader(), crashFirst = await crashReader.read();
  const crashId = JSON.parse(new TextDecoder().decode(crashFirst.value).split('\n')[0].slice(6)).id;
  // Kill only this fixture's application process. Docker's configured restart
  // owner must recover it; no second watchdog, manual service replacement or
  // production daemon interruption is involved.
  docker(['exec', appName, 'node', '-e', "const fs=require('fs');const ids=fs.readFileSync('/proc/1/task/1/children','utf8').trim().split(/\\s+/);const pid=ids.map(Number).find(p=>{const cmd=fs.readFileSync('/proc/'+p+'/cmdline','utf8');return cmd.includes('/app/server.cjs')||cmd.startsWith('next-server (');});if(!pid)process.exit(1);process.kill(pid,'SIGKILL');"]);
  await crashReader.read().catch(() => {}); await crashReader.cancel().catch(() => {});
  for (let i = 0; ; i++) {
    const observed = JSON.parse(docker(['inspect', appName]))[0];
    try { if (observed.RestartCount >= 1 && (await fetch(origin + '/api/health', { headers })).ok) break; } catch {}
    if (i === 120) throw Error('Automatic fixture restart unavailable'); await delay(250);
  }
  response = await invoke(crashToken.access_token, 'hold', crashKey); assert.equal(response.status, 409); assert.equal((await response.json()).error.execution_state, 'unknown');
  assert.equal((await status()).attempts, beforeCrash.attempts + 1);
  const crashState = (await pool.query('SELECT state FROM private.galx_nova_requests WHERE id=$1', [crashId])).rows[0].state;
  assert.equal(crashState, 'running');
  results.push({ name: 'abrupt process loss recovers without replay', requestId: crashId, persistedState: crashState, clientOutcome: 'unknown', newProviderAttemptsAfterRestart: 0, restartCount: JSON.parse(docker(['inspect', appName]))[0].RestartCount, note: 'SIGKILL cannot commit terminal work; retained record is preserved and duplicate admission remains denied.' });
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ at: new Date().toISOString(), image: image.image, manifestSha256: image.manifestSha256, network: 'dedicated internal Docker bridge; application/provider/database have no external egress', realProvider: false, realAccount: false, productionDatabase: false, migrations: migrations.length, results, metrics: await status(), limits: ['Synthetic account session/consent actor and provider; actual packaged HTTP authorization initiation, PKCE exchange, refresh, revocation and inference. No real sign-in, live tunnel or upstream acceptance.', 'Browser uses a loopback fixture ingress, fixed canonical host and the hash-verified candidate client buffer; no production proxy was added.', 'Provider-health classification is separately verified by the established relay suite; the HTTP fixture counts only its explicit failure signals.', 'No host reboot, forced sleep or Docker daemon failure was induced.'] }, null, 2) + '\n');
  fs.writeFileSync(path.join(packageDir, 'acceptance.json'), JSON.stringify({ status: 'PASSED', kind: 'local-synthetic-only', image: image.image, manifestSha256: image.manifestSha256, testSha256: runtimeAcceptanceHash(root), resultSha256: hashFile(path.join(output, 'result.json')), observedAt: new Date().toISOString(), publicCutoverAccepted: false }, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({ checks: results.length, revocationMs, fullDeadlineMs: elapsedMs, state: 'passed' }));
} catch (error: any) {
  let lifecycleStateCounts:unknown,fixtureExit:unknown;
  try{
    const logs=spawnSync('docker',['--context','desktop-linux','logs','--tail','35',appName],{env,encoding:'utf8',timeout:15000,maxBuffer:65536});
    fs.writeFileSync(path.join(output,'runtime-log.private.txt'),(logs.stdout+'\n'+logs.stderr).replaceAll(secret,'[redacted]').replaceAll(password,'[redacted]').slice(-16384),{mode:0o600});
    const observed=JSON.parse(docker(['inspect',appName]))[0];fixtureExit={running:observed.State.Running,exitCode:observed.State.ExitCode,oomKilled:observed.State.OOMKilled};
    lifecycleStateCounts=(await pool?.query('SELECT state,count(*)::int count FROM private.galx_nova_requests GROUP BY state ORDER BY state'))?.rows;
  }catch{}
  fs.writeFileSync(path.join(output, 'failure.json'), JSON.stringify({ at: new Date().toISOString(), name: error.name, message: String(error.message).replaceAll(secret, '[redacted]').replaceAll(password, '[redacted]'), completedChecks: results,lifecycleStateCounts,fixtureExit }, null, 2));
  console.error('Self-host runtime fixture failed. Private evidence records the bounded failure.'); process.exitCode = 1;
} finally {
  await browser.close();
  await pool?.end();
  for (const name of [appName, providerName, dbName, proxyName]) if (owned.has(name)) {
    try {
      const record = JSON.parse(docker(['inspect', name]))[0]; assert.equal(record.Config.Labels['galx.fixture'], runId);
      docker(['rm', '-f', record.Id]);
    } catch { console.error('Fixture cleanup uncertain; inspect its unique fixture label.'); process.exitCode = 1; }
  }
  if (networkOwned) { try { docker(['network', 'rm', network]); } catch { process.exitCode = 1; } }
  fs.rmSync(path.join(output, 'runtime-private.json'), { force: true });
}
