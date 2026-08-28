import { NextRequest } from 'next/server';
import {
  GET as compactGet,
  POST as compactPost,
  OPTIONS as compactOptions,
} from '@/app/api/audit/broccolidb/compact/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function OPTIONS() {
  return compactOptions();
}

export async function GET() {
  return compactGet();
}

/**
 * Top-Level Gateway Alias for BroccoliDB Compaction (/api/broccolidb/compact -> /api/audit/broccolidb/compact)
 */
export async function POST(req: NextRequest) {
  return compactPost(req);
}
