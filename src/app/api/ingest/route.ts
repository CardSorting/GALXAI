import { NextRequest, NextResponse } from 'next/server';
import { POST as authIngestPost } from '@/app/api/auth/ingest/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Top-Level Ingestion Gateway Alias (/api/ingest -> /api/auth/ingest).
 */
export async function POST(req: NextRequest) {
  return authIngestPost(req);
}
