import type { Pool, PoolClient } from 'pg';
import { getPostgresPool } from '@/lib/db/postgres';
import { AdminError } from '@/lib/admin/errors';
import type { AccessRequest, AdminActor, AdminRole, AuditItem, FeedbackItem, Page, RequestState, StaffMember } from '@/lib/admin/preview-contract';

type Identity = { id: string; email: string };
const requestColumns = 'user_id, email, use_case, expected_traffic, status, requested_at, reviewed_at, expires_at, revision';
const auditColumns = `id, actor_email, action, subject, previous_state, next_state, reason, expires_at, created_at,
  COALESCE((SELECT email FROM private.developer_access_requests WHERE user_id=private.preview_admin_audit.subject),
    CASE WHEN action IN ('request_reviewed','feedback_resolved','feedback_reopened') THEN 'Former participant' ELSE subject END) AS subject_label`;
const feedbackColumns = 'f.id, f.user_id, a.email, f.message, f.created_at, f.resolved_at, f.revision';
const iso = (value: Date | null) => value?.toISOString() ?? null;
type RequestRow = Omit<AccessRequest, 'access_state' | 'requested_at' | 'reviewed_at' | 'expires_at'> & { requested_at: Date; reviewed_at: Date | null; expires_at: Date | null };
type AuditRow = Omit<AuditItem, 'created_at' | 'expires_at'> & { created_at: Date; expires_at: Date | null };
type FeedbackRow = Omit<FeedbackItem, 'created_at' | 'resolved_at'> & { created_at: Date; resolved_at: Date | null };
const requestDTO = (r: RequestRow): AccessRequest => ({ user_id: r.user_id, email: r.email, use_case: r.use_case,
  expected_traffic: r.expected_traffic, status: r.status, access_state: r.status === 'approved' && r.expires_at && r.expires_at.getTime() <= Date.now() ? 'expired' : r.status,
  requested_at: r.requested_at.toISOString(), reviewed_at: iso(r.reviewed_at), expires_at: iso(r.expires_at), revision: r.revision });
const auditDTO = (r: AuditRow): AuditItem => ({ id: r.id, actor_email: r.actor_email, action: r.action, subject: r.subject, subject_label: r.subject_label,
  previous_state: r.previous_state, next_state: r.next_state, reason: r.reason, expires_at: iso(r.expires_at), created_at: r.created_at.toISOString() });
const feedbackDTO = (r: FeedbackRow): FeedbackItem => ({ id: r.id, user_id: r.user_id, email: r.email, message: r.message,
  created_at: r.created_at.toISOString(), resolved_at: iso(r.resolved_at), revision: r.revision });
const pageDTO = <T>(items: T[], page: number): Page<T> => ({ items: items.slice(0, 25), has_more: items.length > 25, page });
const conflict = () => new AdminError(409, 'changed', 'This record changed. Refresh it before saving your decision.');
const forbidden = () => new AdminError(403, 'forbidden', 'You do not have permission to perform this action.');

/** Every operation checks current staff membership. Writes hold that membership until commit. */
export class PreviewAdminRepository {
  constructor(private readonly pool: Pool | null = getPostgresPool()) {}
  private async transaction<T>(work: (db: PoolClient) => Promise<T>): Promise<T> {
    if (!this.pool) throw new Error('Storage unavailable');
    const db = await this.pool.connect();
    try {
      await db.query('BEGIN');
      await db.query("SET LOCAL statement_timeout = '5s'; SET LOCAL lock_timeout = '3s'; SET LOCAL idle_in_transaction_session_timeout = '5s'");
      const result = await work(db); await db.query('COMMIT'); return result;
    } catch (error) { await db.query('ROLLBACK'); throw error; }
    finally { db.release(); }
  }
  private async audit(db: PoolClient, actor: Identity, action: string, subject: string, previous: string | null, next: string | null, reason = '', expiresAt: Date | null = null) {
    await db.query(`INSERT INTO private.preview_admin_audit
      (actor_id, actor_email, action, subject, previous_state, next_state, reason, expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [actor.id, actor.email, action, subject, previous, next, reason, expiresAt]);
  }
  private async authorize(db: PoolClient, identity: Identity, permission: 'read' | 'review' | 'staff' = 'read'): Promise<AdminActor> {
    // An invitation is claimed only by the verified session email, then bound permanently to its account ID.
    const claimed = await db.query(`UPDATE private.preview_admin_members SET user_id=$1, updated_at=now(), revision=revision+1
      WHERE email=$2 AND user_id IS NULL RETURNING role`, [identity.id, identity.email.toLowerCase()]);
    if (claimed.rowCount) await this.audit(db, identity, 'staff_activated', identity.email, null, claimed.rows[0].role);
    const member = await db.query<{ role: AdminRole; email: string }>(`SELECT role, email FROM private.preview_admin_members WHERE user_id=$1 FOR SHARE`, [identity.id]);
    const row = member.rows[0];
    if (!row || (permission === 'review' && row.role === 'viewer') || (permission === 'staff' && row.role !== 'owner')) throw forbidden();
    return { id: identity.id, email: row.email, role: row.role };
  }
  session(identity: Identity) { return this.transaction(db => this.authorize(db, identity)); }
  requests(identity: Identity, status: string, search: string, page: number) {
    return this.transaction(async db => {
      await this.authorize(db, identity);
      const result = await db.query<RequestRow>(`SELECT ${requestColumns} FROM private.developer_access_requests
        WHERE ($1='all' OR ($1='expired' AND status='approved' AND expires_at<=now())
          OR (status=$1 AND ($1<>'approved' OR expires_at IS NULL OR expires_at>now())))
        AND ($2='' OR strpos(lower(email),lower($2))>0 OR user_id=$2)
        ORDER BY requested_at ASC, user_id ASC LIMIT 26 OFFSET $3`, [status, search, (page - 1) * 25]);
      return pageDTO(result.rows.map(requestDTO), page);
    });
  }
  detail(identity: Identity, userId: string) {
    return this.transaction(async db => {
      await this.authorize(db, identity);
      const result = await db.query<RequestRow>(`SELECT ${requestColumns} FROM private.developer_access_requests WHERE user_id=$1`, [userId]);
      if (!result.rows[0]) throw new AdminError(404, 'not_found', 'This access request could not be found.');
      const activity = await db.query<AuditRow>(`SELECT ${auditColumns} FROM private.preview_admin_audit WHERE subject=$1 ORDER BY created_at DESC, id DESC LIMIT 25`, [userId]);
      const feedback = await db.query<FeedbackRow>(`SELECT ${feedbackColumns} FROM private.developer_preview_feedback f
        JOIN private.developer_access_requests a USING (user_id) WHERE f.user_id=$1 ORDER BY f.created_at DESC, f.id DESC LIMIT 25`, [userId]);
      return { request: requestDTO(result.rows[0]), activity: activity.rows.map(auditDTO), feedback: feedback.rows.map(feedbackDTO) };
    });
  }
  review(identity: Identity, userId: string, revision: number, status: RequestState, reason: string, days: number | null) {
    return this.transaction(async db => {
      const actor = await this.authorize(db, identity, 'review');
      const current = await db.query<RequestRow>(`SELECT ${requestColumns} FROM private.developer_access_requests WHERE user_id=$1 FOR UPDATE`, [userId]);
      const row = current.rows[0];
      if (!row || row.revision !== revision) throw conflict();
      if (status === 'revoked' && row.status !== 'approved') throw new AdminError(400, 'invalid_transition', 'Only approved access can be paused.');
      if (status === 'declined' && row.status !== 'pending') throw new AdminError(400, 'invalid_transition', 'Only pending requests can be declined.');
      if (status === 'pending' && !['revoked', 'declined'].includes(row.status)) throw new AdminError(400, 'invalid_transition', 'Only paused or declined requests can return to the waitlist.');
      // Expiry is computed by the database and checked on every API request, with no scheduled-job dependency.
      const updated = await db.query<{ expires_at: Date | null }>(`UPDATE private.developer_access_requests
        SET status=$2, reviewed_at=now(), reviewed_by=$3, revision=revision+1,
          expires_at=CASE WHEN $2='approved' AND $4::integer IS NOT NULL THEN now()+make_interval(days=>$4::integer) ELSE NULL END
        WHERE user_id=$1 RETURNING expires_at`, [userId, status, actor.id, days]);
      await this.audit(db, actor, 'request_reviewed', userId, row.status, status, reason, updated.rows[0].expires_at);
      return { saved: true };
    });
  }
  feedback(identity: Identity, status: string, page: number) {
    return this.transaction(async db => {
      await this.authorize(db, identity);
      const result = await db.query<FeedbackRow>(`SELECT ${feedbackColumns} FROM private.developer_preview_feedback f
        JOIN private.developer_access_requests a USING (user_id)
        WHERE $1='all' OR ($1='open' AND f.resolved_at IS NULL) OR ($1='resolved' AND f.resolved_at IS NOT NULL)
        ORDER BY f.created_at DESC, f.id DESC LIMIT 26 OFFSET $2`, [status, (page - 1) * 25]);
      return pageDTO(result.rows.map(feedbackDTO), page);
    });
  }
  resolveFeedback(identity: Identity, id: string, revision: number, resolved: boolean) {
    return this.transaction(async db => {
      const actor = await this.authorize(db, identity, 'review');
      const result = await db.query<{ user_id: string }>(`UPDATE private.developer_preview_feedback SET
        resolved_at=CASE WHEN $3 THEN now() ELSE NULL END, resolved_by=CASE WHEN $3 THEN $4 ELSE NULL END, revision=revision+1
        WHERE id=$1 AND revision=$2 AND (resolved_at IS NOT NULL)<>$3 RETURNING user_id`, [id, revision, resolved, actor.id]);
      if (!result.rows[0]) throw conflict();
      await this.audit(db, actor, resolved ? 'feedback_resolved' : 'feedback_reopened', result.rows[0].user_id, resolved ? 'open' : 'resolved', resolved ? 'resolved' : 'open', `Feedback ${id}`);
      return { saved: true };
    });
  }
  activity(identity: Identity, page: number) {
    return this.transaction(async db => {
      await this.authorize(db, identity);
      const result = await db.query<AuditRow>(`SELECT ${auditColumns} FROM private.preview_admin_audit ORDER BY created_at DESC, id DESC LIMIT 26 OFFSET $1`, [(page - 1) * 25]);
      return pageDTO(result.rows.map(auditDTO), page);
    });
  }
  staff(identity: Identity, page: number) {
    return this.transaction(async db => {
      await this.authorize(db, identity, 'staff');
      const result = await db.query<{ email: string; role: AdminRole; active: boolean; revision: number; created_at: Date }>(`SELECT email, role, user_id IS NOT NULL AS active, revision, created_at
        FROM private.preview_admin_members ORDER BY created_at, email LIMIT 26 OFFSET $1`, [(page - 1) * 25]);
      return pageDTO(result.rows.map((r): StaffMember => ({ email: r.email, role: r.role, active: r.active, revision: r.revision, created_at: r.created_at.toISOString() })), page);
    });
  }
  updateStaff(identity: Identity, email: string, revision: number | null, role: AdminRole | null, reason: string) {
    return this.transaction(async db => {
      // Serialize roster writes before locking the actor. Concurrent owners cannot demote one another into zero owners.
      await db.query('SELECT pg_advisory_xact_lock(73142, 1)');
      const actor = await this.authorize(db, identity, 'staff');
      const result = await db.query<{ role: AdminRole; revision: number; user_id: string | null }>(`SELECT role, revision, user_id FROM private.preview_admin_members WHERE email=$1 FOR UPDATE`, [email]);
      const current = result.rows[0];
      if ((current?.revision ?? null) !== revision) throw conflict();
      if (!current && !role) throw conflict();
      if (current?.role === 'owner' && current.user_id && role !== 'owner') {
        const others = await db.query(`SELECT 1 FROM private.preview_admin_members WHERE role='owner' AND user_id IS NOT NULL AND email<>$1 LIMIT 1`, [email]);
        if (!others.rowCount) throw new AdminError(409, 'last_owner', 'Keep at least one active owner. Add another owner and have them sign in first.');
      }
      if (role) await db.query(`INSERT INTO private.preview_admin_members (email, role) VALUES ($1,$2)
        ON CONFLICT (email) DO UPDATE SET role=$2, revision=preview_admin_members.revision+1, updated_at=now()`, [email, role]);
      else await db.query('DELETE FROM private.preview_admin_members WHERE email=$1', [email]);
      await this.audit(db, actor, !current ? 'staff_added' : role ? 'staff_changed' : 'staff_removed', email, current?.role ?? null, role, reason);
      return { saved: true };
    });
  }
  /** Server CLI only. Creates the first owner; refuses to overwrite an existing roster. */
  bootstrap(email: string) {
    return this.transaction(async db => {
      await db.query('SELECT pg_advisory_xact_lock(73142, 1)');
      if ((await db.query('SELECT 1 FROM private.preview_admin_members LIMIT 1')).rowCount) throw new Error('An admin roster already exists. Use an existing owner account.');
      await db.query("INSERT INTO private.preview_admin_members (email, role) VALUES ($1,'owner')", [email]);
      await this.audit(db, { id: 'operator-cli', email: 'operator-cli' }, 'bootstrap', email, null, 'owner', 'First owner provisioned through the server CLI.');
    });
  }
}
