import type { NextRequest } from 'next/server';

/** Compare the browser Origin with the HTTP target host, including its port.
 * NextURL can canonicalize loopback hosts; the incoming Host retains the actual target.
 * Browser scripts cannot choose Host or Origin on a cross-site credentialed request.
 */
export function isSameOriginRequest(req: NextRequest, allowMissing = false): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return allowMissing;
  try {
    const source = new URL(origin);
    const host = req.headers.get('host') || req.nextUrl.host;
    const protocol = req.headers.get('x-forwarded-proto') === 'https' ? 'https:' : req.nextUrl.protocol;
    return source.origin === origin && ['http:', 'https:'].includes(source.protocol)
      && source.protocol === protocol && source.host.toLowerCase() === host.toLowerCase()
      && req.headers.get('sec-fetch-site') !== 'cross-site';
  } catch { return false; }
}
