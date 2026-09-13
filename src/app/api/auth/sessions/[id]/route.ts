import { withDeveloperAccess } from '@/lib/security/developer-access';
import type { NextRequest } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { requireNativeSession } from '@/lib/auth/request-session';
import { requireSessionMutation, sessionFailure, sessionResponse } from '@/lib/auth/session-http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function previewDELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSessionMutation(req);
    const actor = await requireNativeSession(req), { id } = await params;
    if (!id || id.length > 200) return sessionResponse({ error: 'Session not found.' }, 404);
    const success = await GalxAuthEngine.getInstance().revokeSessionById(id, actor.user.id);
    return success ? sessionResponse({ success: true, message: 'Device signed out.' }) : sessionResponse({ error: 'Session not found.' }, 404);
  } catch (error) { return sessionFailure(error); }
}
export const DELETE = withDeveloperAccess(previewDELETE);
