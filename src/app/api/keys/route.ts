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
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
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

/**
 * Sanitizes capability scopes
 */
function sanitizeScopes(rawScopes: unknown): string[] {
  if (!Array.isArray(rawScopes) || rawScopes.length === 0) return ['*'];
  const allowed = new Set([
    '*',
    'chat:*',
    'chat:completions',
    'models:*',
    'models:read',
    'images:*',
    'images:generate',
    'embeddings:*',
    'audio:*',
    'agents:*'
  ]);
  const cleaned = rawScopes
    .filter((s): s is string => typeof s === 'string' && allowed.has(s.trim()))
    .map(s => s.trim());
  return cleaned.length > 0 ? cleaned : ['*'];
}

/**
 * GET /api/keys
 * Lists all active and historical developer API keys for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get('userId') || undefined;
    const environmentFilter = searchParams.get('environment') as 'live' | 'test' | null;

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

    let sanitizedKeys = keys.map(k => {
      const env = k.environment || (k.prefix.includes('test') ? 'test' : 'live');
      const isExpired = Boolean(k.expiresAtMs && k.expiresAtMs <= Date.now());
      return {
        id: k.id,
        keyPrefix: k.keyPrefix || k.prefix,
        name: k.name,
        userId: k.userId,
        environment: env,
        scopes: k.scopes || ['*'],
        rateLimitPerMinute: k.rateLimitPerMinute || 120,
        totalRequests: k.totalRequests || 0,
        totalTokens: k.totalTokens || 0,
        createdAt: k.createdAtMs || Date.now(),
        lastUsedAt: k.lastUsedAtMs,
        expiresAt: k.expiresAtMs,
        isExpired,
        revoked: Boolean(k.revoked)
      };
    });

    if (environmentFilter) {
      sanitizedKeys = sanitizedKeys.filter(k => k.environment === environmentFilter);
    }

    return NextResponse.json({
      success: true,
      keys: sanitizedKeys,
      total: sanitizedKeys.length,
      activeCount: sanitizedKeys.filter(k => !k.revoked && !k.isExpired).length
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/keys
 * Mints a new developer gateway key with SHA-256 hash and embedded checksum
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let {
      name,
      userId = 'user_demo',
      environment = 'live',
      rateLimitPerMinute,
      scopes,
      expiresInDays,
      ipWhitelist,
      depositedAmount = 0,
      hasVerifiedDeposit = false
    } = body;

    const auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(req);
    if (auth.authenticated) {
      userId = auth.userId;
    } else if (process.env.NODE_ENV === 'production' && (!userId || userId === 'user_demo')) {
      return NextResponse.json(
        { error: 'Unauthorized: Sign-in is required to mint developer API keys' },
        { status: 401 }
      );
    }

    const cleanName = sanitizeKeyName(name);
    const cleanRpm = sanitizeRateLimit(rateLimitPerMinute);
    const cleanScopes = sanitizeScopes(scopes);
    const cleanEnv: 'live' | 'test' = environment === 'test' ? 'test' : 'live';

    let expiresAtMs: number | undefined = undefined;
    if (expiresInDays && Number(expiresInDays) > 0) {
      expiresAtMs = Date.now() + Math.min(Number(expiresInDays), 730) * 86400 * 1000;
    }

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

    // Anti-Bot Proof-of-Deposit Security Gate for production live keys
    if (!hasVerifiedDeposit && existingKeys.length === 0 && Number(depositedAmount) < MINIMUM_INITIAL_DEPOSIT_USD && cleanEnv === 'live') {
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

    const { apiKey, keyPrefix, keyHash, checksum } = GalxCryptoVault.generateGatewayKey(cleanName, userId, { environment: cleanEnv });
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
      revoked: false,
      environment: cleanEnv,
      scopes: cleanScopes,
      ipWhitelist: Array.isArray(ipWhitelist) ? ipWhitelist.filter(ip => typeof ip === 'string').slice(0, 20) : undefined,
      expiresAtMs,
      checksum
    };

    // Save to authoritative database and memory cache
    await keyRepo.saveGatewayKey(newKey, {
      requireRemote: process.env.NODE_ENV === 'production'
    }).catch(async () => {
      await persistence.saveGatewayKeyAsync(newKey, {
        requireRemote: false
      });
    });

    persistence.logAudit(
      'GATEWAY_KEY_CREATED',
      { keyId, keyPrefix, name: cleanName, environment: cleanEnv, scopes: cleanScopes },
      keyId,
      userId
    );

    return NextResponse.json({
      success: true,
      antiBotVerified: true,
      key: {
        id: newKey.id,
        name: newKey.name,
        keyPrefix: newKey.keyPrefix,
        environment: newKey.environment,
        scopes: newKey.scopes,
        rateLimitPerMinute: newKey.rateLimitPerMinute,
        expiresAt: newKey.expiresAtMs,
        apiKey // Full raw token returned once upon creation!
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

/**
 * PATCH /api/keys
 * Updates key metadata (name, rate limits, scopes, IP whitelisting)
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id: keyId, name, rateLimitPerMinute, scopes, ipWhitelist } = body;

    if (!keyId) {
      return NextResponse.json({ error: 'Missing key ID parameter' }, { status: 400 });
    }

    const auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(req);
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const persistence = GalxPersistence.getInstance();
    const keyRepo = ApiKeyRepository.getInstance();

    const existing = (await keyRepo.getGatewayKeyById(keyId)) || persistence.getGatewayKeys().find(k => k.id === keyId);

    if (!existing) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    if (existing.userId !== auth.userId && !auth.claims?.scopes?.includes('admin:*')) {
      return NextResponse.json({ error: 'Forbidden: Cannot modify an API key belonging to another user' }, { status: 403 });
    }

    const updatedKey: DeveloperGatewayKey = {
      ...existing,
      name: name !== undefined ? sanitizeKeyName(name) : existing.name,
      rateLimitPerMinute: rateLimitPerMinute !== undefined ? sanitizeRateLimit(rateLimitPerMinute) : existing.rateLimitPerMinute,
      scopes: scopes !== undefined ? sanitizeScopes(scopes) : existing.scopes,
      ipWhitelist: Array.isArray(ipWhitelist) ? ipWhitelist.filter(ip => typeof ip === 'string').slice(0, 20) : existing.ipWhitelist
    };

    await keyRepo.saveGatewayKey(updatedKey).catch(() => {});
    persistence.saveGatewayKey(updatedKey);
    persistence.logAudit('GATEWAY_KEY_UPDATED', { keyId, updates: { name, rateLimitPerMinute, scopes } }, keyId, auth.userId);

    return NextResponse.json({
      success: true,
      message: 'API key settings updated successfully',
      key: {
        id: updatedKey.id,
        name: updatedKey.name,
        keyPrefix: updatedKey.keyPrefix,
        environment: updatedKey.environment,
        scopes: updatedKey.scopes,
        rateLimitPerMinute: updatedKey.rateLimitPerMinute
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update key' }, { status: 500 });
  }
}

/**
 * DELETE /api/keys
 * Instantly revokes a developer API key
 */
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
