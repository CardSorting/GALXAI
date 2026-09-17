/**
 * Enroll a federation-eligible shard using the authorized enrollment path.
 */
import pg from 'pg';
import * as crypto from 'node:crypto';
import { decryptRegistryShard, encryptRegistryShard } from '../src/relay/shard-registry.js';
import { desiredShard } from '../src/relay/desired-shards.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) { console.error('DATABASE_URL is required'); process.exit(1); }
const db = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000, query_timeout: 10000 });

async function main() {
  console.log('\n\x1b[1m\x1b[36m═══ Federation Shard Enrollment ═══\x1b[0m\n');

  // Step 1: Find a usable pool shard to fork credential from
  console.log('\x1b[1m[1/4] Finding source credential...\x1b[0m');
  const sources = await db.query(`
    SELECT * FROM public.galx_shard_accounts
    WHERE provider = 'openai' AND status = 'healthy'
      AND permission_retracted = false AND relay_pool_id IS NOT NULL
    ORDER BY credential_expires_at_ms DESC LIMIT 1
  `);
  if (!sources.rows.length) { console.error('No usable pool credentials'); process.exit(1); }

  const source = sources.rows[0];
  const decrypted = decryptRegistryShard(source);
  if (!decrypted) { console.error('Cannot decrypt source'); process.exit(1); }
  console.log(`  \x1b[32m✔\x1b[0m Source: ${source.id} (pool: ${source.relay_pool_id})`);

  // Step 2: Generate shard ID (must match ^codex_sh_[a-f0-9]{24}$)
  console.log('\n\x1b[1m[2/4] Creating federation shard...\x1b[0m');
  const secret = process.env.GALX_SHARD_ID_SECRET || process.env.GALX_VAULT_MASTER_SECRET;
  if (!secret) { console.error('Vault secret required'); process.exit(1); }

  const shardId = `codex_sh_${crypto.createHmac('sha256', secret).update(`openai:${decrypted.accountId}`).digest('hex').slice(0, 24)}`;
  const desktopId = crypto.randomUUID();

  console.log(`  Shard ID: ${shardId}`);
  console.log(`  Desktop ID: ${desktopId}`);

  // Check if this exact shard ID already exists  
  const existing = await db.query(`SELECT id, managed_desktop_id, relay_pool_id, status, permission_retracted FROM public.galx_shard_accounts WHERE id = $1`, [shardId]);
  if (existing.rows.length) {
    const ex = existing.rows[0];
    console.log(`  \x1b[33m▲\x1b[0m Shard ${shardId} already exists (pool=${ex.relay_pool_id}, desktop=${ex.managed_desktop_id}, status=${ex.status}, retracted=${ex.permission_retracted})`);
    // If it's already federation-eligible, just verify
    if (!ex.relay_pool_id && !ex.permission_retracted && ex.status === 'healthy') {
      console.log(`  \x1b[32m✔\x1b[0m Already federation-eligible — verifying...`);
      const row = (await db.query(`SELECT * FROM public.galx_shard_accounts WHERE id = $1`, [shardId])).rows[0];
      const dec = decryptRegistryShard(row);
      const shard = desiredShard(row, dec);
      console.log(`  desired: ${!!shard}`);
      if (shard) { console.log(`  \x1b[32m✔\x1b[0m Ready!`); return; }
    }
    // Clear and recreate
    console.log(`  Removing stale entry...`);
    await db.query(`UPDATE public.galx_shard_accounts SET permission_retracted = true, status = 'revoked' WHERE id = $1`, [shardId]);
    await db.query(`DELETE FROM public.galx_shard_accounts WHERE id = $1`, [shardId]);
  }

  // Encrypt credential under new shard identity
  const newRow = { id: shardId, user_id: source.user_id, provider: 'openai' };
  const encrypted = encryptRegistryShard(newRow, {
    accessToken: decrypted.accessToken,
    accountId: decrypted.accountId,
    ...(decrypted.refreshToken ? { refreshToken: decrypted.refreshToken } : {}),
    expiresAtMs: decrypted.expiresAtMs,
  });
  console.log(`  \x1b[32m✔\x1b[0m Encrypted (key_version: ${encrypted.key_version})`);

  // Use the authorized enrollment function
  console.log(`  Enrolling via private.enroll_desktop_shard...`);
  const result = await db.query(
    `SELECT private.enroll_desktop_shard($1::uuid, $2::jsonb, $3::jsonb) AS id`,
    [
      desktopId,
      JSON.stringify({
        id: shardId,
        user_id: source.user_id,
        encrypted_ciphertext: encrypted.encrypted_ciphertext,
        encrypted_iv: encrypted.encrypted_iv,
        encrypted_tag: encrypted.encrypted_tag,
        key_version: encrypted.key_version,
        credential_expires_at_ms: Number(source.credential_expires_at_ms),
      }),
      null, // no expected (new enrollment)
    ]
  );

  if (result.rows[0]?.id !== shardId) {
    console.error(`  \x1b[31m✖\x1b[0m Enrollment returned unexpected ID: ${result.rows[0]?.id}`);
    process.exit(1);
  }
  console.log(`  \x1b[32m✔\x1b[0m Enrolled!`);

  // Step 3: Verify federation eligibility
  console.log('\n\x1b[1m[3/4] Verifying...\x1b[0m');
  const row = (await db.query(`SELECT * FROM public.galx_shard_accounts WHERE id = $1`, [shardId])).rows[0];
  const dec = decryptRegistryShard(row);
  const shard = desiredShard(row, dec);
  console.log(`  relay_pool_id: ${row.relay_pool_id ?? 'NULL'}`);
  console.log(`  managed_desktop_id: ${row.managed_desktop_id}`);
  console.log(`  status: ${row.status}`);
  console.log(`  decryptable: ${!!dec}, desired: ${!!shard}`);

  if (shard) {
    console.log(`  \x1b[32m✔\x1b[0m Federation-eligible!`);
  } else {
    console.log(`  \x1b[31m✖\x1b[0m Not eligible — debug:`);
    console.log(`    pool null: ${row.relay_pool_id == null}`);
    console.log(`    desktop set: ${!!row.managed_desktop_id}`);
    console.log(`    enrolled_at: ${row.desktop_enrolled_at}`);
    console.log(`    provider: ${row.provider}`);
    console.log(`    retracted: ${row.permission_retracted}`);
    console.log(`    status: ${row.status}`);
    console.log(`    status valid: ${['active', 'healthy', 'warming_up', 'half_open', 'cooldown', 'exhausted', 'rate_limited'].includes(row.status)}`);
  }

  // Step 4: Final count
  console.log('\n\x1b[1m[4/4] Registry state\x1b[0m');
  const all = await db.query(`SELECT id, status, relay_pool_id, managed_desktop_id, permission_retracted FROM public.galx_shard_accounts ORDER BY id`);
  for (const r of all.rows) {
    const tag = r.relay_pool_id ? `pool:${r.relay_pool_id}` : 'federation';
    console.log(`  • ${r.id}: ${r.status} [${tag}]`);
  }

  console.log('\n\x1b[1m\x1b[36m═══ Done ═══\x1b[0m\n');
}

main().catch(e => { console.error('FATAL:', e.stack || e.message); process.exit(1); }).finally(() => db.end());
