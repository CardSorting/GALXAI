// Owns an empty, disposable PostgreSQL fixture. Never reads .env or DATABASE_URL.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import { checkBoundary } from './verify.mjs';

if (process.argv.length !== 2) throw new Error('This proof accepts no target or connection arguments.');
const execute = promisify(execFile);
const docker = (...args) => execute('docker', args, { timeout: 120000, maxBuffer: 1024 * 1024 });
const image = 'pgvector/pgvector@sha256:cf134a767f474095eeba57e0117be8e568e011a63f33fbf252f14c9b760f8e6f';
const runId = randomUUID(), container = `galx-pool-proof-${runId}`;
const password = randomBytes(24).toString('hex');
let created = false, admin;
const connections = [];
try {
  created = true; // Check the ownership label even if create's acknowledgement is lost.
  await execute('docker', ['run','--detach','--rm','--name',container,
    '--label',`galx.pool-proof.run=${runId}`,'--publish','127.0.0.1::5432',
    '--tmpfs','/var/lib/postgresql/data:rw,nosuid,noexec,size=536870912','--memory','512m',
    '--env','POSTGRES_PASSWORD','--env','POSTGRES_DB=galx_pool_schema_proof',image],
    {env:{PATH:process.env.PATH,HOME:process.env.HOME,POSTGRES_PASSWORD:password},timeout:120000,maxBuffer:1024*1024});
  const address = (await docker('port',container,'5432/tcp')).stdout.trim();
  if (!/^127\.0\.0\.1:\d+$/.test(address)) throw new Error('Fixture is not isolated to loopback.');
  const config = {host:'127.0.0.1',port:Number(address.split(':')[1]),database:'galx_pool_schema_proof',connectionTimeoutMillis:2000,statement_timeout:10000,max:2};
  admin = new pg.Pool({...config,user:'postgres',password});
  let ready=false;
  for(let attempt=0;attempt<40;attempt++) {
    try { await admin.query('SELECT 1');ready=true;break; } catch { await new Promise(r=>setTimeout(r,250)); }
  }
  if(!ready) throw new Error('Fixture did not become ready.');
  const version = (await admin.query('SHOW server_version')).rows[0].server_version;
  await admin.query(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));
  const actors={};
  for(const suffix of ['premium_controller','standard_controller','premium_operator','standard_operator','premium_monitor','standard_monitor','outsider','service']) {
    const role=`pool_lab_${suffix}`, secret=randomBytes(24).toString('hex');
    // Identifiers are from the fixed list above; secret is generated hex, never logged.
    await admin.query(`ALTER ROLE ${role} PASSWORD '${secret}'`);
    actors[suffix]=new pg.Pool({...config,user:role,password:secret});
    connections.push(actors[suffix]);
  }
  console.log(`Disposable PostgreSQL ${version}: testing real restricted logins.`);
  await checkBoundary(admin,actors);
} catch(error) {
  // Avoid printing connection strings or fixture credentials in database diagnostics.
  console.error(error.name==='AssertionError' ? error.message : `Pool schema proof failed: ${error.code || error.name}: ${error.message}`);
  process.exitCode=1;
} finally {
  await Promise.allSettled(connections.map(p=>p.end()));
  await admin?.end();
  if(created) {
    try {
      const record=JSON.parse((await docker('inspect',container)).stdout)[0];
      if(record.Config.Labels['galx.pool-proof.run']!==runId) throw new Error('Fixture ownership mismatch');
      await docker('stop','--time','2',record.Id);
      console.log('Stopped and removed only the owned pool-schema fixture.');
    } catch(error) {
      if(!String(error.stderr).includes('No such object')) { console.error('Fixture cleanup failed. Inspect the recorded pool-proof container.');process.exitCode=1; }
    }
  }
}
