import { readShardRegistry, decryptRegistryShard } from '../src/relay/shard-registry.js';
import { isLegacyIntegrationFixture, revokeIntegrationFixture } from '../src/relay/fixture-credential-cleanup.js';
import { closePostgresPool } from '../src/lib/db/postgres.js';

// Private operator CLI. Preview by default; preserve rows and credential evidence.
async function main() {
  if (process.argv.slice(2).some(arg => arg !== '--apply')) throw new Error('Use --apply to revoke confirmed legacy integration fixtures, or no arguments to preview.');
  const apply = process.argv.includes('--apply');
  const candidates = (await readShardRegistry()).filter(row => !row.permission_retracted
    && isLegacyIntegrationFixture(row, decryptRegistryShard(row)));
  let revoked = 0;
  if (apply) for (const row of candidates) if (await revokeIntegrationFixture(row, decryptRegistryShard(row))) revoked++;
  console.log(JSON.stringify({ dryRun: !apply, confirmedFixtures: candidates.length, revoked, ...(apply ? { skippedChangedOrBusy: candidates.length - revoked } : {}) }));
}
main().catch(() => { console.error('Fixture cleanup failed; inspect administrator diagnostics and retry.'); process.exitCode = 1; })
  .finally(() => closePostgresPool());
