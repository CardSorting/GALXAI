import { withDeveloperAccess } from '@/lib/security/developer-access';
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

async function previewGET(req: NextRequest) {
  return compactGet(req);
}

/**
 * Top-Level Gateway Alias for BroccoliDB Compaction (/api/broccolidb/compact -> /api/audit/broccolidb/compact)
 */
async function previewPOST(req: NextRequest) {
  return compactPost(req);
}

export const GET = withDeveloperAccess(previewGET);
export const POST = withDeveloperAccess(previewPOST);
