import { createHash, randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { consumeFreeGeneration } from '../billing/free-generation-quota';
import type { ImageGenerationRequest } from '../../core/contracts/GalxContracts';
import type { ImageFormat } from '../security/image-artifact';

export type ImageRequestState = 'queued' | 'generating' | 'completed' | 'failed' | 'cancelled';
export interface ImageRequestRecord {
  id: string; user_id: string; state: ImageRequestState; asset_ids: string[] | null;
  response_format?: 'url' | 'b64_json'; output_format?: ImageFormat;
  failure_code?: string;
}
export type StoredImageRequest = ImageGenerationRequest & { outputFormat?: ImageFormat };
interface ClaimedRequest extends ImageRequestRecord { payload: StoredImageRequest; is_priority: boolean }
export class ImageRequestConflict extends Error {}

const columns = `id,user_id,asset_ids,payload->>'failureCode' AS failure_code,payload->>'response_format' AS response_format,payload->>'outputFormat' AS output_format,CASE
  WHEN state='generating' AND deadline_at < now() THEN 'failed'
  WHEN state='queued' AND created_at < now()-interval '5 minutes' THEN 'failed'
  ELSE state END AS state`;
const validId = (id: string) => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id);

/** Every operation is owner-scoped; process memory is never authoritative. */
export class ImageRequestRepository {
  constructor(private readonly pool: Pick<Pool, 'query'> & Partial<Pick<Pool, 'connect'>>) {}

  async create(owner: string, payload: StoredImageRequest, priority: boolean, free = false): Promise<ImageRequestRecord> {
    const key = payload.idempotencyKey || randomUUID();
    const hash = createHash('sha256').update(JSON.stringify({ prompt: payload.prompt, model: payload.model,
      n: payload.n, size: payload.size, quality: payload.quality, sessionId: payload.sessionId,
      responseFormat: payload.response_format, outputFormat: payload.outputFormat, visibility: payload.visibility })).digest('hex');
    const db = free ? await this.pool.connect?.() : null;
    if (free && !db) throw new Error('Quota storage unavailable');
    try {
    if (db) { await db.query('BEGIN'); await db.query("SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='5s'"); }
    const connection = db || this.pool;
    const result = await connection.query<ImageRequestRecord & { payload_hash: string }>(`
      INSERT INTO private.galx_image_requests (id,user_id,idempotency_key,payload_hash,payload,is_priority)
      VALUES ($1,$2,$3,$4,$5::jsonb,$6)
      ON CONFLICT (user_id,idempotency_key) DO NOTHING
      RETURNING ${columns},payload_hash`, [randomUUID(), owner, key, hash, JSON.stringify(payload), priority && !free]);
    // A separate statement sees a concurrent winner after the INSERT has waited.
    // Replays retain the original charge, including after cancellation or a plan change.
    const row = result.rows[0] || (await connection.query<ImageRequestRecord & { payload_hash: string }>(
      `SELECT ${columns},payload_hash FROM private.galx_image_requests WHERE user_id=$1 AND idempotency_key=$2`, [owner,key])).rows[0];
    if (!row) throw new Error('Image request unavailable');
    if (row.payload_hash !== hash) throw new ImageRequestConflict('Idempotency key already used');
    if (db) {
      if (result.rowCount === 1) await consumeFreeGeneration(db,owner,'image',row.id,payload.n || 1);
      await db.query('COMMIT');
    }
    return row;
    } catch(error) { if(db) await db.query('ROLLBACK'); throw error; } finally { db?.release(); }
  }

  async get(owner: string, id: string): Promise<ImageRequestRecord | null> {
    if (!validId(id)) return null;
    return (await this.pool.query<ImageRequestRecord>(`SELECT ${columns} FROM private.galx_image_requests WHERE user_id=$1 AND id=$2`, [owner,id])).rows[0] || null;
  }

  async claim(owner: string, id: string): Promise<ClaimedRequest | null> {
    if (!validId(id)) return null;
    // A claim is never leased for redispatch: a lost acknowledgement must not double-charge.
    return (await this.pool.query<ClaimedRequest>(`WITH gate AS MATERIALIZED (
      SELECT enabled,valid_until
      FROM private.galx_free_generation_policy WHERE kind='image'
        AND EXISTS(SELECT 1 FROM private.galx_free_generation_usage WHERE user_id::text=$1 AND kind='image' AND operation_id=$2::text) FOR SHARE
    ), stopped AS (
      UPDATE private.galx_image_requests SET state='failed',payload=jsonb_build_object('failureCode','generation_not_started'),updated_at=now()
      WHERE user_id=$1 AND id=$2::uuid AND state='queued'
        AND EXISTS(SELECT 1 FROM private.galx_free_generation_usage WHERE user_id::text=$1 AND kind='image' AND operation_id=$2::text)
        AND NOT coalesce((SELECT enabled AND valid_until>clock_timestamp() FROM gate),false) RETURNING id
    ), released AS (
      UPDATE private.galx_free_generation_usage SET released=true,capacity_settled=true
      WHERE user_id::text=$1 AND kind='image' AND operation_id IN (SELECT id::text FROM stopped)
    ) UPDATE private.galx_image_requests
      SET state='generating',deadline_at=now()+interval '160 seconds',updated_at=now()
      WHERE user_id=$1 AND id=$2::uuid AND state='queued' AND created_at > now()-interval '5 minutes'
        AND (NOT EXISTS(SELECT 1 FROM private.galx_free_generation_usage WHERE user_id::text=$1 AND kind='image' AND operation_id=$2::text)
          OR coalesce((SELECT enabled AND valid_until>clock_timestamp() FROM gate),false))
      RETURNING id,user_id,state,asset_ids,payload,is_priority`, [owner,id])).rows[0] || null;
  }

  async complete(owner: string, id: string, assets: string[]): Promise<void> {
    if (!assets.length || assets.length > 4 || new Set(assets).size !== assets.length) throw new Error('Invalid image assets');
    // Receipt completion and library visibility are checked in one database round trip.
    const result = await this.pool.query(`WITH completed AS (UPDATE private.galx_image_requests
      SET state='completed',asset_ids=$3::text[],
        payload=jsonb_strip_nulls(jsonb_build_object('response_format',payload->'response_format','outputFormat',payload->'outputFormat')),updated_at=now()
      WHERE user_id=$1 AND id=$2::uuid AND (state='generating' OR (state='completed' AND asset_ids=$3::text[]))
      AND (SELECT count(*) FROM public.user_image_library WHERE user_id=$1 AND id=ANY($3::text[]) AND status='completed')=cardinality($3::text[])
      RETURNING id), settled AS (UPDATE private.galx_free_generation_usage SET capacity_settled=true
        WHERE user_id::text=$1 AND kind='image' AND operation_id IN (SELECT id::text FROM completed))
      SELECT id FROM completed`, [owner,id,assets]);
    if (result.rowCount !== 1) throw new Error('Image assets were not committed');
  }

  async fail(owner: string, id: string, notStarted = false): Promise<void> {
    await this.pool.query(`WITH failed AS (
      UPDATE private.galx_image_requests SET state='failed',payload=CASE WHEN $3::boolean
        THEN jsonb_build_object('failureCode','generation_not_started') ELSE '{}'::jsonb END,updated_at=now()
      WHERE user_id=$1 AND id=$2::uuid AND state='generating' RETURNING id
    ) UPDATE private.galx_free_generation_usage SET released=true,capacity_settled=true
      WHERE $3::boolean AND user_id::text=$1 AND kind='image'
        AND operation_id IN (SELECT id::text FROM failed)`, [owner,id,notStarted]);
  }

  async cancel(owner: string, id: string): Promise<boolean> {
    if (!validId(id)) return false;
    // Once dispatch begins it may already be billed; cancellation cannot promise otherwise.
    return (await this.pool.query(`WITH cancelled AS (
      UPDATE private.galx_image_requests SET state='cancelled',payload='{}'::jsonb,updated_at=now()
      WHERE user_id=$1 AND id=$2::uuid AND state='queued' RETURNING id
    ), released AS (UPDATE private.galx_free_generation_usage SET released=true,capacity_settled=true
      WHERE user_id::text=$1 AND kind='image' AND operation_id IN (SELECT id::text FROM cancelled) RETURNING operation_id)
      SELECT id FROM cancelled`, [owner,id])).rowCount === 1;
  }
}
