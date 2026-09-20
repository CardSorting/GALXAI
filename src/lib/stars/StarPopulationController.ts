import type { Pool, PoolClient } from 'pg';
import { GalxUnifiedR2StorageManager } from '@/core/storage/GalxUnifiedR2StorageManager';
import { RelayDispatchError } from '@/core/router/adapters/RelayChatTransport';
import { ImageCapacityError } from '@/core/router/ImageCapacityError';
import { ImageRequestRepository } from '@/lib/images/request-repository';
import { ImageRequestService } from '@/lib/images/request-service';
import {
  STAR_CONTENT_OPPORTUNITIES,
  STAR_COHORT_KEY,
  STAR_REFRESH_COHORT_KEY,
  STAR_REFRESH_RUN_KEY,
  STAR_REFRESH_V2_COHORT_KEY,
  STAR_REFRESH_V2_RUN_KEY,
  STAR_RETRY_COHORT_KEY,
  STAR_RETRY_RUN_KEY,
  STAR_QUALIFICATION_COHORT_KEY,
  STAR_QUALIFICATION_RUN_KEY,
  STAR_DEFINITIONS,
  STAR_QUALIFICATION_DEFINITIONS,
  STAR_MAX_CONTENT_ATTEMPTS,
  STAR_MAX_GENERATION_CONCURRENCY,
  STAR_QUALIFICATION_MAX_GENERATION_CONCURRENCY,
  STAR_QUALIFICATION_CONTENT_OPPORTUNITIES,
  STAR_RUN_KEY,
  buildStarPrompt,
  renderStarAvatarSvg,
  type StarDefinition,
} from './star-cohort';

const STAR_MODEL = 'galx-nova-image';
const STAR_GENERATION_SIZES = ['1024x1024', '1792x1024', '1024x1792'] as const;

export type StarPopulationMode = 'initial' | 'refresh' | 'refresh-v2' | 'retry' | 'qualification';

interface StarExecutionConfig {
  mode: StarPopulationMode;
  cohortKey: string;
  runKey: string;
  label: string;
  definitions: readonly StarDefinition[];
  contentOpportunities: number;
  maxContentAttempts: number;
  maxGenerationConcurrency: number;
}

function getStarExecutionConfig(mode: StarPopulationMode = 'initial'): StarExecutionConfig {
  if (mode === 'qualification') {
    return {
      mode,
      cohortKey: STAR_QUALIFICATION_COHORT_KEY,
      runKey: STAR_QUALIFICATION_RUN_KEY,
      label: 'Production Star qualification',
      definitions: STAR_QUALIFICATION_DEFINITIONS,
      contentOpportunities: STAR_QUALIFICATION_CONTENT_OPPORTUNITIES,
      maxContentAttempts: STAR_QUALIFICATION_DEFINITIONS.length * STAR_QUALIFICATION_CONTENT_OPPORTUNITIES,
      maxGenerationConcurrency: STAR_QUALIFICATION_MAX_GENERATION_CONCURRENCY,
    };
  }
  if (mode === 'retry') {
    return {
      mode,
      cohortKey: STAR_RETRY_COHORT_KEY,
      runKey: STAR_RETRY_RUN_KEY,
      label: 'Star qualification retry',
      definitions: STAR_DEFINITIONS,
      contentOpportunities: STAR_CONTENT_OPPORTUNITIES,
      maxContentAttempts: STAR_MAX_CONTENT_ATTEMPTS,
      maxGenerationConcurrency: STAR_MAX_GENERATION_CONCURRENCY,
    };
  }
  if (mode === 'refresh-v2') {
    return {
      mode,
      cohortKey: STAR_REFRESH_V2_COHORT_KEY,
      runKey: STAR_REFRESH_V2_RUN_KEY,
      label: 'Refreshed GALX Stars (version 2)',
      definitions: STAR_DEFINITIONS,
      contentOpportunities: STAR_CONTENT_OPPORTUNITIES,
      maxContentAttempts: STAR_MAX_CONTENT_ATTEMPTS,
      maxGenerationConcurrency: STAR_MAX_GENERATION_CONCURRENCY,
    };
  }
  return mode === 'refresh'
    ? {
      mode,
      cohortKey: STAR_REFRESH_COHORT_KEY,
      runKey: STAR_REFRESH_RUN_KEY,
      label: 'Refreshed GALX Stars',
      definitions: STAR_DEFINITIONS,
      contentOpportunities: STAR_CONTENT_OPPORTUNITIES,
      maxContentAttempts: STAR_MAX_CONTENT_ATTEMPTS,
      maxGenerationConcurrency: STAR_MAX_GENERATION_CONCURRENCY,
    }
    : {
      mode,
      cohortKey: STAR_COHORT_KEY,
      runKey: STAR_RUN_KEY,
      label: 'Initial GALX Stars',
      definitions: STAR_DEFINITIONS,
      contentOpportunities: STAR_CONTENT_OPPORTUNITIES,
      maxContentAttempts: STAR_MAX_CONTENT_ATTEMPTS,
      maxGenerationConcurrency: STAR_MAX_GENERATION_CONCURRENCY,
    };
}

export interface StarPopulationPlan {
  cohortKey: string;
  runKey: string;
  starCount: number;
  contentOpportunitiesPerStar: number;
  maxContentAttempts: number;
  avatarGenerationAttempts: number;
  deterministicAvatarAssets: number;
  realGenerationCeiling: number;
  maxGenerationConcurrency: number;
  schedulesCreated: number;
  recurringGeneration: boolean;
}

export interface StarDefinitionReport {
  displayName: string;
  handle: string;
  shortPersona: string;
}

export interface StarRunReport {
  plan: StarPopulationPlan;
  stars: StarDefinitionReport[];
  created: number;
  administrativeProAssignments: number;
  avatarAssetsCreated: number;
  avatarGenerations: number;
  contentAttempts: number;
  successfulContentGenerations: number;
  failedContentGenerations: number;
  relayConfirmedGenerations: number;
  provenanceVerifiedGenerations: number;
  frontendProjectionVerified: boolean;
  humanStarAnalyticsVerified: boolean;
  administrativeBillingRecordedUsd: number;
  providerCostEstimateUsd: number | null;
  failures: Array<{ handle: string; opportunity: number; code: string }>;
  anomalies: string[];
  stoppedReason: string | null;
  inactiveAfterRun: boolean;
  cohortState: 'planned' | 'active' | 'completed' | 'disabled' | 'aborted';
}

interface StarRuntime {
  definition: StarDefinition;
  accountId: string;
  actorId: string;
  profileId: string;
}

interface AttemptRow {
  attempt_id: string;
  generation_id: string | null;
  state: 'queued' | 'generating' | 'completed' | 'failed' | 'cancelled';
  asset_ids: string[];
}

export class StarPopulationSystemicError extends Error {}

export function getStarPopulationPlan(mode: StarPopulationMode = 'initial'): StarPopulationPlan {
  const config = getStarExecutionConfig(mode);
  return {
    cohortKey: config.cohortKey,
    runKey: config.runKey,
    starCount: config.definitions.length,
    contentOpportunitiesPerStar: config.contentOpportunities,
    maxContentAttempts: config.maxContentAttempts,
    avatarGenerationAttempts: 0,
    deterministicAvatarAssets: config.definitions.length,
    realGenerationCeiling: config.maxContentAttempts,
    maxGenerationConcurrency: config.maxGenerationConcurrency,
    schedulesCreated: 0,
    recurringGeneration: false,
  };
}

export function getStarDefinitionReports(definitions: readonly StarDefinition[] = STAR_DEFINITIONS): StarDefinitionReport[] {
  return definitions.map((star) => ({
    displayName: star.displayName,
    handle: star.handle,
    shortPersona: `${star.persona.subjectInterests.slice(0, 2).join(' and ')}; ${star.persona.aestheticTendencies.slice(0, 2).join(' and ')}; ${star.persona.experimentation} experimentation`,
  }));
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function stableJitter(starIndex: number, opportunity: number): number {
  return 280 + ((starIndex * 149 + opportunity * 83) % 520);
}

function safeFailureCode(error: unknown): string {
  const typed = error as { code?: unknown; upstreamCode?: unknown; status?: unknown; name?: unknown };
  const source = [typed?.code, typed?.upstreamCode, typed?.name]
    .find((value) => typeof value === 'string' && value.length > 0);
  if (source) return String(source).toLowerCase().replace(/[^a-z0-9_-]+/g, '_').slice(0, 80);
  if (typeof typed?.status === 'number' && Number.isFinite(typed.status)) return `http_${typed.status}`;
  return 'generation_failed';
}

export function isSystemicFailure(error: unknown): boolean {
  const typed = error as { status?: unknown; message?: unknown; code?: unknown; upstreamCode?: unknown };
  const status = typeof typed?.status === 'number' ? typed.status : 0;
  const code = typeof typed?.code === 'string' ? typed.code.toLowerCase() : '';
  if (status === 401 || status === 403) {
    const message = String(typed?.message || '').toLowerCase();
    return /autonomous|account classification|entitlement|administrative|control plane/.test(message);
  }
  if (code === '42p18') return true;
  // A bounded population must stop on relay admission loss instead of turning
  // a capacity incident into a synchronized retry/load test.
  if (error instanceof ImageCapacityError) return true;
  if (error instanceof RelayDispatchError) {
    const relayCode = `${error.reason || ''} ${typed?.upstreamCode || ''}`.toLowerCase();
    // A generic transport failure is an attempt-level outcome. Stop the
    // bounded cohort only for an explicit global/control-plane condition;
    // worker-scoped provider capability and availability failures can be
    // recorded while other eligible workers continue.
    return /invalid_configuration|missing_relay_key|invalid_relay_origin|relay_discovery_failed|provenance|ownership|entitlement|administrative|account_classification|federation_unavailable|relay_fleet_unavailable|admission_capacity_exhausted|relay_reconciling|server_draining|control_unavailable/.test(relayCode);
  }
  const message = String(typed?.message || error || '').toLowerCase();
  return /image storage unavailable|image storage incomplete|image assets were not committed|autonomous content requires|provenance|ownership|entitlement|account classification|permission denied/.test(message);
}

async function withTransaction<T>(pool: Pool, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='15s'");
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function chooseControlOwner(client: PoolClient): Promise<string> {
  const result = await client.query<{ account_id: string }>(`
    SELECT account_id
    FROM private.galx_account_identities
    WHERE account_class = 'human'
    ORDER BY created_at ASC, account_id ASC
    LIMIT 1
  `);
  const owner = result.rows[0]?.account_id;
  if (!owner) throw new StarPopulationSystemicError('No human control owner is registered');
  return owner;
}

async function ensureEntitlement(
  client: PoolClient,
  accountId: string,
  controlOwner: string,
  cohortKey: string,
): Promise<boolean> {
  const active = await client.query<{ id: string; source: string; granted_by_account_id: string }>(`
    SELECT id, source, granted_by_account_id
    FROM private.galx_administrative_entitlements
    WHERE account_id = $1 AND entitlement_key = 'pro-v1'
      AND revoked_at IS NULL
      AND starts_at <= statement_timestamp()
      AND (ends_at IS NULL OR ends_at > statement_timestamp())
    ORDER BY created_at DESC
    LIMIT 1
  `, [accountId]);
  if (active.rows[0]) {
    if (active.rows[0].source !== 'administrative' || active.rows[0].granted_by_account_id !== controlOwner) {
      throw new StarPopulationSystemicError('Existing Star entitlement has an unexpected authority source');
    }
    return false;
  }

  await client.query(`
    INSERT INTO private.galx_administrative_entitlements
      (account_id, entitlement_key, source, granted_by_account_id, reason)
    VALUES ($1, 'pro-v1', 'administrative', $2, $3)
  `, [accountId, controlOwner, `GALX Star cohort ${cohortKey} administrative Pro assignment`]);
  return true;
}

async function ensureControlPlane(
  pool: Pool,
  config: StarExecutionConfig,
  allowRecovery: boolean,
): Promise<{ controlOwner: string; cohortId: string; stars: StarRuntime[]; created: number; administrativeProAssignments: number }> {
  return withTransaction(pool, async (client) => {
    const controlOwner = await chooseControlOwner(client);
    const existingRun = await client.query<{ run_id: string; control_owner_account_id: string; state: string }>(`
      SELECT run_id, control_owner_account_id, state
      FROM private.galx_autonomous_actor_runs
      WHERE run_key = $1
      FOR UPDATE
    `, [config.runKey]);

    let runId: string;
    if (existingRun.rows[0]) {
      if (existingRun.rows[0].control_owner_account_id !== controlOwner) {
        throw new StarPopulationSystemicError('The initial Star run has a different human control owner');
      }
      if (['completed', 'cleaned_up'].includes(existingRun.rows[0].state)
        || (existingRun.rows[0].state === 'disabled' && (config.mode !== 'initial' || !allowRecovery))) {
        throw new StarPopulationSystemicError(`The ${config.mode} Star run is already closed and cannot be expanded`);
      }
      runId = existingRun.rows[0].run_id;
    } else {
      const inserted = await client.query<{ run_id: string }>(`
        INSERT INTO private.galx_autonomous_actor_runs (run_key, control_owner_account_id, state)
        VALUES ($1, $2, 'planned')
        RETURNING run_id
      `, [config.runKey, controlOwner]);
      runId = inserted.rows[0].run_id;
    }

    await client.query(`
      INSERT INTO private.galx_star_cohorts
        (run_id, cohort_key, label, max_stars, content_opportunities_per_star,
         max_content_attempts, max_avatar_attempts, max_generation_concurrency)
      VALUES ($1, $2, $3, $4, $5, $6, 0, $7)
      ON CONFLICT (cohort_key) DO NOTHING
      `, [runId, config.cohortKey, config.label, config.definitions.length, config.contentOpportunities, config.maxContentAttempts, config.maxGenerationConcurrency]);

    const cohort = await client.query<{ cohort_id: string; run_id: string; state: string; max_stars: number; max_content_attempts: number; max_generation_concurrency: number; resume_count: number; content_attempts: number }>(`
      SELECT cohort_id, run_id, state, max_stars, max_content_attempts, max_generation_concurrency,
             resume_count, content_attempts
      FROM private.galx_star_cohorts
      WHERE cohort_key = $1
      FOR UPDATE
    `, [config.cohortKey]);
    const cohortRow = cohort.rows[0];
    if (!cohortRow || cohortRow.run_id !== runId
      || cohortRow.max_stars !== config.definitions.length
      || cohortRow.max_content_attempts !== config.maxContentAttempts
      || cohortRow.max_generation_concurrency !== config.maxGenerationConcurrency) {
      throw new StarPopulationSystemicError(`${config.mode} Star cohort safety limits do not match the controlled plan`);
    }
    if (['completed', 'aborted'].includes(cohortRow.state)
      || (cohortRow.state === 'disabled' && (config.mode !== 'initial' || !allowRecovery))) {
      throw new StarPopulationSystemicError(`The ${config.mode} Star cohort is already closed and cannot be expanded`);
    }
    if (config.mode === 'initial' && cohortRow.state === 'disabled' && cohortRow.resume_count >= 2) {
      throw new StarPopulationSystemicError('The initial Star cohort has already used its recovery authorizations');
    }

    const stars: StarRuntime[] = [];
    let created = 0;
    let administrativeProAssignments = 0;

    for (const definition of config.definitions) {
      const accountId = `star_${definition.handle}`;
      await client.query(`
        INSERT INTO private.galx_account_identities (account_id, account_class)
        VALUES ($1, 'autonomous')
        ON CONFLICT (account_id) DO NOTHING
      `, [accountId]);

      const identity = await client.query<{ account_class: string; profile_id: string }>(`
        SELECT account_class, profile_id
        FROM private.galx_account_identities
        WHERE account_id = $1
      `, [accountId]);
      if (identity.rows[0]?.account_class !== 'autonomous' || !identity.rows[0]?.profile_id) {
        throw new StarPopulationSystemicError(`Star identity ${definition.handle} is not autonomous`);
      }
      const profileId = identity.rows[0].profile_id;

      if (config.mode === 'initial') {
        await client.query(`
          UPDATE private.galx_account_profiles
          SET display_name = $2,
              metadata = jsonb_build_object('participantKind', 'star', 'cohortKey', $3::text),
              revision = revision + 1
          WHERE id = $1
            AND (display_name IS DISTINCT FROM $2
              OR metadata IS DISTINCT FROM jsonb_build_object('participantKind', 'star', 'cohortKey', $3::text))
        `, [profileId, definition.displayName, STAR_COHORT_KEY]);

        await client.query(`
          INSERT INTO private.galx_autonomous_actors
            (account_id, run_id, cohort_id, control_owner_account_id, provisioning_source, is_enabled)
          VALUES ($1, $2, $3, $4, 'orchestration', false)
          ON CONFLICT (account_id) DO NOTHING
        `, [accountId, runId, cohortRow.cohort_id, controlOwner]);
      }
      const actor = await client.query<{ actor_id: string; run_id: string | null; cohort_id: string | null; control_owner_account_id: string; provisioning_source: string }>(`
        SELECT actor_id, run_id, cohort_id, control_owner_account_id, provisioning_source
        FROM private.galx_autonomous_actors
        WHERE account_id = $1
      `, [accountId]);
      const actorRow = actor.rows[0];
      if (!actorRow
        || (config.mode === 'initial' && (actorRow.run_id !== runId || actorRow.cohort_id !== cohortRow.cohort_id))
        || actorRow.control_owner_account_id !== controlOwner || actorRow.provisioning_source !== 'orchestration') {
        throw new StarPopulationSystemicError(`Star actor ${definition.handle} is attached to an unexpected control plane`);
      }

      if (config.mode === 'initial') {
        await client.query(`
          INSERT INTO private.galx_star_profiles
            (actor_id, account_profile_id, cohort_id, handle, bio, interests, creative_persona)
          VALUES ($1, $2, $3, $4, $5, $6::text[], $7::jsonb)
          ON CONFLICT (actor_id) DO NOTHING
        `, [actorRow.actor_id, profileId, cohortRow.cohort_id, definition.handle, definition.bio, definition.interests, JSON.stringify(definition.persona)]);
      }
      const starProfile = await client.query<{ handle: string; account_profile_id: string; cohort_id: string; avatar_url: string | null }>(`
        SELECT handle, account_profile_id, cohort_id, avatar_url
        FROM private.galx_star_profiles
        WHERE actor_id = $1
      `, [actorRow.actor_id]);
      const starProfileRow = starProfile.rows[0];
      if (!starProfileRow || starProfileRow.handle !== definition.handle
        || starProfileRow.account_profile_id !== profileId) {
        throw new StarPopulationSystemicError(`Star profile ${definition.handle} does not match its canonical identity`);
      }

      await client.query(`
        INSERT INTO private.galx_autonomous_actor_configurations
        (actor_id, persona_ref, configuration_ref, configuration_version)
        VALUES ($1, $2, $3, 1)
        ON CONFLICT (actor_id) DO NOTHING
      `, [actorRow.actor_id, `star:${definition.handle}:persona:v1`, `star:${STAR_COHORT_KEY}:creative-config:v1`]);

      await client.query(`
        INSERT INTO private.galx_star_cohort_members
          (cohort_id, actor_id, control_owner_account_id, is_enabled)
        VALUES ($1, $2, $3, false)
        ON CONFLICT (cohort_id, actor_id) DO NOTHING
      `, [cohortRow.cohort_id, actorRow.actor_id, controlOwner]);

      if (await ensureEntitlement(client, accountId, controlOwner, config.cohortKey)) administrativeProAssignments += 1;
      if (!stars.some((star) => star.accountId === accountId)) {
        stars.push({ definition, accountId, actorId: actorRow.actor_id, profileId });
        if (config.mode === 'initial') created += 1;
      }
    }

    await client.query(`
      UPDATE private.galx_autonomous_actor_runs
      SET state = 'active', updated_at = now()
      WHERE run_id = $1 AND state IN ('planned', 'disabled')
    `, [runId]);
    await client.query(`
      UPDATE private.galx_star_cohorts
      SET state = 'active',
          activated_at = COALESCE(activated_at, now()),
          resume_count = CASE WHEN state = 'disabled' THEN resume_count + 1 ELSE resume_count END,
          last_resume_reason = CASE WHEN state = 'disabled'
            THEN format('provenance-persistence-repair-%s-2026-09', resume_count + 1)
            ELSE last_resume_reason END,
          last_resumed_at = CASE WHEN state = 'disabled' THEN now() ELSE last_resumed_at END,
          updated_at = now()
      WHERE cohort_id = $1 AND state IN ('planned', 'disabled')
    `, [cohortRow.cohort_id]);
    await client.query(`
      UPDATE private.galx_star_cohort_members
      SET is_enabled = true, updated_at = now()
      WHERE cohort_id = $1
    `, [cohortRow.cohort_id]);
    await client.query(`
      UPDATE private.galx_autonomous_actors
      SET is_enabled = true, updated_at = now()
      WHERE actor_id = ANY($1::uuid[])
    `, [stars.map((star) => star.actorId)]);

    return { controlOwner, cohortId: cohortRow.cohort_id, stars, created, administrativeProAssignments };
  });
}

async function ensureAvatar(pool: Pool, star: StarRuntime, cohortKey: string): Promise<'created' | 'existing'> {
  const existing = await pool.query<{ avatar_url: string | null }>(`
    SELECT avatar_url FROM private.galx_star_profiles WHERE actor_id = $1
  `, [star.actorId]);
  if (existing.rows[0]?.avatar_url) return 'existing';

  const svg = renderStarAvatarSvg(star.definition);
  const key = `${cohortKey}/avatars/${star.definition.handle}.svg`;
  const manager = GalxUnifiedR2StorageManager.getInstance();
  const upload = await manager.putObject({
    bucket: 'assets',
    key,
    data: Buffer.from(svg, 'utf8'),
    contentType: 'image/svg+xml',
    cacheControl: 'public, max-age=31536000, immutable',
    metadata: { participantKind: 'star', handle: star.definition.handle },
  });
  const avatarUrl = manager.isConfigured()
    ? upload.publicUrl
    : `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
  await pool.query(`
    UPDATE private.galx_star_profiles
    SET avatar_url = $2,
        avatar_asset_key = $3,
        avatar_source = 'deterministic_svg',
        avatar_generation_attempts = 0,
        revision = revision + 1
    WHERE actor_id = $1 AND avatar_url IS NULL
  `, [star.actorId, avatarUrl, key]);
  return 'created';
}

async function getAttempt(pool: Pool, cohortId: string, actorId: string, opportunity: number): Promise<AttemptRow | null> {
  const result = await pool.query<AttemptRow>(`
    SELECT attempt_id, generation_id, state, asset_ids
    FROM private.galx_star_generation_attempts
    WHERE cohort_id = $1 AND actor_id = $2 AND kind = 'content' AND opportunity_number = $3
    LIMIT 1
  `, [cohortId, actorId, opportunity]);
  return result.rows[0] || null;
}

async function createAttempt(pool: Pool, cohortId: string, star: StarRuntime, opportunity: number, prompt: string, size: string): Promise<AttemptRow> {
  const result = await pool.query<AttemptRow>(`
    INSERT INTO private.galx_star_generation_attempts
      (cohort_id, actor_id, kind, opportunity_number, prompt, parameters, estimated_cost_usd)
    SELECT $1::uuid, actor.actor_id, 'content', $3, $4,
           jsonb_build_object('model', $5::text, 'size', $6::text, 'quality', 'standard', 'execution', 'galx-relay'), 0
    FROM private.galx_autonomous_actors AS actor
    JOIN private.galx_star_cohort_members AS member
      ON member.actor_id = actor.actor_id
     AND member.cohort_id = $1::uuid
     AND member.is_enabled = true
    WHERE actor.actor_id = $2
    ON CONFLICT (cohort_id, actor_id, kind, opportunity_number) DO NOTHING
    RETURNING attempt_id, generation_id, state, asset_ids
  `, [cohortId, star.actorId, opportunity, prompt, STAR_MODEL, size]);
  if (result.rows[0]) return result.rows[0];
  const existing = await getAttempt(pool, cohortId, star.actorId, opportunity);
  if (!existing) throw new StarPopulationSystemicError('Star generation attempt was not persisted');
  return existing;
}

async function markAttemptGenerating(pool: Pool, attemptId: string, generationId: string): Promise<void> {
  await pool.query(`
    UPDATE private.galx_star_generation_attempts
    SET generation_id = $2, state = 'generating', started_at = COALESCE(started_at, now())
    WHERE attempt_id = $1 AND state = 'queued'
  `, [attemptId, generationId]);
}

async function markAttemptFailed(pool: Pool, attemptId: string, code: string): Promise<void> {
  await pool.query(`
    UPDATE private.galx_star_generation_attempts
    SET state = 'failed', failure_code = $2, completed_at = COALESCE(completed_at, now())
    WHERE attempt_id = $1 AND state IN ('queued', 'generating')
  `, [attemptId, code]);
}

async function verifyContentProvenance(pool: Pool, accountId: string, generationId: string, assetIds: string[]): Promise<boolean> {
  if (assetIds.length === 0 || new Set(assetIds).size !== assetIds.length) return false;
  const result = await pool.query<{
    account_id: string;
    generation_state: string;
    execution_path: string | null;
    asset_id: string | null;
    generation_asset_id: string | null;
    user_id: string | null;
    asset_status: string | null;
    is_public: boolean | null;
    visibility: string | null;
  }>(`
    SELECT generation.account_id,
           generation.state AS generation_state,
           generation.metadata->>'executionPath' AS execution_path,
           mapping.asset_id,
           mapping.generation_id AS generation_asset_id,
           library.user_id,
           library.status AS asset_status,
           library.is_public,
           library.visibility
    FROM private.galx_generation_records AS generation
    LEFT JOIN private.galx_generation_assets AS mapping ON mapping.generation_id = generation.id
    LEFT JOIN public.user_image_library AS library ON library.id = mapping.asset_id
    WHERE generation.id = $1
      AND (mapping.asset_id IS NULL OR mapping.asset_id = ANY($2::text[]))
  `, [generationId, assetIds]);
  if (!result.rows.length) return false;
  const validRows = result.rows.filter((row) => row.asset_id !== null);
  return result.rows.every((row) => row.account_id === accountId
      && row.generation_state === 'completed'
      && row.execution_path === 'galx-relay')
    && validRows.length === assetIds.length
    && new Set(validRows.map((row) => row.asset_id)).size === assetIds.length
    && validRows.every((row) => assetIds.includes(String(row.asset_id))
      && row.generation_asset_id === generationId
      && row.user_id === accountId
      && row.asset_status === 'completed'
      && row.is_public === true
      && row.visibility === 'public');
}

async function markAttemptCompleted(pool: Pool, attemptId: string, assetIds: string[]): Promise<void> {
  await pool.query(`
    UPDATE private.galx_star_generation_attempts
    SET state = 'completed', asset_ids = $2::text[], relay_confirmed_at = now(), completed_at = now()
    WHERE attempt_id = $1 AND state IN ('queued', 'generating')
  `, [attemptId, assetIds]);
}

async function runOneOpportunity(
  pool: Pool,
  service: ImageRequestService,
  cohortId: string,
  cohortKey: string,
  star: StarRuntime,
  starIndex: number,
  opportunity: number,
  stop: { reason: string | null },
  report: StarRunReport,
): Promise<void> {
  if (stop.reason) return;
  await sleep(stableJitter(starIndex, opportunity));
  if (stop.reason) return;

  const prompt = buildStarPrompt(star.definition, opportunity);
  const size = STAR_GENERATION_SIZES[(starIndex + opportunity - 1) % STAR_GENERATION_SIZES.length];
  let attempt: AttemptRow;
  try {
    attempt = await createAttempt(pool, cohortId, star, opportunity, prompt, size);
  } catch (error) {
    report.anomalies.push(`Star attempt persistence failed for ${star.definition.handle} opportunity ${opportunity}: ${safeFailureCode(error)}`);
    stop.reason = 'Systemic Star attempt persistence defect';
    return;
  }
  if (attempt.state === 'completed' || attempt.state === 'failed' || attempt.state === 'cancelled') return;

  report.contentAttempts += 1;
  let generationId = attempt.generation_id;
  try {
    const request = generationId
      ? { id: generationId }
      : await service.create(star.accountId, {
        prompt,
        model: STAR_MODEL,
        n: 1,
        size,
        quality: 'standard',
        response_format: 'b64_json',
        sessionId: `stars/${cohortKey}`,
        idempotencyKey: `star:${cohortKey}:${star.definition.handle}:content:${opportunity}`,
      }, true, false, false);
    generationId = request.id;
    if (!attempt.generation_id) await markAttemptGenerating(pool, attempt.attempt_id, generationId);
    await pool.query(`
      UPDATE private.galx_generation_records
      SET metadata = metadata || jsonb_build_object(
        'starCohort', $2::text,
        'starAttemptId', $3::text,
        'executionPath', 'galx-relay',
        'entitlementSource', 'administrative'
      ), updated_at = now()
      WHERE id = $1::text AND account_id = $4::text
    `, [generationId, cohortKey, attempt.attempt_id, star.accountId]);
    await service.run(star.accountId, generationId, true);
    const completed = await service.repository.get(star.accountId, generationId);
    if (!completed || completed.state !== 'completed' || !completed.asset_ids?.length) {
      throw new Error('Image assets were not committed');
    }
    const valid = await verifyContentProvenance(pool, star.accountId, generationId, completed.asset_ids);
    if (!valid) throw new StarPopulationSystemicError('Star generation provenance verification failed');
    await markAttemptCompleted(pool, attempt.attempt_id, completed.asset_ids);
    report.successfulContentGenerations += 1;
    report.relayConfirmedGenerations += 1;
    report.provenanceVerifiedGenerations += 1;
  } catch (error) {
    const code = safeFailureCode(error);
    await markAttemptFailed(pool, attempt.attempt_id, code);
    report.failedContentGenerations += 1;
    report.failures.push({ handle: star.definition.handle, opportunity, code });
    if (isSystemicFailure(error)) {
      stop.reason = 'Systemic identity, entitlement, relay, storage, ownership, or provenance defect';
    }
  }
}

async function runStarSequentially(
  pool: Pool,
  service: ImageRequestService,
  cohortId: string,
  cohortKey: string,
  star: StarRuntime,
  starIndex: number,
  contentOpportunities: number,
  stop: { reason: string | null },
  report: StarRunReport,
): Promise<void> {
  for (let opportunity = 1; opportunity <= contentOpportunities; opportunity += 1) {
    await runOneOpportunity(pool, service, cohortId, cohortKey, star, starIndex, opportunity, stop, report);
    if (stop.reason) return;
  }
}

async function runWithConcurrency<T>(items: readonly T[], limit: number, worker: (item: T, index: number) => Promise<void>): Promise<void> {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index], index);
    }
  });
  await Promise.all(workers);
}

async function finalizeRun(pool: Pool, cohortId: string, disabled: boolean): Promise<void> {
  await withTransaction(pool, async (client) => {
    await client.query(`
      UPDATE private.galx_autonomous_actors
      SET is_enabled = false, updated_at = now()
      WHERE actor_id IN (
        SELECT actor_id FROM private.galx_star_cohort_members WHERE cohort_id = $1
      )
    `, [cohortId]);
    await client.query(`
      UPDATE private.galx_star_cohort_members
      SET is_enabled = false, updated_at = now()
      WHERE cohort_id = $1
    `, [cohortId]);
    if (disabled) {
      await client.query(`
        UPDATE private.galx_star_cohorts
        SET state = 'disabled', disabled_at = now(), updated_at = now()
        WHERE cohort_id = $1 AND state = 'active'
      `, [cohortId]);
      await client.query(`
        UPDATE private.galx_autonomous_actor_runs AS run
        SET state = 'disabled', closed_at = now(), updated_at = now()
        FROM private.galx_star_cohorts AS cohort
        WHERE cohort.cohort_id = $1 AND run.run_id = cohort.run_id AND run.state = 'active'
      `, [cohortId]);
    } else {
      await client.query(`
        UPDATE private.galx_star_cohorts
        SET state = 'completed', completed_at = now(), updated_at = now()
        WHERE cohort_id = $1 AND state = 'active'
      `, [cohortId]);
      await client.query(`
        UPDATE private.galx_autonomous_actor_runs AS run
        SET state = 'completed', closed_at = now(), updated_at = now()
        FROM private.galx_star_cohorts AS cohort
        WHERE cohort.cohort_id = $1 AND run.run_id = cohort.run_id AND run.state = 'active'
      `, [cohortId]);
    }
  });
}

/**
 * A claim or failure-finalization outage must not leave a Star request queued
 * after its append-only population opportunity is terminal. This records the
 * durable request failure without creating another opportunity or generation.
 */
async function reconcilePendingStarRequests(pool: Pool, cohortId: string): Promise<number> {
  const result = await pool.query(`
    UPDATE private.galx_image_requests AS request
    SET state = 'failed',
        payload = jsonb_build_object('failureCode', 'generation_not_started'),
        updated_at = now()
    WHERE EXISTS (
      SELECT 1
      FROM private.galx_star_generation_attempts AS attempt
      WHERE attempt.cohort_id = $1
        AND attempt.kind = 'content'
        AND attempt.state = 'failed'
        AND attempt.generation_id IS NOT NULL
        AND attempt.generation_id = request.id::text
    )
      AND request.state IN ('queued', 'generating')
    RETURNING request.id
  `, [cohortId]);
  return result.rowCount || 0;
}

async function verifyAnalytics(pool: Pool): Promise<boolean> {
  const result = await pool.query<{ participant_kind: string; generation_attempts: string }>(`
    SELECT participant_kind, SUM(generation_attempts)::BIGINT AS generation_attempts
    FROM private.galx_participant_generation_activity
    GROUP BY participant_kind
  `);
  const starRow = result.rows.find((row) => row.participant_kind === 'star');
  const humanRowsAreDistinct = result.rows.every((row) => row.participant_kind === 'human' || row.participant_kind === 'star');
  return humanRowsAreDistinct && (!starRow || Number(starRow.generation_attempts) >= 0);
}

async function verifyFrontendProjection(pool: Pool, stars: StarRuntime[]): Promise<boolean> {
  const result = await pool.query<{ participant_kind: string; handle: string }>(`
    SELECT participant_kind, handle
    FROM public.community_participant_profiles
    WHERE participant_kind = 'star'
      AND handle = ANY($1::text[])
  `, [stars.map((star) => star.definition.handle)]);
  return result.rows.length === stars.length && result.rows.every((row) => row.participant_kind === 'star');
}

async function hydrateExistingRunStats(
  pool: Pool,
  report: StarRunReport,
  cohortId: string,
  stars: StarRuntime[],
): Promise<void> {
  const aggregate = await pool.query<{ state: string; count: string }>(`
    SELECT state, COUNT(*)::BIGINT AS count
    FROM private.galx_star_generation_attempts
    WHERE cohort_id = $1
      AND kind = 'content'
    GROUP BY state
  `, [cohortId]);
  for (const row of aggregate.rows) {
    const count = Number(row.count);
    report.contentAttempts += count;
    if (row.state === 'completed') {
      report.successfulContentGenerations += count;
      report.relayConfirmedGenerations += count;
      report.provenanceVerifiedGenerations += count;
    }
    if (row.state === 'failed' || row.state === 'cancelled') report.failedContentGenerations += count;
  }

  const failures = await pool.query<{ handle: string; opportunity_number: number; failure_code: string | null }>(`
    SELECT profile.handle, attempt.opportunity_number, attempt.failure_code
    FROM private.galx_star_generation_attempts AS attempt
    JOIN private.galx_star_profiles AS profile ON profile.actor_id = attempt.actor_id
    WHERE attempt.cohort_id = $1
      AND attempt.kind = 'content' AND attempt.state IN ('failed', 'cancelled')
    ORDER BY profile.handle, attempt.opportunity_number
  `, [cohortId]);
  report.failures.push(...failures.rows.map((row) => ({
    handle: row.handle,
    opportunity: row.opportunity_number,
    code: row.failure_code || 'generation_failed',
  })));

  const totals = await pool.query<{ avatars: string; entitlements: string }>(`
    SELECT
      (SELECT COUNT(*)::BIGINT
       FROM private.galx_star_profiles AS profile
       JOIN private.galx_autonomous_actors AS actor ON actor.actor_id = profile.actor_id
       WHERE actor.account_id = ANY($2::text[]) AND profile.avatar_url IS NOT NULL) AS avatars,
      (SELECT COUNT(DISTINCT entitlement.account_id)::BIGINT
       FROM private.galx_administrative_entitlements AS entitlement
       WHERE entitlement.account_id = ANY($2::text[])
         AND entitlement.entitlement_key = 'pro-v1'
         AND entitlement.source = 'administrative'
         AND entitlement.revoked_at IS NULL) AS entitlements
    FROM private.galx_star_cohorts AS cohort
    WHERE cohort.cohort_id = $1
  `, [cohortId, stars.map((star) => star.accountId)]);
  if (totals.rows[0]) {
    report.avatarAssetsCreated = Number(totals.rows[0].avatars || 0);
    report.administrativeProAssignments = Number(totals.rows[0].entitlements || 0);
  }
}

export async function executeStarPopulation(
  pool: Pool,
  options: { allowRecovery?: boolean; mode?: StarPopulationMode } = {},
): Promise<StarRunReport> {
  const mode = options.mode || 'initial';
  const config = getStarExecutionConfig(mode);
  const plan = getStarPopulationPlan(mode);
  const report: StarRunReport = {
    plan,
    stars: getStarDefinitionReports(config.definitions),
    created: 0,
    administrativeProAssignments: 0,
    avatarAssetsCreated: 0,
    avatarGenerations: 0,
    contentAttempts: 0,
    successfulContentGenerations: 0,
    failedContentGenerations: 0,
    relayConfirmedGenerations: 0,
    provenanceVerifiedGenerations: 0,
    frontendProjectionVerified: false,
    humanStarAnalyticsVerified: false,
    administrativeBillingRecordedUsd: 0,
    providerCostEstimateUsd: null,
    failures: [],
    anomalies: [],
    stoppedReason: null,
    inactiveAfterRun: false,
    cohortState: 'planned',
  };

  const controlPlane = await ensureControlPlane(pool, config, options.allowRecovery === true);
  report.created = controlPlane.created;
  report.administrativeProAssignments = controlPlane.administrativeProAssignments;
  await hydrateExistingRunStats(pool, report, controlPlane.cohortId, controlPlane.stars);

  for (const star of controlPlane.stars) {
    try {
      if (await ensureAvatar(pool, star, config.cohortKey) === 'created') report.avatarAssetsCreated += 1;
    } catch (error) {
      report.anomalies.push(`Avatar asset failed for ${star.definition.handle}`);
      report.stoppedReason = 'Systemic avatar/profile persistence defect';
      break;
    }
  }

  const service = new ImageRequestService(
    new ImageRequestRepository(pool),
    async (input) => {
      const { galxRouter } = await import('@/core/router/GalxModelRouter');
      return galxRouter.routeImageGeneration({ ...input, usageBillingBasis: 'administrative' });
    },
    () => undefined,
  );
  const stop = { reason: report.stoppedReason };

  if (!stop.reason) {
    await runWithConcurrency(controlPlane.stars, config.maxGenerationConcurrency, (star, index) =>
      runStarSequentially(pool, service, controlPlane.cohortId, config.cohortKey, star, index, config.contentOpportunities, stop, report));
  }
  report.stoppedReason = stop.reason;
  const reconciledPendingRequests = await reconcilePendingStarRequests(pool, controlPlane.cohortId);
  if (reconciledPendingRequests > 0) {
    report.anomalies.push(`Reconciled ${reconciledPendingRequests} uncommitted Star request receipt(s) as failed`);
  }
  await finalizeRun(pool, controlPlane.cohortId, Boolean(stop.reason));
  report.cohortState = stop.reason ? 'disabled' : 'completed';
  report.inactiveAfterRun = true;
  report.frontendProjectionVerified = await verifyFrontendProjection(pool, controlPlane.stars);
  report.humanStarAnalyticsVerified = await verifyAnalytics(pool);
  if (!report.frontendProjectionVerified) report.anomalies.push('Public participant projection verification failed');
  if (!report.humanStarAnalyticsVerified) report.anomalies.push('Human/Star analytics projection verification failed');
  if (report.contentAttempts > plan.maxContentAttempts) report.anomalies.push('Content attempt ceiling exceeded');
  return report;
}

export function formatStarPlanForHuman(mode: StarPopulationMode = 'initial'): string {
  const plan = getStarPopulationPlan(mode);
  const config = getStarExecutionConfig(mode);
  return [
    `Star cohort: ${plan.cohortKey}`,
    `Stars: ${plan.starCount}`,
    `Content opportunities: ${plan.contentOpportunitiesPerStar} each (${plan.maxContentAttempts} maximum real generations)`,
    `Avatar generations: ${plan.avatarGenerationAttempts} (deterministic SVG assets: ${plan.deterministicAvatarAssets})`,
    `Total real-generation ceiling: ${plan.realGenerationCeiling}`,
    `Maximum concurrency: ${plan.maxGenerationConcurrency}`,
    'Schedules created: 0; recurring generation: disabled',
    '',
    ...getStarDefinitionReports(config.definitions).map((star) => `- ${star.displayName} (@${star.handle}) — ${star.shortPersona}`),
  ].join('\n');
}
