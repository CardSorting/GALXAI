import { getPostgresPool } from '@/lib/db/postgres';
import type { Pool } from 'pg';

export type PreviewStatus = 'pending' | 'approved' | 'revoked' | 'declined';
export type PreviewRecord = { user_id: string; email: string; use_case: string; expected_traffic: string;
  status: PreviewStatus; requested_at: Date; reviewed_at: Date | null; expires_at?: Date | null };

export class DeveloperAccessRepository {
  constructor(private readonly database: Pick<Pool, 'query'> | null = getPostgresPool()) {}
  private db() { if (!this.database) throw new Error('Preview storage unavailable'); return this.database; }
  async get(userId: string): Promise<PreviewRecord | null> {
    const result = await this.db().query<PreviewRecord>(`SELECT user_id, email, use_case, expected_traffic,
      status, requested_at, reviewed_at, expires_at FROM private.developer_access_requests WHERE user_id = $1`, [userId]);
    return result.rows[0] ?? null;
  }
  async isApproved(userId: string): Promise<boolean> {
    const result = await this.db().query(`SELECT 1 FROM private.developer_access_requests
      WHERE user_id=$1 AND status='approved' AND (expires_at IS NULL OR expires_at>now())`, [userId]);
    return result.rowCount === 1;
  }
  async request(userId: string, email: string, useCase: string, traffic: string) {
    // Retrying, editing a request, or resubmitting after revocation can never approve it.
    await this.db().query(`INSERT INTO private.developer_access_requests (user_id, email, use_case, expected_traffic)
      VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO NOTHING`, [userId, email, useCase, traffic]);
    return this.get(userId);
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
    return result.rowCount === 1;
  }
}
