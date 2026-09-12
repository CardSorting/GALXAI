import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

/**
 * Native Ollama-Compatible GET /api/version Endpoint.
 */
async function previewGET() {
  return NextResponse.json(
    { version: '0.5.12-galxai-gateway' },
    {
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    }
  );
}

export const GET = withDeveloperAccess(previewGET);
