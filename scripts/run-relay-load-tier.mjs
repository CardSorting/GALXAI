import { spawnSync } from 'node:child_process';

const tier = process.argv[2] || 'stress';
if (!['smoke', 'stress', 'war'].includes(tier)) {
  console.error(`Unknown relay load tier: ${tier}. Use smoke, stress, or war.`);
  process.exit(2);
}

const result = spawnSync(
  process.execPath,
  ['--import', 'tsx', '--test', 'scripts/test-relay-load-balancing.ts'],
  {
    env: { ...process.env, RELAY_LOAD_TIER: tier },
    stdio: 'inherit'
  }
);

process.exit(result.status ?? 1);
