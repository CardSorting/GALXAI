import { NextResponse, type NextRequest } from 'next/server';
import { DeveloperAccessRepository } from '@/lib/supabase/repositories/DeveloperAccessRepository';
import { USAGE_PRICING } from '@/lib/billing/usage-pricing';
import { hasInternalAccess } from './internal-access';

export type PreviewIdentity = { authenticated: boolean; userId?: string };
export type PreviewGateDependencies = {
  identity: (req: Request) => Promise<PreviewIdentity>;
  approved: (userId: string) => Promise<boolean>;
};
export const previewResponse = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: {
  'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff', 'Access-Control-Allow-Origin': '*',
} });
export function previewError(status: number, code: string, message: string) {
  return previewResponse({ error: { code, message }, request_access_url: '/developers' }, status);
}
const dependencies: PreviewGateDependencies = {
  identity: async req => {
    const { GalxAuthEngine } = await import('@/core/auth/GalxAuthEngine');
    return GalxAuthEngine.getInstance().resolveAuthIdentity(req, undefined, { countRequest: false });
  },
  approved: async id => new DeveloperAccessRepository().isApproved(id),
};
/** The current approved preview or active paid Developer subscription is looked up on every request; no JWT claim, payment header, or stale grant cache authorizes access. */
export async function enforceDeveloperAccess(req: Request, deps = dependencies): Promise<NextResponse | null> {
  try {
    if (hasInternalAccess(req.headers)) return null;
    const actor = await deps.identity(req);
    if (!actor.authenticated || !actor.userId) return previewError(401, 'authentication_required', 'Sign in or use an approved account’s API key.');
    if (!await deps.approved(actor.userId)) return previewError(403, 'developer_access_required', 'An active GALX Nova Developer Access subscription or approved preview is required.');
    return null;
  } catch {
    return previewError(503, 'access_check_unavailable', 'We couldn’t check your access. Please try again.');
  }
}
/** Route-level guard also applies when a handler is called without middleware. */
export function withDeveloperAccess<Args extends unknown[]>(handler: (req: NextRequest, ...args: Args) => Response | Promise<Response>) {
  return async (req: NextRequest, ...args: Args) => {
    const denied = await enforceDeveloperAccess(req);
    if (denied) return denied;
    const response = await handler(req, ...args);
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  };
}

/**
 * Developer admission and consumption approval are separate decisions. Keep
 * API admission available for keys, models, and documentation, but do not
 * dispatch public inference until the per-message consumption contract exists.
 */
export function usagePricingUnavailable(req: Request): NextResponse | null {
  if (USAGE_PRICING.ratesPublished || hasInternalAccess(req.headers)) return null;

  return NextResponse.json({
    error: {
      message: 'API usage is not available until the separate per-message usage-pricing terms are published. Developer Access includes no usage credits.',
      type: 'service_unavailable',
      code: 'usage_pricing_not_published',
      usage_pricing_url: USAGE_PRICING.path,
    },
  }, {
    status: 503,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/**
 * The image route is shared by the browser Image Studio and the API. Browser
 * sessions retain the consumer contract; Developer API keys must still pass
 * the live subscription check, and API consumption remains closed until its
 * separate per-message usage contract is published.
 */
export async function enforceDeveloperApiKeyAccess(req: Request, authType: string, consumption = false): Promise<NextResponse | null> {
  if (authType !== 'developer_key') return null;
  const denied = await enforceDeveloperAccess(req);
  if (denied) return denied;
  return consumption ? usagePricingUnavailable(req) : null;
}

export function withDeveloperUsageAccess<Args extends unknown[]>(handler: (req: NextRequest, ...args: Args) => Response | Promise<Response>) {
  return withDeveloperAccess(async (req: NextRequest, ...args: Args) => {
    const unavailable = usagePricingUnavailable(req);
    if (unavailable) return unavailable;
    return handler(req, ...args);
  });
}
