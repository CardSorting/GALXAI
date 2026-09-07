import { clearExpiredCredentials } from '../src/relay/shard-registry.js';

const args = process.argv.slice(2);
if (args.some(arg => arg !== '--dry-run')) {
  console.error('Usage: npm run shards:clear-expired -- [--dry-run]');
  process.exitCode = 1;
} else {
  clearExpiredCredentials({ dryRun: args.includes('--dry-run') }).then(result => {
    console.log(JSON.stringify(result));
    if (!result.dryRun) console.log('Expired credentials revoked. The relay reloads the registry on its next request (within 5 seconds).');
  }).catch(() => {
    console.error('Expired credential cleanup failed. Check database connectivity and backend permissions.');
    process.exitCode = 1;
  });
}
