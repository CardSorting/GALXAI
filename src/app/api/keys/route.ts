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
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-api-key, x-galx-key',
      'Access-Control-Max-Age': '86400'
    }
  });
}

const MINIMUM_INITIAL_DEPOSIT_USD = 10.00;
const MAX_KEYS_PER_USER = 50;

/**
 * Sanitizes and validates developer key labels
 */
function sanitizeKeyName(rawName: unknown): string {
  if (typeof rawName !== 'string') return 'Developer API Key';
  const sanitized = rawName.trim().replace(/[<>"/\\{}\x00-\x1F]/g, '').slice(0, 80);
  return sanitized || 'Developer API Key';
}

/**
 * Clamps rate limits to secure platform boundaries (10 - 10,000 RPM)
 */
function sanitizeRateLimit(rawRpm: unknown): number {
  const parsed = Number(rawRpm);
  if (isNaN(parsed) || parsed < 10) return 120;
  if (parsed > 10000) return 10000;
  return Math.floor(parsed);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get('userId') || undefined;

    const auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(req);
    const targetUserId = auth.authenticated ? auth.userId : requestedUserId;

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication or userId parameter required' },
        { status: 401 }
      );
    }

    // Prevent accessing keys belonging to other users
    if (requestedUserId && auth.authenticated && requestedUserId !== auth.userId && !auth.claims?.scopes?.includes('admin:*')) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot inspect keys belonging to another user' },
        { status: 403 }
      );
    }

    // Attempt authoritative database retrieval with hot-cache fallback
    const keyRepo = ApiKeyRepository.getInstance();
    let keys = await keyRepo.getGatewayKeys(targetUserId);

    if (!keys || keys.length === 0) {
      const persistence = GalxPersistence.getInstance();
      keys = persistence.getGatewayKeys().filter(k => k.userId === targetUserId);
    }

    const sanitizedKeys = keys.map(k => ({
      id: k.id,
      keyPrefix: k.keyPrefix || k.prefix,
      name: k.name,
      userId: k.userId,
      rateLimitPerMinute: k.rateLimitPerMinute || 120,
      totalRequests: k.totalRequests || 0,
      totalTokens: k.totalTokens || 0,
      createdAt: k.createdAtMs || Date.now(),
      lastUsedAt: k.lastUsedAtMs,
      revoked: Boolean(k.revoked)
    }));

    return NextResponse.json({
      success: true,
      keys: sanitizedKeys,
      total: sanitizedKeys.length
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let {
      name,
      userId = 'user_demo',
      rateLimitPerMinute,
      depositedAmount = 0,
      hasVerifiedDeposit = false
    } = body;

    const auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(req);
    if (auth.authenticated) {
      userId = auth.userId;
    } else if (process.env.NODE_ENV === 'production' && (!userId || userId === 'user_demo')) {
      // In production, reject unauthenticated anonymous key creation if auth required
      return NextResponse.json(
        { error: 'Unauthorized: Sign-in is required to mint developer API keys' },
        { status: 401 }
      );
    }

    const cleanName = sanitizeKeyName(name);
    const cleanRpm = sanitizeRateLimit(rateLimitPerMinute);

    const persistence = GalxPersistence.getInstance();
    const keyRepo = ApiKeyRepository.getInstance();

    const existingKeys = (await keyRepo.getGatewayKeys(userId)) || persistence.getGatewayKeys().filter(k => k.userId === userId && !k.revoked);

    if (existingKeys.length >= MAX_KEYS_PER_USER) {
      return NextResponse.json(
        {
          success: false,
          error: 'KEY_QUOTA_EXCEEDED',
          message: `Workspace limit of ${MAX_KEYS_PER_USER} active keys reached. Please revoke unused keys before minting new ones.`
        },
        { status: 429 }
      );
    }

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

    const { apiKey, keyPrefix, keyHash } = GalxCryptoVault.generateGatewayKey(cleanName, userId);
    const keyId = `key_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newKey: DeveloperGatewayKey = {
      id: keyId,
      prefix: keyPrefix,
      keyPrefix,
      keyHash,
      name: cleanName,
      userId,
      rateLimitPerMinute: cleanRpm,
      totalRequests: 0,
      totalTokens: 0,
      createdAtMs: Date.now(),
      revoked: false
    };

    // Save to both authoritative repository and persistent memory store
    await keyRepo.saveGatewayKey(newKey, {
      requireRemote: process.env.NODE_ENV === 'production'
    }).catch(async () => {
      await persistence.saveGatewayKeyAsync(newKey, {
        requireRemote: false
      });
    });

    persistence.logAudit('GATEWAY_KEY_CREATED', { keyId, keyPrefix, name: cleanName, antiBotVerified: true }, keyId, userId);

    return NextResponse.json({
      success: true,
      antiBotVerified: true,
      key: {
        id: newKey.id,
        name: newKey.name,
        keyPrefix: newKey.keyPrefix,
        rateLimitPerMinute: newKey.rateLimitPerMinute,
        apiKey // Raw token returned exactly once upon creation
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keyId = searchParams.get('id');
    if (!keyId) return NextResponse.json({ error: 'Missing key id' }, { status: 400 });

    const auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(req);
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required to revoke keys' }, { status: 401 });
    }

    const persistence = GalxPersistence.getInstance();
    const keyRepo = ApiKeyRepository.getInstance();

    const keys = persistence.getGatewayKeys();
    const found = keys.find(k => k.id === keyId) || (await keyRepo.getGatewayKeyById(keyId));

    if (!found) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    if (found.userId !== auth.userId && !auth.claims?.scopes?.includes('admin:*')) {
      return NextResponse.json({ error: 'Forbidden: Cannot revoke a key belonging to another user' }, { status: 403 });
    }

    await keyRepo.revokeKey(keyId, 'User requested revocation via developer console');
    persistence.saveGatewayKey({ ...found, revoked: true });
    persistence.logAudit('GATEWAY_KEY_REVOKED', { keyId }, keyId, found.userId);

    return NextResponse.json({ success: true, message: `Key ${keyId} revoked successfully` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to revoke key' }, { status: 500 });
  }
}
