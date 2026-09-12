import type { NextRequest } from 'next/server';
import { AccountIdentityError, requireAccountIdentity } from './accountIdentity';
import { DeveloperAccessRepository, type PreviewRecord } from '@/lib/supabase/repositories/DeveloperAccessRepository';
import { previewError, previewResponse } from '@/lib/security/developer-access';
import { isSameOriginRequest } from '@/lib/security/same-origin';

const trafficOptions = new Set(['exploring', 'under_100_daily', 'under_1000_daily', 'over_1000_daily']);
function publicStatus(record: PreviewRecord | null) {
  const expired = record?.status === 'approved' && record.expires_at && record.expires_at.getTime() <= Date.now();
  return { status: expired ? 'expired' : record?.status ?? 'not_requested', requested_at: record?.requested_at.toISOString() ?? null,
    expires_at: record?.status === 'approved' ? record.expires_at?.toISOString() ?? null : null };
}
export function createDeveloperAccessHandlers(deps = {
  identity: requireAccountIdentity,
  repository: () => new DeveloperAccessRepository(),
}) {
  function failure(error: unknown) {
    return error instanceof AccountIdentityError
      ? previewError(401, 'authentication_required', 'Sign in with a verified email to request access.')
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
  return {
    GET: async (req: NextRequest) => {
      try { const actor = await deps.identity(req); return previewResponse(publicStatus(await deps.repository().get(actor.id))); }
      catch (error) { return failure(error); }
    },
    POST: async (req: NextRequest) => {
      try {
        if (!isSameOriginRequest(req, true))
          return previewError(403, 'origin_not_allowed', 'Submit your request from the GALX website.');
        const actor = await deps.identity(req);
        const input = await body(req);
        const useCase = typeof input?.use_case === 'string' ? input.use_case.trim() : '';
        if (useCase.length < 20 || useCase.length > 2000 || !trafficOptions.has(input?.expected_traffic))
          return previewError(400, 'invalid_request', 'Describe your project in 20–2,000 characters and choose expected traffic.');
        const record = await deps.repository().request(actor.id, actor.email, useCase, input.expected_traffic);
        if (!record) throw new Error('Request not persisted');
        return previewResponse(publicStatus(record));
      } catch (error) { return failure(error); }
    },
    feedback: async (req: NextRequest) => {
      try {
        if (!isSameOriginRequest(req, true))
          return previewError(403, 'origin_not_allowed', 'Send feedback from the GALX website.');
        const actor = await deps.identity(req);
        const repo = deps.repository();
        const access = await repo.get(actor.id);
        if (access?.status !== 'approved' || (access.expires_at && access.expires_at.getTime() <= Date.now()))
          return previewError(403, 'developer_preview_required', 'Private feedback is available to approved preview participants.');
        const input = await body(req);
        const message = typeof input?.message === 'string' ? input.message.trim() : '';
        if (message.length < 10 || message.length > 4000)
          return previewError(400, 'invalid_request', 'Enter feedback in 10–4,000 characters.');
        if (!await repo.feedback(actor.id, message)) return previewError(429, 'feedback_limit', 'Please wait a minute before sending more feedback.');
        return previewResponse({ received: true }, 201);
      } catch (error) { return failure(error); }
    },
  };
}
