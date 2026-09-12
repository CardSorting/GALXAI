import { NextResponse, type NextRequest } from 'next/server';
import { DeveloperAccessRepository } from '@/lib/supabase/repositories/DeveloperAccessRepository';
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
/** Approval is looked up on every request; no JWT claim, payment, header, or stale grant cache authorizes access. */
export async function enforceDeveloperAccess(req: Request, deps = dependencies): Promise<NextResponse | null> {
  try {
    if (hasInternalAccess(req.headers)) return null;
    const actor = await deps.identity(req);
    if (!actor.authenticated || !actor.userId) return previewError(401, 'authentication_required', 'Sign in or use an approved account’s API key.');
    if (!await deps.approved(actor.userId)) return previewError(403, 'developer_preview_required', 'The developer API is in private preview. Request access to join.');
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
