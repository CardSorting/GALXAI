import { NextRequest, NextResponse } from 'next/server';
import { galxRouter } from '@/core/router/GalxModelRouter';

export const runtime = 'nodejs';

export async function GET() {
  const stats = galxRouter.pool.getPoolStats();
  return NextResponse.json(stats, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.strategy) {
      galxRouter.pool.setStrategy(body.strategy);
    }
    return NextResponse.json({ success: true, strategy: galxRouter.pool.getStrategy() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
