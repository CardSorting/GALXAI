import { NextResponse } from 'next/server';
import { EXCLUSIVE_MODEL_CATALOG } from '@/core/router/ModelCatalog';
import { GalxPersistence } from '@/lib/storage/GalxPersistence';
import { GalxTaskQueueEngine } from '@/core/queue/GalxTaskQueueEngine';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-galx-key, x-galx-shard-id',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Universal Platform Health & Vercel Diagnostic Telemetry Discovery API.
 * GET /api/health
 */
export async function GET() {
  const persistence = GalxPersistence.getInstance();
  const queueEngine = GalxTaskQueueEngine.getInstance();
  const queueStats = queueEngine.getQueueStats('default');

  const vercelEnv = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
  const vercelRegion = process.env.VERCEL_REGION || 'local-edge';
  const vercelCommitSha = process.env.VERCEL_GIT_COMMIT_SHA || 'head';

  return NextResponse.json({
    status: 'healthy',
    version: '2.0.0-zenith',
    timestamp: Date.now(),
    uptime: process.uptime?.() || 86400,
    deployment: {
      provider: 'vercel',
      environment: vercelEnv,
      region: vercelRegion,
      commitSha: vercelCommitSha,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://galx.ai'
    },
    capabilities: {
      openai_compatible: true,
      anthropic_compatible: true,
      streaming_sse: true,
      multimodal_vision: true,
      dag_workflows: true,
      async_queues: true,
      broccolidb_substrate: true,
      zdr_privacy_shield: true,
      soc2_type_ii_compliant: true
    },
    models: {
      total: EXCLUSIVE_MODEL_CATALOG.length,
      reasoningCount: EXCLUSIVE_MODEL_CATALOG.filter(m => m.supportsReasoning).length,
      defaultModel: 'gpt-5.6-sol'
    },
    infrastructure: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mazhcjisettrzbqhorvp.supabase.co',
      edgeGatewayUrl: process.env.NEXT_PUBLIC_GALX_EDGE_URL || 'https://api.galx.ai',
      assetsCdnUrl: process.env.PUBLIC_ASSETS_URL || 'https://assets.galx.ai',
      vaultActiveKeyVersion: process.env.GALX_VAULT_ACTIVE_KEY_VERSION || 'v1'
    },
    substrate: {
      tableCount: 5,
      cachedTasksCount: persistence.taskTable.count(),
      activeQueuesCount: persistence.queueTable.count(),
      dispatchRatePerSec: queueStats?.currentDispatchesPerSecond || 100
    }
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'x-galx-platform': 'nextjs-15-vercel'
    }
  });
}
