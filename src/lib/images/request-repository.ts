import { createHash, randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { ImageGenerationRequest } from '../../core/contracts/GalxContracts';
import type { ImageFormat } from '../security/image-artifact';

export type ImageRequestState = 'queued' | 'generating' | 'completed' | 'failed' | 'cancelled';
export interface ImageRequestRecord {
  id: string; user_id: string; state: ImageRequestState; asset_ids: string[] | null;
  response_format?: 'url' | 'b64_json'; output_format?: ImageFormat;
}
export type StoredImageRequest = ImageGenerationRequest & { outputFormat?: ImageFormat };
interface ClaimedRequest extends ImageRequestRecord { payload: StoredImageRequest; is_priority: boolean }
export class ImageRequestConflict extends Error {}

const columns = `id,user_id,asset_ids,payload->>'response_format' AS response_format,payload->>'outputFormat' AS output_format,CASE
  WHEN state='generating' AND deadline_at < now() THEN 'failed'
  WHEN state='queued' AND created_at < now()-interval '5 minutes' THEN 'failed'
  ELSE state END AS state`;
const validId = (id: string) => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id);

/** Every operation is owner-scoped; process memory is never authoritative. */
export class ImageRequestRepository {
  constructor(private readonly pool: Pick<Pool, 'query'>) {}

  async create(owner: string, payload: StoredImageRequest, priority: boolean): Promise<ImageRequestRecord> {
    const key = payload.idempotencyKey || randomUUID();
    const hash = createHash('sha256').update(JSON.stringify({ prompt: payload.prompt, model: payload.model,
      n: payload.n, size: payload.size, quality: payload.quality, sessionId: payload.sessionId,
      responseFormat: payload.response_format, outputFormat: payload.outputFormat })).digest('hex');
    const result = await this.pool.query<ImageRequestRecord & { payload_hash: string }>(`
      INSERT INTO private.galx_image_requests (id,user_id,idempotency_key,payload_hash,payload,is_priority)
      VALUES ($1,$2,$3,$4,$5::jsonb,$6)
      ON CONFLICT (user_id,idempotency_key) DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key
      RETURNING ${columns},payload_hash`, [randomUUID(), owner, key, hash, JSON.stringify(payload), priority]);
    const row = result.rows[0];
    if (row.payload_hash !== hash) throw new ImageRequestConflict('Idempotency key already used');
    return row;
  }

  async get(owner: string, id: string): Promise<ImageRequestRecord | null> {
    if (!validId(id)) return null;
    return (await this.pool.query<ImageRequestRecord>(`SELECT ${columns} FROM private.galx_image_requests WHERE user_id=$1 AND id=$2`, [owner,id])).rows[0] || null;
  }

  async claim(owner: string, id: string): Promise<ClaimedRequest | null> {
    if (!validId(id)) return null;
    // A claim is never leased for redispatch: a lost acknowledgement must not double-charge.
    return (await this.pool.query<ClaimedRequest>(`UPDATE private.galx_image_requests
      SET state='generating',deadline_at=now()+interval '160 seconds',updated_at=now()
      WHERE user_id=$1 AND id=$2 AND state='queued' AND created_at > now()-interval '5 minutes'
      RETURNING id,user_id,state,asset_ids,payload,is_priority`, [owner,id])).rows[0] || null;
  }

  async complete(owner: string, id: string, assets: string[]): Promise<void> {
    if (!assets.length || assets.length > 4 || new Set(assets).size !== assets.length) throw new Error('Invalid image assets');
    // Receipt completion and library visibility are checked in one database round trip.
    const result = await this.pool.query(`UPDATE private.galx_image_requests
      SET state='completed',asset_ids=$3::text[],
        payload=jsonb_strip_nulls(jsonb_build_object('response_format',payload->'response_format','outputFormat',payload->'outputFormat')),updated_at=now()
      WHERE user_id=$1 AND id=$2 AND (state='generating' OR (state='completed' AND asset_ids=$3::text[]))
      AND (SELECT count(*) FROM public.user_image_library WHERE user_id=$1 AND id=ANY($3::text[]) AND status='completed')=cardinality($3::text[])
      RETURNING id`, [owner,id,assets]);
    if (result.rowCount !== 1) throw new Error('Image assets were not committed');
  }

  async fail(owner: string, id: string): Promise<void> {
    await this.pool.query(`UPDATE private.galx_image_requests SET state='failed',payload='{}'::jsonb,updated_at=now()
      WHERE user_id=$1 AND id=$2 AND state='generating'`, [owner,id]);
  }

  async cancel(owner: string, id: string): Promise<boolean> {
    if (!validId(id)) return false;
    // Once dispatch begins it may already be billed; cancellation cannot promise otherwise.
    return (await this.pool.query(`UPDATE private.galx_image_requests SET state='cancelled',payload='{}'::jsonb,updated_at=now()
      WHERE user_id=$1 AND id=$2 AND state='queued' RETURNING id`, [owner,id])).rowCount === 1;
  }
}
