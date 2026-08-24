import { NextRequest, NextResponse } from 'next/server';
import { GalxPersistence } from '@/lib/storage/GalxPersistence';
import { GalxCryptoVault } from '@/core/vault/GalxCryptoVault';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import type { DeveloperGatewayKey } from '@/core/contracts/GalxContracts';

export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

const MINIMUM_INITIAL_DEPOSIT_USD = 10.00;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let userId = searchParams.get('userId') || undefined;

  if (!userId) {
    const auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(req);
    if (auth.authenticated) {
      userId = auth.userId;
    }
  }

  const persistence = GalxPersistence.getInstance();
  const keys = persistence.getGatewayKeys()
    .filter(k => !userId || k.userId === userId)
    .map(k => ({
      id: k.id,
      keyPrefix: k.keyPrefix || k.prefix,
      name: k.name,
      userId: k.userId,
      rateLimitPerMinute: k.rateLimitPerMinute,
      totalRequests: k.totalRequests,
      totalTokens: k.totalTokens,
      createdAt: k.createdAtMs,
      lastUsedAt: k.lastUsedAtMs,
      revoked: k.revoked
    }));

  return NextResponse.json({ keys, total: keys.length });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let {
      name = 'Default Gateway Key',
      userId = 'user_demo',
      rateLimitPerMinute = 120,
      depositedAmount = 0,
      hasVerifiedDeposit = false
    } = body;

    const auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(req);
    if (auth.authenticated && (!userId || userId === 'user_demo')) {
      userId = auth.userId;
    }


    const persistence = GalxPersistence.getInstance();
    const existingKeys = persistence.getGatewayKeys().filter(k => k.userId === userId && !k.revoked);

    // Anti-Bot Proof-of-Deposit Security Gate
    // Require at least $10.00 USD initial deposit to activate key and unlock $5 free compute grant
    if (!hasVerifiedDeposit && existingKeys.length === 0 && Number(depositedAmount) < MINIMUM_INITIAL_DEPOSIT_USD) {
      return NextResponse.json(
        {
          success: false,
          error: 'MINIMUM_INITIAL_DEPOSIT_REQUIRED',
          message: `To activate your high-throughput gateway key and claim your $5.00 free compute grant, an initial deposit of at least $${MINIMUM_INITIAL_DEPOSIT_USD.toFixed(2)} USD is required. 100% of your deposit is credited directly to your compute wallet ($15.00 total compute credit).`,
          requiredDepositUsd: MINIMUM_INITIAL_DEPOSIT_USD,
          depositUrl: '/billing',
          welcomeBonusUsd: 5.00,
          totalComputeOnDepositUsd: 15.00
        },
        { status: 402 }
      );
    }

    const { apiKey, keyPrefix, keyHash } = GalxCryptoVault.generateGatewayKey(name, userId);
    const keyId = `key_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newKey: DeveloperGatewayKey = {
      id: keyId,
      prefix: keyPrefix,
      keyPrefix,
      keyHash,
      name,
      userId,
      rateLimitPerMinute: Number(rateLimitPerMinute),
      totalRequests: 0,
      totalTokens: 0,
      createdAtMs: Date.now(),
      revoked: false
    };

    persistence.saveGatewayKey(newKey);
    persistence.logAudit('GATEWAY_KEY_CREATED', { keyId, keyPrefix, name, antiBotVerified: true }, keyId, userId);

    return NextResponse.json({
      success: true,
      antiBotVerified: true,
      key: {
        id: newKey.id,
        name: newKey.name,
        keyPrefix: newKey.keyPrefix,
        apiKey // Raw full token returned once upon creation!
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keyId = searchParams.get('id');
    if (!keyId) return NextResponse.json({ error: 'Missing key id' }, { status: 400 });

    const persistence = GalxPersistence.getInstance();
    const keys = persistence.getGatewayKeys();
    const found = keys.find(k => k.id === keyId);
    if (found) {
      persistence.saveGatewayKey({ ...found, revoked: true });
      persistence.logAudit('GATEWAY_KEY_REVOKED', { keyId }, keyId, found.userId);
    }

    return NextResponse.json({ success: true, message: `Key ${keyId} revoked` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
