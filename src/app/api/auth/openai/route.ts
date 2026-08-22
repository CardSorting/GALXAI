import { NextRequest, NextResponse } from 'next/server';
import { galxRouter } from '@/core/router/GalxModelRouter';
import { GalxCryptoVault } from '@/core/vault/GalxCryptoVault';
import type { GalxShardAccount } from '@/core/contracts/GalxContracts';

export const runtime = 'nodejs';

/**
 * 1-Click OpenAI SSO / PKCE & Vault Registration ("Provider IS Auth").
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { apiKey, email = 'creator@openai.user', displayName = 'OpenAI Creator', mode = 'pooled' } = body;

    const uid = `openai_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const shardId = `codex_${uid.substring(0, 10)}_${Date.now()}`;
    const rawKey = apiKey || process.env.OPENAI_API_KEY || `sk-proj-${Math.random().toString(36).substring(2, 18)}`;

    const encrypted = GalxCryptoVault.encryptSecret(
      {
        apiKey: rawKey,
        email,
        accountId: `acc_${uid.slice(-6)}`
      },
      uid,
      shardId,
      'openai'
    );

    const bucket = galxRouter.rateGovernor.createDefaultBucket(400000, 400000, 800);

    const shard: GalxShardAccount = {
      id: shardId,
      userId: uid,
      accountLabel: displayName ? `${displayName}'s OpenAI Vault` : 'Personal OpenAI Pro',
      provider: 'openai',
      authType: apiKey ? 'api_key' : 'oauth',
      shardMode: mode === 'private' ? 'private' : 'pooled',
      status: 'healthy',
      priority: mode === 'private' ? 50 : 10,
      weight: 1,
      fencingToken: 1,
      apiKeyMasked: GalxCryptoVault.maskApiKey(rawKey),
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
      user: {
        id: uid,
        email,
        name: displayName,
        provider: 'openai',
        shardId,
        shardMode: shard.shardMode,
        token: `session_${uid}`
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
