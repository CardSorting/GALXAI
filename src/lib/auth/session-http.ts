import { NextResponse, type NextRequest } from 'next/server';
import type { CookieOptions } from '@supabase/ssr';
import { canonicalRequestOrigin } from '../security/request-origin';
export type SessionCookie = { name: string; value: string; options: CookieOptions };

/** Propagate only SDK cookie mutations onto an application-owned response. */
export function withSessionCookies(response: Response, cookies: SessionCookie[] = []): Response {
  if (!cookies.length) return response;
  const result = new NextResponse(response.body, { status: response.status, headers: response.headers });
  for (const cookie of cookies) result.cookies.set(cookie.name, cookie.value, cookie.options);
  return result;
}

export class SessionAccessError extends Error {
  constructor(readonly status: 400 | 401 | 403 | 503, readonly cookies: { name: string; value: string; options: CookieOptions }[] = []) { super(status === 503 ? 'Session verification is unavailable. Try again.' : status === 403 ? 'This request is not allowed.' : status === 400 ? 'Check the request and try again.' : 'Sign in again to continue.'); }
}
export async function readSessionBody(request: NextRequest): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new SessionAccessError(400);
  let size = 0; const chunks: Uint8Array[] = [];
  for (;;) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.byteLength; if (size > 24_000) { await reader.cancel(); throw new SessionAccessError(400); }
    chunks.push(value);
  }
  try {
    const raw = Buffer.concat(chunks).toString('utf8');
    const body = request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded') ? Object.fromEntries(new URLSearchParams(raw)) : JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body;
  } catch { throw new SessionAccessError(400); }
}
export function sessionResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store', Pragma: 'no-cache', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow', ...(status === 503 ? { 'Retry-After': '3' } : {}) } });
}
export function sessionFailure(error: unknown) {
  const failure = error instanceof SessionAccessError ? error : new SessionAccessError(503);
  const response = sessionResponse({ valid: false, error: failure.message }, failure.status);
  for (const cookie of failure.cookies) response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
export function sessionBearer(request: Request): string | undefined {
  const header = request.headers.get('authorization');
  if (header === null) return undefined;
  const match = header.match(/^Bearer ([^\s,]+)$/i);
  if (!match || match[1].length > 16_384) throw new SessionAccessError(401);
  return match[1];
}
/** A bearer credential may be used by a CLI; ambient browser cookies require same-origin intent. */
export function requireSessionMutation(request: Request) {
  const origin = request.headers.get('origin');
  const expected = canonicalRequestOrigin(request);
  if (!expected || (origin !== null && origin !== expected) || ['cross-site', 'same-site'].includes(request.headers.get('sec-fetch-site') || '')) throw new SessionAccessError(403);
  if (!sessionBearer(request) && origin !== expected && request.headers.get('sec-fetch-site') !== 'same-origin') throw new SessionAccessError(403);
}
export function clearSessionCookies(request: NextRequest, response: NextResponse) {
  const names = new Set(['galx_session', 'galx_user_role', 'galx_logout_pending', ...request.cookies.getAll().map(c => c.name).filter(name => /^sb-.+-auth-token(?:\.\d+|-code-verifier)?$/.test(name))]);
  for (const name of names) response.cookies.set(name, '', { path: '/', maxAge: 0, sameSite: 'lax', secure: canonicalRequestOrigin(request).startsWith('https:'), httpOnly: name.startsWith('galx_') && name !== 'galx_logout_pending' });
  return response;
}
