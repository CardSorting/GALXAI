import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET(req: NextRequest) {
  void req;
  return NextResponse.json({
    error: 'Usage quotes are not available through this retired credit-quote route.',
  }, { status: 410, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
