import { NextRequest, NextResponse } from 'next/server';
import { GalxPersistence } from '@/lib/storage/GalxPersistence';
import { GalxCryptoVault } from '@/core/vault/GalxCryptoVault';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { ApiKeyRepository } from '@/lib/supabase/repositories/ApiKeyRepository';
import type { DeveloperGatewayKey } from '@/core/contracts/GalxContracts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-api-key, x-galx-key',
      'Access-Control-Max-Age': '86400'
    }
  });
}

/**
 * POST /api/keys/[id]/roll
 * Zero-Downtime Key Rotation (Rolling)
 *
 * Implements enterprise key rotation semantics (Stripe / GitHub / AWS KMS model):
 * 1. Mints a brand new secret API key inheriting the existing key's settings (name, scopes, rate limits, environment).
 * 2. Optionally sets a grace period on the previous key (e.g. 24 hours) or revokes it immediately.
 * 3. Returns the new secret token exactly once.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: keyId } = await params;
    if (!keyId) {
      return NextResponse.json({ error: 'Missing key ID parameter' }, { status: 400 });
    }

    const auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(req);
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required to roll keys' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      gracePeriodHours = 24, // 0 means revoke immediately, >0 keeps previous key alive during migration
      name
    } = body;

    const persistence = GalxPersistence.getInstance();
    const keyRepo = ApiKeyRepository.getInstance();

    const existingKey = (await keyRepo.getGatewayKeyById(keyId)) || persistence.getGatewayKeys().find(k => k.id === keyId);

    if (!existingKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    if (existingKey.userId !== auth.userId && !auth.claims?.scopes?.includes('admin:*')) {
      return NextResponse.json({ error: 'Forbidden: Cannot roll an API key belonging to another user' }, { status: 403 });
    }

    const environment = existingKey.environment || (existingKey.prefix.includes('test') ? 'test' : 'live');
    const keyName = (name && typeof name === 'string') ? name.trim() : existingKey.name;

    // Generate brand new high-entropy token with checksum
    const { apiKey, keyPrefix, keyHash, checksum } = GalxCryptoVault.generateGatewayKey(keyName, existingKey.userId, { environment });
    const newKeyId = `key_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newKey: DeveloperGatewayKey = {
      id: newKeyId,
      prefix: keyPrefix,
      keyPrefix,
      keyHash,
      name: keyName,
      userId: existingKey.userId,
      rateLimitPerMinute: existingKey.rateLimitPerMinute || 120,
      totalRequests: 0,
      totalTokens: 0,
      createdAtMs: Date.now(),
      revoked: false,
      environment,
      scopes: existingKey.scopes || ['*'],
      ipWhitelist: existingKey.ipWhitelist,
      expiresAtMs: existingKey.expiresAtMs,
      description: existingKey.description,
      checksum
    };

    // Save new key
    await keyRepo.saveGatewayKey(newKey, {
      requireRemote: process.env.NODE_ENV === 'production'
    }).catch(async () => {
      await persistence.saveGatewayKeyAsync(newKey, { requireRemote: false });
    });

    // Handle old key grace period or revocation
    if (gracePeriodHours <= 0) {
      await keyRepo.revokeKey(keyId, 'Zero-downtime key rotation (instant revocation)');
      persistence.saveGatewayKey({ ...existingKey, revoked: true });
    } else {
      // Set expiration on old key to the grace period window
      const graceExpiresAtMs = Date.now() + gracePeriodHours * 3600 * 1000;
      const updatedOldKey = { ...existingKey, expiresAtMs: graceExpiresAtMs };
      await keyRepo.saveGatewayKey(updatedOldKey).catch(() => {});
      persistence.saveGatewayKey(updatedOldKey);
    }

    persistence.logAudit(
      'GATEWAY_KEY_ROLLED',
      { previousKeyId: keyId, newKeyId, gracePeriodHours, environment },
      newKeyId,
      existingKey.userId
    );

    return NextResponse.json({
      success: true,
      message: gracePeriodHours > 0
        ? `API key rolled successfully. Previous key will expire in ${gracePeriodHours} hours.`
        : 'API key rolled successfully. Previous key revoked immediately.',
      rolledFromId: keyId,
      gracePeriodHours,
      key: {
        id: newKey.id,
        name: newKey.name,
        keyPrefix: newKey.keyPrefix,
        environment: newKey.environment,
        scopes: newKey.scopes,
        rateLimitPerMinute: newKey.rateLimitPerMinute,
        apiKey // Raw token returned exactly once
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to roll API key' }, { status: 500 });
  }
}
