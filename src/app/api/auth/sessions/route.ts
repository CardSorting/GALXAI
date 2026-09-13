import { withDeveloperAccess } from '@/lib/security/developer-access';
import type { NextRequest } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { requireNativeSession } from '@/lib/auth/request-session';
import { requireSessionMutation, sessionFailure, sessionResponse } from '@/lib/auth/session-http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function previewGET(req: NextRequest) {
  try {
    const actor = await requireNativeSession(req);
    const devices = await GalxAuthEngine.getInstance().getUserActiveSessions(actor.user.id, actor.session.id);
    const sessions = devices.map(device => ({ id: device.id, browser: device.browser, os: device.os,
      isCurrent: device.id === actor.session.id, lastActiveAtMs: device.lastActiveAtMs,
      expiresAtMs: device.expiresAtMs, createdAt: device.createdAt }));
    return sessionResponse({ success: true, sessions, total: sessions.length, currentSessionId: actor.session.id });
  } catch (error) { return sessionFailure(error); }
}
async function previewDELETE(req: NextRequest) {
  try {
    requireSessionMutation(req);
    const actor = await requireNativeSession(req);
    const revokedCount = await GalxAuthEngine.getInstance().revokeOtherSessions(actor.user.id, actor.session.id);
    return sessionResponse({ success: true, revokedCount, message: 'Other device sessions have been signed out.' });
  } catch (error) { return sessionFailure(error); }
}
export const GET = withDeveloperAccess(previewGET);
export const DELETE = withDeveloperAccess(previewDELETE);
