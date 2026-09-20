import { NextRequest } from 'next/server';
import { readImageArtifact } from '@/lib/images/read-image-artifact';
import { imageBytesResponse, imageError } from '@/lib/security/public-image-http';
import { logImageFailure } from '@/lib/security/private-image-diagnostics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const artifact = await readImageArtifact((await params).token, false, req);
    return artifact ? imageBytesResponse(artifact, requestId) : imageError('not_found', requestId);
  } catch (error) {
    logImageFailure(requestId, error);
    return imageError('temporarily_unavailable', requestId, 3);
  }
}
