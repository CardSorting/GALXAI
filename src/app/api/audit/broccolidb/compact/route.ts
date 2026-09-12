import { withDeveloperAccess } from '@/lib/security/developer-access';
/**
 * GALXAI BroccoliDB Authenticated Compaction API Endpoint
 * 
 * Exposes the hardened BroccoliCompactionFacade for production traffic, batch streams,
 * incident cascades, and document pyramids with:
 * - Bearer / API Key / x-galx-key authentication via GalxAuthEngine
 * - Payload size bounding and memory-safety enforcement
 * - Fail-closed provenance validation for domain compaction
 */

import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import {
  BroccoliCompactionFacade,
  CompactionRequest,
} from '@/core/broccolidb/BroccoliCompactionFacade';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_PAYLOAD_BYTES = 10 * 1024 * 1024; // 10MB max request size

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, x-galx-key',
    },
  });
}

async function previewGET() {
  try {
    const metrics = BroccoliCompactionFacade.getMetrics();
    return NextResponse.json({
      status: 'operational',
      service: 'broccolidb-compaction-gateway',
      version: '2.0.0',
      supportedModes: ['domain', 'batch', 'log_stream', 'metric_stream', 'trace_stream', 'structured_stream', 'network_stream', 'orderbook_stream', 'window_stream', 'sensor_stream', 'clickstream', 'genomic_stream', 'stream_envelope', 'ebpf_stream', 'k8s_watch_stream', 'geospatial_stream', 'arrow_dict_stream', 'incident', 'document'],
      limits: {
        maxPayloadBytes: MAX_PAYLOAD_BYTES,
        maxTextLengthChars: BroccoliCompactionFacade.MAX_TEXT_LENGTH,
        maxBatchFrames: BroccoliCompactionFacade.MAX_BATCH_FRAMES,
        minIncidentBudgetTokens: BroccoliCompactionFacade.MIN_INCIDENT_BUDGET,
        maxIncidentBudgetTokens: BroccoliCompactionFacade.MAX_INCIDENT_BUDGET,
      },
      metrics,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error?.message || 'Failed to inspect compaction service health.', code: 'internal_error' } },
      { status: 500 }
    );
  }
}

async function previewPOST(req: NextRequest) {
  try {
    // 1. Authentication Check
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);

    if (!authResult.authenticated && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: { message: 'Authentication required for BroccoliDB compaction gateway.', code: 'unauthorized' } },
        { status: 401 }
      );
    }

    // 2. Request Size Bounding (Headers)
    const contentLength = req.headers.get('content-length');
    if (contentLength && Number(contentLength) > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        {
          error: {
            message: `Payload size (${contentLength} bytes) exceeds maximum limit of ${MAX_PAYLOAD_BYTES} bytes (10MB).`,
            code: 'payload_too_large',
          },
        },
        { status: 413 }
      );
    }

    // 3. Read Body with Memory Guard
    let rawText: string;
    try {
      rawText = await req.text();
    } catch {
      return NextResponse.json(
        { error: { message: 'Failed to read request body payload.', code: 'invalid_body' } },
        { status: 400 }
      );
    }

    if (rawText.length > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        {
          error: {
            message: `Payload character length (${rawText.length}) exceeds maximum limit of ${MAX_PAYLOAD_BYTES}.`,
            code: 'payload_too_large',
          },
        },
        { status: 413 }
      );
    }

    if (!rawText.trim()) {
      return NextResponse.json(
        { error: { message: 'Empty compaction request payload.', code: 'empty_payload' } },
        { status: 400 }
      );
    }

    // 4. Parse JSON
    let body: CompactionRequest;
    try {
      body = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        { error: { message: 'Invalid JSON request body.', code: 'invalid_json' } },
        { status: 400 }
      );
    }

    // 5. Dispatch to Safe Compaction Facade
    try {
      const response = BroccoliCompactionFacade.compact(body);
      return NextResponse.json({
        status: 'success',
        mode: response.mode,
        data: response.result,
        authenticatedUser: authResult.userId,
        timestampMs: Date.now(),
      });
    } catch (dispatchError: any) {
      if (dispatchError instanceof TypeError) {
        return NextResponse.json(
          { error: { message: dispatchError.message, code: 'bad_request' } },
          { status: 400 }
        );
      }
      if (dispatchError instanceof RangeError) {
        return NextResponse.json(
          { error: { message: dispatchError.message, code: 'range_error' } },
          { status: 400 }
        );
      }
      throw dispatchError;
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        error: {
          message: error?.message || 'An unexpected error occurred during BroccoliDB compaction.',
          code: 'internal_error',
        },
      },
      { status: 500 }
    );
  }
}

export const GET = withDeveloperAccess(previewGET);
export const POST = withDeveloperAccess(previewPOST);
