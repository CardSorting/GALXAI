import { NextRequest } from 'next/server';
import { GET as imageStream } from '@/app/v1/images/requests/[id]/stream/route';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest, { params }: { params: Promise<{ queueId: string; taskId: string }> }) {
  return imageStream(req, { params: Promise.resolve({ id: (await params).taskId }) });
}
