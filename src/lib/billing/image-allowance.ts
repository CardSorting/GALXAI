import type { Pool, PoolClient } from 'pg';
import { getPostgresPool } from '../db/postgres';
import {
  approvedAllowanceFor,
  IMAGE_ALLOWANCE_CONFIGURATION,
  type ImageAllowanceConfiguration,
  type ImagePlanKey,
  type ImageQuality,
} from './image-allowance-config';

export type { ImagePlanKey, ImageQuality } from './image-allowance-config';
export type ImageAllowanceFailure = 'image_plan_required' | 'image_allowance_exhausted' | 'image_allowance_unavailable';
export type ImagePublicPlanId = 'workshop' | 'studio' | 'foundry';
export type ImageSubscriptionState = 'none' | 'active' | 'ending' | 'payment_required' | 'processing' | 'paused' | 'canceled' | 'unavailable';

export class ImageAllowanceError extends Error {
  constructor(readonly code: ImageAllowanceFailure) { super(code); }
}

interface ActiveImagePlan {
  subscription_id: string;
  plan_key: ImagePlanKey;
  period_end: Date | string;
  monthly_units: number;
  standard_output_units: number;
  hd_output_units: number;
}

const activePlanQuery = `
  SELECT subscription_id, plan_key, period_end
  FROM private.galx_plan_subscriptions
  WHERE user_id = $1
    AND plan_key IN ('creator-v1','studio-v1','team-v1')
    AND status = 'active'
    AND period_end > statement_timestamp()
  ORDER BY period_end DESC,
    CASE plan_key WHEN 'team-v1' THEN 3 WHEN 'studio-v1' THEN 2 ELSE 1 END DESC,
    subscription_id
  LIMIT 1`;

async function readActiveImagePlan(
  db: Pick<Pool, 'query'>,
  owner: string,
  configuration: ImageAllowanceConfiguration,
): Promise<ActiveImagePlan | null> {
  const subscription = (await db.query<{ subscription_id: string; plan_key: ImagePlanKey; period_end: Date | string }>(activePlanQuery, [owner])).rows[0];
  if (!subscription) return null;
  const allowance = approvedAllowanceFor(configuration, subscription.plan_key);
  if (!allowance) throw new ImageAllowanceError('image_allowance_unavailable');
  return { ...subscription, monthly_units: allowance.monthlyUnits,
    standard_output_units: allowance.standardOutputUnits, hd_output_units: allowance.hdOutputUnits };
}

export interface ImageAllowanceSnapshot {
  plan: 'workshop' | 'studio' | 'foundry';
  planName: string;
  available: boolean;
  exhausted: boolean;
  totalUnits: number;
  usedUnits: number;
  remainingUnits: number;
  standardOutputUnits: number;
  hdOutputUnits: number;
  renewsAt: string;
}

const publicPlanName: Record<ImagePlanKey, { id: ImageAllowanceSnapshot['plan']; name: string }> = {
  'creator-v1': { id: 'workshop', name: 'Workshop' },
  'studio-v1': { id: 'studio', name: 'Studio' },
  'team-v1': { id: 'foundry', name: 'Foundry' },
};

export interface ImagePlanSummary {
  state: ImageSubscriptionState;
  plan: ImagePublicPlanId | null;
  planName: string | null;
  periodEnd: string | null;
  endsAt: string | null;
  allowanceConfigured: boolean;
}

/** Billing display state is separate from Sites Pro access. It never grants
 * creation; requests still reserve allowance under the database transaction. */
export async function readImagePlanSummary(
  owner: string,
  pool = getPostgresPool(),
  configuration: ImageAllowanceConfiguration = IMAGE_ALLOWANCE_CONFIGURATION,
): Promise<ImagePlanSummary> {
  const empty = (state: ImageSubscriptionState): ImagePlanSummary => ({
    state, plan: null, planName: null, periodEnd: null, endsAt: null, allowanceConfigured: false,
  });
  if (!pool) return empty('unavailable');
  try {
    const rows = (await pool.query<{
      plan_key: ImagePlanKey;
      status: string;
      period_end: Date | string | null;
      period_is_current: boolean;
      cancel_at_period_end: boolean;
    }>(`SELECT plan_key,status,period_end,period_end > statement_timestamp() AS period_is_current,cancel_at_period_end
        FROM private.galx_plan_subscriptions
        WHERE user_id=$1 AND plan_key IN ('creator-v1','studio-v1','team-v1')
        ORDER BY (status IN ('active','past_due','unpaid','paused','incomplete','trialing')) DESC,
          period_end DESC NULLS LAST,subscription_id
        LIMIT 3`, [owner])).rows;
    const current = rows.filter(row => ['active','past_due','unpaid','paused','incomplete','trialing'].includes(row.status));
    if (current.length > 1) return empty('unavailable');
    const row = current[0];
    if (!row) return empty(rows.some(item => item.status === 'canceled') ? 'canceled' : 'none');
    if (!row.period_end || !row.period_is_current) return empty('unavailable');
    const display = publicPlanName[row.plan_key];
    if (!display) return empty('unavailable');
    const periodEnd = new Date(row.period_end!).toISOString();
    const state: ImageSubscriptionState = row.status === 'active'
      ? row.cancel_at_period_end ? 'ending' : 'active'
      : row.status === 'past_due' || row.status === 'unpaid' ? 'payment_required'
        : row.status === 'paused' ? 'paused' : 'processing';
    const allowanceConfigured = approvedAllowanceFor(configuration, row.plan_key) !== null;
    return { state, plan: display.id, planName: display.name, periodEnd,
      endsAt: row.cancel_at_period_end ? periodEnd : null, allowanceConfigured };
  } catch {
    return empty('unavailable');
  }
}

export async function readImageAllowance(
  owner: string,
  pool = getPostgresPool(),
  configuration: ImageAllowanceConfiguration = IMAGE_ALLOWANCE_CONFIGURATION,
): Promise<ImageAllowanceSnapshot | null> {
  if (!pool) throw new ImageAllowanceError('image_allowance_unavailable');
  const plan = await readActiveImagePlan(pool, owner, configuration);
  if (!plan) return null;
  const usage = (await pool.query<{ used_units: number; allowance_units: number; standard_output_units: number; hd_output_units: number }>(
    `SELECT used_units,allowance_units,standard_output_units,hd_output_units FROM private.galx_image_plan_period_usage
     WHERE user_id=$1 AND subscription_id=$2 AND period_end=$3`, [owner, plan.subscription_id, plan.period_end])).rows[0];
  const usedUnits = Number(usage?.used_units || 0);
  const totalUnits = Number(usage?.allowance_units ?? plan.monthly_units);
  const remainingUnits = Math.max(0, totalUnits - usedUnits);
  const standardOutputUnits = Number(usage?.standard_output_units ?? plan.standard_output_units);
  const hdOutputUnits = Number(usage?.hd_output_units ?? plan.hd_output_units);
  if (!Number.isSafeInteger(totalUnits) || totalUnits < 1 || totalUnits > 2_147_483_647 ||
      !Number.isSafeInteger(usedUnits) || usedUnits < 0 || usedUnits > totalUnits ||
      !Number.isSafeInteger(standardOutputUnits) || standardOutputUnits < 1 || standardOutputUnits > 32_767 ||
      !Number.isSafeInteger(hdOutputUnits) || hdOutputUnits < standardOutputUnits || hdOutputUnits > 32_767) {
    throw new ImageAllowanceError('image_allowance_unavailable');
  }
  const display = publicPlanName[plan.plan_key];
  return { plan: display.id, planName: display.name, available: remainingUnits > 0,
    exhausted: remainingUnits === 0, totalUnits, usedUnits, remainingUnits,
    standardOutputUnits, hdOutputUnits,
    renewsAt: new Date(plan.period_end).toISOString() };
}

/** Reserve allowance in the same short transaction that inserts the durable
 * request receipt. This must commit before any worker can claim/dispatch it. */
export async function reserveImageAllowance(
  db: PoolClient,
  owner: string,
  operationId: string,
  outputCount: number,
  quality: ImageQuality,
  configuration: ImageAllowanceConfiguration = IMAGE_ALLOWANCE_CONFIGURATION,
): Promise<void> {
  if (!Number.isSafeInteger(outputCount) || outputCount < 1 || outputCount > 4) {
    throw new ImageAllowanceError('image_allowance_unavailable');
  }
  const subscription = (await db.query<{ subscription_id: string; plan_key: ImagePlanKey; period_end: Date | string }>(
    `${activePlanQuery.replace('LIMIT 1', 'LIMIT 1 FOR UPDATE')}`, [owner])).rows[0];
  if (!subscription) throw new ImageAllowanceError('image_plan_required');
  const config = approvedAllowanceFor(configuration, subscription.plan_key);
  if (!config) throw new ImageAllowanceError('image_allowance_unavailable');

  await db.query(`INSERT INTO private.galx_image_plan_period_usage
    (user_id,subscription_id,period_end,plan_key,allowance_units,standard_output_units,hd_output_units)
    VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(user_id,subscription_id,period_end) DO NOTHING`,
  [owner, subscription.subscription_id, subscription.period_end, subscription.plan_key,
    config.monthlyUnits, config.standardOutputUnits, config.hdOutputUnits]);

  const period = (await db.query<{ allowance_units: number; used_units: number; standard_output_units: number; hd_output_units: number }>(
    `SELECT allowance_units,used_units,standard_output_units,hd_output_units
     FROM private.galx_image_plan_period_usage
     WHERE user_id=$1 AND subscription_id=$2 AND period_end=$3 FOR UPDATE`,
  [owner, subscription.subscription_id, subscription.period_end])).rows[0];
  if (!period) throw new ImageAllowanceError('image_allowance_unavailable');
  const perOutput = quality === 'hd' ? Number(period.hd_output_units) : Number(period.standard_output_units);
  const units = outputCount * perOutput;
  if (Number(period.used_units) + units > Number(period.allowance_units)) throw new ImageAllowanceError('image_allowance_exhausted');

  await db.query(`UPDATE private.galx_image_plan_period_usage SET used_units=used_units+$4,updated_at=now()
    WHERE user_id=$1 AND subscription_id=$2 AND period_end=$3`,
  [owner, subscription.subscription_id, subscription.period_end, units]);
  await db.query(`INSERT INTO private.galx_image_usage_reservations
    (operation_id,user_id,subscription_id,period_end,units,state)
    VALUES($1::uuid,$2,$3,$4,$5,'reserved')`,
  [operationId, owner, subscription.subscription_id, subscription.period_end, units]);
}
