import { NextRequest, NextResponse } from 'next/server';
import { GalxPersistence } from '@/lib/storage/GalxPersistence';
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
      'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-api-key, x-galx-key',
      'Access-Control-Max-Age': '86400'
    }
  });
}

function sanitizeKeyName(rawName: unknown): string {
  if (typeof rawName !== 'string') return 'Developer API Key';
  const sanitized = rawName.trim().replace(/[<>"/\\{}\x00-\x1F]/g, '').slice(0, 80);
  return sanitized || 'Developer API Key';
}

function sanitizeRateLimit(rawRpm: unknown): number {
  const parsed = Number(rawRpm);
  if (isNaN(parsed) || parsed < 10) return 120;
  if (parsed > 10000) return 10000;
  return Math.floor(parsed);
}

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
 * GET /api/keys/[id]
 * Retrieves full metadata for an individual API key
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: keyId } = await params;
    if (!keyId) return NextResponse.json({ error: 'Missing key ID' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get('userId') || undefined;

    const auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(req);
    const userId = (auth.authenticated && auth.userId && auth.userId !== 'anonymous_developer')
      ? auth.userId
      : requestedUserId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const persistence = GalxPersistence.getInstance();
    const keyRepo = ApiKeyRepository.getInstance();

    const found = (await keyRepo.getGatewayKeyById(keyId)) || persistence.getGatewayKeys().find(k => k.id === keyId);

    if (!found) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    if (found.userId !== userId && !auth.claims?.scopes?.includes('admin:*')) {
      return NextResponse.json({ error: 'Forbidden: Cannot inspect another user\'s key' }, { status: 403 });
    }

    const env = found.environment || (found.prefix?.includes('test') ? 'test' : 'live');
    const isExpired = Boolean(found.expiresAtMs && found.expiresAtMs <= Date.now());

    return NextResponse.json({
      success: true,
      key: {
        id: found.id,
        keyPrefix: found.keyPrefix || found.prefix,
        name: found.name,
        userId: found.userId,
        environment: env,
        scopes: found.scopes || ['*'],
        rateLimitPerMinute: found.rateLimitPerMinute || 120,
        totalRequests: found.totalRequests || 0,
        totalTokens: found.totalTokens || 0,
        createdAt: found.createdAtMs,
        lastUsedAt: found.lastUsedAtMs,
        expiresAt: found.expiresAtMs,
        isExpired,
        revoked: Boolean(found.revoked)
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch key' }, { status: 500 });
  }
}

/**
 * PATCH /api/keys/[id]
 * Updates an individual key's settings (label, rate limits, scopes, IP whitelist, expiration)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: keyId } = await params;
    if (!keyId) return NextResponse.json({ error: 'Missing key ID' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { name, rateLimitPerMinute, scopes, expiresInDays, defaultCompactionMode } = body;

    const auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(req);
    const userId = (auth.authenticated && auth.userId && auth.userId !== 'anonymous_developer')
      ? auth.userId
      : body.userId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const persistence = GalxPersistence.getInstance();
    const keyRepo = ApiKeyRepository.getInstance();

    const existing = (await keyRepo.getGatewayKeyById(keyId)) || persistence.getGatewayKeys().find(k => k.id === keyId);

    if (!existing) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    if (existing.userId !== userId && !auth.claims?.scopes?.includes('admin:*')) {
      return NextResponse.json({ error: 'Forbidden: Cannot modify an API key belonging to another user' }, { status: 403 });
    }

    let updatedExpiresAt = existing.expiresAtMs;
    if (expiresInDays !== undefined) {
      if (Number(expiresInDays) <= 0) {
        updatedExpiresAt = undefined;
      } else {
        updatedExpiresAt = Date.now() + Math.min(Number(expiresInDays), 730) * 86400 * 1000;
      }
    }

    const updatedKey: DeveloperGatewayKey = {
      ...existing,
      name: name !== undefined ? sanitizeKeyName(name) : existing.name,
      rateLimitPerMinute: rateLimitPerMinute !== undefined ? sanitizeRateLimit(rateLimitPerMinute) : existing.rateLimitPerMinute,
      scopes: scopes !== undefined ? sanitizeScopes(scopes) : existing.scopes,
      expiresAtMs: updatedExpiresAt,
      defaultCompactionMode: defaultCompactionMode !== undefined ? (defaultCompactionMode === 'raw' ? 'raw' : 'auto') : existing.defaultCompactionMode,
    };

    await keyRepo.saveGatewayKey(updatedKey).catch(() => {});
    persistence.saveGatewayKey(updatedKey);
    persistence.logAudit('GATEWAY_KEY_UPDATED', { keyId, updates: body }, keyId, userId);

    return NextResponse.json({
      success: true,
      message: 'API key updated successfully',
      key: {
        id: updatedKey.id,
        name: updatedKey.name,
        keyPrefix: updatedKey.keyPrefix,
        environment: updatedKey.environment,
        scopes: updatedKey.scopes,
        rateLimitPerMinute: updatedKey.rateLimitPerMinute,
        expiresAt: updatedKey.expiresAtMs,
        defaultCompactionMode: updatedKey.defaultCompactionMode,
        updatedAt: Date.now()
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update key' }, { status: 500 });
  }
}

/**
 * DELETE /api/keys/[id]
 * Revokes an individual key immediately
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: keyId } = await params;
    if (!keyId) return NextResponse.json({ error: 'Missing key ID' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get('userId') || undefined;

    const auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(req);
    const userId = (auth.authenticated && auth.userId && auth.userId !== 'anonymous_developer')
      ? auth.userId
      : requestedUserId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const persistence = GalxPersistence.getInstance();
    const keyRepo = ApiKeyRepository.getInstance();

    const existing = (await keyRepo.getGatewayKeyById(keyId)) || persistence.getGatewayKeys().find(k => k.id === keyId);

    if (!existing) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    if (existing.userId !== userId && !auth.claims?.scopes?.includes('admin:*')) {
      return NextResponse.json({ error: 'Forbidden: Cannot revoke a key belonging to another user' }, { status: 403 });
    }

    const targetUserId = auth.claims?.scopes?.includes('admin:*') ? undefined : userId;
    await keyRepo.revokeKey(keyId, 'User requested revocation via REST API', targetUserId);
    persistence.apiKeyTable.put(keyId, { ...existing, revoked: true });
    persistence.logAudit('GATEWAY_KEY_REVOKED', { keyId }, keyId, existing.userId);

    return NextResponse.json({ success: true, message: `Key ${keyId} revoked successfully` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to revoke key' }, { status: 500 });
  }
}
