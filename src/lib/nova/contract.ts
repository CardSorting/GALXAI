/** Nova consumes normalized permission; it has no knowledge of purchases or media roles. */
export type NovaAdmission = { id: string; userId: string; grantId: string };
export type NovaState = 'completed' | 'not_accepted' | 'unknown';
export type NovaAccess = {
  admit(input: { tokenHash: string; resource: string; origin: string | null; requestKey: string; fingerprint: string }): Promise<NovaAdmission>;
  finish(id: string, state: NovaState): Promise<void>;
};
export type NovaErrorCode = 'invalid_token' | 'inference_access_required' | 'service_busy' | 'request_already_submitted' | 'invalid_request' | 'outcome_unconfirmed' | 'access_check_unavailable';
export class NovaError extends Error {
  constructor(readonly code: NovaErrorCode, readonly status: number, readonly executionState: 'not_accepted' | 'unknown' | 'completed' = 'not_accepted') { super(code); this.name = 'NovaError'; }
}
