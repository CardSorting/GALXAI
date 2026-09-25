import { createHash, randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { reserveImageAllowance } from '../billing/image-allowance';
import { IMAGE_ALLOWANCE_CONFIGURATION, type ImageAllowanceConfiguration } from '../billing/image-allowance-config';
import type { ImageGenerationRequest } from '../../core/contracts/GalxContracts';
import type { ImageFormat } from '../security/image-artifact';

export type ImageRequestState = 'queued' | 'generating' | 'completed' | 'failed' | 'cancelled';
export type ImageWorkClass = 'private' | 'star_published';
export interface ImageRequestRecord {
  id: string; user_id: string; state: ImageRequestState; asset_ids: string[] | null;
  work_class: ImageWorkClass;
  response_format?: 'url' | 'b64_json'; output_format?: ImageFormat;
  failure_code?: string;
}
export type StoredImageRequest = ImageGenerationRequest & { outputFormat?: ImageFormat };
interface ClaimedRequest extends ImageRequestRecord { payload: StoredImageRequest; is_priority: boolean }
export class ImageRequestConflict extends Error {}

const columns = `id,user_id,work_class,asset_ids,payload->>'failureCode' AS failure_code,payload->>'response_format' AS response_format,payload->>'outputFormat' AS output_format,CASE
  WHEN state='generating' AND deadline_at < now() THEN 'failed'
  WHEN state='queued' AND created_at < now()-interval '5 minutes' THEN 'failed'
  ELSE state END AS state`;
const validId = (id: string) => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id);

/** Every operation is owner-scoped; process memory is never authoritative. */
export class ImageRequestRepository {
  constructor(
    private readonly pool: Pick<Pool, 'query'> & Partial<Pick<Pool, 'connect'>>,
    private readonly allowanceConfiguration: ImageAllowanceConfiguration = IMAGE_ALLOWANCE_CONFIGURATION,
  ) {}

  async create(owner: string, payload: StoredImageRequest, priority: boolean, workClass: ImageWorkClass = 'private'): Promise<ImageRequestRecord> {
    const key = payload.idempotencyKey || randomUUID();
    const hash = createHash('sha256').update(JSON.stringify({ prompt: payload.prompt, model: payload.model,
      n: payload.n, size: payload.size, quality: payload.quality, sessionId: payload.sessionId,
      responseFormat: payload.response_format, outputFormat: payload.outputFormat, workClass })).digest('hex');
    const db = workClass === 'private' ? await this.pool.connect?.() : null;
    if (workClass === 'private' && !db) throw new Error('Quota storage unavailable');
    try {
    if (db) { await db.query('BEGIN'); await db.query("SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='5s'"); }
    const connection = db || this.pool;
    const result = await connection.query<ImageRequestRecord & { payload_hash: string }>(`
      INSERT INTO private.galx_image_requests (id,user_id,idempotency_key,payload_hash,payload,is_priority,work_class)
      VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7)
      ON CONFLICT (user_id,idempotency_key) DO NOTHING
      RETURNING ${columns},payload_hash`, [randomUUID(), owner, key, hash, JSON.stringify(payload), priority, workClass]);
    // A separate statement sees a concurrent winner after the INSERT has waited.
    // Replays retain the original charge, including after cancellation or a plan change.
    const row = result.rows[0] || (await connection.query<ImageRequestRecord & { payload_hash: string }>(
      `SELECT ${columns},payload_hash FROM private.galx_image_requests WHERE user_id=$1 AND idempotency_key=$2`, [owner,key])).rows[0];
    if (!row) throw new Error('Image request unavailable');
    if (row.payload_hash !== hash) throw new ImageRequestConflict('Idempotency key already used');
    if (db) {
      if (result.rowCount === 1) {
        if (workClass === 'private') await reserveImageAllowance(
          db, owner, row.id, payload.n || 1, payload.quality === 'hd' ? 'hd' : 'standard', this.allowanceConfiguration,
        );
      }
      await db.query('COMMIT');
    }
    return row;
    } catch(error) { if(db) await db.query('ROLLBACK'); throw error; } finally { db?.release(); }
  }

  async get(owner: string, id: string): Promise<ImageRequestRecord | null> {
    if (!validId(id)) return null;
    // A request that stayed queued beyond its dispatch window is proven not
    // to have reached inference. Expire it and release its reservation in the
    // same statement; an identical later read cannot release twice.
    await this.pool.query(`WITH expired AS (
      UPDATE private.galx_image_requests
      SET state='failed',payload=jsonb_build_object('failureCode','generation_not_started'),updated_at=now()
      WHERE user_id=$1 AND id=$2::uuid AND state='queued' AND created_at <= now()-interval '5 minutes'
      RETURNING id
    ), plan_released AS (
      UPDATE private.galx_image_usage_reservations SET state='released',updated_at=now()
      WHERE user_id=$1 AND operation_id IN (SELECT id FROM expired) AND state='reserved'
      RETURNING user_id,subscription_id,period_end,units
    ), plan_refunded AS (
      UPDATE private.galx_image_plan_period_usage AS period
      SET used_units=GREATEST(0,period.used_units-released.units),updated_at=now()
      FROM plan_released AS released
      WHERE period.user_id=released.user_id AND period.subscription_id=released.subscription_id AND period.period_end=released.period_end
    ), legacy_released AS (
      UPDATE private.galx_free_generation_usage SET released=true,capacity_settled=true
      WHERE user_id::text=$1 AND kind='image' AND operation_id IN (SELECT id::text FROM expired)
    ) SELECT id FROM expired`, [owner,id]);
    return (await this.pool.query<ImageRequestRecord>(`SELECT ${columns} FROM private.galx_image_requests WHERE user_id=$1 AND id=$2::uuid`, [owner,id])).rows[0] || null;
  }

  async claim(owner: string, id: string): Promise<ClaimedRequest | null> {
    if (!validId(id)) return null;
    // A claim is never leased for redispatch: a lost acknowledgement must not double-charge.
    return (await this.pool.query<ClaimedRequest>(`WITH stopped AS (
      UPDATE private.galx_image_requests SET state='failed',payload=jsonb_build_object('failureCode','generation_not_started'),updated_at=now()
      WHERE user_id=$1 AND id=$2::uuid AND state='queued'
        AND (created_at <= now()-interval '5 minutes'
          OR (work_class='private' AND NOT EXISTS(
            SELECT 1 FROM private.galx_image_usage_reservations WHERE user_id=$1 AND operation_id=$2::uuid AND state='reserved')))
      RETURNING id
    ), plan_released AS (
      UPDATE private.galx_image_usage_reservations SET state='released',updated_at=now()
      WHERE user_id=$1 AND operation_id IN (SELECT id FROM stopped) AND state='reserved'
      RETURNING user_id,subscription_id,period_end,units
    ), plan_refunded AS (
      UPDATE private.galx_image_plan_period_usage AS period
      SET used_units=GREATEST(0,period.used_units-released.units),updated_at=now()
      FROM plan_released AS released
      WHERE period.user_id=released.user_id AND period.subscription_id=released.subscription_id AND period.period_end=released.period_end
    ), legacy_released AS (
      UPDATE private.galx_free_generation_usage SET released=true,capacity_settled=true
      WHERE user_id::text=$1 AND kind='image' AND operation_id IN (SELECT id::text FROM stopped)
    ) UPDATE private.galx_image_requests
      SET state='generating',deadline_at=now()+interval '160 seconds',updated_at=now()
      WHERE user_id=$1 AND id=$2::uuid AND state='queued' AND created_at > now()-interval '5 minutes'
        AND NOT EXISTS(SELECT 1 FROM stopped WHERE id=$2::uuid)
        AND (work_class='star_published'
          OR EXISTS(SELECT 1 FROM private.galx_image_usage_reservations WHERE user_id=$1 AND operation_id=$2::uuid AND state='reserved'))
      RETURNING id,user_id,work_class,state,asset_ids,payload,is_priority`, [owner,id])).rows[0] || null;
  }

  async complete(owner: string, id: string, assets: string[]): Promise<void> {
    if (!assets.length || assets.length > 4 || new Set(assets).size !== assets.length) throw new Error('Invalid image assets');
    // Receipt completion and library visibility are checked in one database round trip.
    const result = await this.pool.query(`WITH completed AS (UPDATE private.galx_image_requests
      SET state='completed',asset_ids=$3::text[],
        payload=jsonb_strip_nulls(jsonb_build_object('response_format',payload->'response_format','outputFormat',payload->'outputFormat')),updated_at=now()
      WHERE user_id=$1 AND id=$2::uuid AND (state='generating' OR (state='completed' AND asset_ids=$3::text[]))
      AND (SELECT count(*) FROM public.user_image_library
        WHERE user_id=$1 AND id=ANY($3::text[]) AND status='completed'
          AND work_class=(SELECT work_class FROM private.galx_image_requests WHERE user_id=$1 AND id=$2::uuid)
          AND metadata->>'requestId'=$2::text)=cardinality($3::text[])
      RETURNING id), settled AS (UPDATE private.galx_free_generation_usage SET capacity_settled=true
        WHERE user_id::text=$1 AND kind='image' AND operation_id IN (SELECT id::text FROM completed))
      , plan_settled AS (UPDATE private.galx_image_usage_reservations SET state='settled',updated_at=now()
        WHERE user_id=$1 AND operation_id IN (SELECT id FROM completed) AND state='reserved')
      SELECT id FROM completed`, [owner,id,assets]);
    if (result.rowCount !== 1) throw new Error('Image assets were not committed');
  }

  async fail(owner: string, id: string, notStarted = false): Promise<void> {
    await this.pool.query(`WITH failed AS (
      UPDATE private.galx_image_requests SET state='failed',payload=CASE WHEN $3::boolean
        THEN jsonb_build_object('failureCode','generation_not_started') ELSE '{}'::jsonb END,updated_at=now()
      WHERE user_id=$1 AND id=$2::uuid AND state='generating' RETURNING id
    ), plan_released AS (
      UPDATE private.galx_image_usage_reservations SET state='released',updated_at=now()
      WHERE $3::boolean AND user_id=$1 AND operation_id IN (SELECT id FROM failed) AND state='reserved'
      RETURNING user_id,subscription_id,period_end,units
    ), plan_refunded AS (
      UPDATE private.galx_image_plan_period_usage AS period
      SET used_units=GREATEST(0,period.used_units-released.units),updated_at=now()
      FROM plan_released AS released
      WHERE period.user_id=released.user_id AND period.subscription_id=released.subscription_id AND period.period_end=released.period_end
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
    ), plan_released AS (
      UPDATE private.galx_image_usage_reservations SET state='released',updated_at=now()
      WHERE user_id=$1 AND operation_id IN (SELECT id FROM cancelled) AND state='reserved'
      RETURNING user_id,subscription_id,period_end,units
    ), plan_refunded AS (
      UPDATE private.galx_image_plan_period_usage AS period
      SET used_units=GREATEST(0,period.used_units-released.units),updated_at=now()
      FROM plan_released AS released
      WHERE period.user_id=released.user_id AND period.subscription_id=released.subscription_id AND period.period_end=released.period_end
    ), released AS (UPDATE private.galx_free_generation_usage SET released=true,capacity_settled=true
      WHERE user_id::text=$1 AND kind='image' AND operation_id IN (SELECT id::text FROM cancelled) RETURNING operation_id)
      SELECT id FROM cancelled`, [owner,id])).rowCount === 1;
  }
}
