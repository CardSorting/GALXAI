import type { Pool } from 'pg';
import { BroccoliDbTable } from '@/core/broccolidb/broccolidb-table';
import type { PreviewRecord } from './DeveloperAccessRepository';

type Database = Pick<Pool, 'query'>;
type Snapshot = { version: string; json: string; bytes: number; expires: number };
type Result = { approved: boolean; record: PreviewRecord | null };
type Pending = { id: string; application: boolean; snapshot?: Snapshot;
  waiters: { resolve: (value: Result) => void; reject: (error: unknown) => void }[] };
type SnapshotRow = { slot: number; version: string | null; record: PreviewRecord | null };
type BatchRow = { checked: number; approved: number[]; applications: SnapshotRow[] };
const stores = new WeakMap<Database, PreviewReadSync>();
const MAX_BATCH = 128, MAX_WAITERS = 1024, MAX_ACTIVE = 4;
const MAX_SNAPSHOTS = 512, MAX_BYTES = 2 * 1024 * 1024, SNAPSHOT_TTL = 60_000;

/** Server-only, process-local acceleration. Neither grants nor failed checks are cached. */
export class PreviewReadSync {
  static for(database: Database) {
    let store = stores.get(database);
    if (!store) { store = new PreviewReadSync(database); stores.set(database, store); }
    return store;
  }
  private readonly snapshots = new BroccoliDbTable<Snapshot>('preview_application_snapshots');
  private readonly order = new Map<string, number>();
  private bytes = 0;
  private readonly pending = new Map<string, Pending>();
  private waiting = 0;
  private active = 0;
  private timer?: ReturnType<typeof setTimeout>;
  constructor(private readonly database: Database) {
    this.snapshots.subscribe(event => {
      if (event.operation === 'EXPIRE') {
        this.bytes -= this.order.get(event.recordId) ?? 0;
        this.order.delete(event.recordId);
      }
    });
  }

  invalidate(id: string) {
    this.snapshots.delete(id);
    this.bytes -= this.order.get(id) ?? 0;
    this.order.delete(id);
  }
  private remember(id: string, version: string, record: PreviewRecord) {
    const json = JSON.stringify(record), bytes = Buffer.byteLength(json);
    this.invalidate(id);
    if (bytes > MAX_BYTES) return;
    while (this.order.size >= MAX_SNAPSHOTS || this.bytes + bytes > MAX_BYTES) this.invalidate(this.order.keys().next().value!);
    this.snapshots.put(id, { version, json, bytes, expires: Date.now() + SNAPSHOT_TTL }, { ttlMs: SNAPSHOT_TTL });
    this.order.set(id, bytes); this.bytes += bytes;
  }
  read(id: string, application: boolean): Promise<Result> {
    if (this.waiting >= MAX_WAITERS) return Promise.reject(new Error('Preview check capacity exceeded'));
    this.waiting++;
    // Only callers queued BEFORE dispatch share a snapshot. A later request must
    // not join an in-flight query which may predate a committed revocation.
    const key = JSON.stringify([id, application]);
    let pending = this.pending.get(key);
    if (!pending) { pending = { id, application, waiters: [] }; this.pending.set(key, pending); }
    const result = new Promise<Result>((resolve, reject) => pending!.waiters.push({ resolve, reject }));
    this.schedule();
    return result;
  }
  private schedule() {
    if (!this.pending.size || this.active >= MAX_ACTIVE) return;
    if (this.pending.size >= MAX_BATCH) { this.flush(); return; }
    if (!this.timer) this.timer = setTimeout(() => { this.timer = undefined; this.flush(); }, 2);
  }
  private flush() {
    if (this.active >= MAX_ACTIVE || !this.pending.size) return;
    const batch: Pending[] = [];
    for (const [key, request] of this.pending) {
      this.pending.delete(key);
      if (request.application) {
        const snapshot = this.snapshots.get(request.id);
        if (snapshot && snapshot.expires > Date.now()) request.snapshot = snapshot;
        else this.invalidate(request.id);
      }
      batch.push(request);
      if (batch.length === MAX_BATCH) break;
    }
    this.active++;
    void this.run(batch);
    this.schedule();
  }
  private async run(batch: Pending[]) {
    try {
      // One parameterized query covers approvals and application sync. xmin is
      // an opaque, short-lived row validator, so even edits outside the app's
      // revision protocol invalidate a snapshot. No row content crosses the
      // database connection again when the current version is already local.
      // ctid also distinguishes multiple updates within the same transaction.
      // Approval-only results are compact slot numbers, not repeated IDs or
      // nullable application columns for every caller in the batch.
      const result = await this.database.query<BatchRow>(`SELECT count(*)::integer AS checked,
        COALESCE(array_agg(wanted.ordinality::integer) FILTER (WHERE a.status='approved'
          AND (a.expires_at IS NULL OR a.expires_at>statement_timestamp())), '{}'::integer[]) AS approved,
        COALESCE(jsonb_agg(jsonb_build_object('slot', wanted.ordinality::integer,
          'version', a.xmin::text || ':' || a.ctid::text,
          'record', CASE WHEN a.user_id IS NOT NULL AND (a.xmin::text || ':' || a.ctid::text) IS DISTINCT FROM wanted.version THEN
          jsonb_build_object('user_id',a.user_id,'email',a.email,'use_case',a.use_case,'expected_traffic',a.expected_traffic,
            'introduction',a.introduction,'github_url',a.github_url,'linkedin_url',a.linkedin_url,
            'cohort_interest',a.cohort_interest,'revision',a.revision,'application_updated_at',a.application_updated_at,
            'status',a.status,'requested_at',a.requested_at,'reviewed_at',a.reviewed_at,'expires_at',a.expires_at)
          ELSE NULL END)) FILTER (WHERE wanted.application), '[]'::jsonb) AS applications
        FROM unnest($1::text[], $2::text[], $3::boolean[]) WITH ORDINALITY AS wanted(user_id, version, application, ordinality)
        LEFT JOIN private.developer_access_requests a ON a.user_id=wanted.user_id`,
      [batch.map(r => r.id), batch.map(r => r.snapshot?.version ?? null), batch.map(r => r.application)]);
      const resultRow = result.rows[0];
      if (result.rows.length !== 1 || resultRow.checked !== batch.length || !Array.isArray(resultRow.approved)
        || !Array.isArray(resultRow.applications)) throw new Error('Incomplete preview check');
      const approved = new Set(resultRow.approved);
      if (approved.size !== resultRow.approved.length || [...approved].some(slot => !Number.isInteger(slot) || slot < 1 || slot > batch.length)) throw new Error('Invalid preview check');
      const rows = new Map(resultRow.applications.map(row => [row.slot, row]));
      if (rows.size !== batch.filter(request => request.application).length) throw new Error('Incomplete preview snapshots');
      const resolved = batch.map((request, index) => {
        const row = rows.get(index + 1);
        let record: PreviewRecord | null = null;
        if (request.application) {
          if (!row) throw new Error('Missing preview snapshot');
          if (row.version === null) this.invalidate(request.id);
          else if (row.record) { record = row.record; this.remember(request.id, row.version, record); }
          else if (request.snapshot?.version === row.version) record = JSON.parse(request.snapshot.json);
          else throw new Error('Missing preview snapshot');
        }
        return { approved: approved.has(index + 1), record };
      });
      batch.forEach((request, index) => request.waiters.forEach(waiter => {
        // Each caller receives its own dates and object, never a mutable cache reference.
        const value = resolved[index], record = value.record;
        waiter.resolve({ approved: value.approved, record: record ? { ...record,
          requested_at: new Date(record.requested_at), reviewed_at: record.reviewed_at ? new Date(record.reviewed_at) : null,
          expires_at: record.expires_at ? new Date(record.expires_at) : null,
          application_updated_at: record.application_updated_at ? new Date(record.application_updated_at) : null,
        } : null });
      }));
    } catch (error) {
      for (const request of batch) {
        this.invalidate(request.id);
        request.waiters.forEach(waiter => waiter.reject(error));
      }
    } finally {
      this.waiting -= batch.reduce((count, request) => count + request.waiters.length, 0);
      this.active--; this.schedule();
    }
  }
}
