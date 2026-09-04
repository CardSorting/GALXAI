import pg from 'pg';
import { GalxCryptoVault } from '../src/core/vault/GalxCryptoVault';
import type { ProviderType } from '../src/core/contracts/GalxContracts';
import { getPostgresSslConfig } from '../src/lib/db/postgres';

interface EncryptedShardRow {
  id: string;
  user_id: string;
  provider: string;
  encrypted_ciphertext: string;
  encrypted_iv: string;
  encrypted_tag: string;
  key_version: string;
}

function readOption(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required for vault key rotation');

  const fromVersion = readOption('--from');
  const toVersion = readOption('--to');
  const apply = process.argv.includes('--apply');
  if (!fromVersion || !toVersion || fromVersion === toVersion) {
    throw new Error('Usage: npm run shards:rotate-vault -- --from v1 --to v2 [--apply]');
  }
  if (!/^v[1-9][0-9]*$/.test(fromVersion) || !/^v[1-9][0-9]*$/.test(toVersion)) {
    throw new Error('Vault versions must use the form v1, v2, ...');
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: getPostgresSslConfig(),
    connectionTimeoutMillis: 10_000
  });
  await client.connect();

  let rewrapped = 0;
  try {
    await client.query('BEGIN');
    const result = await client.query<EncryptedShardRow>(
      `SELECT id, user_id, provider::text, encrypted_ciphertext,
              encrypted_iv, encrypted_tag, key_version
       FROM public.galx_shard_accounts
       WHERE key_version = $1
       ORDER BY id
       FOR UPDATE`,
      [fromVersion]
    );

    for (const row of result.rows) {
      const plaintext = GalxCryptoVault.decryptSecret(
        {
          ciphertext: row.encrypted_ciphertext,
          iv: row.encrypted_iv,
          tag: row.encrypted_tag,
          keyVersion: row.key_version
        },
        row.user_id,
        row.id,
        row.provider as ProviderType
      );

      try {
        const replacement = GalxCryptoVault.encryptSecret(
          plaintext,
          row.user_id,
          row.id,
          row.provider as ProviderType,
          toVersion
        );
        const updated = await client.query(
          `UPDATE public.galx_shard_accounts
           SET encrypted_ciphertext = $3,
               encrypted_iv = $4,
               encrypted_tag = $5,
               key_version = $2,
               updated_at = clock_timestamp()
           WHERE id = $1 AND key_version = $6`,
          [row.id, toVersion, replacement.ciphertext, replacement.iv, replacement.tag, fromVersion]
        );
        if (updated.rowCount !== 1) throw new Error('concurrent shard key-version change detected');
        rewrapped++;
      } finally {
        for (const key of Object.keys(plaintext)) {
          (plaintext as Record<string, unknown>)[key] = undefined;
        }
      }
    }

    const remaining = await client.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM public.galx_shard_accounts WHERE key_version = $1',
      [fromVersion]
    );
    const target = await client.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM public.galx_shard_accounts WHERE key_version = $1',
      [toVersion]
    );

    if (apply) await client.query('COMMIT');
    else await client.query('ROLLBACK');

    console.log(JSON.stringify({
      mode: apply ? 'applied' : 'dry-run-rolled-back',
      fromVersion,
      toVersion,
      rewrapped,
      remainingAtValidationPoint: Number(remaining.rows[0]?.count || 0),
      targetAtValidationPoint: Number(target.rows[0]?.count || 0),
      shardIdentitiesPrinted: false
    }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
