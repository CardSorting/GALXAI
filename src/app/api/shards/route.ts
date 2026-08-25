import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400'
    }
  });
}

export async function GET() {
  return NextResponse.json(
    {
      error: 'Direct partition inspection is deprecated. Infrastructure routing is sovereign and managed at the gateway layer.',
      code: 'endpoint_deprecated'
    },
    { status: 410, headers: { 'Access-Control-Allow-Origin': '*' } }
  );
}

export async function POST() {
  return NextResponse.json(
    {
      error: 'Direct partition creation is deprecated. Infrastructure routing is sovereign and managed at the gateway layer.',
      code: 'endpoint_deprecated'
    },
    { status: 410, headers: { 'Access-Control-Allow-Origin': '*' } }
  );
}
