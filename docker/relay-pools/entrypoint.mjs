import { readFileSync } from 'node:fs';

try {
  const policy = JSON.parse(readFileSync(new URL('./pool.json', import.meta.url), 'utf8'));
  if (policy.pool !== 'premium' || policy.stage !== 'awaiting-central-authorization') throw Error();
  if (process.argv.length === 3 && process.argv[2] === '--describe') {
    console.log(JSON.stringify({ ...policy, servingReady: false }));
  } else {
    if (process.argv.length !== 2) throw Error();
    // Fail visibly on accidental root-env inheritance; never log supplied values.
    for (const [name, value] of Object.entries(process.env)) {
      if (value && /^(DATABASE_URL$|POSTGRES|PG(HOST|PORT|USER|PASSWORD|DATABASE|SERVICE)|SUPABASE|NEXT_PUBLIC_SUPABASE|GALX_VAULT|GALX_SHARDS|RELAY_ASSIGNED|RELAY_SHARD_ID$|RELAY_API_KEYS$|RELAY_ADMIN_API_KEYS$|RELAY_DISCOVER_HOST_CREDENTIALS$|RELAY_ACTIV|NODE_OPTIONS$)/.test(name)) throw Error();
    }
    if (process.env.RELAY_POOL && process.env.RELAY_POOL !== policy.pool) throw Error();
    const key = name => {
      const value = readFileSync(`/run/secrets/${name}`, 'utf8').trim();
      if (!/^[A-Za-z0-9_-]{32,256}$/.test(value)) throw Error();
      return value;
    };
    const inferenceKey = key('relay-inference-key'), adminKey = key('relay-admin-key');
    if (inferenceKey === adminKey) throw Error();
    const { GalxaiRelayServer } = await import('./relay.mjs');
    const relay = new GalxaiRelayServer({ stagedPool: policy.pool,
      host: '0.0.0.0', port: 3001, assignedShard: undefined, assignedShardId: undefined,
      registryEnabled: false, discoverHostCredentials: false, testOnlyMultiShard: false,
      masterSecret: undefined, shardsJsonPath: undefined,
      apiKeys: [inferenceKey], adminApiKeys: [adminKey], allowedOrigins: [],
      codexImageToolAlias: false, forwardOutputTokenLimit: false,
      maxUpstreamRetries: 0, stateSnapshotPath: '/tmp/galx-staged/relay-snapshot.json',
      drainTimeoutMs: 5000 });
    let stopping;
    const stop = () => { stopping ??= relay.stop().catch(() => { process.exitCode = 1; }); };
    process.once('SIGTERM', stop);
    process.once('SIGINT', stop);
    await relay.start();
    console.log(JSON.stringify({ component: 'relay_pool_image', pool: policy.pool, stage: policy.stage, servingReady: false }));
  }
} catch {
  console.error('Relay image startup refused. Check its fixed pool, separate secret files and credential-free environment.');
  process.exitCode = 1;
}
