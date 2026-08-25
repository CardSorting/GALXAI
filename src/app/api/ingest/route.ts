import { NextRequest } from 'next/server';
import { POST as authIngestPost, OPTIONS as authIngestOptions } from '@/app/api/auth/ingest/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return authIngestOptions();
}

/**
 * Top-Level Ingestion Gateway Alias (/api/ingest -> /api/auth/ingest).
 */
export async function POST(req: NextRequest) {
  return authIngestPost(req);
}
