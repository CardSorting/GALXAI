/**
 * GALXAI: Master Shard Fleet Manager & Pool Cycler
 *
 * Sourced directly from the shard pool of /Users/bozoegg/Desktop/GALXAI.
 * Manages multi-account ChatGPT / OpenAI shards, Smooth Weighted Round-Robin (SWRR)
 * distribution, 40 req / 3 hr quota monitoring, live WebSocket wire testing, and fleet sync.
 *
 * Usage:
 *   npx tsx scripts/manage-shards.ts --list
 *   npx tsx scripts/manage-shards.ts --import
 *   npx tsx scripts/manage-shards.ts --add --token <jwt> --account <accountId> [--refresh <rt>] [--email <email>]
 *   npx tsx scripts/manage-shards.ts --test
 *   npx tsx scripts/manage-shards.ts --cycle [count]
 *   npx tsx scripts/manage-shards.ts --sync-edge
 *   npx tsx scripts/manage-shards.ts --remove <shardId>
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { GalxPersistence } from '../src/lib/storage/GalxPersistence';
import { GalxCredentialSubstrate } from '../src/core/substrate/GalxCredentialSubstrate';
import { GalxCredentialPool } from '../src/core/pool/GalxCredentialPool';
import { GalxCryptoVault } from '../src/core/vault/GalxCryptoVault';
import { OpenAIAdapter } from '../src/core/router/adapters/OpenAIAdapter';
import type { GalxShardAccount } from '../src/core/contracts/GalxContracts';

interface CliArgs {
  action: 'list' | 'import' | 'add' | 'test' | 'cycle' | 'sync-edge' | 'remove';
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
  const args: CliArgs = { action: 'list' };

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
    else if (a === '--sync-edge') args.action = 'sync-edge';
    else if (a === '--remove' || a === '-r') {
      args.action = 'remove';
      if (argv[i + 1]) args.shardId = argv[++i];
    }
    else if (a === '--token' && argv[i + 1]) args.token = argv[++i];
    else if (a === '--refresh' && argv[i + 1]) args.refresh = argv[++i];
    else if (a === '--account' && argv[i + 1]) args.account = argv[++i];
    else if (a === '--email' && argv[i + 1]) args.email = argv[++i];
    else if (a === '--priority' && argv[i + 1]) args.priority = Number(argv[++i]);
    else if (a === '--weight' && argv[i + 1]) args.weight = Number(argv[++i]);
    else if (a === '--shard-id' && argv[i + 1]) args.shardId = argv[++i];
  }

  return args;
}

function getSubstrate(): GalxCredentialSubstrate {
  const persistence = GalxPersistence.getInstance();
  const substrate = new GalxCredentialSubstrate(persistence);
  substrate.initialize();
  return substrate;
}

async function listShards(substrate: GalxCredentialSubstrate) {
  const shards = substrate.listAccounts();
  console.log('\n========================================================================================================');
  console.log('               🛸  GALXAI SHARD FLEET POOL (/Users/bozoegg/Desktop/GALXAI)                             ');
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
    'ACCOUNT ID'.padEnd(40) +
    'STATUS'.padEnd(12) +
    'PRIO/WT'.padEnd(10) +
    'SERVED'.padEnd(10) +
    'QUOTA HEADROOM'
  );
  console.log(''.padEnd(115, '-'));

  shards.forEach((s, idx) => {
    const quota = s.slidingWindowQuota
      ? `${s.slidingWindowQuota.maxRequestsPerWindow - (s.slidingWindowQuota.requestHistoryTimestampsMs?.length || s.slidingWindowQuota.usedRequestsInWindow || 0)}/${s.slidingWindowQuota.maxRequestsPerWindow} (3h)`
      : `${s.tokenBucket.remainingRequests}/${s.tokenBucket.maxRequests}`;

    console.log(
      `[${idx + 1}]`.padEnd(4) +
      s.id.slice(0, 28).padEnd(30) +
      (s.accountId || 'unknown').slice(0, 38).padEnd(40) +
      s.status.toUpperCase().padEnd(12) +
      `${s.priority}/${s.weight}`.padEnd(10) +
      String(s.stats?.totalRequestsServed || 0).padEnd(10) +
      quota
    );
  });
  console.log('========================================================================================================\n');
}

async function importFleet(substrate: GalxCredentialSubstrate) {
  console.log('\n[+] Scanning multi-account credential sources to enroll into GALXAI shard pool...');
  const added = substrate.seedMultiAccountFleet();
  console.log(`[✓] Successfully ingested and encrypted ${added} accounts into GALXAI shard pool!`);
  await listShards(substrate);
}

async function addSingleShard(substrate: GalxCredentialSubstrate, args: CliArgs) {
  if (!args.token || !args.account) {
    console.error('[-] Error: --token and --account are required to add a shard.');
    process.exit(1);
  }

  const shardId = args.shardId || `codex_sh_${args.account.slice(0, 8)}_${Date.now().toString(36)}`;
  const encrypted = GalxCryptoVault.encryptSecret(
    {
      accessToken: args.token,
      refreshToken: args.refresh,
      accountId: args.account,
      email: args.email || 'operator@galx.ai',
      name: `ChatGPT Shard (${args.account.slice(0, 8)})`
    },
    'system_admin',
    shardId,
    'openai'
  );

  const shard: GalxShardAccount = {
    id: shardId,
    userId: 'system_admin',
    accountLabel: `ChatGPT Fleet Shard (${args.account.slice(0, 8)})`,
    provider: 'openai',
    authType: 'oauth',
    shardMode: 'pooled',
    status: 'healthy',
    priority: args.priority || 10,
    weight: args.weight || 1,
    fencingToken: 1,
    accountId: args.account,
    apiKeyMasked: `oauth_${args.account.slice(0, 8)}...`,
    encryptedSecrets: encrypted,
    encryptedPayload: encrypted,
    privacyCapabilities: {
      hipaaCompliant: true,
      zdrCertified: true,
      dataResidency: 'global',
      baaSigned: true,
      piiFiltering: true
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
    createdAtMs: Date.now(),
    updatedAtMs: Date.now()
  };

  substrate.addAccount(shard);
  console.log(`[✓] Successfully enrolled shard ${shardId} (Account: ${args.account}) into GALXAI pool!`);
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

    process.stdout.write(`[Probe ${i + 1}/${shards.length}] Shard: ${shard.id} (${shard.accountId})... `);
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
    console.log(
      `[Turn ${String(i).padStart(2)}] Leased Shard: ${lease.shardId.padEnd(30)} ` +
      `Account: ${(lease.account.accountId || 'unknown').slice(0, 36).padEnd(38)} ` +
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

async function syncEdge(substrate: GalxCredentialSubstrate) {
  const edgeWorkerUrl =
    process.env.LUMI_EDGE_WORKER_URL ||
    process.env.EDGE_RELAY_URL ||
    'https://lumi-edge-worker.notsosuper688651.workers.dev';

  const shards = substrate.listAccounts();
  console.log(`\n[+] Syncing ${shards.length} shards from GALXAI pool to Edge Worker at ${edgeWorkerUrl}...`);

  let synced = 0;
  for (const s of shards) {
    const enc = s.encryptedPayload || s.encryptedSecrets;
    const dec = GalxCryptoVault.decryptSecret(enc!, s.userId, s.id, s.provider);

    try {
      const res = await fetch(`${edgeWorkerUrl.replace(/\/+$/, '')}/v1/tokens/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: s.id,
          accessToken: dec.accessToken,
          refreshToken: dec.refreshToken,
          accountId: dec.accountId,
          email: dec.email,
          weight: s.weight,
          priority: s.priority,
          maxRequestsPerWindow: 40,
          windowDurationHours: 3
        })
      });

      if (res.ok) {
        console.log(`  [✓] Pushed ${s.id} (${s.accountId})`);
        synced++;
      } else {
        console.log(`  [!] Failed ${s.id}: HTTP ${res.status}`);
      }
    } catch (e: any) {
      console.log(`  [!] Error ${s.id}: ${e.message}`);
    }
  }

  console.log(`[✓] Completed: ${synced}/${shards.length} shards synchronized with Edge Worker.\n`);
}

async function removeShard(substrate: GalxCredentialSubstrate, shardId?: string) {
  if (!shardId) {
    console.error('[-] Error: Shard ID required to remove.');
    process.exit(1);
  }
  const ok = substrate.deleteAccount(shardId);
  console.log(ok ? `[✓] Shard ${shardId} removed.` : `[-] Shard ${shardId} not found.`);
}

async function main() {
  const args = parseArgs();
  const substrate = getSubstrate();

  switch (args.action) {
    case 'list':
      await listShards(substrate);
      break;
    case 'import':
      await importFleet(substrate);
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
    case 'sync-edge':
      await syncEdge(substrate);
      break;
    case 'remove':
      await removeShard(substrate, args.shardId);
      break;
  }
}

main().catch(console.error);
