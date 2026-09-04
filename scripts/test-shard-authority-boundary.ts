import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { GalxShardAccount } from '../src/core/contracts/GalxContracts';

function assertInvariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Shard authority boundary invariant failed: ${message}`);
}

async function main(): Promise<void> {
  const originalCwd = process.cwd();
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'galx-shard-authority-'));
  const authorityEnvironmentKeys = [
    'DATABASE_URL',
    'SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SECRET_KEY',
    'NODE_ENV',
    'GALX_ALLOW_EPHEMERAL_SHARDS_FOR_TESTS'
  ] as const;
  const savedEnvironment = new Map<string, string | undefined>(
    authorityEnvironmentKeys.map(key => [key, process.env[key]])
  );

  try {
    for (const key of authorityEnvironmentKeys) delete process.env[key];
    process.chdir(tempDirectory);

    process.env.SUPABASE_URL = 'https://authority-boundary.invalid';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_publishable_misconfigured_as_admin';
    const { getSupabaseConfig } = await import('../src/lib/supabase/config');
    assertInvariant(
      !getSupabaseConfig().hasAdminCredential,
      'a publishable key in the service-role variable must not create admin authority'
    );
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const { GalxCredentialSubstrate } = await import('../src/core/substrate/GalxCredentialSubstrate');
    const substrate = new GalxCredentialSubstrate();
    await substrate.ready();

    const now = Date.now();
    const shard: GalxShardAccount = {
      id: 'test_authority_boundary',
      userId: 'test_operator',
      accountLabel: 'Authority Boundary Fixture',
      provider: 'openai',
      authType: 'oauth',
      shardMode: 'pooled',
      status: 'healthy',
      priority: 10,
      weight: 1,
      fencingToken: 1,
      apiKeyMasked: 'oauth_test...',
      encryptedPayload: {
        ciphertext: 'fixture-ciphertext',
        iv: 'fixture-iv',
        tag: 'fixture-tag',
        keyVersion: 'v2'
      },
      tokenBucket: {
        maxTokens: 10_000,
        remainingTokens: 10_000,
        reservedTokens: 0,
        refillRatePerMinute: 100,
        maxRequests: 10,
        remainingRequests: 10,
        lastRefillTimestampMs: now
      },
      stats: {
        totalRequestsServed: 0,
        totalTokensConsumed: 0,
        consecutiveFailures: 0
      },
      permissionRetracted: false,
      registrySource: 'api',
      createdAtMs: now,
      updatedAtMs: now
    };

    let durableMutationRejected = false;
    try {
      await substrate.addAccountAsync(shard, { requireRemote: true });
    } catch {
      durableMutationRejected = true;
    }

    assertInvariant(durableMutationRejected, 'durable mutation must fail when PostgreSQL authority is unavailable');
    assertInvariant(!substrate.getAccount(shard.id), 'failed durable mutation must not enter the routing projection');
    assertInvariant(!fs.existsSync(path.join(tempDirectory, '.galx-shards.json')), 'failed mutation must not create a JSON credential file');

    // Synchronous mutation remains an explicitly ephemeral simulation surface.
    substrate.addAccount(shard);
    assertInvariant(Boolean(substrate.getAccount(shard.id)), 'ephemeral simulation mutation should remain available');
    assertInvariant(!fs.existsSync(path.join(tempDirectory, '.galx-shards.json')), 'ephemeral projection must remain memory-only');

    const { QoSPoolRepository } = await import('../src/lib/supabase/repositories/QoSPoolRepository');
    const qosDecision = await new QoSPoolRepository().acquireLumiLease({
      userId: 'authority-boundary-user',
      modelId: 'authority-boundary-model'
    });
    assertInvariant(
      !qosDecision.allowed && qosDecision.rejectionCode === 'AUTHORITY_UNAVAILABLE' && !qosDecision.leaseId,
      'QoS work ownership must fail closed instead of minting a local lease'
    );

    console.log(JSON.stringify({
      durableMutationRejected,
      failedMutationPublishedToProjection: false,
      ephemeralProjectionAvailable: true,
      legacyJsonCacheCreated: false,
      publishableKeyRejectedAsAdmin: true,
      qosLocalLeaseFallbackRejected: true
    }, null, 2));
  } finally {
    process.chdir(originalCwd);
    for (const [key, value] of savedEnvironment) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
