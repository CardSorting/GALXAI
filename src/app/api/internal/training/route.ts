import { NextRequest, NextResponse } from 'next/server';
import { GalxTrainingStreamEngine } from '@/core/training/GalxTrainingStreamEngine';
import { GalxR2TrainingSyncEngine } from '@/core/storage/GalxR2TrainingSyncEngine';
import { GalxSyntheticCuratorEngine } from '@/core/training/GalxSyntheticCuratorEngine';
import { GalxInternalAuthGuard } from '@/core/auth/GalxInternalAuthGuard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/internal/training
 * Exports training datasets (SFT, DPO, KTO, Microbatches), framework recipes, or live telemetry.
 * Strictly gated behind GalxInternalAuthGuard (constant-time verification).
 */
export async function GET(req: NextRequest) {
  try {
    const authGuard = GalxInternalAuthGuard.getInstance();
    const authResult = await authGuard.verifyInternalRequest(req);

    if (!authResult.authorized) {
      return authGuard.createUnauthorizedResponse(authResult);
    }

    const trainingEngine = GalxTrainingStreamEngine.getInstance();
    const syncEngine = GalxR2TrainingSyncEngine.getInstance();
    const curatorEngine = GalxSyntheticCuratorEngine.getInstance();

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'telemetry';
    const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get('limit') || '100', 10)));
    const tier = searchParams.get('tier') || undefined;
    const sprint = searchParams.get('sprint') || undefined;

    const streamHeaders = {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Robots-Tag': 'noindex, nofollow',
    };

    switch (format) {
      case 'sft_jsonl':
      case 'jsonl': {
        const jsonl = trainingEngine.exportSftJsonl(limit);
        return new NextResponse(jsonl, {
          headers: {
            ...streamHeaders,
            'Content-Disposition': 'attachment; filename="galx_distilled_sft_dataset.jsonl"',
          },
        });
      }

      case 'dpo_jsonl': {
        const jsonl = trainingEngine.exportDpoJsonl(limit);
        return new NextResponse(jsonl, {
          headers: {
            ...streamHeaders,
            'Content-Disposition': 'attachment; filename="galx_distilled_dpo_dataset.jsonl"',
          },
        });
      }

      case 'kto_jsonl': {
        const jsonl = trainingEngine.exportKtoJsonl(limit);
        return new NextResponse(jsonl, {
          headers: {
            ...streamHeaders,
            'Content-Disposition': 'attachment; filename="galx_distilled_kto_dataset.jsonl"',
          },
        });
      }

      case 'microbatches': {
        const maxTokens = parseInt(searchParams.get('maxTokens') || '4096', 10);
        const batches = trainingEngine.exportTokenPackedMicroBatches(maxTokens);
        return NextResponse.json(
          { totalBatches: batches.length, maxTokensPerBatch: maxTokens, batches },
          { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'X-Robots-Tag': 'noindex, nofollow' } }
        );
      }

      case 'samples':
      case 'sft_samples': {
        const samples = trainingEngine.getRecentSFTSamples(limit, { curriculumTier: tier, sprintId: sprint });
        return NextResponse.json(
          { total: samples.length, format: 'sft', tier, sprint, samples },
          { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'X-Robots-Tag': 'noindex, nofollow' } }
        );
      }

      case 'axolotl_yaml': {
        const yaml = syncEngine.exportAxolotlDatasetConfig();
        return new NextResponse(yaml, {
          headers: {
            'Content-Type': 'text/yaml; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Content-Disposition': 'attachment; filename="galx_axolotl_training_dataset.yaml"',
            'X-Robots-Tag': 'noindex, nofollow',
          },
        });
      }

      case 'torchtune_yaml':
      case 'torchtune': {
        const yaml = syncEngine.exportTorchtuneRecipeYaml();
        return new NextResponse(yaml, {
          headers: {
            'Content-Type': 'text/yaml; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Content-Disposition': 'attachment; filename="torchtune_galx_recipe.yaml"',
            'X-Robots-Tag': 'noindex, nofollow',
          },
        });
      }

      case 'unsloth_py':
      case 'unsloth': {
        const pyScript = syncEngine.exportUnslothPythonScript();
        return new NextResponse(pyScript, {
          headers: {
            'Content-Type': 'text/x-python; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Content-Disposition': 'attachment; filename="train_unsloth_galx.py"',
            'X-Robots-Tag': 'noindex, nofollow',
          },
        });
      }

      case 'streaming_index':
      case 'index_json': {
        const streamingIndex = syncEngine.exportStreamingIndexJson();
        return NextResponse.json(streamingIndex, {
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'X-Robots-Tag': 'noindex, nofollow' },
        });
      }

      case 'presigned_urls':
      case 'splits': {
        const splitsJson = syncEngine.exportPresignedSplitsJson();
        return NextResponse.json(splitsJson, {
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'X-Robots-Tag': 'noindex, nofollow' },
        });
      }

      case 'r2_health': {
        const health = await syncEngine.verifyR2TrainingStorage();
        return NextResponse.json(health, {
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'X-Robots-Tag': 'noindex, nofollow' },
        });
      }

      case 'sprint_status': {
        const status = curatorEngine.getStatus();
        return NextResponse.json(status, {
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'X-Robots-Tag': 'noindex, nofollow' },
        });
      }

      case 'manifest': {
        const auditRecords = syncEngine.getRecentSyncRecords();
        return NextResponse.json(
          { totalShards: auditRecords.length, shards: auditRecords },
          { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'X-Robots-Tag': 'noindex, nofollow' } }
        );
      }

      case 'telemetry':
      default: {
        const telemetry = trainingEngine.getTelemetry();
        const sprintStatus = curatorEngine.getStatus();
        const r2Health = await syncEngine.verifyR2TrainingStorage();

        return NextResponse.json(
          {
            telemetry,
            sprintStatus,
            r2Health,
            status: 'operational',
            engine: 'BroccoliDB_Ultra_Lean_Continuous_Learning',
            guarantees: {
              developer_api: 'always_private_zdr',
              consumer_web_chat: 'opt_out_available',
              pii_scrubbing: 'in_flight_volatile_redaction',
              database_persistence: 'zero_retention_training',
              storage_streaming: 'cloudflare_r2_direct_sigv4',
              time_budget_envelope: '2.5_hours_bounded_sprints',
            },
          },
          { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'X-Robots-Tag': 'noindex, nofollow' } }
        );
      }
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/internal/training
 * Triggers atomic synchronization, shard compaction, DLQ replay, or synthetic curation in Cloudflare R2
 */
export async function POST(req: NextRequest) {
  try {
    const authGuard = GalxInternalAuthGuard.getInstance();
    const authResult = await authGuard.verifyInternalRequest(req);

    if (!authResult.authorized) {
      return authGuard.createUnauthorizedResponse(authResult);
    }

    let action = 'sync';
    let targetType: 'sft' | 'dpo' | 'kto' | 'microbatch' | 'all' = 'all';

    try {
      const body = await req.json();
      if (body?.action) action = body.action;
      if (body?.type) targetType = body.type;
    } catch {}

    const syncEngine = GalxR2TrainingSyncEngine.getInstance();
    const curatorEngine = GalxSyntheticCuratorEngine.getInstance();

    if (action === 'canary') {
      const canaryResult = await curatorEngine.executePreflightCanary();
      return NextResponse.json(
        { success: true, canary: canaryResult },
        { status: 200, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'X-Robots-Tag': 'noindex, nofollow' } }
      );
    }

    if (action === 'sync') {
      const syncResult = await syncEngine.syncAllDatasets();

      return NextResponse.json(
        {
          success: true,
          engine: 'Cloudflare_R2_Training_Dataset_Synchronizer',
          targetType,
          syncedShards: syncResult.syncedShards,
          totalTokens: syncResult.totalTokens,
          manifest: syncResult.manifest,
          records: syncResult.records,
        },
        { status: 200, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'X-Robots-Tag': 'noindex, nofollow' } }
      );
    }

    if (action === 'compact') {
      const compResult = await syncEngine.compactShards({ minShardCount: 1 });
      return NextResponse.json(
        {
          success: true,
          engine: 'Cloudflare_R2_Training_Dataset_Compactor',
          compactedCount: compResult.compactedCount,
          newShards: compResult.newShards,
        },
        { status: 200, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'X-Robots-Tag': 'noindex, nofollow' } }
      );
    }

    if (action === 'replay_dlq') {
      const replayResult = await syncEngine.replayDeadLetterQueue();
      return NextResponse.json(
        {
          success: true,
          engine: 'Cloudflare_R2_Training_DLQ_Replayer',
          replayedCount: replayResult.replayedCount,
          remainingCount: replayResult.remainingCount,
        },
        { status: 200, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'X-Robots-Tag': 'noindex, nofollow' } }
      );
    }

    return NextResponse.json(
      { error: `Unsupported action '${action}'. Supported actions: 'canary', 'sync', 'compact', 'replay_dlq'` },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to execute R2 dataset sync' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/internal/training
 * Flushes all volatile in-memory training tables
 */
export async function DELETE(req: NextRequest) {
  try {
    const authGuard = GalxInternalAuthGuard.getInstance();
    const authResult = await authGuard.verifyInternalRequest(req);

    if (!authResult.authorized) {
      return authGuard.createUnauthorizedResponse(authResult);
    }

    const trainingEngine = GalxTrainingStreamEngine.getInstance();
    trainingEngine.clearBuffer();

    return NextResponse.json(
      {
        success: true,
        message: 'Volatile in-memory training buffers flushed successfully.',
        clearedAt: new Date().toISOString(),
      },
      { status: 200, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'X-Robots-Tag': 'noindex, nofollow' } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to flush volatile training buffer' },
      { status: 500 }
    );
  }
}
