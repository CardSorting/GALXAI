import { NextResponse, type NextRequest } from 'next/server';
import { AccountIdentityError, requireAccountIdentity } from '@/lib/auth/accountIdentity';
import { PreviewAdminRepository } from '@/lib/supabase/repositories/PreviewAdminRepository';
import { AdminError } from './errors';
import type { AdminRole, RequestState } from './preview-contract';
import { isSameOriginRequest } from '@/lib/security/same-origin';

export const adminResponse = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: {
  'Cache-Control': 'private, no-store', 'Vary': 'Cookie, Authorization',
  'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY',
} });
export function adminFailure(error: unknown) {
  if (error instanceof AccountIdentityError) return adminResponse({ error: { code: 'authentication_required', message: 'Sign in with your staff account to continue.' } }, 401);
  if (error instanceof AdminError) return adminResponse({ error: { code: error.code, message: error.message } }, error.status);
  return adminResponse({ error: { code: 'unavailable', message: 'The admin workspace is unavailable. Try again shortly.' } }, 503);
}
const invalid = () => new AdminError(400, 'invalid_request', 'Check the required fields and try again.');
const roles = new Set(['owner', 'reviewer', 'viewer']);
const states = new Set(['pending', 'approved', 'revoked', 'declined']);
export const validStaffEmail = (value: unknown): value is string => typeof value === 'string' && value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const validRevision = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const validUserId = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 200;
const validCredentialNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
};
async function readBody(req: NextRequest) {
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw invalid();
  const reader = req.body?.getReader(); if (!reader) throw invalid();
  let size = 0; const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength; if (size > 12_000) { await reader.cancel(); throw invalid(); }
    chunks.push(value);
  }
  try { const data = JSON.parse(Buffer.concat(chunks).toString('utf8')); if (!data || typeof data !== 'object' || Array.isArray(data)) throw invalid(); return data; }
  catch { throw invalid(); }
}
const defaults = { identity: requireAccountIdentity, repository: () => new PreviewAdminRepository() };
export function createPreviewAdminHandlers(deps = defaults) {
  return {
    GET: async (req: NextRequest) => {
      try {
        const identity = await deps.identity(req), repo = deps.repository();
        const params = req.nextUrl.searchParams, view = params.get('view') || 'session';
        const page = Number(params.get('page') || '1');
        if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw invalid();
        if (view === 'session') return adminResponse({ actor: await repo.session(identity) });
        if (view === 'requests' || view === 'access') {
          const status = params.get('status') || 'pending', search = (params.get('q') || '').trim();
          if (!states.has(status) && !['all', 'expired'].includes(status) || search.length > 320) throw invalid();
          return adminResponse(await repo.requests(identity, status, search, page));
        }
        if (view === 'request') {
          const id = params.get('id'); if (!id || id.length > 200) throw invalid();
          return adminResponse(await repo.detail(identity, id));
        }
        if (view === 'feedback') {
          const status = params.get('status') || 'open'; if (!['open', 'resolved', 'all'].includes(status)) throw invalid();
          return adminResponse(await repo.feedback(identity, status, page));
        }
        if (view === 'activity') return adminResponse(await repo.activity(identity, page));
        if (view === 'staff') return adminResponse(await repo.staff(identity, page));
        throw invalid();
      } catch (error) { return adminFailure(error); }
    },
    POST: async (req: NextRequest) => {
      try {
        // Browser mutations require an exact same-origin request. No cookie-bearing cross-site forms or CORS writes.
        if (!isSameOriginRequest(req))
          throw new AdminError(403, 'origin_not_allowed', 'Use the admin workspace to save changes.');
        const identity = await deps.identity(req), repo = deps.repository();
        await repo.session(identity); // Reject nonstaff before reading any body.
        const data = await readBody(req);
        if (data.action === 'review') {
          if (typeof data.user_id !== 'string' || !data.user_id || data.user_id.length > 200 || !validRevision(data.revision)
            || !states.has(data.status) || typeof data.reason !== 'string' || data.reason.trim().length < 3 || data.reason.length > 1000
            || !(data.expires_in_days === null || [7, 30, 90].includes(data.expires_in_days))) throw invalid();
          return adminResponse(await repo.review(identity, data.user_id, data.revision, data.status as RequestState, data.reason.trim(), data.expires_in_days));
        }
        if (data.action === 'feedback') {
          if (typeof data.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id)
            || !validRevision(data.revision) || typeof data.resolved !== 'boolean') throw invalid();
          return adminResponse(await repo.resolveFeedback(identity, data.id, data.revision, data.resolved));
        }
        if (data.action === 'staff') {
          if (!validStaffEmail(data.email) || !(data.revision === null || validRevision(data.revision))
            || !(data.role === null || roles.has(data.role)) || typeof data.reason !== 'string' || data.reason.trim().length < 3 || data.reason.length > 1000) throw invalid();
          return adminResponse(await repo.updateStaff(identity, data.email.toLowerCase(), data.revision, data.role as AdminRole | null, data.reason.trim()));
        }
        if (data.action === 'credential_create') {
          if (!validUserId(data.user_id) || (data.environment !== undefined && !['live', 'test'].includes(data.environment))
            || !validCredentialNumber(data.rate_limit_per_minute) || !validCredentialNumber(data.usage_cap_usd)
            || (data.expires_in_days !== undefined && data.expires_in_days !== null && (!validCredentialNumber(data.expires_in_days) || Number(data.expires_in_days) > 730))) throw invalid();
          return adminResponse(await repo.createPrivateKey(identity, data.user_id, {
            name: data.name, environment: data.environment, rateLimitPerMinute: data.rate_limit_per_minute,
            usageCapUsd: data.usage_cap_usd, expiresInDays: data.expires_in_days,
          }));
        }
        if (data.action === 'credential_update') {
          if (!validUserId(data.user_id) || typeof data.key_id !== 'string' || data.key_id.length > 100
            || (data.name !== undefined && typeof data.name !== 'string')
            || (data.rate_limit_per_minute !== undefined && !validCredentialNumber(data.rate_limit_per_minute))
            || (data.usage_cap_usd !== undefined && !validCredentialNumber(data.usage_cap_usd))) throw invalid();
          return adminResponse(await repo.updatePrivateKey(identity, data.user_id, data.key_id, {
            name: data.name, rateLimitPerMinute: data.rate_limit_per_minute, usageCapUsd: data.usage_cap_usd,
          }));
        }
        if (data.action === 'credential_revoke') {
          if (!validUserId(data.user_id) || typeof data.key_id !== 'string' || data.key_id.length > 100
            || typeof data.reason !== 'string' || data.reason.trim().length < 3 || data.reason.length > 1000) throw invalid();
          return adminResponse(await repo.revokePrivateKey(identity, data.user_id, data.key_id, data.reason.trim()));
        }
        throw invalid();
      } catch (error) { return adminFailure(error); }
    },
  };
}

export async function enforcePreviewAdmin(req: NextRequest) {
  try { await defaults.repository().session(await defaults.identity(req)); return null; }
  catch (error) { return adminFailure(error); }
}
