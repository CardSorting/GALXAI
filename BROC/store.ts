import type { Pool, PoolClient } from 'pg';
import {
  BROC_CONTEXT_EVENT_LIMIT,
  buildBrocCanonRevisionPayload,
  buildBrocJudgmentPayload,
  createInitialBrocCanon,
  type BrocCanon,
  type BrocEventType,
  type BrocHistoryEvent,
  type BrocJudgmentInput,
  type BrocPracticeContext,
  type BrocScenePlan,
} from './practice';
import type { StarDefinition } from '../src/lib/stars/star-cohort';

type EventRow = {
  event_sequence: string | number;
  event_id: string;
  event_type: BrocEventType;
  event_payload: unknown;
  created_at: Date | string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readCanon(value: unknown, eventType: BrocEventType): BrocCanon | null {
  if (!isRecord(value)) return null;
  const raw = eventType === 'canon_revision' ? value.canon : value;
  if (!isRecord(raw) || typeof raw.handle !== 'string' || typeof raw.displayName !== 'string') return null;
  if (!Number.isSafeInteger(raw.version) || !Number.isSafeInteger(raw.revision)) return null;
  if (typeof raw.artistStatement !== 'string' || typeof raw.artisticPosition !== 'string') return null;
  if (!isRecord(raw.medium) || typeof raw.medium.name !== 'string'
    || typeof raw.medium.wayOfThinking !== 'string' || typeof raw.medium.boundary !== 'string') return null;
  if (!Array.isArray(raw.bodiesOfWork) || !Array.isArray(raw.visualLanguage)
    || !Array.isArray(raw.invariants) || !Array.isArray(raw.nextQuestions)
    || !Array.isArray(raw.influences)) return null;
  if (typeof raw.activeBodyId !== 'string') return null;
  return raw as unknown as BrocCanon;
}

function normalizeHistoryRow(row: EventRow): BrocHistoryEvent | null {
  if (row.event_type === 'canon' || row.event_type === 'canon_revision') return null;
  const payload = isRecord(row.event_payload) ? row.event_payload : {};
  const createdAt = row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at);
  return {
    eventId: row.event_id,
    eventType: row.event_type,
    payload,
    createdAt,
  };
}

export class BrocPracticePersistenceError extends Error {}

export interface BrocCandidateReviewRecord {
  attemptId: string;
  actorId: string;
  handle: string;
  assetIds: string[];
  createdAt: string;
  decision: 'unreviewed' | 'selected' | 'withheld';
  selectedAssetIds: string[];
}

export class BrocPracticeRepository {
  async listCandidateReviews(database: Pool | PoolClient, limit = 48): Promise<BrocCandidateReviewRecord[]> {
    const boundedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(Math.trunc(limit), 100)) : 48;
    const result = await database.query<{
      attempt_id: string;
      actor_id: string;
      handle: string;
      asset_ids: string[];
      created_at: Date | string;
      decision: 'selected' | 'withheld' | null;
      selected_asset_ids: unknown;
    }>(`
      SELECT attempt.attempt_id, attempt.actor_id, star.handle, attempt.asset_ids,
             candidate.created_at,
             decision.event_payload->>'status' AS decision,
             COALESCE(decision.event_payload->'selectedAssetIds', '[]'::jsonb) AS selected_asset_ids
      FROM private.galx_star_generation_attempts AS attempt
      JOIN private.galx_autonomous_actors AS actor ON actor.actor_id = attempt.actor_id
      JOIN private.galx_star_profiles AS star ON star.actor_id = actor.actor_id
      JOIN private.galx_star_practice_events AS candidate
        ON candidate.attempt_id = attempt.attempt_id
       AND candidate.actor_id = attempt.actor_id
       AND candidate.event_type = 'candidate'
      LEFT JOIN LATERAL (
        SELECT event_payload
        FROM private.galx_star_practice_events AS selection
        WHERE selection.attempt_id = attempt.attempt_id
          AND selection.actor_id = attempt.actor_id
          AND selection.event_type = 'selection'
        ORDER BY (event_payload->>'decisionVersion')::bigint DESC,
                 selection.event_sequence DESC
        LIMIT 1
      ) AS decision ON true
      WHERE attempt.kind = 'content' AND attempt.state = 'completed'
      ORDER BY candidate.event_sequence DESC
      LIMIT $1
    `, [boundedLimit]);

    return result.rows.map((row) => ({
      attemptId: row.attempt_id,
      actorId: row.actor_id,
      handle: row.handle,
      assetIds: Array.isArray(row.asset_ids) ? row.asset_ids.map(String) : [],
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      decision: row.decision || 'unreviewed',
      selectedAssetIds: Array.isArray(row.selected_asset_ids)
        ? row.selected_asset_ids.filter((id): id is string => typeof id === 'string')
        : [],
    }));
  }

  async recordCandidateDecision(
    pool: Pool,
    attemptId: string,
    selectedAssetIds: string[],
    rationale: string,
    reviewer: string,
  ): Promise<{ decision: 'selected' | 'withheld'; selectedAssetIds: string[]; decisionVersion: number }> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(attemptId)) {
      throw new BrocPracticePersistenceError('Star candidate identifier is invalid');
    }
    const uniqueAssetIds = [...new Set(selectedAssetIds)];
    if (uniqueAssetIds.length !== selectedAssetIds.length || uniqueAssetIds.length > 4 ||
      uniqueAssetIds.some((id) => !/^[A-Za-z0-9_-]{1,160}$/.test(id))) {
      throw new BrocPracticePersistenceError('Selected Star assets are invalid');
    }
    const cleanRationale = rationale.trim();
    const cleanReviewer = reviewer.trim();
    if (cleanRationale.length < 8 || cleanRationale.length > 1500 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(cleanRationale) ||
      cleanReviewer.length < 2 || cleanReviewer.length > 120 || /[\r\n\u0000-\u001F]/.test(cleanReviewer)) {
      throw new BrocPracticePersistenceError('Selection rationale or reviewer is invalid');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL lock_timeout = '3s'; SET LOCAL statement_timeout = '8s'");
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`broc-selection:${attemptId}`]);
      const attemptResult = await client.query<{
        attempt_id: string;
        actor_id: string;
        account_id: string;
        handle: string;
        generation_id: string;
        asset_ids: string[];
        state: string;
        is_discoverable: boolean;
        profile_status: string;
      }>(`
        SELECT attempt.attempt_id, attempt.actor_id, actor.account_id,
               star.handle, attempt.generation_id, attempt.asset_ids, attempt.state,
               star.is_discoverable, profile.status AS profile_status
        FROM private.galx_star_generation_attempts AS attempt
        JOIN private.galx_autonomous_actors AS actor ON actor.actor_id = attempt.actor_id
        JOIN private.galx_star_profiles AS star ON star.actor_id = actor.actor_id
        JOIN private.galx_account_profiles AS profile ON profile.id = star.account_profile_id
        WHERE attempt.attempt_id = $1::uuid
        FOR UPDATE OF attempt
      `, [attemptId]);
      const attempt = attemptResult.rows[0];
      if (!attempt || attempt.state !== 'completed' || !attempt.generation_id) {
        throw new BrocPracticePersistenceError('Completed Star candidate was not found');
      }
      if (attempt.is_discoverable !== true || attempt.profile_status !== 'active') {
        throw new BrocPracticePersistenceError('Star profile is not eligible for public exhibition');
      }
      if (!Array.isArray(attempt.asset_ids) || attempt.asset_ids.length === 0 || new Set(attempt.asset_ids).size !== attempt.asset_ids.length) {
        throw new BrocPracticePersistenceError('Star candidate has no complete asset set');
      }
      const attemptAssetIds = attempt.asset_ids.map(String);
      if (uniqueAssetIds.some((id) => !attemptAssetIds.includes(id))) {
        throw new BrocPracticePersistenceError('Selected assets must belong to this Star candidate');
      }

      const candidateResult = await client.query(`
        SELECT 1 FROM private.galx_star_practice_events
        WHERE attempt_id = $1::uuid AND actor_id = $2::uuid AND event_type = 'candidate'
        LIMIT 1
      `, [attemptId, attempt.actor_id]);
      if (candidateResult.rowCount !== 1) {
        throw new BrocPracticePersistenceError('Star candidate has no BROC candidate record');
      }

      const assetResult = await client.query<{ id: string }>(`
        SELECT id FROM public.user_image_library
        WHERE id = ANY($1::text[]) AND user_id = $2::text
          AND status = 'completed' AND work_class = 'star_published'
          AND metadata->>'requestId' = $3::text
        ORDER BY id
        FOR UPDATE
      `, [attemptAssetIds, attempt.account_id, attempt.generation_id]);
      if (assetResult.rows.length !== attemptAssetIds.length ||
        new Set(assetResult.rows.map((row) => row.id)).size !== attemptAssetIds.length) {
        throw new BrocPracticePersistenceError('Star candidate asset provenance is incomplete');
      }

      const versionResult = await client.query<{ next_version: string | number }>(`
        SELECT COALESCE((
          SELECT (event_payload->>'decisionVersion')::bigint
          FROM private.galx_star_practice_events
          WHERE attempt_id = $1::uuid AND event_type = 'selection'
          ORDER BY (event_payload->>'decisionVersion')::bigint DESC, event_sequence DESC
          LIMIT 1
        ), 0) + 1 AS next_version
      `, [attemptId]);
      const decisionVersion = Number(versionResult.rows[0]?.next_version);
      if (!Number.isSafeInteger(decisionVersion) || decisionVersion < 1 || decisionVersion > 999_999_999) {
        throw new BrocPracticePersistenceError('Star selection history is unavailable');
      }

      const decision = uniqueAssetIds.length > 0 ? 'selected' : 'withheld';
      const payload = {
        version: 1,
        decisionVersion,
        status: decision,
        selectedAssetIds: uniqueAssetIds,
        rationale: cleanRationale,
        reviewer: cleanReviewer,
      };
      await client.query(`
        INSERT INTO private.galx_star_practice_events
          (actor_id, attempt_id, event_type, event_payload)
        VALUES ($1::uuid, $2::uuid, 'selection', $3::jsonb)
      `, [attempt.actor_id, attemptId, JSON.stringify(payload)]);

      const updated = await client.query(`
        UPDATE public.user_image_library
        SET is_public = (id = ANY($1::text[])),
            visibility = CASE WHEN id = ANY($1::text[]) THEN 'public' ELSE 'private' END,
            is_explore_visible = (id = ANY($1::text[])),
            updated_at = now()
        WHERE id = ANY($2::text[]) AND user_id = $3::text
          AND status = 'completed' AND work_class = 'star_published'
          AND metadata->>'requestId' = $4::text
      `, [uniqueAssetIds, attemptAssetIds, attempt.account_id, attempt.generation_id]);
      if (updated.rowCount !== attemptAssetIds.length) {
        throw new BrocPracticePersistenceError('Star candidate exhibition update was incomplete');
      }
      await client.query('COMMIT');
      return { decision, selectedAssetIds: uniqueAssetIds, decisionVersion };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      if (error instanceof BrocPracticePersistenceError) throw error;
      throw new BrocPracticePersistenceError('Star candidate decision could not be committed');
    } finally {
      client.release();
    }
  }

  async loadContext(pool: Pool | PoolClient, actorId: string, star: StarDefinition): Promise<BrocPracticeContext> {
    const seed = createInitialBrocCanon(star);
    await pool.query([
      'INSERT INTO private.galx_star_practice_events',
      '  (actor_id, attempt_id, event_type, event_payload)',
      "VALUES ($1, NULL, 'canon', $2::jsonb)",
      "ON CONFLICT (actor_id) WHERE event_type = 'canon' DO NOTHING",
    ].join('\n'), [actorId, JSON.stringify(seed)]);

    const canonical = await pool.query<EventRow>([
      'SELECT event_sequence, event_id, event_type, event_payload, created_at',
      'FROM private.galx_star_practice_events',
      "WHERE actor_id = $1 AND event_type IN ('canon', 'canon_revision')",
      'ORDER BY event_sequence DESC',
      'LIMIT 1',
    ].join('\n'), [actorId]);
    const canonicalRow = canonical.rows[0];
    const canon = canonicalRow ? readCanon(canonicalRow.event_payload, canonicalRow.event_type) : null;
    if (!canonicalRow || !canon || canon.handle !== star.handle) {
      throw new BrocPracticePersistenceError('BROC practice canon is unavailable');
    }

    const historyResult = await pool.query<EventRow>([
      'SELECT event_sequence, event_id, event_type, event_payload, created_at',
      'FROM private.galx_star_practice_events',
      "WHERE actor_id = $1 AND event_type NOT IN ('canon', 'canon_revision')",
      'ORDER BY event_sequence DESC',
      'LIMIT $2',
    ].join('\n'), [actorId, BROC_CONTEXT_EVENT_LIMIT]);
    const recentEvents = historyResult.rows
      .map(normalizeHistoryRow)
      .filter((event): event is BrocHistoryEvent => event !== null);

    return {
      canonEventId: canonicalRow.event_id,
      canon,
      recentEvents,
    };
  }

  async appendScene(client: PoolClient, actorId: string, attemptId: string, scene: BrocScenePlan): Promise<void> {
    const payload = {
      version: scene.version,
      bodyId: scene.bodyId,
      bodyTitle: scene.bodyTitle,
      question: scene.question,
      mediumOperation: scene.mediumOperation,
      formalFocus: scene.formalFocus,
      directiveSource: scene.directiveSource,
      preflight: scene.preflight,
    };
    await client.query([
      'INSERT INTO private.galx_star_practice_events',
      '  (actor_id, attempt_id, event_type, event_payload)',
      "VALUES ($1, $2, 'scene', $3::jsonb)",
      "ON CONFLICT (attempt_id) WHERE event_type = 'scene' DO NOTHING",
    ].join('\n'), [actorId, attemptId, JSON.stringify(payload)]);
  }

  async appendCandidate(client: PoolClient, actorId: string, attemptId: string, assetCount: number): Promise<void> {
    const payload = {
      version: 1,
      status: 'unreviewed_candidate',
      canonChange: false,
      visualReview: 'pending',
      assetCount: Math.max(0, Math.min(16, Math.trunc(assetCount))),
    };
    await client.query([
      'INSERT INTO private.galx_star_practice_events',
      '  (actor_id, attempt_id, event_type, event_payload)',
      "VALUES ($1, $2, 'candidate', $3::jsonb)",
      "ON CONFLICT (attempt_id) WHERE event_type = 'candidate' DO NOTHING",
    ].join('\n'), [actorId, attemptId, JSON.stringify(payload)]);
  }

  async appendJudgment(
    database: Pool | PoolClient,
    actorId: string,
    attemptId: string,
    input: BrocJudgmentInput,
  ): Promise<void> {
    const payload = buildBrocJudgmentPayload(input);
    await database.query([
      'INSERT INTO private.galx_star_practice_events',
      '  (actor_id, attempt_id, event_type, event_payload)',
      'VALUES ($1, $2, $3, $4::jsonb)',
    ].join('\n'), [actorId, attemptId, input.eventType, JSON.stringify(payload)]);
  }

  async appendCanonRevision(
    client: PoolClient,
    actorId: string,
    attemptId: string,
    expectedCanonEventId: string,
    canon: BrocCanon,
    rationale: string,
  ): Promise<void> {
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      [`broc-canon:${actorId}`],
    );
    const current = await client.query<{ event_sequence: string | number; event_id: string; event_type: BrocEventType; event_payload: unknown }>([
      'SELECT event_sequence, event_id, event_type, event_payload',
      'FROM private.galx_star_practice_events',
      "WHERE actor_id = $1 AND event_type IN ('canon', 'canon_revision')",
      'ORDER BY event_sequence DESC',
      'LIMIT 1',
      'FOR UPDATE',
    ].join('\n'), [actorId]);
    const currentRow = current.rows[0];
    const currentCanon = currentRow ? readCanon(currentRow.event_payload, currentRow.event_type) : null;
    if (!currentRow || currentRow.event_id !== expectedCanonEventId || !currentCanon
      || currentCanon.handle !== canon.handle || canon.revision !== currentCanon.revision + 1) {
      throw new BrocPracticePersistenceError('BROC canon revision is stale or invalid');
    }
    const payload = buildBrocCanonRevisionPayload(canon, rationale);
    await client.query([
      'INSERT INTO private.galx_star_practice_events',
      '  (actor_id, attempt_id, event_type, event_payload)',
      "VALUES ($1, $2, 'canon_revision', $3::jsonb)",
    ].join('\n'), [actorId, attemptId, JSON.stringify(payload)]);
  }
}
