import { NextRequest, NextResponse } from 'next/server';
import { galxRouter } from '@/core/router/GalxModelRouter';

export const runtime = 'nodejs';

/**
 * 1-Click Instant Permission Retraction & Zero-Residual Eviction Killswitch.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const userId = body.userId || 'system_admin';

    const success = galxRouter.substrate.retractAccount(id, userId);

    return NextResponse.json({
      success,
      message: `Shard ${id} permission instantly retracted. Active leases aborted and memory zeroized.`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
