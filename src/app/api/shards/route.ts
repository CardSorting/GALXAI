import { withDeveloperAccess } from '@/lib/security/developer-access';
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

async function previewGET() {
  return NextResponse.json(
    {
      error: 'Direct partition inspection is deprecated. Infrastructure routing is sovereign and managed at the gateway layer.',
      code: 'endpoint_deprecated'
    },
    { status: 410, headers: { 'Access-Control-Allow-Origin': '*' } }
  );
}

async function previewPOST() {
  return NextResponse.json(
    {
      error: 'Direct partition creation is deprecated. Infrastructure routing is sovereign and managed at the gateway layer.',
      code: 'endpoint_deprecated'
    },
    { status: 410, headers: { 'Access-Control-Allow-Origin': '*' } }
  );
}

export const GET = withDeveloperAccess(previewGET);
export const POST = withDeveloperAccess(previewPOST);
