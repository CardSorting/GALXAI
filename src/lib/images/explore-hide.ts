import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { executePostgresQuery } from '@/lib/db/postgres';
import { logImageFailure } from '@/lib/security/private-image-diagnostics';
import { requireSessionMutation, SessionAccessError } from '@/lib/auth/session-http';

const ASSET_ID_PATTERN = /^[A-Za-z0-9._:-]+$/;
const MAX_BODY_BYTES = 12_000;

type HideAction = 'hide' | 'unhide';

function response(body: Record<string, unknown>, status = 200, retryAfter?: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      ...(retryAfter ? { 'Retry-After': String(Math.max(1, Math.min(900, Math.ceil(retryAfter)))) } : {}),
    },
  });
}

function sessionError(error: unknown): NextResponse | null {
  if (!(error instanceof SessionAccessError)) return null;
  const status = error.status;
  return response(
    { success: false, error: status === 403 ? 'This action is only available from GALX.' : status === 400 ? 'Check the hide request and try again.' : 'Sign in again to continue.' },
    status,
    status === 503 ? 3 : undefined,
  );
}

function parseAction(body: unknown): { action: HideAction; assetId: string } | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  const rawAsset = typeof record.assetId === 'string'
    ? record.assetId.trim()
    : typeof record.imageId === 'string'
      ? record.imageId.trim()
      : '';
  if (!rawAsset || rawAsset.length > 160 || !ASSET_ID_PATTERN.test(rawAsset)) return null;
  return {
    action: record.action === 'unhide' ? 'unhide' : 'hide',
    assetId: rawAsset,
  };
}

/**
 * Account-scoped Explore preference mutation.
 *
 * The route deliberately does not accept a caller-supplied viewer ID or a
 * reason. “Hide” is a private personalization control; safety reporting is a
 * separate product decision and must not be smuggled into this mutation.
 */
export async function handleExploreHideMutation(
  req: NextRequest,
  parsedBody?: unknown,
  queryExecutor: typeof executePostgresQuery = executePostgresQuery,
): Promise<NextResponse> {
  try {
    requireSessionMutation(req);
  } catch (error) {
    const denied = sessionError(error);
    if (denied) return denied;
    return response({ success: false, error: 'This action is only available from GALX.' }, 403);
  }

  let auth;
  try {
    auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(req);
  } catch {
    return response({ success: false, error: 'Your account could not be checked. Try again shortly.' }, 503, 3);
  }

  if (auth.error === 'AUTH_UNAVAILABLE') {
    return response({ success: false, error: 'Your account could not be checked. Try again shortly.' }, 503, 3);
  }

  if (!auth.authenticated || !auth.userId || auth.userId === 'anonymous_developer') {
    return response({ success: false, error: 'Sign in to hide creations from your Explore feed.' }, 401);
  }

  // API keys authenticate a developer integration, not an interactive account
  // session. Keeping this preference in the browser account boundary prevents a
  // script from spending a key's identity on a large hide list.
  if (auth.authType === 'developer_key') {
    return response({ success: false, error: 'Sign in to hide creations from your Explore feed.' }, 403);
  }

  if (!parsedBody && Number(req.headers.get('content-length') || 0) > MAX_BODY_BYTES) {
    return response({ success: false, error: 'The hide request is too large.' }, 413);
  }

  let body = parsedBody;
  if (body === undefined) {
    try {
      body = await req.json();
    } catch {
      return response({ success: false, error: 'Check the hide request and try again.' }, 400);
    }
  }

  const parsed = parseAction(body);
  if (!parsed) return response({ success: false, error: 'Invalid creation identifier.' }, 400);

  try {
    const result = await queryExecutor<{ result?: Record<string, unknown> }>(
      'SELECT public.fn_set_image_explore_hide($1, $2, $3) AS result;',
      [auth.userId, parsed.assetId, parsed.action === 'hide'],
    );
    const outcome = result?.rows?.[0]?.result;

    if (!outcome || outcome.success !== true) {
      const code = outcome?.code;
      if (code === 'rate_limited' || code === 'daily_limit') {
        const retryAfter = Number(outcome?.retry_after_seconds) || 60;
        return response({ success: false, error: code === 'daily_limit'
          ? 'You have reached today’s hide limit. Try again tomorrow.'
          : 'You’re hiding creations quickly. Try again in a few minutes.' }, 429, retryAfter);
      }
      if (code === 'hide_limit') {
        return response({ success: false, error: 'Your hidden list is full. Undo a few hides to make room.' }, 409);
      }
      if (code === 'busy') {
        return response({ success: false, error: 'Your hide list is updating. Try again shortly.' }, 409, 2);
      }
      if (code === 'forbidden') return response({ success: false, error: 'This action is not available for that account.' }, 403);
      return response({ success: false, error: 'The hide preference could not be saved.' }, 503, 3);
    }

    return response({
      success: true,
      action: parsed.action === 'hide' ? 'hidden_for_you' : 'visible_for_you',
      assetId: parsed.assetId,
    });
  } catch (error) {
    logImageFailure(crypto.randomUUID(), error);
    return response({ success: false, error: 'The hide preference could not be saved. Try again shortly.' }, 503, 3);
  }
}
