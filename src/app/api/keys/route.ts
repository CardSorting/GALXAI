import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextRequest, NextResponse } from 'next/server';
import { GalxPersistence } from '@/lib/storage/GalxPersistence';
import { GalxCryptoVault } from '@/core/vault/GalxCryptoVault';
import { AccountIdentityError, requireAccountIdentity } from '@/lib/auth/accountIdentity';
import { getPostgresPool } from '@/lib/db/postgres';
import { ensureWallet } from '@/lib/billing/wallet';
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

async function accountIsPaid(userId: string) {
  const pool = getPostgresPool();
  if (!pool) throw new Error('Wallet storage unavailable');
  const wallet = await ensureWallet(pool, userId);
  return wallet.proof_of_deposit_verified && Number(wallet.deposited_total_usd) > 0;
}
function keyFailure(error: unknown) {
  return NextResponse.json({ error: error instanceof AccountIdentityError ? 'Sign in with a verified account to manage API keys.' : 'API keys are unavailable. Please try again.' },
    { status: error instanceof AccountIdentityError ? 401 : 503, headers: { 'Cache-Control': 'private, no-store' } });
}
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
async function previewGET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get('userId') || undefined;
    const environmentFilter = searchParams.get('environment') as 'live' | 'test' | null;

    const actor = await requireAccountIdentity(req);
    const targetUserId = actor.id;

    if (requestedUserId && requestedUserId !== actor.id) {
      return NextResponse.json({ error: 'Cannot inspect keys belonging to another account.' }, { status: 403 });
    }

    // ETag & HTTP 304 Not Modified validation for zero-egress delta syncing
    const ifNoneMatch = req.headers.get('if-none-match');
    const keyRepo = ApiKeyRepository.getInstance();
    const etag = await keyRepo.getUserKeysETag(targetUserId);

    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          'ETag': etag,
          'Cache-Control': 'private, no-cache'
        }
      });
    }

    // Attempt authoritative database retrieval with hot-cache fallback
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
    }, {
      headers: {
        'ETag': etag,
        'Cache-Control': 'private, no-cache'
      }
    });
  } catch (error) {
    return keyFailure(error);
  }
}

/**
 * POST /api/keys
 * Mints a new developer gateway key with SHA-256 hash and embedded checksum
 */
async function previewPOST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      name,
      environment = 'live',
      rateLimitPerMinute,
      scopes,
      expiresInDays,
      defaultCompactionMode = 'raw',
    } = body;

    const actor = await requireAccountIdentity(req);
    const userId = actor.id;
    if (body.userId && body.userId !== userId) {
      return NextResponse.json({ error: 'Cannot create keys for another account.' }, { status: 403 });
    }

    const cleanName = sanitizeKeyName(name);
    const cleanRpm = sanitizeRateLimit(rateLimitPerMinute);
    const cleanScopes = sanitizeScopes(scopes);
    const cleanEnv: 'live' | 'test' = environment === 'test' ? 'test' : 'live';
    const cleanCompactionMode: 'auto' | 'raw' = defaultCompactionMode === 'auto' ? 'auto' : 'raw';

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

    // Welcome credit is spendable balance, never proof of a paid deposit.
    const isPaid = await accountIsPaid(userId);
    const computePool: 'shared_community' | 'priority_dedicated' = isPaid ? 'priority_dedicated' : 'shared_community';
    const effectiveRpm = isPaid ? cleanRpm : Math.min(cleanRpm, 60);

    const { apiKey, keyPrefix, keyHash, checksum } = GalxCryptoVault.generateGatewayKey(cleanName, userId, { environment: cleanEnv });
    const keyId = `key_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newKey: DeveloperGatewayKey = {
      id: keyId,
      prefix: keyPrefix,
      keyPrefix,
      keyHash,
      name: cleanName,
      userId,
      rateLimitPerMinute: effectiveRpm,
      totalRequests: 0,
      totalTokens: 0,
      createdAtMs: Date.now(),
      revoked: false,
      environment: cleanEnv,
      scopes: cleanScopes,
      expiresAtMs,
      checksum,
      computePool,
      freeMonthlyGrantUsd: 30.00,
      defaultCompactionMode: cleanCompactionMode,
    };

    // Save to authoritative database and memory cache
    await keyRepo.saveGatewayKey(newKey, {
      requireRemote: true
    });
    persistence.apiKeyTable.put(newKey.id, newKey);

    persistence.logAudit(
      'GATEWAY_KEY_CREATED',
      { keyId, keyPrefix, name: cleanName, environment: cleanEnv, scopes: cleanScopes, computePool, freeMonthlyGrantUsd: 30.00 },
      keyId,
      userId
    );

    return NextResponse.json({
      success: true,
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
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return keyFailure(error);
  }
}

/**
 * PATCH /api/keys
 * Updates key metadata (name, rate limits, scopes, IP whitelisting)
 */
async function previewPATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id: keyId, name, rateLimitPerMinute, scopes, defaultCompactionMode } = body;

    if (!keyId) {
      return NextResponse.json({ error: 'Missing key ID parameter' }, { status: 400 });
    }

    const actor = await requireAccountIdentity(req);

    const persistence = GalxPersistence.getInstance();
    const keyRepo = ApiKeyRepository.getInstance();

    const existing = (await keyRepo.getGatewayKeyById(keyId)) || persistence.getGatewayKeys().find(k => k.id === keyId);

    if (!existing) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    if (existing.userId !== actor.id) {
      return NextResponse.json({ error: 'Forbidden: Cannot modify an API key belonging to another user' }, { status: 403 });
    }

    const updatedKey: DeveloperGatewayKey = {
      ...existing,
      name: name !== undefined ? sanitizeKeyName(name) : existing.name,
      rateLimitPerMinute: rateLimitPerMinute !== undefined ? Math.min(sanitizeRateLimit(rateLimitPerMinute), await accountIsPaid(actor.id) ? 10000 : 60) : existing.rateLimitPerMinute,
      scopes: scopes !== undefined ? sanitizeScopes(scopes) : existing.scopes,
      defaultCompactionMode: defaultCompactionMode !== undefined ? (defaultCompactionMode === 'raw' ? 'raw' : 'auto') : existing.defaultCompactionMode,
    };

    await keyRepo.saveGatewayKey(updatedKey, { requireRemote: true });
    persistence.saveGatewayKey(updatedKey);
    persistence.logAudit('GATEWAY_KEY_UPDATED', { keyId, updates: { name, rateLimitPerMinute, scopes } }, keyId, actor.id);

    return NextResponse.json({
      success: true,
      message: 'API key settings updated successfully',
      key: {
        id: updatedKey.id,
        name: updatedKey.name,
        keyPrefix: updatedKey.keyPrefix,
        environment: updatedKey.environment,
        scopes: updatedKey.scopes,
        rateLimitPerMinute: updatedKey.rateLimitPerMinute,
        defaultCompactionMode: updatedKey.defaultCompactionMode,
      }
    });
  } catch (error) {
    return keyFailure(error);
  }
}

/**
 * DELETE /api/keys
 * Instantly revokes a developer API key
 */
async function previewDELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keyId = searchParams.get('id');
    if (!keyId) return NextResponse.json({ error: 'Missing key id' }, { status: 400 });

    const actor = await requireAccountIdentity(req);
    const userId = actor.id;

    const persistence = GalxPersistence.getInstance();
    const keyRepo = ApiKeyRepository.getInstance();

    const keys = persistence.getGatewayKeys();
    const found = keys.find(k => k.id === keyId) || (await keyRepo.getGatewayKeyById(keyId));

    if (!found) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    if (found.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden: Cannot revoke a key belonging to another user' }, { status: 403 });
    }

    await keyRepo.revokeKey(keyId, 'User requested revocation via developer console', found.userId);
    persistence.apiKeyTable.put(keyId, { ...found, revoked: true });
    persistence.logAudit('GATEWAY_KEY_REVOKED', { keyId }, keyId, found.userId);

    return NextResponse.json({ success: true, message: `Key ${keyId} revoked successfully` });
  } catch (error) {
    return keyFailure(error);
  }
}

export const GET = withDeveloperAccess(previewGET);
export const POST = withDeveloperAccess(previewPOST);
export const PATCH = withDeveloperAccess(previewPATCH);
export const DELETE = withDeveloperAccess(previewDELETE);
