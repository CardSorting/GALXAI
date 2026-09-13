import { withDeveloperAccess } from '@/lib/security/developer-access';
import type { NextRequest } from 'next/server';
import { requireNativeSession } from '@/lib/auth/request-session';
import { requireSessionMutation, sessionFailure, sessionResponse } from '@/lib/auth/session-http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function previewPOST(req: NextRequest) {
  try {
    requireSessionMutation(req);
    await requireNativeSession(req);
    // A session credential is not fresh step-up proof. Keep this legacy entry closed
    // until an account-bound, expiring, single-use verification ceremony is implemented.
    return sessionResponse({ error: 'Additional verification is required. This action is currently unavailable.', elevationRequired: true }, 403);
  } catch (error) { return sessionFailure(error); }
}
export const POST = withDeveloperAccess(previewPOST);
