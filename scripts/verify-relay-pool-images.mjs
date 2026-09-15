import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const fixture = mkdtempSync(path.join(tmpdir(), 'galx-pool-images-'));
const owned = [];
const evidence = { observedAt: new Date().toISOString(), stage: 'staged-images-only', images: [], checks: 0 };
const docker = (args, options = {}) => execFileSync('docker', args, { cwd: root, timeout: 60000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options }).trim();
function check(value, message) { assert(value, message); evidence.checks++; }
// Disposable synthetic values only. Files are readable by the non-root container
// under a private temporary parent; they are never real deployment credentials.
const secrets = {};
for (const pool of ['premium', 'standard']) for (const role of ['inference', 'admin']) {
  const name = `${pool}-${role}`;
  secrets[name] = path.join(fixture, name);
  writeFileSync(secrets[name], randomBytes(32).toString('base64url'), { mode: 0o444 });
}
const env = { ...process.env, GALX_PREMIUM_INFERENCE_KEY_FILE: secrets['premium-inference'],
  GALX_PREMIUM_ADMIN_KEY_FILE: secrets['premium-admin'], GALX_STANDARD_INFERENCE_KEY_FILE: secrets['standard-inference'],
  GALX_STANDARD_ADMIN_KEY_FILE: secrets['standard-admin'] };
const mounts = pool => ['--mount', `type=bind,src=${secrets[`${pool}-inference`]},dst=/run/secrets/relay-inference-key,readonly`,
  '--mount', `type=bind,src=${secrets[`${pool}-admin`]},dst=/run/secrets/relay-admin-key,readonly`];
const hardened = ['--network', 'none', '--read-only', '--user', '1000:1000', '--cap-drop', 'ALL',
  '--security-opt', 'no-new-privileges:true', '--pids-limit', '128', '--memory', '512m', '--cpus', '1',
  '--tmpfs', '/tmp:rw,noexec,nosuid,nodev,size=32m,uid=1000,gid=1000,mode=0700'];
try {
  const bundles = [];
  for (const pool of ['premium', 'standard']) {
    const image = `galxai-relay-${pool}:staged-20260915`;
    const details = JSON.parse(docker(['image', 'inspect', image]))[0];
    check(details.Config.User === '1000:1000', 'Non-root image');
    check(details.Config.Labels['io.galx.pool'] === pool, 'Fixed pool label');
    check(details.Config.Labels['io.galx.stage'] === 'awaiting-central-authorization', 'Honest stage label');
    check(!details.Config.Env.some(v => /DATABASE|VAULT|SUPABASE|TOKEN|SECRET/.test(v)), 'No account authority baked into environment');
    check(JSON.stringify(details.Config.Entrypoint) === JSON.stringify(['node', '/app/entrypoint.mjs']), 'Guarded entrypoint');
    const description = JSON.parse(docker(['run', '--rm', '--network', 'none', image, '--describe']));
    check(description.pool === pool && description.servingReady === false, 'Private image description');
    const bundle = docker(['run', '--rm', ...hardened, '--entrypoint', 'node', image, '--input-type=module', '-e', `
      import assert from 'node:assert/strict'; import fs from 'node:fs'; import crypto from 'node:crypto';
      import sharp from 'sharp'; import pg from 'pg'; import WebSocket from 'ws';
      for (const name of ['.env','.env.local','.relay','.git','docs','internal','post-mortem','src','dashboard.html']) assert(!fs.existsSync('/app/'+name));
      assert.deepEqual(fs.readdirSync('/app').sort(),['entrypoint.mjs','node_modules','package-lock.json','package.json','pool.json','relay.mjs']);
      await sharp({create:{width:1,height:1,channels:3,background:'#fff'}}).png().toBuffer();
      assert(pg.Pool && WebSocket); assert.throws(()=>fs.writeFileSync('/app/write-test','blocked'));
      console.log(crypto.createHash('sha256').update(fs.readFileSync('/app/relay.mjs')).digest('hex'));
    `]);
    check(/^[a-f0-9]{64}$/.test(bundle), 'Native dependencies, image contents and read-only filesystem'); bundles.push(bundle);
    const compose = JSON.parse(docker(['compose', '--env-file', '/dev/null', '-f', `docker/relay-pools/compose.${pool}.yaml`, 'config', '--format', 'json'], { env }));
    const service = compose.services.relay;
    check(service.image === image && service.read_only && service.user === '1000:1000', 'Compose matches image and filesystem policy');
    check(service.ports.every(p => p.host_ip === '127.0.0.1'), 'Loopback-only template');
    check(compose.networks.runtime.internal === true && compose.name === `galx-relay-${pool}-staged`, 'Distinct internal network namespace');
    check(!service.environment && !service.volumes && !service.privileged, 'No environment inheritance, host directories or socket mounts');
    check(Object.values(compose.secrets).every(s => s.file.startsWith(fixture)), 'Only own synthetic secret files');
    for (const poison of ['DATABASE_URL=postgresql://synthetic.invalid/fixture', 'GALX_VAULT_MASTER_SECRET=synthetic',
      'RELAY_ASSIGNED_SHARD={}', `RELAY_POOL=${pool === 'premium' ? 'standard' : 'premium'}`, 'RELAY_ACTIVATE=true']) {
      let rejected = false;
      try { docker(['run', '--rm', ...hardened, ...mounts(pool), '-e', poison, image]); }
      catch (error) { rejected = error.status === 1 && String(error.stderr).includes('startup refused') && !String(error.stderr).includes('synthetic.invalid'); }
      check(rejected, `Reject unsafe configuration: ${poison.split('=')[0]}`);
    }
    const id = docker(['run', '-d', ...hardened, ...mounts(pool), '--label', 'io.galx.verification=relay-pool-images', image]);
    check(/^[a-f0-9]{64}$/.test(id), 'Owned disposable container ID'); owned.push(id);
    const result = JSON.parse(docker(['exec', id, 'node', '--input-type=module', '-e', `
      import assert from 'node:assert/strict'; import fs from 'node:fs';
      const admin=fs.readFileSync('/run/secrets/relay-admin-key','utf8').trim(), inference=fs.readFileSync('/run/secrets/relay-inference-key','utf8').trim();
      let live; for(let i=0;i<40;i++){try { live=await fetch('http://127.0.0.1:3001/health/live'); if(live.ok) break; }catch{} await new Promise(r=>setTimeout(r,100));}
      assert(live?.ok); assert.deepEqual(await live.json(),{status:'ok'});
      const request=(p,key,method='GET')=>fetch('http://127.0.0.1:3001'+p,{method,headers:key?{Authorization:'Bearer '+key}:{}});
      for(const key of [undefined,inference,'peer-fixture-key']) assert.equal((await request('/health/ready',key)).status,401);
      const readiness=await request('/health/ready',admin); assert.equal(readiness.status,503); const body=await readiness.json(); assert.equal(body.ready,false);
      for(const route of ['/v1/chat/completions','/v1/images/generations','/api/capabilities/probe-image','/api/sites/contract','/api/shards/enroll','/v1/responses','/v1/jobs/x/stream']) {
        const r=await request(route,admin,'POST'); assert.equal(r.status,503); assert.deepEqual(await r.json(),{error:{code:'service_unavailable',message:'This service is temporarily unavailable.'}});
      }
      console.log(JSON.stringify({pool:body.pool,ready:body.ready,workloads:body.allowedWorkloads}));
    `]));
    check(result.pool === pool && result.ready === false, 'Built engine health, admin authorization and request denial');
    docker(['stop', '--time', '10', id]);
    const stopped = JSON.parse(docker(['inspect', id]))[0];
    check(stopped.State.ExitCode === 0, 'Graceful SIGTERM');
    evidence.images.push({ tag: image, id: details.Id, platform: `${details.Os}/${details.Architecture}`, sizeBytes: details.Size, bundleSha256: bundle });
  }
  check(bundles[0] === bundles[1], 'Mirrored engine build in both images');
  mkdirSync(path.join(root, '.relay'), { recursive: true });
  writeFileSync(path.join(root, '.relay/pool-images-verification.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  for (const id of owned) docker(['rm', '-f', id]);
  rmSync(fixture, { recursive: true, force: true });
}
