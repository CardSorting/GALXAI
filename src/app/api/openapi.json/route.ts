import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

/** GALX does not offer a public general-purpose inference API. */
export function GET() {
  return NextResponse.json(
    { error: { code: 'not_available', message: 'Public API documentation is not available.' } },
    { status: 410, headers: { 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow' } },
  );
}
