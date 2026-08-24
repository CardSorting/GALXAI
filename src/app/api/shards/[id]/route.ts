import { NextRequest, NextResponse } from 'next/server';
import { galxRouter } from '@/core/router/GalxModelRouter';
import type { GalxShardAccount } from '@/core/contracts/GalxContracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { shardMode, status, priority, accountLabel } = body;

    const account = galxRouter.substrate.getAccount(id);
    if (!account) {
      return NextResponse.json({ error: 'Shard not found' }, { status: 404 });
    }

    const updated: GalxShardAccount = {
      ...account,
      shardMode: shardMode || account.shardMode || 'pooled',
      status: status || account.status,
      priority: priority !== undefined ? Number(priority) : account.priority,
      accountLabel: accountLabel || account.accountLabel,
      updatedAtMs: Date.now()
    };

    galxRouter.substrate.updateAccount(updated);

    return NextResponse.json({ success: true, shard: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    galxRouter.substrate.deleteAccount(id);
    return NextResponse.json({ success: true, message: `Shard ${id} deleted` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
