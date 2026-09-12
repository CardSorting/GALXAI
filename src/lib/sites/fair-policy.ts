/** Private policy; never import into browser code. No production numeric defaults. */
export interface FairLimits {
  baseline_message_threshold: number; allowance_window_seconds: number;
  pool_max_outstanding: number; baseline_protected_slots: number;
  account_max_outstanding: number; account_max_continuation_outstanding: number;
  flow_window_seconds: number; pool_max_attempts_per_flow_window: number;
  continuation_max_attempts_per_flow_window: number; account_max_attempts_per_flow_window: number;
  active_continuation_demand_ttl_seconds: number; snapshot_ttl_seconds: number;
  refresh_timeout_milliseconds: number; admission_deadline_milliseconds: number;
  dispatch_grant_expiry_milliseconds: number; provider_max_attempts_per_logical_invocation: number;
  request_deadline_seconds: number;
}
const limitKeys = ('baseline_message_threshold allowance_window_seconds pool_max_outstanding baseline_protected_slots account_max_outstanding account_max_continuation_outstanding flow_window_seconds pool_max_attempts_per_flow_window continuation_max_attempts_per_flow_window account_max_attempts_per_flow_window active_continuation_demand_ttl_seconds snapshot_ttl_seconds refresh_timeout_milliseconds admission_deadline_milliseconds dispatch_grant_expiry_milliseconds provider_max_attempts_per_logical_invocation request_deadline_seconds').split(' ').sort();
export function readFairLimits(value: unknown): FairLimits {
  const p = value as FairLimits;
  if (!p || typeof p !== 'object' || Object.keys(p).sort().join() !== limitKeys.join() ||
    Object.entries(p).some(([k,v]) => !Number.isSafeInteger(v) || v < (k === 'baseline_protected_slots' ? 0 : 1) || v > 10_000_000) ||
    p.baseline_protected_slots >= p.pool_max_outstanding || p.account_max_outstanding > p.pool_max_outstanding ||
    p.account_max_continuation_outstanding > p.account_max_outstanding || p.continuation_max_attempts_per_flow_window > p.pool_max_attempts_per_flow_window ||
    p.account_max_attempts_per_flow_window > p.pool_max_attempts_per_flow_window || p.refresh_timeout_milliseconds > p.admission_deadline_milliseconds ||
    p.admission_deadline_milliseconds > 5000 || p.dispatch_grant_expiry_milliseconds > 5000 || p.snapshot_ttl_seconds > 60 ||
    p.request_deadline_seconds > 60 || p.provider_max_attempts_per_logical_invocation !== 1) throw new FairUsageError(503,'configuration');
  // The existing Sites transport dispatches once. Do not silently promise retries.
  return {...p};
}
export type FairLane = 'BASELINE' | 'CONTINUATION';
export interface PoolSnapshot {
  pool_id: string; revision: number; observed_at: number; valid_until: number;
  readiness: 'READY' | 'CONSTRAINED' | 'UNAVAILABLE' | 'UNKNOWN';
  signal_basis: 'shared-local-admission'; local_concurrency_limit: number;
}
export interface FairCounts {
  messages: number; outstanding: number; accountOutstanding: number; continuationOutstanding: number; accountContinuationOutstanding: number;
  attempts: number; accountAttempts: number; continuationAttempts: number; accountContinuationAttempts: number; activeDemand: number;
}
export class FairUsageError extends Error {
  constructor(readonly status: number, readonly reason: string, readonly retryAfter?: number, readonly beforeAdmission = true) { super('Sites access unavailable'); }
}
export function decideFairAdmission(p: FairLimits, s: PoolSnapshot | null, c: FairCounts, now: number, poolId: string): FairLane {
  const lane: FairLane = c.messages < p.baseline_message_threshold ? 'BASELINE' : 'CONTINUATION';
  if (!s || s.pool_id !== poolId || !Number.isSafeInteger(s.revision) || s.revision < 1 || !Number.isFinite(s.observed_at) ||
    !Number.isFinite(s.valid_until) || s.observed_at > now || s.valid_until <= now || s.valid_until <= s.observed_at ||
    s.valid_until-s.observed_at > p.snapshot_ttl_seconds*1000 || s.signal_basis !== 'shared-local-admission' ||
    !Number.isSafeInteger(s.local_concurrency_limit) || s.local_concurrency_limit < 0 || !['READY','CONSTRAINED'].includes(s.readiness))
    throw new FairUsageError(503,'snapshot');
  const ceiling = Math.min(p.pool_max_outstanding,s.local_concurrency_limit);
  if (c.outstanding >= ceiling) throw new FairUsageError(503,'pool_outstanding');
  if (c.accountOutstanding >= p.account_max_outstanding) throw new FairUsageError(429,'account_outstanding');
  if (c.attempts >= p.pool_max_attempts_per_flow_window) throw new FairUsageError(503,'pool_flow',p.flow_window_seconds);
  if (c.accountAttempts >= p.account_max_attempts_per_flow_window) throw new FairUsageError(429,'account_flow',p.flow_window_seconds);
  if (lane === 'CONTINUATION') {
    if (s.readiness !== 'READY' || c.continuationOutstanding >= Math.max(0,ceiling-p.baseline_protected_slots)) throw new FairUsageError(503,'protected_room');
    if (c.accountContinuationOutstanding >= p.account_max_continuation_outstanding) throw new FairUsageError(429,'account_continuation');
    if (c.continuationAttempts >= p.continuation_max_attempts_per_flow_window) throw new FairUsageError(503,'continuation_flow',p.flow_window_seconds);
    const share = Math.min(p.account_max_attempts_per_flow_window,Math.max(1,Math.ceil(p.continuation_max_attempts_per_flow_window/Math.max(1,c.activeDemand))));
    if (c.accountContinuationAttempts >= share) throw new FairUsageError(429,'account_share',p.flow_window_seconds);
  }
  return lane;
}
