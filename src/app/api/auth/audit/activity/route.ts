import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { GalxPersistence } from '@/lib/storage/GalxPersistence';

export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

/**
 * GET /api/auth/audit/activity
 * Returns humanized user authentication and security activity history.
 */
export async function GET(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const auth = await authEngine.resolveAuthIdentity(req);

    if (!auth.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid session bearer token is required' },
        { status: 401 }
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

        return {
          id: log.id,
          action: log.action,
          description,
          details: meta,
          timestamp: log.timestampMs,
          formattedDate: new Date(log.timestampMs).toISOString()
        };

      });

    return NextResponse.json({
      success: true,
      activities: userLogs,
      total: userLogs.length
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve activity history' },
      { status: 500 }
    );
  }
}
