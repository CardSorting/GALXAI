import { getPostgresPool } from '@/lib/db/postgres';
import type { Pool } from 'pg';
import type { ApplicationInput } from '@/lib/developers/application';
import { PreviewReadSync } from './PreviewReadSync';

export type PreviewStatus = 'pending' | 'approved' | 'revoked' | 'declined';
export type PreviewRecord = { user_id: string; email: string; use_case: string; expected_traffic: string;
  introduction?: string | null; github_url?: string | null; linkedin_url?: string | null;
  cohort_interest?: 'next' | 'later' | null; revision?: number; application_updated_at?: Date | null;
  status: PreviewStatus; requested_at: Date; reviewed_at: Date | null; expires_at?: Date | null };
const columns = `user_id, email, use_case, expected_traffic, introduction, github_url, linkedin_url,
  cohort_interest, revision, application_updated_at, status, requested_at, reviewed_at, expires_at`;

export class DeveloperAccessRepository {
  constructor(private readonly database: Pick<Pool, 'query'> | null = getPostgresPool()) {}
  private db() { if (!this.database) throw new Error('Preview storage unavailable'); return this.database; }
  async get(userId: string): Promise<PreviewRecord | null> {
    return (await PreviewReadSync.for(this.db()).read(userId, true)).record;
  }
  async isApproved(userId: string): Promise<boolean> {
    return (await PreviewReadSync.for(this.db()).read(userId, false)).approved;
  }
  async request(userId: string, email: string, useCase: string, traffic: string, details?: ApplicationInput) {
    // Retrying, editing a request, or resubmitting after revocation can never approve it.
    const result = await this.db().query<PreviewRecord>(`WITH inserted AS (INSERT INTO private.developer_access_requests
      (user_id, email, use_case, expected_traffic, introduction, github_url, linkedin_url, cohort_interest)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (user_id) DO NOTHING RETURNING ${columns})
      SELECT ${columns} FROM inserted UNION ALL
      SELECT ${columns} FROM private.developer_access_requests WHERE user_id=$1 LIMIT 1`,
    [userId, email, useCase, traffic, details?.introduction ?? null, details?.github_url ?? null, details?.linkedin_url ?? null, details?.cohort_interest ?? null]);
    PreviewReadSync.for(this.db()).invalidate(userId);
    // A competing INSERT may commit after this statement's snapshot. Re-read
    // that rare conflict; never use a no-op UPDATE just to obtain RETURNING.
    return result.rows[0] ?? this.get(userId);
  }
  async updateApplication(userId: string, revision: number, input: ApplicationInput): Promise<PreviewRecord | null> {
    // Editing never resets queue order, approval, expiry or a staff decision. It invalidates stale reviews.
    const result = await this.db().query<PreviewRecord>(`UPDATE private.developer_access_requests
      SET introduction=$3, github_url=$4, linkedin_url=$5, use_case=$6, expected_traffic=$7,
        cohort_interest=$8, application_updated_at=now(), revision=revision+1
      WHERE user_id=$1 AND revision=$2 AND status='pending'
      RETURNING user_id, email, use_case, expected_traffic, introduction, github_url, linkedin_url,
        cohort_interest, revision, application_updated_at, status, requested_at, reviewed_at, expires_at`,
    [userId, revision, input.introduction, input.github_url, input.linkedin_url, input.use_case, input.expected_traffic, input.cohort_interest]);
    PreviewReadSync.for(this.db()).invalidate(userId);
    return result.rows[0] ?? null;
  }
  async feedback(userId: string, message: string) {
    // Serialize each account's submissions, with a durable per-account rate limit.
    const result = await this.db().query(`WITH admitted AS (
      UPDATE private.developer_access_requests SET last_feedback_at = now()
      WHERE user_id = $1 AND status = 'approved'
        AND (expires_at IS NULL OR expires_at > now())
        AND (last_feedback_at IS NULL OR last_feedback_at < now() - interval '1 minute') RETURNING user_id
    ) INSERT INTO private.developer_preview_feedback (user_id, message)
      SELECT user_id, $2 FROM admitted RETURNING id`, [userId, message]);
    return result.rowCount === 1;
  }
  async review(userId: string, status: 'approved' | 'revoked', reviewer: string) {
    // Retained server CLI path shares the same audit and revision guarantees as the workspace.
    const result = await this.db().query(`WITH previous AS MATERIALIZED (
      SELECT status FROM private.developer_access_requests WHERE user_id=$1 FOR UPDATE
    ), changed AS (UPDATE private.developer_access_requests a
      SET status=$2, reviewed_at=now(), reviewed_by=$3, revision=revision+1, expires_at=NULL
      FROM previous WHERE a.user_id=$1 RETURNING a.user_id, previous.status AS previous_state)
      INSERT INTO private.preview_admin_audit (actor_id, actor_email, action, subject, previous_state, next_state, reason)
      SELECT $3, 'operator-cli', 'request_reviewed', user_id, previous_state, $2, 'Access changed through the server CLI.' FROM changed RETURNING id`, [userId, status, reviewer]);
    PreviewReadSync.for(this.db()).invalidate(userId);
    return result.rowCount === 1;
  }
  async grantDeveloperTier(userId: string, email: string, source = 'stripe-fulfillment') {
    const result = await this.db().query<PreviewRecord>(`INSERT INTO private.developer_access_requests
      (user_id, email, use_case, expected_traffic, status, reviewed_at, reviewed_by, expires_at)
      VALUES ($1, $2, 'Developer tier purchased via checkout for images and frontier models API access', 'over_1000_daily', 'approved', now(), $3, NULL)
      ON CONFLICT (user_id) DO UPDATE SET
        status = 'approved',
        reviewed_at = now(),
        reviewed_by = $3,
        expires_at = NULL,
        revision = COALESCE(private.developer_access_requests.revision, 1) + 1
      RETURNING ${columns}`, [userId, email, source]);
    PreviewReadSync.for(this.db()).invalidate(userId);
    return result.rows[0] ?? null;
  }
}
