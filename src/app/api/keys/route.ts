import { NextRequest, NextResponse } from 'next/server';
import { GalxPersistence } from '@/lib/storage/GalxPersistence';
import { GalxCryptoVault } from '@/core/vault/GalxCryptoVault';
import type { DeveloperGatewayKey } from '@/core/contracts/GalxContracts';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || undefined;

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
    const { name = 'Default Gateway Key', userId = 'user_demo', rateLimitPerMinute = 120 } = body;

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

    const persistence = GalxPersistence.getInstance();
    persistence.saveGatewayKey(newKey);
    persistence.logAudit('GATEWAY_KEY_CREATED', { keyId, keyPrefix, name }, keyId, userId);

    return NextResponse.json({
      success: true,
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
