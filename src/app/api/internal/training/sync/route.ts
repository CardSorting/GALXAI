import { NextRequest, NextResponse } from 'next/server';
import { GalxR2TrainingSyncEngine } from '@/core/storage/GalxR2TrainingSyncEngine';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);

    const internalSecret = req.headers.get('x-galx-internal-key');
    const isValidInternal = internalSecret && internalSecret === process.env.GALX_INTERNAL_ADMIN_KEY;

    if (!authResult.authenticated && !isValidInternal) {
      return NextResponse.json(
        { error: 'Unauthorized. Internal dataset sync access required.' },
        { status: 401 }
      );
    }

    const syncEngine = GalxR2TrainingSyncEngine.getInstance();
    const syncResult = await syncEngine.syncAllDatasets();

    return NextResponse.json({
      success: true,
      engine: 'Cloudflare_R2_Training_Dataset_Synchronizer',
      syncedShards: syncResult.syncedShards,
      totalTokens: syncResult.totalTokens,
      manifest: syncResult.manifest,
      records: syncResult.records,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to execute R2 dataset sync' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);

    const internalSecret = req.headers.get('x-galx-internal-key');
    const isValidInternal = internalSecret && internalSecret === process.env.GALX_INTERNAL_ADMIN_KEY;

    if (!authResult.authenticated && !isValidInternal) {
      return NextResponse.json(
        { error: 'Unauthorized. Internal dataset sync access required.' },
        { status: 401 }
      );
    }

    const syncEngine = GalxR2TrainingSyncEngine.getInstance();
    const records = syncEngine.getRecentSyncRecords(50);

    return NextResponse.json({
      status: 'operational',
      engine: 'Cloudflare_R2_Training_Dataset_Synchronizer',
      totalRecords: records.length,
      records,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to get R2 sync records' },
      { status: 500 }
    );
  }
}
