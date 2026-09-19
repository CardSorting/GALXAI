/** Read-only rollout checks. Never creates users, grants access, sends mail or starts paid work. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { getPostgresPool, closePostgresPool } from '../src/lib/db/postgres';

const site = new URL(process.argv[2] || 'https://galx.ai');
assert(site.protocol === 'https:' && (site.hostname === 'galx.ai' || /^galxai-[a-z0-9-]+\.vercel\.app$/.test(site.hostname)), 'Use the GALX production or staged deployment.');
assert(!site.username && !site.password && site.pathname === '/' && !site.search && !site.hash);
const checkGateway = process.argv.includes('--gateway');
// Vercel's authenticated curl command can issue a cookie for a protected staged build.
// Scope it to that exact host; never send it to production or the API gateway.
const cookieJar = process.env.GALX_PREVIEW_COOKIE_JAR;
const stagedCookies = cookieJar && site.hostname.endsWith('.vercel.app')
  ? (await readFile(cookieJar, 'utf8')).split('\n').map(line => line.replace(/^#HttpOnly_/, '').split('\t'))
    .filter(parts => parts.length === 7 && parts[0] === site.hostname && parts[5] === '_vercel_jwt')
    .map(parts => `${parts[5]}=${parts[6]}`).join('; ') : '';
const results: { method: string; path: string; status: number; host: string }[] = [];
const forbidden = /GALX_VAULT_|SUPABASE_SERVICE_ROLE_KEY|VM_RELAY_URL|galx_shard|private\.developer|preview_admin_(?:audit|members)|Internal decision note|upstreamId|executionModel|P-AHT|High-Concurrency Fleet Routing|crawler_quarantine_active|internal training substrates/;
async function request(origin: URL, pathname: string, method = 'GET', extra: Record<string, string> = {}) {
  const response = await fetch(new URL(pathname, origin), { method, redirect: 'manual', signal: AbortSignal.timeout(20_000), headers: {
    ...(origin.origin === site.origin && stagedCookies ? {cookie:stagedCookies} : {}), ...extra,
  } });
  results.push({ method, path: pathname, status: response.status, host: origin.hostname });
  assert.doesNotMatch(JSON.stringify(Object.fromEntries(response.headers)), forbidden, `Headers: ${pathname}`);
  return response;
}
try {
  const pool = getPostgresPool(); assert(pool, 'Server database configuration required.');
  const expectedMigrations = ['20260912215724','20260912222003','20260918250000','20260918251000'];
  const migrations = await pool.query('SELECT version FROM supabase_migrations.schema_migrations WHERE version = ANY($1::text[]) ORDER BY version', [expectedMigrations]);
  assert.deepEqual(migrations.rows.map(row => row.version), expectedMigrations);
  if (cohort) {
    const fields = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema='private' AND table_name='developer_access_requests' AND column_name IN ('introduction','github_url','linkedin_url','cohort_interest','application_updated_at')");
    assert.equal(fields.rows.length, 5);
  }
  const tables = await pool.query(`SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity,
    has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS anon_access,
    has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS browser_access
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='private'
    AND c.relname IN ('developer_access_requests','developer_preview_feedback','preview_admin_members','preview_admin_audit')`);
  assert.equal(tables.rows.length, 4);
  for (const table of tables.rows) { assert(table.relrowsecurity && table.relforcerowsecurity, table.relname); assert(!table.anon_access && !table.browser_access, table.relname); }
  const audit = await pool.query("SELECT has_table_privilege('service_role','private.preview_admin_audit','UPDATE,DELETE,TRUNCATE') AS mutable");
  assert.equal(audit.rows[0].mutable, false);
  const owners = await pool.query("SELECT count(*)::integer AS count, count(user_id)::integer AS active FROM private.preview_admin_members WHERE role='owner'");
  const roster = { owners: owners.rows[0].count, activeOwners: owners.rows[0].active };
  const scripts = new Set<string>();
  for (const pathname of ['/','/developers','/images','/sites','/pricing','/auth/signin?next=%2Fadmin','/auth/signup?next=%2Fdevelopers']) {
    const response = await request(site, pathname); assert.equal(response.status, 200, pathname);
    const html = await response.text(); assert.doesNotMatch(html, forbidden, pathname);
    for (const match of html.matchAll(/<script[^>]+src="([^"]+)"/g)) scripts.add(match[1].replaceAll('&amp;', '&'));
  }
  for (const script of scripts) {
    const url = new URL(script, site); assert.equal(url.origin, site.origin);
    const response = await request(site, url.pathname + url.search); assert.equal(response.status, 200, script);
    assert.doesNotMatch(await response.text(), forbidden, script);
  }
  for (const pathname of ['/v1/chat/completions','/v1/messages','/v1/embeddings','/v1/models','/v1/models/model.png','/api/chat','/api/run','/api/keys','/api/new-endpoint','/api/admin/preview?view=requests','/api/admin/preview?view=staff','/api/developer-access','/api/developer-access/check']) {
    for (const method of pathname === '/api/developer-access/check' ? ['POST'] : pathname === '/api/developer-access' ? ['GET','POST','PATCH'] : ['GET','POST']) {
      const response = await request(site, pathname, method, {'x-user-id':'invented','x-role':'owner','x-galx-approved':'true','x-middleware-subrequest':'middleware:middleware:middleware:middleware:middleware'});
      assert.equal(response.status, 401, `${method} ${pathname}`); assert.match(response.headers.get('cache-control') || '', /no-store/);
      assert.doesNotMatch(await response.text(), forbidden, pathname);
    }
  }
  for (const pathname of ['/admin','/models','/docs','/keys','/llms-full.txt']) {
    const response = await request(site, pathname); assert.equal(response.status, 307, pathname);
    const target = new URL(response.headers.get('location')!, site);
    assert.equal(target.pathname, pathname === '/admin' ? '/auth/signin' : '/developers');
  }
  const schema = await (await request(site, '/api/openapi.json')).json(); assert.deepEqual(Object.keys(schema.paths), ['/images/generations']);
  const image = await request(site, '/v1/images/generations', 'POST'); assert.equal(image.status, 401); assert.equal((await image.json()).error.code, 'unauthorized');
  const sites = await request(site, '/api/sites/workspace'); assert.equal(sites.status, 401); assert.doesNotMatch(await sites.text(), /developer_preview_required/);
  if (checkGateway) {
    const gateway = new URL('https://api.galx.ai');
    for (const pathname of ['/v1/models','/models','/v1/chat/completions','/chat/completions','/v1/messages','/v1/embeddings','/api/tags']) {
      const response = await request(gateway, pathname, 'POST'); assert.equal(response.status, 401, pathname); assert.doesNotMatch(await response.text(), forbidden);
    }
    const response = await request(gateway, '/v1/images/generations', 'POST'); assert.equal(response.status, 401); assert.equal((await response.json()).error.code, 'unauthorized');
  }
  const report = { checkedAt: new Date().toISOString(), site: site.origin, checkGateway, migrations: migrations.rows.map(row => row.version), tables: tables.rows, roster, scriptsScanned: scripts.size, results };
  await mkdir('docs/operations/evidence', { recursive: true });
  await writeFile(`docs/operations/evidence/preview-${site.hostname === 'galx.ai' ? 'production' : 'staged'}.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(`PASS: migrations, private privileges, ${results.length} HTTP checks, ${scripts.size} public scripts. Owners: ${roster.owners}; active: ${roster.activeOwners}.`);
} finally { await closePostgresPool(); }
