import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Retired compatibility route. The former response exposed a free grant and
 * priority-pool state, neither of which is part of Developer Access. Keep the
 * address inert until an approved usage contract exists.
 */
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-api-key, x-galx-key',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export function GET() {
  return NextResponse.json({
    error: 'Self-service developer access and public usage allowances are not available.',
  }, {
    status: 410,
    headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
