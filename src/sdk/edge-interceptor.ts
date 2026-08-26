/**
 * GALXAI Zero-File Next.js Edge Middleware Interceptor
 * Intercepts AI requests at the Edge before route files are even needed.
 */

import { handleGalxAI } from './next';

export interface MiddlewareConfig {
  apiKey?: string;
  baseURL?: string;
  paths?: string[];
}

/**
 * Creates Next.js Edge Middleware that handles /api/galxai/* and /api/generate automatically.
 *
 * @example
 * ```ts
 * // middleware.ts in project root
 * import { galxaiMiddleware } from 'galxai/middleware';
 * export default galxaiMiddleware();
 * export const config = { matcher: ['/api/galxai/:path*', '/api/generate', '/api/chat', '/api/models'] };
 * ```
 */
export function galxaiMiddleware(config: MiddlewareConfig = {}) {
  const interceptedPaths = config.paths || ['/api/galxai', '/api/generate', '/api/chat', '/api/models'];

  return async function middleware(req: any) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    const isMatch = interceptedPaths.some(p => pathname === p || pathname.startsWith(`${p}/`));
    if (!isMatch) {
      return undefined; // Continue to normal Next.js pipeline
    }

    return handleGalxAI(req);
  };
}

export const createEdgeInterceptor = galxaiMiddleware;
