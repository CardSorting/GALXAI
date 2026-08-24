import { NextRequest, NextResponse } from 'next/server';
import { galxRouter } from '@/core/router/GalxModelRouter';
import { GalxCryptoVault } from '@/core/vault/GalxCryptoVault';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import type { GalxShardAccount, ProviderType } from '@/core/contracts/GalxContracts';

export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let userId = searchParams.get('userId') || undefined;
  const provider = (searchParams.get('provider') as ProviderType) || undefined;

  if (!userId) {
    const auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(req);
    if (auth.authenticated) {
      userId = auth.userId;
    }
  }

  const shards = galxRouter.substrate.listAccounts(userId, provider).map(s => ({
    id: s.id,
    userId: s.userId,
    accountLabel: s.accountLabel,
    provider: s.provider,
    authType: s.authType,
    shardMode: s.shardMode,
    status: s.status,
    priority: s.priority,
    weight: s.weight,
    apiKeyMasked: s.apiKeyMasked,
    tokenBucket: {
      remainingTokens: Math.round(s.tokenBucket.remainingTokens),
      maxTokens: s.tokenBucket.maxTokens,
      remainingRequests: Math.round(s.tokenBucket.remainingRequests),
      maxRequests: s.tokenBucket.maxRequests
    },
    stats: s.stats,
    inFlight: galxRouter.pool.getInFlightCount(s.id),
    cooldownUntil: s.cooldownUntilTimestampMs,
    createdAt: s.createdAtMs,
    updatedAt: s.updatedAtMs
  }));

  return NextResponse.json({ shards, total: shards.length });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { apiKey, accountLabel, provider, shardMode = 'pooled', userId = 'user_demo', priority = 10 } = body;

    const auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(req);
    if (auth.authenticated && (!userId || userId === 'user_demo')) {
      userId = auth.userId;
    }


    if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 8) {
      return NextResponse.json({ error: 'Valid API Key is required' }, { status: 400 });
    }

    // Auto-detect provider if not explicitly given
    let effectiveProvider: ProviderType = provider;
    if (!effectiveProvider) {
      if (apiKey.startsWith('xai-') || apiKey.toLowerCase().includes('grok')) {
        effectiveProvider = 'xai-grok';
      } else {
        effectiveProvider = 'openai';
      }
    }

    // Run Pre-flight key validation probe
    const preflight = await galxRouter.validateKeyPreflight(apiKey, effectiveProvider);
    if (!preflight.valid) {
      return NextResponse.json({ error: `Key validation failed: ${preflight.reason}` }, { status: 400 });
    }

    const shardId = `${effectiveProvider === 'xai-grok' ? 'grok' : 'codex'}_${userId.substring(0, 8)}_${Date.now()}`;
    const encrypted = GalxCryptoVault.encryptSecret({ apiKey }, userId, shardId, effectiveProvider);

    const bucket = galxRouter.rateGovernor.createDefaultBucket(
      effectiveProvider === 'xai-grok' ? 500000 : 400000,
      effectiveProvider === 'xai-grok' ? 500000 : 400000,
      1000
    );

    const shard: GalxShardAccount = {
      id: shardId,
      userId,
      accountLabel: accountLabel || (effectiveProvider === 'xai-grok' ? 'xAI Grok Key Shard' : 'OpenAI Key Shard'),
      provider: effectiveProvider,
      authType: 'api_key',
      shardMode: 'pooled',
      status: 'healthy',
      priority: Number(priority) || 10,
      weight: 1,
      fencingToken: 1,
      apiKeyMasked: GalxCryptoVault.maskApiKey(apiKey),
      encryptedSecrets: encrypted,
      tokenBucket: bucket,
      stats: {
        totalRequestsServed: 0,
        totalTokensConsumed: 0,
        consecutiveFailures: 0
      },
      permissionRetracted: false,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    };

    galxRouter.substrate.addAccount(shard);

    return NextResponse.json({
      success: true,
      shard: {
        id: shard.id,
        accountLabel: shard.accountLabel,
        provider: shard.provider,
        shardMode: shard.shardMode,
        apiKeyMasked: shard.apiKeyMasked,
        status: shard.status
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to register shard' }, { status: 500 });
  }
}
