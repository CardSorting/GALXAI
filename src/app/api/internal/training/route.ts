import { NextRequest, NextResponse } from 'next/server';
import { GalxTrainingStreamEngine } from '@/core/training/GalxTrainingStreamEngine';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);

    // Only authorized developers or internal admins can inspect the stream telemetry
    const internalSecret = req.headers.get('x-galx-internal-key');
    const isValidInternal = internalSecret && internalSecret === process.env.GALX_INTERNAL_ADMIN_KEY;

    if (!authResult.authenticated && !isValidInternal) {
      return NextResponse.json(
        { error: 'Unauthorized. Internal training pipeline access required.' },
        { status: 401 }
      );
    }

    const trainingEngine = GalxTrainingStreamEngine.getInstance();
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    if (format === 'jsonl' || format === 'sft_jsonl') {
      const jsonl = trainingEngine.exportSftJsonl(limit);
      return new NextResponse(jsonl, {
        headers: {
          'Content-Type': 'application/x-ndjson; charset=utf-8',
          'Content-Disposition': 'attachment; filename="galx_distilled_sft_dataset.jsonl"',
        },
      });
    }

    if (format === 'dpo_jsonl') {
      const jsonl = trainingEngine.exportDpoJsonl(limit);
      return new NextResponse(jsonl, {
        headers: {
          'Content-Type': 'application/x-ndjson; charset=utf-8',
          'Content-Disposition': 'attachment; filename="galx_distilled_dpo_dataset.jsonl"',
        },
      });
    }

    if (format === 'kto_jsonl') {
      const jsonl = trainingEngine.exportKtoJsonl(limit);
      return new NextResponse(jsonl, {
        headers: {
          'Content-Type': 'application/x-ndjson; charset=utf-8',
          'Content-Disposition': 'attachment; filename="galx_distilled_kto_dataset.jsonl"',
        },
      });
    }

    if (format === 'microbatches') {
      const maxTokens = parseInt(searchParams.get('maxTokens') || '4096', 10);
      const batches = trainingEngine.exportTokenPackedMicroBatches(maxTokens);
      return NextResponse.json({
        totalBatches: batches.length,
        maxTokensPerBatch: maxTokens,
        batches,
      });
    }

    if (format === 'samples' || format === 'sft_samples') {
      const samples = trainingEngine.getRecentSFTSamples(limit);
      return NextResponse.json({
        total: samples.length,
        format: 'sft',
        samples,
      });
    }

    if (format === 'dpo_samples') {
      const samples = trainingEngine.getRecentDPOPairs(limit);
      return NextResponse.json({
        total: samples.length,
        format: 'dpo',
        samples,
      });
    }

    if (format === 'kto_samples') {
      const samples = trainingEngine.getRecentKTOPairs(limit);
      return NextResponse.json({
        total: samples.length,
        format: 'kto',
        samples,
      });
    }

    // Default: comprehensive telemetry metrics
    const telemetry = trainingEngine.getTelemetry();
    return NextResponse.json({
      telemetry,
      status: 'operational',
      engine: 'BroccoliDB_Hybrid_Zero_Storage_Distillation',
      guarantees: {
        developer_api: 'always_private_zdr',
        consumer_web_chat: 'opt_out_available',
        pii_scrubbing: 'in_flight_volatile_redaction',
        database_chat_persistence: 'zero_retention_training',
        deduplication_engines: ['BroccoliDeDuplicationBloomRingBuffer', 'BroccoliSimHashFuzzyDedupBuffer'],
        volatile_tables: ['galx_volatile_sft_stream', 'galx_volatile_dpo_stream'],
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
