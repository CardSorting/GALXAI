/** Private Mac database operations. Never imports application runtime or prints credentials. */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes, createHash } from 'node:crypto';
import pg from 'pg';
import assert from 'node:assert/strict';

const exec = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const home = path.join(root, '.data/local-postgres');
const bin = '/opt/homebrew/opt/postgresql@17/bin';
const user = os.userInfo().username;
const targets = {
  central: { database: 'galxai', port: 55432, project: 'mazhcjisettrzbqhorvp' },
  premium: { database: 'galx_relay_premium', port: 55433, project: 'prgjcyokylzcsqrjmkaa' },
};
const schemas = ['public', 'private', 'auth', 'galx_account_auth', 'supabase_migrations', 'extensions'];
const identifier = s => '"' + s.replaceAll('"', '""') + '"';
const literal = s => "'" + s.replaceAll("'", "''") + "'";
const timestamp = () => new Date().toISOString().replaceAll(/[:.]/g, '-');
const directory = name => path.join(home, name);
const privateWrite = async (file, data) => { await fs.writeFile(file, data, { mode: 0o600 }); await fs.chmod(file, 0o600); };
const json = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const exists = async file => fs.access(file).then(() => true, () => false);
async function run(command, args, env = {}) {
  try { return (await exec(command, args, { cwd: root, env: { PATH: process.env.PATH, HOME: os.homedir(), LANG: 'en_US.UTF-8', ...env }, timeout: 180000, maxBuffer: 8 * 1024 * 1024 })).stdout; }
  catch (error) {
    const log = path.join(home, 'last-operation.log');
    await privateWrite(log, `${error.stderr || ''}\n${error.stdout || ''}`).catch(() => {});
    throw new Error(`Database operation failed (${path.basename(command)}); inspect the private last-operation.log.`, { cause: { code: error.code } });
  }
}
function admin(name, database = 'postgres') {
  return new pg.Client({ host: path.join(directory(name), 'socket'), port: targets[name].port,
    user, database, connectionTimeoutMillis: 5000, application_name: 'galx-local-postgres-operator' });
}
async function connected(client, callback) { await client.connect(); try { return await callback(client); } finally { await client.end(); } }
async function setup(name) {
  const dir = directory(name), cluster = path.join(dir, 'cluster'), socket = path.join(dir, 'socket');
  if (await exists(path.join(cluster, 'PG_VERSION'))) {
    if (!await exists(path.join(dir, 'instance.json'))) throw Error('Unmanaged cluster; refusing to change it.');
    console.log(`${name}: existing managed cluster retained.`); return;
  }
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  await fs.mkdir(socket, { recursive: true, mode: 0o700 });
  await run(path.join(bin, 'initdb'), ['-D', cluster, '-U', user, '--encoding=UTF8', '--locale=C', '--auth-local=peer', '--auth-host=scram-sha-256', '--data-checksums']);
  const config = `\n# GALX dedicated local cluster; no external listeners.\nlisten_addresses = '127.0.0.1'\nport = ${targets[name].port}\nunix_socket_directories = '${socket.replaceAll("'", "''")}'\nunix_socket_permissions = 0700\npassword_encryption = 'scram-sha-256'\nmax_connections = 60\nshared_buffers = '128MB'\nwork_mem = '4MB'\nmaintenance_work_mem = '64MB'\nwal_compression = on\nmax_wal_size = '1GB'\nmin_wal_size = '80MB'\nfsync = on\nsynchronous_commit = on\nfull_page_writes = on\nlog_statement = 'none'\nlog_min_error_statement = panic\nlog_parameter_max_length_on_error = 0\nlogging_collector = on\nlog_directory = 'log'\nlog_filename = 'postgresql-%a.log'\nlog_rotation_age = '1d'\nlog_truncate_on_rotation = on\nlog_file_mode = 0600\ntimezone = 'UTC'\n`;
  await fs.appendFile(path.join(cluster, 'postgresql.conf'), config);
  const roles = name === 'central' ? ['postgres', 'galx_control_service'] : ['postgres', 'galx_execution_service'];
  await privateWrite(path.join(cluster, 'pg_hba.conf'), `local all ${identifier(user)} peer\n` +
    roles.map(role => `host ${targets[name].database} ${role} 127.0.0.1/32 scram-sha-256`).join('\n') + '\nlocal all all reject\nhost all all 0.0.0.0/0 reject\nhost all all ::0/0 reject\n');
  await privateWrite(path.join(dir, 'instance.json'), JSON.stringify({ version: 1, name, ...targets[name], createdAt: new Date().toISOString() }, null, 2));
  await run(path.join(bin, 'pg_ctl'), ['-D', cluster, '-l', path.join(dir, 'startup.log'), '-w', 'start']);
  console.log(`${name}: PostgreSQL 17 initialized on loopback with checksums and SCRAM authentication.`);
}
async function source(name) {
  const phaseFile=path.join(root,'.data/postgres-cutover',name+'-cutover.json');
  if(await exists(phaseFile)){
    const phase=await json(phaseFile);
    if(phase.hostedProjectRetired||phase.hostedProjectPaused)throw Error('This hosted source is inactive. Use the active local backup/recovery procedure.');
  }
  if (name === 'central') {
    const url = new URL(process.env.DATABASE_URL || '');
    if (!decodeURIComponent(url.username).endsWith('.' + targets.central.project) || !url.hostname.endsWith('.pooler.supabase.com')) throw Error('The original central source must be selected explicitly.');
    url.port = '5432'; url.search = '';
    const state=path.join(root,'.data/postgres-cutover');
    let retained;
    try { retained=await json(path.join(state,'central-hosted.secret.json')); }
    catch(error) { if(error.code!=='ENOENT')throw error;retained=await json(path.join(root,'.relay/service-deployment/components/central.json')); }
    if(!retained.databaseCa||retained.databaseDeployment)throw Error('The original central source certificate must be retained before export.');
    const sslrootcert=path.join(state,'central-source-ca.crt');await privateWrite(sslrootcert,retained.databaseCa);
    return { host: url.hostname, port: Number(url.port), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1), ssl: { rejectUnauthorized: true,ca:retained.databaseCa },sslrootcert };
  }
  // The CLI obtains a short-lived migration login through the already authorized
  // management session. Never evaluate the emitted shell or print its password.
  const plan = await run('/opt/homebrew/bin/supabase', ['db', 'dump', '--project-ref', targets[name].project, '--dry-run']);
  const vars = {};
  for (const key of ['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE']) {
    const match = plan.match(new RegExp(`^export ${key}="([^"\\\\\\n]*)"$`, 'm'));
    if (!match) throw Error('Unsupported CLI connection plan; no shell was evaluated.');
    vars[key] = match[1];
  }
  if (!vars.PGUSER.endsWith('.' + targets[name].project) || !vars.PGHOST.endsWith('.pooler.supabase.com')) throw Error('Wrong Premium source.');
  return { host: vars.PGHOST, port: Number(vars.PGPORT), user: vars.PGUSER, password: vars.PGPASSWORD, database: vars.PGDATABASE, ssl: { rejectUnauthorized: false } };
}
function pgEnvironment(config) {
  return { PGHOST: config.host, PGPORT: String(config.port), PGUSER: config.user, PGPASSWORD: config.password || '', PGDATABASE: config.database, PGSSLMODE: config.sslrootcert ? 'verify-full' : config.ssl ? 'require' : 'disable', ...(config.sslrootcert?{PGSSLROOTCERT:config.sslrootcert}:{}), PGCONNECT_TIMEOUT: '10' };
}
async function tableManifest(client, included) {
  const tables = (await client.query(`SELECT n.nspname AS schema,c.relname AS name,c.relrowsecurity AS rls,c.relforcerowsecurity AS force_rls,
      pg_get_userbyid(c.relowner) AS owner,COALESCE(c.relacl::text,'') AS acl
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname=ANY($1) AND c.relkind IN ('r','p') ORDER BY 1,2`, [included])).rows;
  for (const table of tables) {
    const tableName = `${identifier(table.schema)}.${identifier(table.name)}`;
    const row = (await client.query(`SELECT count(*)::text AS rows,md5(coalesce(string_agg(digest,'' ORDER BY digest),'')) AS digest
      FROM (SELECT md5(to_jsonb(t)::text) AS digest FROM ${tableName} t) hashes`)).rows[0];
    Object.assign(table, row);
  }
  return tables;
}
async function snapshot(name) {
  const config = await source(name);
  const dest = path.join(home, `source-${name}-${timestamp()}`);
  await fs.mkdir(dest, { recursive: true, mode: 0o700 });
  const sourceClient = new pg.Client({ ...config, connectionTimeoutMillis: 10000 });
  await connected(sourceClient, async client => {
    await client.query('SET ROLE postgres');
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET LOCAL timezone='UTC'; SET LOCAL statement_timeout='120s';");
    const included = (await client.query('SELECT nspname FROM pg_namespace WHERE nspname=ANY($1) ORDER BY 1', [schemas])).rows.map(r => r.nspname);
    const snapshotId = (await client.query('SELECT pg_export_snapshot() AS id')).rows[0].id;
    const archive = path.join(dest, 'database.dump');
    await run(path.join(bin, 'pg_dump'), ['--role=postgres', '--format=custom', '--file', archive, '--snapshot', snapshotId,
      '--lock-wait-timeout=10s', ...included.flatMap(s => ['--schema', s])], pgEnvironment(config));
    await fs.chmod(archive, 0o600);
    const tables = await tableManifest(client, included);
    const roles = (await client.query(`SELECT rolname,rolinherit,rolbypassrls FROM pg_roles WHERE rolname !~ '^pg_' ORDER BY 1`)).rows;
    const memberships = (await client.query(`SELECT member::regrole::text AS member,roleid::regrole::text AS role,bool_or(inherit_option) AS inherit_option,bool_or(set_option) AS set_option
      FROM pg_auth_members WHERE member IN (SELECT oid FROM pg_roles WHERE rolname !~ '^pg_') GROUP BY 1,2 ORDER BY 1,2`)).rows;
    const namespaces = (await client.query('SELECT nspname,pg_get_userbyid(nspowner) AS owner FROM pg_namespace WHERE nspname=ANY($1)', [included])).rows;
    const extensions = (await client.query('SELECT extname,extversion FROM pg_extension ORDER BY 1')).rows;
    await client.query('COMMIT');
    await privateWrite(path.join(dest, 'manifest.json'), JSON.stringify({ version: 1, name, project: targets[name].project, capturedAt: new Date().toISOString(), included, tables, roles, memberships, namespaces, extensions,
      sha256: createHash('sha256').update(await fs.readFile(archive)).digest('hex'),
      limits: 'Database snapshot only. Auth service and external object bytes are not migrated. Writer freeze and activation require a separate migration receipt.' }, null, 2));
  });
  await privateWrite(path.join(directory(name), 'latest-source.json'), JSON.stringify({ path: dest }));
  console.log(`${name}: consistent source snapshot retained privately, with table hashes and role metadata.`);
}
async function restore(name) {
  const dest = (await json(path.join(directory(name), 'latest-source.json'))).path;
  if (!dest.startsWith(home + path.sep + 'source-' + name + '-')) throw Error('Unexpected archive path.');
  const manifest = await json(path.join(dest, 'manifest.json')), archive = path.join(dest, 'database.dump');
  if (manifest.name !== name || manifest.project !== targets[name].project || manifest.sha256 !== createHash('sha256').update(await fs.readFile(archive)).digest('hex')) throw Error('Source archive identity/hash mismatch.');
  await connected(admin(name), async client => {
    const databaseExists = (await client.query('SELECT 1 FROM pg_database WHERE datname=$1', [targets[name].database])).rowCount;
    if (databaseExists) {
      await connected(admin(name, targets[name].database), async destination => {
        const objects = (await destination.query("SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=ANY($1) AND c.relkind IN ('r','p','v','m','S')", [manifest.included.filter(s => s !== 'extensions')])).rows[0].n;
        if (objects !== 0) throw Error('Destination contains application objects; refusing to overwrite it.');
      });
    }
    for (const role of manifest.roles) {
      if (role.rolname === user || /^pg_/.test(role.rolname)) throw Error('Unsafe imported role.');
      // Passwords, superuser, role/database creation and replication authority are never copied.
      if (!(await client.query('SELECT 1 FROM pg_roles WHERE rolname=$1', [role.rolname])).rowCount) await client.query(`CREATE ROLE ${identifier(role.rolname)} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION ${role.rolinherit ? 'INHERIT' : 'NOINHERIT'} ${role.rolbypassrls ? 'BYPASSRLS' : 'NOBYPASSRLS'}`);
    }
    for (const m of manifest.memberships) {
      if (!/^pg_/.test(m.role)) await client.query(`GRANT ${identifier(m.role)} TO ${identifier(m.member)} WITH INHERIT ${m.inherit_option}, SET ${m.set_option}`);
    }
    if (!databaseExists) await client.query(`CREATE DATABASE ${identifier(targets[name].database)} OWNER postgres TEMPLATE template0`);
    await client.query(`REVOKE ALL ON DATABASE ${identifier(targets[name].database)} FROM PUBLIC`);
  });
  await connected(admin(name, targets[name].database), async client => {
    await client.query('CREATE SCHEMA IF NOT EXISTS extensions AUTHORIZATION postgres');
    for (const extension of ['pgcrypto', 'uuid-ossp', 'vector']) await client.query(`CREATE EXTENSION IF NOT EXISTS ${identifier(extension)} WITH SCHEMA extensions`);
    for (const namespace of manifest.namespaces.filter(n => ['public', 'extensions'].includes(n.nspname))) await client.query(`ALTER SCHEMA ${identifier(namespace.nspname)} OWNER TO ${identifier(namespace.owner)}`);
  });
  const list = await run(path.join(bin, 'pg_restore'), ['--list', archive]);
  const selected = list.split('\n').filter(line => !/; \d+ \d+ SCHEMA - (public|extensions) /.test(line));
  const toc = path.join(dest, 'restore.list'); await privateWrite(toc, selected.join('\n'));
  const config = { host: path.join(directory(name), 'socket'), port: targets[name].port, user, database: targets[name].database };
  await run(path.join(bin, 'pg_restore'), ['--dbname', config.database, '--exit-on-error', '--single-transaction', '--use-list', toc, archive], pgEnvironment(config));
  await connected(admin(name, targets[name].database), async client => {
    await client.query(`ALTER DATABASE ${identifier(targets[name].database)} SET search_path=public,extensions`);
    const passwords = {};
    for (const role of (name === 'central' ? ['postgres', 'galx_control_service'] : ['postgres', 'galx_execution_service'])) {
      const password = randomBytes(36).toString('base64url'); passwords[role] = password;
      await client.query(`ALTER ROLE ${identifier(role)} LOGIN PASSWORD ${literal(password)}`);
      await client.query(`GRANT CONNECT ON DATABASE ${identifier(targets[name].database)} TO ${identifier(role)}`);
    }
    await privateWrite(path.join(directory(name), 'credentials.secret.json'), JSON.stringify(passwords));
    await client.query('ANALYZE');
  });
  console.log(`${name}: data, original owners, ACLs, RLS and restricted service roles restored; no source changed.`);
  await verify(name);
}
async function verify(name) {
  const sourcePath = (await json(path.join(directory(name), 'latest-source.json'))).path;
  const manifest = await json(path.join(sourcePath, 'manifest.json'));
  await connected(admin(name, targets[name].database), async client => {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET LOCAL timezone='UTC'");
    const actual = await tableManifest(client, manifest.included);
    // ACL arrays are sets: pg_restore may issue equivalent GRANTs in a different order.
    const defaults = Object.fromEntries((await client.query("SELECT rolname,acldefault('r',oid)::text AS acl FROM pg_roles")).rows.map(r => [r.rolname, r.acl]));
    const canonical = tables => tables.map(t => ({ ...t, acl: pg.types.getTypeParser(1009)(t.acl || defaults[t.owner]).sort() }));
    const expectedTables = canonical(manifest.tables), actualTables = canonical(actual);
    if (JSON.stringify(actualTables) !== JSON.stringify(expectedTables)) {
      const mismatches = actualTables.flatMap((table, index) => {
        const expected = expectedTables[index];
        const fields = Object.keys(table).filter(key => JSON.stringify(table[key]) !== JSON.stringify(expected?.[key]));
        return fields.length ? [{ schema: table.schema, table: table.name, fields }] : [];
      });
      await privateWrite(path.join(directory(name), 'verification-mismatches.json'), JSON.stringify(mismatches, null, 2));
      throw Error(`Restored snapshot differs; inspect the private verification-mismatches.json (${mismatches.length} tables).`);
    }
    await client.query('COMMIT');
    const report = { observedAt: new Date().toISOString(), name, database: targets[name].database, tables: actual.length,
      rows: actual.reduce((sum, t) => sum + Number(t.rows), 0), sourceCapturedAt: manifest.capturedAt,
      tableHashes: 'match', owners: 'match', tableAcls: 'match', rls: 'match',
      scope:'Snapshot-content comparison only; writer freeze, live placement and Auth service acceptance require separate evidence.' };
    await privateWrite(path.join(directory(name), 'verification.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  });
}
async function backup(name) {
  const folder = path.join(directory(name), 'backups'); await fs.mkdir(folder, { recursive: true, mode: 0o700 });
  const filename = path.join(folder, `${timestamp()}.dump`), temporary = filename + '.partial';
  const config = { host: path.join(directory(name), 'socket'), port: targets[name].port, user, database: targets[name].database };
  await run(path.join(bin, 'pg_dump'), ['--format=custom', '--file', temporary], pgEnvironment(config));
  await fs.chmod(temporary, 0o600);
  await run(path.join(bin, 'pg_restore'), ['--list', temporary]);
  await fs.rename(temporary, filename);
  // Keep fourteen successfully completed daily archives. Unfinished files are never treated as backups.
  const old = (await fs.readdir(folder)).filter(f => /^\d{4}-.*\.dump$/.test(f)).sort().slice(0, -14);
  for (const file of old) await fs.unlink(path.join(folder, file));
  console.log(`${name}: completed private local backup. Off-device backup remains separate.`);
}
async function rehearse(name) {
  const folder = path.join(directory(name), 'backups');
  const files = (await fs.readdir(folder)).filter(f => /^\d{4}-.*\.dump$/.test(f)).sort();
  if (!files.length) throw Error('Create a successful backup before rehearsing recovery.');
  const archive = path.join(folder, files.at(-1));
  const database = 'galx_restore_check_' + randomBytes(8).toString('hex');
  let created = false;
  await connected(admin(name), async client => {
    try {
      await client.query(`CREATE DATABASE ${identifier(database)} TEMPLATE template0`); created = true;
      await client.query(`REVOKE ALL ON DATABASE ${identifier(database)} FROM PUBLIC`);
      const config = { host: path.join(directory(name), 'socket'), port: targets[name].port, user, database };
      await run(path.join(bin, 'pg_restore'), ['--dbname', database, '--exit-on-error', '--single-transaction', archive], pgEnvironment(config));
      const included = (await json(path.join((await json(path.join(directory(name), 'latest-source.json'))).path, 'manifest.json'))).included;
      const expected = await connected(admin(name, targets[name].database), c => tableManifest(c, included));
      const actual = await connected(admin(name, database), c => tableManifest(c, included));
      assert.deepEqual(actual.map(({ acl, ...row }) => row), expected.map(({ acl, ...row }) => row));
      await privateWrite(path.join(directory(name), 'restore-rehearsal.json'), JSON.stringify({ observedAt: new Date().toISOString(), name, restoredTables: actual.length, dataHashes: 'match', backup: path.basename(archive), result: 'pass' }, null, 2));
      console.log(`${name}: backup restored into a disposable database; every table's data hash matches.`);
    } finally {
      // Only the random database created by this invocation can be removed.
      if (created) await client.query(`DROP DATABASE ${identifier(database)}`);
    }
  });
}
async function audit(name) {
  const credentials = await json(path.join(directory(name), 'credentials.secret.json'));
  const service = name === 'central' ? 'galx_control_service' : 'galx_execution_service';
  const relation = name === 'central' ? 'private.galx_relay_principals' : 'private.relay_executions';
  const protocol = name === 'central' ? 'private.relay_control(text,text,jsonb)' : 'private.relay_execution(text,uuid,text,jsonb)';
  const config = { host: '127.0.0.1', port: targets[name].port, database: targets[name].database, user: service, password: credentials[service], ssl: false, connectionTimeoutMillis: 2000 };
  await connected(new pg.Client(config), async client => {
    const role = (await client.query('SELECT rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0];
    assert(Object.values(role).every(value => value === false));
    assert.equal((await client.query('SELECT has_function_privilege(current_user,$1,\'EXECUTE\') AS allowed', [protocol])).rows[0].allowed, true);
    await assert.rejects(client.query(`SELECT * FROM ${relation} LIMIT 0`), { code: '42501' }, 'Direct private table access must be denied.');
    await assert.rejects(client.query('SET ROLE postgres'), { code: '42501' }, 'Role escalation must be denied.');
    await assert.rejects(client.query('CREATE SCHEMA unauthorized_probe'), { code: '42501' }, 'Schema creation must be denied.');
  });
  for (const deniedConfig of [ { ...config, password: randomBytes(24).toString('hex') },
    { ...config, user, password: '' }, { ...config, port: name === 'central' ? targets.premium.port : targets.central.port } ]) {
    const client = new pg.Client(deniedConfig);
    try { await assert.rejects(client.connect(), error => ['28000', '28P01'].includes(error.code)); }
    finally { await client.end(); }
  }
  await connected(admin(name, targets[name].database), async client => {
    const settings = (await client.query("SELECT current_setting('listen_addresses') AS listen,current_setting('data_checksums') AS checksums,current_setting('fsync') AS fsync")).rows[0];
    assert.deepEqual(settings, { listen: '127.0.0.1', checksums: 'on', fsync: 'on' });
    for (const role of ['anon', 'authenticated', 'service_role']) {
      await client.query('BEGIN');
      try {
        await client.query(`SET LOCAL ROLE ${identifier(role)}`);
        await assert.rejects(client.query(`SELECT * FROM ${relation} LIMIT 0`), { code: '42501' });
      } finally { await client.query('ROLLBACK'); }
    }
  });
  await privateWrite(path.join(directory(name), 'authorization-audit.json'), JSON.stringify({ observedAt: new Date().toISOString(), name, serviceLogin: 'pass', restrictedProtocol: 'pass', directTableDenial: 'pass', roleEscalationDenial: 'pass', ddlDenial: 'pass', incorrectPasswordDenial: 'pass', adminTcpDenial: 'pass', otherClusterDenial: 'pass', browserRolesDenied: 'pass', loopbackAndDurability: 'pass' }, null, 2));
  console.log(`${name}: restricted login, protocol permissions, table/DDL/role denials, cross-cluster denial and durability checks passed.`);
}
async function connections(name) {
  const passwords = await json(path.join(directory(name), 'credentials.secret.json'));
  const urls = Object.fromEntries(Object.entries(passwords).map(([role, password]) => [role, `postgresql://${role}:${password}@127.0.0.1:${targets[name].port}/${targets[name].database}`]));
  await privateWrite(path.join(directory(name), 'connections.secret.json'), JSON.stringify(urls, null, 2));
  await privateWrite(path.join(directory(name), 'application.secret.env'), `DATABASE_URL=${urls.postgres}\nPOSTGRES_SSL_MODE=disable\nPOSTGRES_POOL_SIZE=15\n`);
  console.log(`${name}: connection templates written privately. Active application and relay configuration has not changed.`);
}
async function restartCheck(name) {
  // Only the dedicated, copied cluster is exercised; no application cutover yet.
  const before = await connected(admin(name), async c => (await c.query('SELECT pg_postmaster_start_time()::text AS started')).rows[0].started);
  await run('/bin/launchctl', ['print', `gui/${os.userInfo().uid}/ai.galx.postgres.${name}`]);
  // launchd may replace postmaster.pid before pg_ctl observes its removal.
  // Send the stop without waiting, then verify a different postmaster below.
  await run(path.join(bin, 'pg_ctl'), ['-D', path.join(directory(name), 'cluster'), '-m', 'fast', '-W', 'stop']);
  let after;
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      after = await connected(admin(name), async c => (await c.query('SELECT pg_postmaster_start_time()::text AS started')).rows[0].started);
      if (after !== before) break;
    } catch { /* launchd observes exit and restarts after its throttle interval */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert(after && after !== before, 'launchd must restart PostgreSQL after exit.');
  await verify(name);
  await privateWrite(path.join(directory(name), 'restart-check.json'), JSON.stringify({ observedAt: new Date().toISOString(), name, automaticallyRestarted: true, sourceDataRetained: true }, null, 2));
  console.log(`${name}: automatic service restart and retained data verified.`);
}
const xml = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
async function services() {
  const uid = os.userInfo().uid, agentDir = path.join(os.homedir(), 'Library/LaunchAgents');
  for (const name of Object.keys(targets)) {
    const dir = directory(name), label = `ai.galx.postgres.${name}`, file = path.join(agentDir, label + '.plist');
    const existing = await exists(file);
    const argumentsXml = ['/usr/bin/caffeinate', '-is', path.join(bin, 'postgres'), '-D', path.join(dir, 'cluster')].map(s => `<string>${xml(s)}</string>`).join('');
    // macOS locale discovery can spawn a thread before PostgreSQL forks. Give
    // launchd an explicit locale, just as the interactive initializer receives.
    const environmentXml = '<key>EnvironmentVariables</key><dict><key>LANG</key><string>en_US.UTF-8</string><key>LC_ALL</key><string>C</string></dict>';
    const plist = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>Label</key><string>${label}</string>${environmentXml}<key>ProgramArguments</key><array>${argumentsXml}</array><key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>10</integer><key>StandardOutPath</key><string>${xml(path.join(dir, 'service.log'))}</string><key>StandardErrorPath</key><string>${xml(path.join(dir, 'service.log'))}</string></dict></plist>`;
    const current = existing ? await fs.readFile(file, 'utf8') : null;
    if (existing && current !== plist && current !== plist.replace(environmentXml, '')) throw Error('Existing service differs; refusing an unreviewed replacement.');
    if (current !== plist) {
      if (existing) await run('/bin/launchctl', ['bootout', `gui/${uid}`, file]);
      else await run(path.join(bin, 'pg_ctl'), ['-D', path.join(dir, 'cluster'), '-m', 'fast', '-w', 'stop']);
      await privateWrite(file, plist);
      await run('/bin/launchctl', ['bootstrap', `gui/${uid}`, file]);
    }
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      try { await connected(admin(name), c => c.query('SELECT 1')); ready = true; break; }
      catch { await new Promise(resolve => setTimeout(resolve, 250)); }
    }
    if (!ready) throw Error(`${name}: service did not become ready; inspect private PostgreSQL logs.`);
    const backupLabel = label + '.backup', backupFile = path.join(agentDir, backupLabel + '.plist');
    if (!await exists(backupFile)) {
      await privateWrite(backupFile, `<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict><key>Label</key><string>${backupLabel}</string><key>ProgramArguments</key><array><string>${xml(process.execPath)}</string><string>${xml(fileURLToPath(import.meta.url))}</string><string>backup</string><string>${name}</string></array><key>StartInterval</key><integer>86400</integer><key>StandardOutPath</key><string>${xml(path.join(dir, 'backup.log'))}</string><key>StandardErrorPath</key><string>${xml(path.join(dir, 'backup.log'))}</string></dict></plist>`);
      await run('/bin/launchctl', ['bootstrap', `gui/${uid}`, backupFile]);
    }
    console.log(`${name}: login service, crash restart, caffeinate and daily backups installed.`);
  }
}
async function status(name) {
  const facts = await connected(admin(name), async client => (await client.query('SELECT version(),current_setting(\'listen_addresses\') AS listen,current_setting(\'data_checksums\') AS checksums,current_setting(\'fsync\') AS fsync')).rows[0]);
  console.log({ name, port: targets[name].port, ...facts });
}
export { source as localPostgresSource, snapshot as snapshotLocalPostgresSource, restore as restoreLocalPostgres, verify as verifyLocalPostgres, tableManifest as localPostgresTableManifest };
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))try {
  await fs.mkdir(home, { recursive: true, mode: 0o700 }); await fs.chmod(home, 0o700);
  const [command, name, ...extra] = process.argv.slice(2);
  if (extra.length || (!targets[name] && command !== 'services')) throw Error('Use setup|snapshot|restore|verify|backup|rehearse|audit|connections|status|restart-check central|premium, or services.');
  const actions = { setup, snapshot, restore, verify, backup, rehearse, audit, connections, status, 'restart-check': restartCheck };
  if (command === 'services') await services();
  else if (actions[command]) await actions[command](name);
  else throw Error('Unknown database operation.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
