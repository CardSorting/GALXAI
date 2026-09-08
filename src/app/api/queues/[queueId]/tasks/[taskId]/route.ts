import { NextRequest } from 'next/server';
import { GET as imageGet, DELETE as imageDelete } from '@/app/v1/images/requests/[id]/route';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ queueId: string; taskId: string }> };
export async function GET(req: NextRequest, { params }: Context) {
  const url = new URL(req.url); url.searchParams.set('snapshot', 'true');
  return imageGet(new NextRequest(url, { headers: req.headers, signal: req.signal }), { params: Promise.resolve({ id: (await params).taskId }) });
}
export async function DELETE(req: NextRequest, { params }: Context) {
  return imageDelete(req, { params: Promise.resolve({ id: (await params).taskId }) });
}
