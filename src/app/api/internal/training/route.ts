import { NextRequest, NextResponse } from 'next/server';
import { GalxTrainingStreamEngine } from '@/core/training/GalxTrainingStreamEngine';
import { GalxR2TrainingSyncEngine } from '@/core/storage/GalxR2TrainingSyncEngine';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function verifyInternalAuth(req: NextRequest): Promise<boolean> {
  const authEngine = GalxAuthEngine.getInstance();
  const authResult = await authEngine.resolveAuthIdentity(req);

  const internalSecret = req.headers.get('x-galx-internal-key');
  const isValidInternal = Boolean(internalSecret && internalSecret === process.env.GALX_INTERNAL_ADMIN_KEY);

  return authResult.authenticated || isValidInternal;
}

/**
 * GET /api/internal/training
 * Exports training datasets (SFT, DPO, KTO, Microbatches) or live telemetry
 */
export async function GET(req: NextRequest) {
  try {
    const isAuthorized = await verifyInternalAuth(req);
    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized. Internal training pipeline access required.' },
        { status: 401 }
      );
    }

    const trainingEngine = GalxTrainingStreamEngine.getInstance();
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'telemetry';
    const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get('limit') || '100', 10)));

    const streamHeaders = {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
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
          { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
      }

      case 'samples':
      case 'sft_samples': {
        const samples = trainingEngine.getRecentSFTSamples(limit);
        return NextResponse.json(
          { total: samples.length, format: 'sft', samples },
          { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
      }

      case 'dpo_samples': {
        const samples = trainingEngine.getRecentDPOPairs(limit);
        return NextResponse.json(
          { total: samples.length, format: 'dpo', samples },
          { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
      }

      case 'axolotl_yaml': {
        const syncEngine = GalxR2TrainingSyncEngine.getInstance();
        const yaml = syncEngine.exportAxolotlDatasetConfig();
        return new NextResponse(yaml, {
          headers: {
            'Content-Type': 'text/yaml; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Content-Disposition': 'attachment; filename="galx_axolotl_training_dataset.yaml"',
          },
        });
      }

      case 'hf_info':
      case 'dataset_info': {
        const syncEngine = GalxR2TrainingSyncEngine.getInstance();
        const hfInfo = syncEngine.exportHuggingFaceDatasetInfo();
        return NextResponse.json(hfInfo, {
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        });
      }

      case 'unsloth_py':
      case 'unsloth': {
        const syncEngine = GalxR2TrainingSyncEngine.getInstance();
        const pyScript = syncEngine.exportUnslothPythonScript();
        return new NextResponse(pyScript, {
          headers: {
            'Content-Type': 'text/x-python; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Content-Disposition': 'attachment; filename="train_unsloth_galx.py"',
          },
        });
      }

      case 'streaming_index':
      case 'index_json': {
        const syncEngine = GalxR2TrainingSyncEngine.getInstance();
        const streamingIndex = syncEngine.exportStreamingIndexJson();
        return NextResponse.json(streamingIndex, {
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        });
      }

      case 'dataset_card':
      case 'readme': {
        const syncEngine = GalxR2TrainingSyncEngine.getInstance();
        const card = syncEngine.exportDatasetCardMarkdown();
        return new NextResponse(card, {
          headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Content-Disposition': 'attachment; filename="README.md"',
          },
        });
      }

      case 'presigned_urls':
      case 'splits': {
        const syncEngine = GalxR2TrainingSyncEngine.getInstance();
        const splitsJson = syncEngine.exportPresignedSplitsJson();
        return NextResponse.json(splitsJson, {
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        });
      }

      case 'torchtune_yaml':
      case 'torchtune': {
        const syncEngine = GalxR2TrainingSyncEngine.getInstance();
        const yaml = syncEngine.exportTorchtuneRecipeYaml();
        return new NextResponse(yaml, {
          headers: {
            'Content-Type': 'text/yaml; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Content-Disposition': 'attachment; filename="torchtune_galx_recipe.yaml"',
          },
        });
      }

      case 'llamafactory':
      case 'llama_factory': {
        const syncEngine = GalxR2TrainingSyncEngine.getInstance();
        const registry = syncEngine.exportLlamaFactoryDatasetInfo();
        return NextResponse.json(registry, {
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        });
      }

      case 'curriculum':
      case 'curriculum_state': {
        const syncEngine = GalxR2TrainingSyncEngine.getInstance();
        const curriculum = syncEngine.exportCurriculumStateJson();
        return NextResponse.json(curriculum, {
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        });
      }

      case 'manifest': {
        const syncEngine = GalxR2TrainingSyncEngine.getInstance();
        const auditRecords = syncEngine.getRecentSyncRecords();
        return NextResponse.json(
          { totalShards: auditRecords.length, shards: auditRecords },
          { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
      }

      case 'kto_samples': {
        const samples = trainingEngine.getRecentKTOPairs(limit);
        return NextResponse.json(
          { total: samples.length, format: 'kto', samples },
          { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
      }

      case 'telemetry':
      default: {
        const telemetry = trainingEngine.getTelemetry();
        return NextResponse.json(
          {
            telemetry,
            status: 'operational',
            engine: 'BroccoliDB_Ultra_Lean_Continuous_Learning',
            guarantees: {
              developer_api: 'always_private_zdr',
              consumer_web_chat: 'opt_out_available',
              pii_scrubbing: 'in_flight_volatile_redaction',
              database_persistence: 'zero_retention_training',
              deduplication: ['BloomRingBuffer', 'SimHashFuzzyBuffer'],
            },
          },
          { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
      }
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/internal/training
 * Triggers atomic synchronization, shard compaction, or DLQ replay in Cloudflare R2
 */
export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyInternalAuth(req);
    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized. Internal dataset sync access required.' },
        { status: 401 }
      );
    }

    let action = 'sync';
    let targetType: 'sft' | 'dpo' | 'kto' | 'microbatch' | 'all' = 'all';

    try {
      const body = await req.json();
      if (body?.action) action = body.action;
      if (body?.type) targetType = body.type;
    } catch {}

    const syncEngine = GalxR2TrainingSyncEngine.getInstance();

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
        {
          status: 200,
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        }
      );
    }

    if (action === 'compact') {
      const compResult = await syncEngine.compactShards({ minShardCount: 2 });
      return NextResponse.json(
        {
          success: true,
          engine: 'Cloudflare_R2_Training_Dataset_Compactor',
          compactedCount: compResult.compactedCount,
          newShards: compResult.newShards,
        },
        {
          status: 200,
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        }
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
        {
          status: 200,
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        }
      );
    }

    return NextResponse.json(
      { error: `Unsupported action '${action}'. Supported actions: 'sync', 'compact', 'replay_dlq'` },
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
    const isAuthorized = await verifyInternalAuth(req);
    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized. Internal buffer flush access required.' },
        { status: 401 }
      );
    }

    const trainingEngine = GalxTrainingStreamEngine.getInstance();
    trainingEngine.clearBuffer();

    return NextResponse.json(
      {
        success: true,
        message: 'Volatile in-memory training buffers flushed successfully.',
        clearedAt: new Date().toISOString(),
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to flush volatile training buffer' },
      { status: 500 }
    );
  }
}
