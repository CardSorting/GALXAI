/**
 * GALXAI: Master Shard Fleet Manager & Pool Cycler
 *
 * Sourced directly from the shard pool of /Users/bozoegg/Desktop/GALXAI.
 * Manages multi-account ChatGPT / OpenAI shards, Smooth Weighted Round-Robin (SWRR)
 * distribution, 40 req / 3 hr quota monitoring, and live WebSocket wire testing.
 *
 * Usage:
 *   npx tsx scripts/manage-shards.ts --list
 *   --import is retired; enrollment requires an explicitly supplied, validated account.
 *   GALX_SHARD_ACCESS_TOKEN=... GALX_SHARD_ACCOUNT_ID=... npm run shards -- --add
 *   npx tsx scripts/manage-shards.ts --test
 *   npx tsx scripts/manage-shards.ts --cycle [count]
 *   npm run shards:doctor
 *   npm run shards -- --quarantine-legacy
 */

import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import * as os from 'node:os';
import * as path from 'node:path';
import { GalxPersistence } from '../src/lib/storage/GalxPersistence';
import { GalxCredentialSubstrate } from '../src/core/substrate/GalxCredentialSubstrate';
import { GalxCredentialPool } from '../src/core/pool/GalxCredentialPool';
import { GalxCryptoVault } from '../src/core/vault/GalxCryptoVault';
import { OpenAIAdapter } from '../src/core/router/adapters/OpenAIAdapter';
import { getSupabaseConfig } from '../src/lib/supabase/config';
import { closePostgresPool } from '../src/lib/db/postgres';
import type { GalxShardAccount } from '../src/core/contracts/GalxContracts';
import { validateOperatorCredential } from '../src/relay/operator-enrollment.js';

interface CliArgs {
  action: 'list' | 'import' | 'add' | 'test' | 'cycle' | 'remove' | 'doctor' | 'quarantine-legacy';
  token?: string;
  refresh?: string;
  account?: string;
  email?: string;
  priority?: number;
  weight?: number;
  shardId?: string;
  cycleCount?: number;
}

function parseArgs(): CliArgs {
  const argv = process.argv.slice(2);
  const args: CliArgs = {
    action: 'list',
    token: process.env.GALX_SHARD_ACCESS_TOKEN,
    refresh: process.env.GALX_SHARD_REFRESH_TOKEN,
    account: process.env.GALX_SHARD_ACCOUNT_ID,
    email: process.env.GALX_SHARD_EMAIL
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--list' || a === '-l') args.action = 'list';
    else if (a === '--import' || a === '-i') args.action = 'import';
    else if (a === '--add') args.action = 'add';
    else if (a === '--test' || a === '-t') args.action = 'test';
    else if (a === '--cycle' || a === '-c') {
      args.action = 'cycle';
      if (argv[i + 1] && !argv[i + 1].startsWith('-')) {
        args.cycleCount = parseInt(argv[++i], 10) || 6;
      } else {
        args.cycleCount = 6;
      }
    }
    else if (a === '--sync-edge') {
      throw new Error(
        '--sync-edge was removed: long-lived provider credentials must not be duplicated into edge KV. Use the PostgreSQL authority.'
      );
    }
    else if (a === '--doctor') args.action = 'doctor';
    else if (a === '--quarantine-legacy') args.action = 'quarantine-legacy';
    else if (a === '--remove' || a === '-r') {
      args.action = 'remove';
      if (argv[i + 1]) args.shardId = argv[++i];
    }
    else if (a === '--token' || a === '--refresh') {
      throw new Error(
        `${a} is intentionally unsupported because command-line secrets leak through shell history and process listings. Use GALX_SHARD_ACCESS_TOKEN/GALX_SHARD_REFRESH_TOKEN.`
      );
    }
    else if (a === '--account' || a === '--email') {
      throw new Error(
        `${a} is intentionally unsupported because provider identity data leaks through shell history and process listings. Use GALX_SHARD_ACCOUNT_ID/GALX_SHARD_EMAIL.`
      );
    }
    else if (a === '--priority' && argv[i + 1]) args.priority = Number(argv[++i]);
    else if (a === '--weight' && argv[i + 1]) args.weight = Number(argv[++i]);
    else if (a === '--shard-id' && argv[i + 1]) args.shardId = argv[++i];
  }

  return args;
}

async function getSubstrate(): Promise<GalxCredentialSubstrate> {
  const persistence = GalxPersistence.getInstance();
  const substrate = new GalxCredentialSubstrate(persistence);
  await substrate.ready();
  return substrate;
}

async function listShards(substrate: GalxCredentialSubstrate) {
  const shards = substrate.listAccounts();
  console.log('\n========================================================================================================');
  console.log('               🛸  GALXAI SHARD FLEET POOL (SUPABASE POSTGRESQL AUTHORITY)                            ');
  console.log('========================================================================================================');
  console.log(`Total Shards Registered: ${shards.length}\n`);

  if (shards.length === 0) {
    console.log('No shards currently registered. Run:');
    console.log('  npx tsx scripts/manage-shards.ts --import');
    return;
  }

  console.log(
    '#'.padEnd(4) +
    'SHARD ID'.padEnd(30) +
    'ACCOUNT FINGERPRINT'.padEnd(40) +
    'STATUS'.padEnd(12) +
    'PRIO/WT'.padEnd(10) +
    'SERVED'.padEnd(10) +
    'QUOTA HEADROOM'
  );
  console.log(''.padEnd(115, '-'));

  shards.forEach((s, idx) => {
    const hasSlidingQuota = Number.isFinite(s.slidingWindowQuota?.maxRequestsPerWindow);
    const quota = hasSlidingQuota
      ? `${s.slidingWindowQuota.maxRequestsPerWindow - (s.slidingWindowQuota.requestHistoryTimestampsMs?.length || s.slidingWindowQuota.usedRequestsInWindow || 0)}/${s.slidingWindowQuota.maxRequestsPerWindow} (3h)`
      : `${s.tokenBucket.remainingRequests}/${s.tokenBucket.maxRequests}`;
    const accountFingerprint = s.accountId
      ? `sha256:${crypto.createHash('sha256').update(s.accountId).digest('hex').slice(0, 12)}`
      : 'not-projected';

    console.log(
      `[${idx + 1}]`.padEnd(4) +
      s.id.slice(0, 28).padEnd(30) +
      accountFingerprint.padEnd(40) +
      s.status.toUpperCase().padEnd(12) +
      `${s.priority}/${s.weight}`.padEnd(10) +
      String(s.stats?.totalRequestsServed || 0).padEnd(10) +
      quota
    );
  });
  console.log('========================================================================================================\n');
}

async function addSingleShard(substrate: GalxCredentialSubstrate, args: CliArgs) {
  if (!args.token || !args.account) {
    console.error('[-] Error: GALX_SHARD_ACCESS_TOKEN and GALX_SHARD_ACCOUNT_ID are required to add a shard.');
    process.exit(1);
  }

  const shardIdSecret = process.env.GALX_SHARD_ID_SECRET || process.env.GALX_VAULT_MASTER_SECRET;
  if (!shardIdSecret) {
    throw new Error('GALX_SHARD_ID_SECRET or GALX_VAULT_MASTER_SECRET is required for stable shard IDs');
  }
  const shardId = `codex_sh_${crypto
    .createHmac('sha256', shardIdSecret)
    .update(`openai:${args.account}`)
    .digest('hex')
    .slice(0, 24)}`;
  // A fresh read gives useful feedback; createOnly below fences a concurrent enrollment.
  await substrate.refreshFromAuthority();
  if (substrate.getAccount(shardId)) throw new Error('Account already enrolled. Use its linked desktop to refresh the login.');
  const candidate = await validateOperatorCredential({ accessToken: args.token, accountId: args.account, refreshToken: args.refresh });
  const accountFingerprint = crypto.createHash('sha256').update(args.account).digest('hex').slice(0, 12);
  const encrypted = GalxCryptoVault.encryptSecret(
    {
      accessToken: candidate.accessToken,
      refreshToken: candidate.refreshToken,
      accountId: candidate.accountId,
      expiresAtMs: candidate.expiresAtMs,
      email: args.email || 'operator@galx.ai',
      name: 'Operator-Managed OpenAI OAuth Shard'
    },
    'system_admin',
    shardId,
    'openai'
  );

  const shard: GalxShardAccount = {
    id: shardId,
    userId: 'system_admin',
    accountLabel: 'Operator-Managed OpenAI OAuth Shard',
    provider: 'openai',
    authType: 'oauth',
    shardMode: 'pooled',
    status: 'healthy',
    priority: args.priority || 10,
    weight: args.weight || 1,
    fencingToken: 1,
    accountId: args.account,
    apiKeyMasked: 'oauth_********',
    encryptedSecrets: encrypted,
    encryptedPayload: encrypted,
    privacyCapabilities: {
      hipaaCompliant: false,
      zdrCertified: false,
      dataResidency: 'global',
      baaSigned: false,
      piiFiltering: false
    },
    tokenBucket: {
      maxTokens: 500000,
      remainingTokens: 500000,
      refillRatePerMinute: 50000,
      maxRequests: 40,
      remainingRequests: 40,
      lastRefillTimestampMs: Date.now()
    },
    slidingWindowQuota: {
      windowDurationMs: 3 * 3600 * 1000,
      maxRequestsPerWindow: 40,
      usedRequestsInWindow: 0,
      windowStartTimestampMs: Date.now(),
      requestHistoryTimestampsMs: []
    },
    stats: {
      totalRequestsServed: 0,
      totalTokensConsumed: 0,
      consecutiveFailures: 0
    },
    permissionRetracted: false,
    expiresAtMs: candidate.expiresAtMs,
    createdAtMs: Date.now(),
    updatedAtMs: Date.now()
  };

  await substrate.addAccountAsync({ ...shard, registrySource: 'operator_import' }, { requireRemote: true, createOnly: true });
  console.log(`[✓] Successfully enrolled shard ${shardId} (account sha256:${accountFingerprint}) into GALXAI pool!`);
}

async function testShards(substrate: GalxCredentialSubstrate) {
  const shards = substrate.listAccounts();
  console.log('\n========================================================================================================');
  console.log('               ⚡  LIVE WEBSOCKET WIRE HEALTH PROBE ACROSS GALXAI FLEET                                ');
  console.log('========================================================================================================\n');

  if (shards.length === 0) {
    console.log('No shards to test.');
    return;
  }

  for (let i = 0; i < shards.length; i++) {
    const shard = shards[i];
    const enc = shard.encryptedPayload || shard.encryptedSecrets;
    const dec = GalxCryptoVault.decryptSecret(enc!, shard.userId, shard.id, shard.provider);

    const accountFingerprint = shard.accountId
      ? crypto.createHash('sha256').update(shard.accountId).digest('hex').slice(0, 12)
      : 'not-projected';
    process.stdout.write(`[Probe ${i + 1}/${shards.length}] Shard: ${shard.id} (account sha256:${accountFingerprint})... `);
    const startMs = Date.now();

    try {
      const res = await OpenAIAdapter.executeViaCodexWebSocket(
        {
          model: 'gpt-5.6-terra',
          messages: [{ role: 'user', content: 'Respond with the single word: READY' }],
          stream: false
        },
        { id: 'gpt-5.6-terra', provider: 'openai' } as any,
        dec,
        { timeoutMs: 15000 }
      );

      const elapsed = Date.now() - startMs;
      const json = await res.response.json() as any;
      const text = json.choices?.[0]?.message?.content?.trim() || '';

      console.log(`✓ 200 OK (${elapsed}ms) - Output: "${text}" [Quota Active]`);
    } catch (err: any) {
      const elapsed = Date.now() - startMs;
      console.log(`✗ FAILED (${elapsed}ms) - Error: ${err.message}`);
    }
  }
  console.log('\n========================================================================================================\n');
}

async function cycleFleet(substrate: GalxCredentialSubstrate, count: number) {
  console.log('\n========================================================================================================');
  console.log(`               🔄  SWRR / ADAPTIVE HEADROOM POOL CYCLING SIMULATION (${count} TURNS)                    `);
  console.log('========================================================================================================\n');

  const pool = new GalxCredentialPool(substrate, undefined, undefined, 'smooth_weighted_round_robin');

  for (let i = 1; i <= count; i++) {
    const acq = pool.acquireLease({
      userId: 'usr_galx_developer_master',
      jobId: `job_sim_${i}`,
      provider: 'openai',
      targetModel: 'gpt-5.6-sol',
      estimatedTokens: 250
    });

    if (!acq.lease) {
      console.log(`[Turn ${i}] Saturated: No shard available (${acq.reason})`);
      continue;
    }

    const lease = acq.lease;
    const accountFingerprint = lease.account.accountId
      ? crypto.createHash('sha256').update(lease.account.accountId).digest('hex').slice(0, 12)
      : 'not-projected';
    console.log(
      `[Turn ${String(i).padStart(2)}] Leased Shard: ${lease.shardId.padEnd(30)} ` +
      `Account: sha256:${accountFingerprint.padEnd(30)} ` +
      `Fencing: #${lease.fencingToken}`
    );

    // Simulate completion with 250 tokens and commit
    pool.releaseLease(lease.leaseId, {
      tokensConsumed: 250,
      success: true,
      statusCode: 200,
      latencyMs: 180 + Math.floor(Math.random() * 50)
    });
  }

  console.log('\n========================================================================================================\n');
}

async function removeShard(substrate: GalxCredentialSubstrate, shardId?: string) {
  if (!shardId) {
    console.error('[-] Error: Shard ID required to remove.');
    process.exit(1);
  }
  const ok = await substrate.retractAccountAsync(shardId, 'system_admin');
  console.log(ok ? `[✓] Shard ${shardId} revoked.` : `[-] Shard ${shardId} not found.`);
}

interface ShardAuthorityAudit {
  total: number;
  active: number;
  decryptFailures: number;
  fallbackSeeds: number;
  obviousSynthetic: number;
  duplicateCredentials: number;
  stableIds: number;
  activeNonStableIds: number;
  localJsonCachePresent: boolean;
  adminDataApiFallbackConfigured: boolean;
  keyVersions: Record<string, number>;
  quarantineIds: Set<string>;
}

async function auditShardAuthority(): Promise<ShardAuthorityAudit> {
  const persistence = GalxPersistence.getInstance();
  const shards = await persistence.getShardsAsync(undefined, { requireRemote: true });
  const groups = new Map<string, GalxShardAccount[]>();
  const fallbackIds = new Set<string>();
  const syntheticIds = new Set<string>();
  const undecryptableIds = new Set<string>();
  const keyVersions: Record<string, number> = {};
  const shardIdSecret = process.env.GALX_SHARD_ID_SECRET || process.env.GALX_VAULT_MASTER_SECRET;

  if (!shardIdSecret) throw new Error('Shard authority audit requires GALX_SHARD_ID_SECRET or GALX_VAULT_MASTER_SECRET');

  for (const shard of shards) {
    const keyVersion = (shard.encryptedPayload || shard.encryptedSecrets)?.keyVersion || 'unknown';
    keyVersions[keyVersion] = (keyVersions[keyVersion] || 0) + 1;
    if (shard.permissionRetracted || shard.status === 'revoked') continue;
    if (shard.id.startsWith('shard_galx_flagship_')) fallbackIds.add(shard.id);
    const encrypted = shard.encryptedPayload || shard.encryptedSecrets;
    if (!encrypted) {
      undecryptableIds.add(shard.id);
      continue;
    }

    try {
      const secret = GalxCryptoVault.decryptSecret(encrypted, shard.userId, shard.id, shard.provider);
      const secretValues = [secret.apiKey, secret.accessToken, secret.refreshToken]
        .filter(Boolean)
        .map(String);
      if (
        /(^|[_-])(test|mock|dummy|placeholder)([_-]|$)/i.test(secret.accountId || '') ||
        secretValues.some(value => /test|mock|dummy|placeholder|native[_-]flagship/i.test(value))
      ) {
        syntheticIds.add(shard.id);
      }
      if (secret.accountId) {
        const credentialKey = crypto
          .createHmac('sha256', shardIdSecret)
          .update(`${shard.provider}:${secret.accountId}`)
          .digest('hex');
        const group = groups.get(credentialKey) || [];
        group.push(shard);
        groups.set(credentialKey, group);
      }
    } catch {
      undecryptableIds.add(shard.id);
    }
  }

  const duplicateIds = new Set<string>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const keeper = [...group].sort((left, right) => {
      const leftStable = left.id.startsWith('codex_sh_') ? 1 : 0;
      const rightStable = right.id.startsWith('codex_sh_') ? 1 : 0;
      return rightStable - leftStable || right.updatedAtMs - left.updatedAtMs;
    })[0];
    for (const shard of group) {
      if (shard.id !== keeper.id) duplicateIds.add(shard.id);
    }
  }

  const quarantineIds = new Set([
    ...fallbackIds,
    ...syntheticIds,
    ...undecryptableIds,
    ...duplicateIds
  ]);

  return {
    total: shards.length,
    active: shards.filter(shard => !shard.permissionRetracted && shard.status !== 'revoked').length,
    decryptFailures: undecryptableIds.size,
    fallbackSeeds: fallbackIds.size,
    obviousSynthetic: syntheticIds.size,
    duplicateCredentials: duplicateIds.size,
    stableIds: shards.filter(shard => shard.id.startsWith('codex_sh_')).length,
    activeNonStableIds: shards.filter(shard =>
      !shard.permissionRetracted && shard.status !== 'revoked' && !shard.id.startsWith('codex_sh_')
    ).length,
    localJsonCachePresent: fs.existsSync(path.join(process.cwd(), '.galx-shards.json')),
    adminDataApiFallbackConfigured: getSupabaseConfig().hasAdminCredential,
    keyVersions,
    quarantineIds
  };
}

async function doctorShards(applyQuarantine: boolean): Promise<void> {
  const audit = await auditShardAuthority();
  console.log('\nGALXAI Shard Authority Doctor');
  console.log(JSON.stringify({
    authority: 'supabase-postgresql',
    total: audit.total,
    active: audit.active,
    stableIds: audit.stableIds,
    activeNonStableIds: audit.activeNonStableIds,
    duplicateCredentials: audit.duplicateCredentials,
    fallbackSeeds: audit.fallbackSeeds,
    obviousSynthetic: audit.obviousSynthetic,
    decryptFailures: audit.decryptFailures,
    localJsonCachePresent: audit.localJsonCachePresent,
    adminDataApiFallbackConfigured: audit.adminDataApiFallbackConfigured,
    keyVersions: audit.keyVersions,
    recommendedQuarantineCount: audit.quarantineIds.size
  }, null, 2));

  if (!applyQuarantine || audit.quarantineIds.size === 0) return;

  const persistence = GalxPersistence.getInstance();
  const shards = await persistence.getShardsAsync(undefined, { requireRemote: true });
  let quarantined = 0;
  for (const shard of shards) {
    if (!audit.quarantineIds.has(shard.id)) continue;
    await persistence.saveShardAsync({
      ...shard,
      status: 'revoked',
      permissionRetracted: true,
      updatedAtMs: Date.now()
    }, { requireRemote: true });
    quarantined++;
  }
  console.log(`Quarantined ${quarantined} legacy/synthetic/duplicate shard records via reversible revocation.`);
}

async function main() {
  const args = parseArgs();
  if (args.action === 'import') throw new Error('Bulk credential import is retired. Use npm run relay:desktops for sign-in and repair; use shards -- --add for explicit validated enrollment.');
  const substrate = await getSubstrate();

  switch (args.action) {
    case 'list':
      await listShards(substrate);
      break;
    case 'add':
      await addSingleShard(substrate, args);
      break;
    case 'test':
      await testShards(substrate);
      break;
    case 'cycle':
      await cycleFleet(substrate, args.cycleCount || 6);
      break;
    case 'remove':
      await removeShard(substrate, args.shardId);
      break;
    case 'doctor':
      await doctorShards(false);
      break;
    case 'quarantine-legacy':
      await doctorShards(true);
      break;
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(() => closePostgresPool().catch(() => undefined));
