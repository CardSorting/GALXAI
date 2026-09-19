/** Browser-safe administration DTOs. Operational infrastructure never belongs here. */
export type AdminRole = 'owner' | 'reviewer' | 'viewer';
export type AdminActor = { id: string; email: string; role: AdminRole };
export type RequestState = 'pending' | 'approved' | 'revoked' | 'declined';
export type AccessState = RequestState | 'expired';
export type AccessRequest = { user_id: string; email: string; use_case: string; expected_traffic: string;
  introduction: string | null; github_url: string | null; linkedin_url: string | null;
  cohort_interest: 'next' | 'later' | null; application_updated_at: string | null;
  status: RequestState; access_state: AccessState; requested_at: string; reviewed_at: string | null;
  expires_at: string | null; revision: number };
export type FeedbackItem = { id: string; user_id: string; email: string; message: string; created_at: string;
  resolved_at: string | null; revision: number };
export type StaffMember = { email: string; role: AdminRole; active: boolean; revision: number; created_at: string };
export type AuditItem = { id: string; actor_email: string; action: string; subject: string; subject_label: string;
  previous_state: string | null; next_state: string | null; reason: string; expires_at: string | null; created_at: string };
export type Page<T> = { items: T[]; has_more: boolean; page: number };
export type PrivateAccessKey = { id: string; name: string; key_prefix: string; environment: 'live' | 'test'; scopes: string[];
  rate_limit_per_minute: number; usage_cap_usd: number | null; current_usage_usd: number; total_requests: number; total_tokens: number;
  created_at: string; last_used_at: string | null; expires_at: string | null; revoked: boolean };
export type PrivateAccessUsage = { status: 'active' | 'unavailable'; period_start: string | null; reset_at: string | null;
  completed_messages: number; pending_messages: number; cap_messages: number; accrued_usd: number; remaining_usd: number; percent_used: number };
export type PrivateAccessDetail = { keys: PrivateAccessKey[]; usage: PrivateAccessUsage | null };
export type RequestDetail = { request: AccessRequest; activity: AuditItem[]; feedback: FeedbackItem[]; private_access?: PrivateAccessDetail };
export const ROLE_DESCRIPTION: Record<AdminRole, string> = {
  owner: 'Review requests, manage private access, and control staff access.',
  reviewer: 'Approve or pause private access, manage credentials, and manage feedback.',
  viewer: 'Read requests, private feedback and decision history.',
};
