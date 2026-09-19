import type { NextRequest } from 'next/server';
import { AccountIdentityError, requireAccountIdentity } from './accountIdentity';
import { DeveloperAccessRepository, type PreviewRecord } from '@/lib/supabase/repositories/DeveloperAccessRepository';
import { previewError, previewResponse } from '@/lib/security/developer-access';
import { isSameOriginRequest } from '@/lib/security/same-origin';
import { validateApplication } from '@/lib/developers/application';

function publicStatus(access: { approved: boolean; record: PreviewRecord | null }) {
  const record = access.record;
  const expired = record?.status === 'approved' && record.expires_at && record.expires_at.getTime() <= Date.now();
  const manualExpiry = access.approved && record?.status === 'approved' && !expired && record.expires_at
    ? record.expires_at.toISOString() : null;
  return { status: access.approved ? 'approved' : expired ? 'expired' : record?.status ?? 'not_requested', requested_at: record?.requested_at.toISOString() ?? null,
    expires_at: manualExpiry,
    application: record ? {
      introduction: record.introduction ?? null, github_url: record.github_url ?? null, linkedin_url: record.linkedin_url ?? null,
      use_case: record.use_case, expected_traffic: record.expected_traffic, cohort_interest: record.cohort_interest ?? null,
      revision: record.revision ?? 1, updated_at: record.application_updated_at?.toISOString() ?? null,
    } : null };
}
export function createDeveloperAccessHandlers(deps = {
  identity: requireAccountIdentity,
  repository: () => new DeveloperAccessRepository(),
}) {
  const retired = () => previewError(410, 'public_access_retired', 'Self-service developer access is no longer available.');
  function failure(error: unknown) {
    return error instanceof AccountIdentityError
      ? previewError(401, 'authentication_required', 'Sign in with an authorized account to continue.')
      : previewError(503, 'request_unavailable', 'Your request could not be saved. Please try again.');
  }
  async function body(req: NextRequest) {
    // Bound the raw stream as well as parsed fields; Content-Length is untrusted.
    const reader = req.body?.getReader();
    if (!reader) return null;
    let size = 0; const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 20_000) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return null; }
  }
  async function saveApplication(req: NextRequest, editing: boolean) {
    try {
      if (!isSameOriginRequest(req, true)) return previewError(403, 'origin_not_allowed', 'Submit your application from the GALX website.');
      const actor = await deps.identity(req);
      const input = await body(req);
      const { value, errors } = validateApplication(input);
      if (Object.keys(errors).length) return previewResponse({ error: {
        code: 'invalid_request', message: 'Check the highlighted fields and try again.', fields: errors,
      } }, 400);
      if (editing && (!Number.isSafeInteger(input?.revision) || input.revision < 1)) return previewError(400, 'invalid_revision', 'Refresh your application before saving changes.');
      const repo = deps.repository();
      const record = editing ? await repo.updateApplication(actor.id, input.revision, value)
        : await repo.request(actor.id, actor.email, value.use_case, value.expected_traffic, value);
      if (!record) return previewError(409, 'application_changed', 'Your application or access status changed. Reload the saved application before editing again.');
      return previewResponse(publicStatus({
        approved: record.status === 'approved' && (!record.expires_at || record.expires_at.getTime() > Date.now()),
        record,
      }));
    } catch (error) { return failure(error); }
  }
  return {
    GET: async () => retired(),
    POST: async () => retired(),
    PATCH: async () => retired(),
    feedback: async () => retired(),
  };
}
