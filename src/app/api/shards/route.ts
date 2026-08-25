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

export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      error: 'Client-side shard creation is no longer supported. Model routing is managed automatically via enterprise gateway infrastructure.',
      code: 'shard_creation_deprecated'
    },
    { status: 410 }
  );
}
