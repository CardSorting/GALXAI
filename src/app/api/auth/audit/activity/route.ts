import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextRequest, NextResponse } from 'next/server';
import { hasInternalAccess } from '@/lib/security/internal-access';
import { sessionFailure, sessionResponse } from '@/lib/auth/session-http';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { GalxPersistence } from '@/lib/storage/GalxPersistence';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/auth/audit/activity
 * Returns humanized user authentication and security activity history.
 */
async function previewGET(req: NextRequest) {
  try {
    if (!hasInternalAccess(req.headers)) return sessionResponse({ error: 'Administrator authorization is required.' }, 403);
    const authEngine = GalxAuthEngine.getInstance();
    const auth = await authEngine.resolveAuthIdentity(req);

    if (!auth.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid session bearer token is required' },
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const persistence = GalxPersistence.getInstance();
    const allAuditLogs = persistence.getAuditLogs();
    const userLogs = allAuditLogs
      .filter(l => l.userId === auth.userId)
      .slice(-50)
      .reverse()
      .map(log => {
        let description = log.action;
        const meta = log.metadata || {};
        if (log.action === 'PROVIDER_AUTH_LOGIN') {
          description = `Signed in via ${meta.provider || 'Provider'} (${meta.email || 'Account'})`;
        } else if (log.action === 'SESSION_TOKEN_ROTATED') {
          description = 'Session token refreshed & rotated (Anti-replay window preserved)';
        } else if (log.action === 'SUDO_MODE_ELEVATED') {
          description = 'Step-Up SUDO elevation activated for 15 minutes';
        } else if (log.action === 'SESSION_REVOKED') {
          description = `Device session logged out (${meta.reason || 'User initiated'})`;
        } else if (log.action === 'OTHER_SESSIONS_REVOKED') {
          description = `Remote logout executed on ${meta.count || 0} other device(s)`;
        } else if (log.action === 'TOKEN_REUSE_ATTACK_DETECTED') {
          description = 'SECURITY THREAT: Suspected token replay attack blocked; session family terminated';
        }

        const cleanMeta = { ...meta };
        delete cleanMeta.shardId;
        delete cleanMeta.shardMode;

        return {
          id: log.id,
          action: log.action,
          description,
          details: cleanMeta,
          timestamp: log.timestampMs,
          formattedDate: new Date(log.timestampMs).toISOString()
        };

      });

    return NextResponse.json({
      success: true,
      activities: userLogs,
      total: userLogs.length
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error) {
    return sessionFailure(error);
  }
}

export const GET = withDeveloperAccess(previewGET);
