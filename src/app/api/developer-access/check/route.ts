import type { NextRequest } from 'next/server';
import { enforceDeveloperAccess, previewResponse } from '@/lib/security/developer-access';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
  return await enforceDeveloperAccess(req) ?? previewResponse({ approved: true });
}
