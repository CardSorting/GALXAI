import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400'
    }
  });
}

async function previewPOST() {
  return NextResponse.json(
    {
      error: 'Direct partition retraction is deprecated. Infrastructure routing is sovereign and managed at the gateway layer.',
      code: 'endpoint_deprecated'
    },
    { status: 410, headers: { 'Access-Control-Allow-Origin': '*' } }
  );
}

export const POST = withDeveloperAccess(previewPOST);
