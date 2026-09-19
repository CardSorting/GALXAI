import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
function unavailable() {
  return NextResponse.json({ error: 'Automatic top-ups are not available through this retired route.' }, { status: 410, headers: { 'Cache-Control': 'no-store' } });
}
export const GET = unavailable;
export const POST = unavailable;
