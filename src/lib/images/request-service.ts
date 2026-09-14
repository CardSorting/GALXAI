import { after } from 'next/server';
import { ImageCapacityError } from '../../core/router/ImageCapacityError';
import { RelayDispatchError } from '../../core/router/adapters/RelayChatTransport';
import { getPostgresPool } from '../db/postgres';
import { ImageRequestRepository, type ImageRequestRecord, type StoredImageRequest } from './request-repository';
import type { GalxModelRouter } from '../../core/router/GalxModelRouter';
import { GalxUnifiedR2StorageManager } from '../../core/storage/GalxUnifiedR2StorageManager';
import { normalizeImageOutput } from '../security/normalize-image-output';
import { logImageFailure } from '../security/private-image-diagnostics';
import type { ImageGenerationResponse } from '../../core/contracts/GalxContracts';
import { imageDownloadUrl } from '../security/image-download-url';
import { imageJsonResponse } from '../security/public-image-http';

const generateImage: GalxModelRouter['routeImageGeneration'] = async (input) => {
  const { galxRouter } = await import('../../core/router/GalxModelRouter');
  return galxRouter.routeImageGeneration(input);
};

export class ImageRequestService {
  private static instance: ImageRequestService;
  static getInstance() {
    if (this.instance) return this.instance;
    const pool = getPostgresPool();
    if (!pool) throw new Error('Image requests unavailable');
    return this.instance = new ImageRequestService(new ImageRequestRepository(pool));
  }
  constructor(readonly repository: ImageRequestRepository,
    private readonly generate = generateImage,
    private readonly schedule: (work: () => Promise<void>) => void = after) {}

  async create(owner: string, payload: StoredImageRequest, priority: boolean, free = false, schedule = true) {
    if (!GalxUnifiedR2StorageManager.getInstance().isConfigured()) throw new Error('Image storage unavailable');
    const record = await this.repository.create(owner, payload, priority, free);
    if(schedule) this.resume(record);
    return record;
  }

  resume(record: ImageRequestRecord) {
    if (record.state === 'queued') this.schedule(() => this.run(record.user_id, record.id));
  }

  async run(owner: string, id: string, reportFailure = false) {
    try {
      const request = await this.repository.claim(owner,id);
      if (!request) return;
      try {
        const { outputFormat: _output, ...input } = request.payload;
        const result = await this.generate({ request: { ...input, response_format: 'b64_json' }, userId: owner, requestId: id,
          isPriorityUser: request.is_priority, signal: AbortSignal.timeout(135000) });
        const assets = result.data.map(item => item.asset_id);
        if (assets.length !== (request.payload.n || 1) || assets.some(id => typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,160}$/.test(id))) throw new Error('Image storage incomplete');
        await this.repository.complete(owner,id,assets as string[]);
      } catch (error) {
        logImageFailure(id,error);
        const notStarted = error instanceof ImageCapacityError || (error instanceof RelayDispatchError &&
          error.status === 503 && error.executionState === 'not_accepted' &&
          ['model_temporarily_unavailable', 'model_capacity_exhausted', 'federation_unavailable',
            'admission_capacity_exhausted', 'relay_reconciling', 'server_draining'].includes(error.upstreamCode || ''));
        await this.repository.fail(owner,id,notStarted);
        if (reportFailure) throw error;
      }
    } catch (error) { logImageFailure(id,error); if (reportFailure) throw error; }
  }
}

export function imageRequestResult(record: ImageRequestRecord): ImageGenerationResponse {
  return { created: Math.floor(Date.now()/1000), data: (record.asset_ids || []).map(asset_id => ({ asset_id })) } as ImageGenerationResponse;
}

export function imageRequestResponse(record: ImageRequestRecord, requestId: string, json: boolean): Promise<Response> | Response {
  if (json && record.response_format === 'url' && !record.output_format) {
    // References were owner-checked at commit; download delivery rechecks ownership
    // and re-encodes the artifact. Do not load megabytes merely to return links.
    return imageJsonResponse((record.asset_ids || []).map(id => ({ url: imageDownloadUrl(record.user_id,id) })),requestId);
  }
  return normalizeImageOutput(imageRequestResult(record), { requestId, userId: record.user_id,
    responseFormat: json ? 'b64_json' : 'binary', outputFormat: record.output_format });
}

/** Explicit public DTO, including for SSE. Never serialize the private receipt. */
export async function imageRequestSnapshot(record: ImageRequestRecord) {
  return { id: record.id, status: record.state,
    ...(record.state === 'failed' && record.failure_code === 'generation_not_started' ? { error: { code: 'generation_not_started' } } : {}),
    ...(record.state === 'completed' ? { result: { data: await (await imageRequestResponse(record,crypto.randomUUID(),true)).json() } } : {}),
  };
}
