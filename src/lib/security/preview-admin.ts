import type { NextRequest } from 'next/server';
import { enforcePreviewAdmin } from '@/lib/admin/preview-route';

/** Credential management is an administrator operation, even for authenticated accounts. */
export function withPreviewAdmin<Args extends unknown[]>(handler: (req: NextRequest, ...args: Args) => Response | Promise<Response>) {
  return async (req: NextRequest, ...args: Args) => {
    const denied = await enforcePreviewAdmin(req);
    if (denied) return denied;
    const response = await handler(req, ...args);
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  };
}
