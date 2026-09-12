/**
 * GALXAI: Supabase PostgreSQL Database Type Definitions (Apex Edition)
 * Strict schema definitions according to Supabase JavaScript SDK standards.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type GalxProviderType = 'openai';
export type GalxAuthType = 'api_key' | 'oauth';
export type GalxShardMode = 'pooled' | 'private';
export type GalxCredentialStatus =
  | 'healthy'
  | 'warming_up'
  | 'half_open'
  | 'cooldown'
  | 'exhausted'
  | 'soft_draining'
  | 'dead'
  | 'quarantined'
  | 'paused'
  | 'revoked';
export type GalxRotationStrategy = 'adaptive_headroom' | 'smooth_weighted_round_robin' | 'least_utilized' | 'priority_failover';
export type GalxQueueState = 'RUNNING' | 'PAUSED' | 'DISABLED' | 'DRAINING';
export type GalxTaskStatus =
  | 'QUEUED'
  | 'SCHEDULED'
  | 'WAITING_DEPENDENCIES'
  | 'DISPATCHING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'RETRYING'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'DEAD_LETTERED';
export type GalxDispatchTargetType = 'HTTP_PUSH' | 'INTERNAL_MODEL' | 'PULL_WORKER';
export type GalxWalletTransactionType =
  | 'deposit'
  | 'match_grant'
  | 'usage_draw'
  | 'auto_reload'
  | 'refund'
  | 'adjustment';
export type GalxWorkspaceRole = 'owner' | 'admin' | 'developer' | 'viewer';
export type GalxEnvironmentType = 'production' | 'staging' | 'development';
export type GalxIdempotencyState = 'IN_FLIGHT' | 'COMMITTED' | 'FAILED';

export interface Database {
  private: {
    Tables: {
      galx_site_workspaces: {
        Row: { id: string; user_id: string; title: string; revision: number; document: Json | null; published_document: Json | null; published_revision: number | null; messages: Json;
          archived: boolean; operation_id: string | null; operation_brief: string | null; operation_started_at: string | null;
          created_at: string; updated_at: string };
        Insert: { id: string; user_id: string; title: string };
        Update: { title?: string; revision?: number; document?: Json | null; published_document?: Json | null; published_revision?: number | null; messages?: Json; archived?: boolean;
          operation_id?: string | null; operation_brief?: string | null; operation_started_at?: string | null; updated_at?: string };
        Relationships: [];
      };
      galx_site_namespaces: {
        Row: { user_id: string; username: string; created_at: string };
        Insert: { user_id: string; username: string; created_at?: string };
        Update: { username?: never };
        Relationships: [];
      };
      galx_site_domains: {
        Row: { id: string; user_id: string; username: string; project_id: string; app_slug: string; hostname: string;
          status: 'reserved' | 'pending' | 'active'; attach_started: boolean; plan: Json | null; lease_id: string | null;
          lease_until: string | null; next_check_at: string | null; last_error: string | null; retry_count: number;
          automation_stopped: boolean; created_at: string; updated_at: string };
        Insert: { user_id: string; username: string; project_id: string; app_slug: string };
        Update: { status?: 'reserved' | 'pending' | 'active'; attach_started?: boolean; plan?: Json; lease_id?: string | null;
          lease_until?: string | null; next_check_at?: string | null; last_error?: string | null; retry_count?: number;
          automation_stopped?: boolean; updated_at?: string };
        Relationships: [];
      };
      galx_signup_credit_policy: {
        Row: { singleton: boolean; enabled: boolean; amount_usd: number; updated_at: string };
        Insert: { singleton?: boolean; enabled?: boolean; amount_usd?: number; updated_at?: string };
        Update: { enabled?: boolean; amount_usd?: number; updated_at?: string };
        Relationships: [];
      };
      galx_signup_credit_grants: {
        Row: { user_id: string; amount_usd: number; status: 'pending' | 'granted' | 'duplicate'; identity_hash: string | null; transaction_id: string | null; enrolled_at: string; granted_at: string | null };
        Insert: { user_id: string; amount_usd: number; status?: 'pending'; enrolled_at?: string };
        Update: { status?: 'granted' | 'duplicate'; identity_hash?: string; transaction_id?: string; granted_at?: string };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
  public: {
    Tables: {
      galx_workspaces: {
        Row: {
          id: string;
          slug: string;
          name: string;
          tier: string;
          is_active: boolean;
          monthly_spend_cap_usd: number;
          current_month_spend_usd: number;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          tier?: string;
          is_active?: boolean;
          monthly_spend_cap_usd?: number;
          current_month_spend_usd?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          tier?: string;
          is_active?: boolean;
          monthly_spend_cap_usd?: number;
          current_month_spend_usd?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      galx_budget_alerts: {
        Row: {
          id: string;
          workspace_id: string;
          environment_id: string | null;
          threshold_percentage: number;
          notification_webhook_url: string;
          is_triggered: boolean;
          triggered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          environment_id?: string | null;
          threshold_percentage: number;
          notification_webhook_url: string;
          is_triggered?: boolean;
          triggered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          environment_id?: string | null;
          threshold_percentage?: number;
          notification_webhook_url?: string;
          is_triggered?: boolean;
          triggered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      galx_workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: GalxWorkspaceRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role?: GalxWorkspaceRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          role?: GalxWorkspaceRole;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      galx_projects: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          slug: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          slug: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      galx_environments: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          environment_type: GalxEnvironmentType;
          monthly_budget_usd: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          environment_type?: GalxEnvironmentType;
          monthly_budget_usd?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          environment_type?: GalxEnvironmentType;
          monthly_budget_usd?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      galx_idempotency_keys: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          request_hash: string;
          state: GalxIdempotencyState;
          status_code: number | null;
          response_headers: Json | null;
          response_body: Json | null;
          error_message: string | null;
          expires_at_ms: number;
          created_at_ms: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          endpoint: string;
          request_hash: string;
          state?: GalxIdempotencyState;
          status_code?: number | null;
          response_headers?: Json | null;
          response_body?: Json | null;
          error_message?: string | null;
          expires_at_ms: number;
          created_at_ms: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          request_hash?: string;
          state?: GalxIdempotencyState;
          status_code?: number | null;
          response_headers?: Json | null;
          response_body?: Json | null;
          error_message?: string | null;
          expires_at_ms?: number;
          created_at_ms?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      galx_distributed_locks: {
        Row: {
          lock_key: string;
          owner_id: string;
          fencing_token: number;
          acquired_at_ms: number;
          expires_at_ms: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          lock_key: string;
          owner_id: string;
          fencing_token?: number;
          acquired_at_ms: number;
          expires_at_ms: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          lock_key?: string;
          owner_id?: string;
          fencing_token?: number;
          acquired_at_ms?: number;
          expires_at_ms?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      galx_api_key_scopes: {
        Row: {
          id: string;
          key_id: string;
          scope: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          key_id: string;
          scope: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          key_id?: string;
          scope?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      galx_developer_keys: {
        Row: {
          id: string;
          workspace_id: string | null;
          user_id: string;
          name: string;
          prefix: string;
          key_hash: string;
          rate_limit_per_minute: number;
          total_requests: number;
          total_tokens: number;
          spend_cap_usd: number | null;
          current_spend_usd: number;
          allowed_models: string[] | null;
          allowed_ips: string[] | null;
          is_revoked: boolean;
          revoked_at: string | null;
          revoked_reason: string | null;
          last_used_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          workspace_id?: string | null;
          user_id: string;
          name: string;
          prefix: string;
          key_hash: string;
          rate_limit_per_minute?: number;
          total_requests?: number;
          total_tokens?: number;
          spend_cap_usd?: number | null;
          current_spend_usd?: number;
          allowed_models?: string[] | null;
          allowed_ips?: string[] | null;
          is_revoked?: boolean;
          revoked_at?: string | null;
          revoked_reason?: string | null;
          last_used_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string | null;
          user_id?: string;
          name?: string;
          prefix?: string;
          key_hash?: string;
          rate_limit_per_minute?: number;
          total_requests?: number;
          total_tokens?: number;
          spend_cap_usd?: number | null;
          current_spend_usd?: number;
          allowed_models?: string[] | null;
          allowed_ips?: string[] | null;
          is_revoked?: boolean;
          revoked_at?: string | null;
          revoked_reason?: string | null;
          last_used_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      galx_shard_accounts: {
        Row: {
          id: string;
          workspace_id: string | null;
          user_id: string;
          provider: GalxProviderType;
          auth_type: GalxAuthType;
          account_label: string;
          api_key_masked: string;
          encrypted_ciphertext: string;
          encrypted_iv: string;
          encrypted_tag: string;
          key_version: string | null;
          shard_mode: GalxShardMode;
          priority: number;
          weight: number;
          status: GalxCredentialStatus;
          max_tokens: number;
          remaining_tokens: number;
          reserved_tokens: number;
          refill_rate_per_minute: number;
          max_requests: number;
          remaining_requests: number;
          last_refill_timestamp_ms: number;
          total_requests_served: number;
          total_tokens_consumed: number;
          consecutive_failures: number;
          consecutive_successes: number;
          average_latency_ms: number;
          last_latency_ms: number | null;
          fencing_token: number;
          permission_retracted: boolean;
          cooldown_until_ms: number | null;
          credential_expires_at_ms: number | null;
          privacy_capabilities: Json;
          sliding_window_quota: Json;
          supported_models: string[] | null;
          unsupported_models: string[] | null;
          registry_source: string;
          registry_revision: number;
          tier_pool: string;
          max_concurrency_ceiling: number;
          active_in_flight_count: number;
          ewma_latency_p95_ms: number;
          hydraulic_headroom_score: number;
          circuit_state: string;
          token_refill_remainder: number;
          request_refill_remainder: number;
          created_at_ms: number;
          updated_at_ms: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          workspace_id?: string | null;
          user_id: string;
          provider: GalxProviderType;
          auth_type?: GalxAuthType;
          account_label: string;
          api_key_masked: string;
          encrypted_ciphertext: string;
          encrypted_iv: string;
          encrypted_tag: string;
          key_version?: string | null;
          shard_mode?: GalxShardMode;
          priority?: number;
          weight?: number;
          status?: GalxCredentialStatus;
          max_tokens?: number;
          remaining_tokens?: number;
          reserved_tokens?: number;
          refill_rate_per_minute?: number;
          max_requests?: number;
          remaining_requests?: number;
          last_refill_timestamp_ms?: number;
          total_requests_served?: number;
          total_tokens_consumed?: number;
          consecutive_failures?: number;
          consecutive_successes?: number;
          average_latency_ms?: number;
          last_latency_ms?: number | null;
          fencing_token?: number;
          permission_retracted?: boolean;
          cooldown_until_ms?: number | null;
          credential_expires_at_ms?: number | null;
          privacy_capabilities?: Json;
          sliding_window_quota?: Json;
          supported_models?: string[] | null;
          unsupported_models?: string[] | null;
          registry_source?: string;
          registry_revision?: number;
          tier_pool?: string;
          max_concurrency_ceiling?: number;
          active_in_flight_count?: number;
          ewma_latency_p95_ms?: number;
          hydraulic_headroom_score?: number;
          circuit_state?: string;
          token_refill_remainder?: number;
          request_refill_remainder?: number;
          created_at_ms: number;
          updated_at_ms: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string | null;
          user_id?: string;
          provider?: GalxProviderType;
          auth_type?: GalxAuthType;
          account_label?: string;
          api_key_masked?: string;
          encrypted_ciphertext?: string;
          encrypted_iv?: string;
          encrypted_tag?: string;
          key_version?: string | null;
          shard_mode?: GalxShardMode;
          priority?: number;
          weight?: number;
          status?: GalxCredentialStatus;
          max_tokens?: number;
          remaining_tokens?: number;
          reserved_tokens?: number;
          refill_rate_per_minute?: number;
          max_requests?: number;
          remaining_requests?: number;
          last_refill_timestamp_ms?: number;
          total_requests_served?: number;
          total_tokens_consumed?: number;
          consecutive_failures?: number;
          consecutive_successes?: number;
          average_latency_ms?: number;
          last_latency_ms?: number | null;
          fencing_token?: number;
          permission_retracted?: boolean;
          cooldown_until_ms?: number | null;
          credential_expires_at_ms?: number | null;
          privacy_capabilities?: Json;
          sliding_window_quota?: Json;
          supported_models?: string[] | null;
          unsupported_models?: string[] | null;
          registry_source?: string;
          registry_revision?: number;
          tier_pool?: string;
          max_concurrency_ceiling?: number;
          active_in_flight_count?: number;
          ewma_latency_p95_ms?: number;
          hydraulic_headroom_score?: number;
          circuit_state?: string;
          token_refill_remainder?: number;
          request_refill_remainder?: number;
          created_at_ms?: number;
          updated_at_ms?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      galx_shard_registry_events: {
        Row: {
          journal_offset: number;
          event_id: string;
          shard_id: string;
          registry_revision: number;
          event_type: string;
          actor_id: string;
          projection: Json;
          occurred_at: string;
        };
        Insert: {
          journal_offset?: never;
          event_id?: string;
          shard_id: string;
          registry_revision: number;
          event_type: string;
          actor_id?: string;
          projection?: Json;
          occurred_at?: string;
        };
        Update: {
          journal_offset?: never;
          event_id?: never;
          shard_id?: never;
          registry_revision?: never;
          event_type?: never;
          actor_id?: never;
          projection?: never;
          occurred_at?: never;
        };
        Relationships: [];
      };
      galx_shard_leases: {
        Row: {
          id: string;
          shard_id: string;
          workspace_id: string | null;
          user_id: string;
          job_id: string | null;
          fencing_token: number;
          health_revision?: number | null;
          estimated_tokens: number;
          committed_tokens: number | null;
          acquired_at_ms: number;
          expires_at_ms: number;
          is_committed: boolean;
          is_reclaimed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          shard_id: string;
          workspace_id?: string | null;
          user_id: string;
          job_id?: string | null;
          fencing_token: number;
          health_revision?: number | null;
          estimated_tokens?: number;
          committed_tokens?: number | null;
          acquired_at_ms: number;
          expires_at_ms: number;
          is_committed?: boolean;
          is_reclaimed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shard_id?: string;
          workspace_id?: string | null;
          user_id?: string;
          job_id?: string | null;
          fencing_token?: number;
          health_revision?: number | null;
          estimated_tokens?: number;
          committed_tokens?: number | null;
          acquired_at_ms?: number;
          expires_at_ms?: number;
          is_committed?: boolean;
          is_reclaimed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      galx_task_queues: {
        Row: {
          id: string;
          workspace_id: string | null;
          name: string;
          description: string | null;
          state: GalxQueueState;
          max_dispatches_per_second: number;
          max_concurrent_dispatches: number;
          max_burst_size: number;
          max_attempts: number;
          max_retry_duration_ms: number | null;
          min_backoff_ms: number;
          max_backoff_ms: number;
          max_doublings: number;
          jitter_factor: number;
          dlq_target_queue_id: string | null;
          dlq_retention_ms: number | null;
          dlq_webhook_url: string | null;
          default_tenant_max_concurrency: number;
          content_based_deduplication: boolean;
          default_deduplication_window_ms: number;
          priority_aging_interval_ms: number;
          created_at_ms: number;
          updated_at_ms: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          workspace_id?: string | null;
          name: string;
          description?: string | null;
          state?: GalxQueueState;
          max_dispatches_per_second?: number;
          max_concurrent_dispatches?: number;
          max_burst_size?: number;
          max_attempts?: number;
          max_retry_duration_ms?: number | null;
          min_backoff_ms?: number;
          max_backoff_ms?: number;
          max_doublings?: number;
          jitter_factor?: number;
          dlq_target_queue_id?: string | null;
          dlq_retention_ms?: number | null;
          dlq_webhook_url?: string | null;
          default_tenant_max_concurrency?: number;
          content_based_deduplication?: boolean;
          default_deduplication_window_ms?: number;
          priority_aging_interval_ms?: number;
          created_at_ms: number;
          updated_at_ms: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string | null;
          name?: string;
          description?: string | null;
          state?: GalxQueueState;
          max_dispatches_per_second?: number;
          max_concurrent_dispatches?: number;
          max_burst_size?: number;
          max_attempts?: number;
          max_retry_duration_ms?: number | null;
          min_backoff_ms?: number;
          max_backoff_ms?: number;
          max_doublings?: number;
          jitter_factor?: number;
          dlq_target_queue_id?: string | null;
          dlq_retention_ms?: number | null;
          dlq_webhook_url?: string | null;
          default_tenant_max_concurrency?: number;
          content_based_deduplication?: boolean;
          default_deduplication_window_ms?: number;
          priority_aging_interval_ms?: number;
          created_at_ms?: number;
          updated_at_ms?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      galx_tasks: {
        Row: {
          id: string;
          queue_id: string;
          workspace_id: string | null;
          user_id: string;
          idempotency_key: string | null;
          content_hash: string | null;
          tag: string | null;
          group_id: string | null;
          depends_on: string[];
          priority: number;
          target_type: GalxDispatchTargetType;
          target_payload: Json;
          pipeline_steps: Json | null;
          cron_config: Json | null;
          deadline_ms: number | null;
          ttl_ms: number | null;
          status: GalxTaskStatus;
          schedule_time_ms: number;
          dispatch_count: number;
          response_count: number;
          first_attempt_ms: number | null;
          last_attempt_ms: number | null;
          lease_expires_at_ms: number | null;
          active_worker_id: string | null;
          active_fencing_token: number | null;
          parent_task_results: Json;
          progress: Json | null;
          active_pipeline_step_index: number | null;
          pipeline_step_results: Json;
          result: Json | null;
          last_error: Json | null;
          created_at_ms: number;
          updated_at_ms: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          queue_id: string;
          workspace_id?: string | null;
          user_id: string;
          idempotency_key?: string | null;
          content_hash?: string | null;
          tag?: string | null;
          group_id?: string | null;
          depends_on?: string[];
          priority?: number;
          target_type: GalxDispatchTargetType;
          target_payload: Json;
          pipeline_steps?: Json | null;
          cron_config?: Json | null;
          deadline_ms?: number | null;
          ttl_ms?: number | null;
          status?: GalxTaskStatus;
          schedule_time_ms: number;
          dispatch_count?: number;
          response_count?: number;
          first_attempt_ms?: number | null;
          last_attempt_ms?: number | null;
          lease_expires_at_ms?: number | null;
          active_worker_id?: string | null;
          active_fencing_token?: number | null;
          parent_task_results?: Json;
          progress?: Json | null;
          active_pipeline_step_index?: number | null;
          pipeline_step_results?: Json;
          result?: Json | null;
          last_error?: Json | null;
          created_at_ms: number;
          updated_at_ms: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          queue_id?: string;
          workspace_id?: string | null;
          user_id?: string;
          idempotency_key?: string | null;
          content_hash?: string | null;
          tag?: string | null;
          group_id?: string | null;
          depends_on?: string[];
          priority?: number;
          target_type?: GalxDispatchTargetType;
          target_payload?: Json;
          pipeline_steps?: Json | null;
          cron_config?: Json | null;
          deadline_ms?: number | null;
          ttl_ms?: number | null;
          status?: GalxTaskStatus;
          schedule_time_ms?: number;
          dispatch_count?: number;
          response_count?: number;
          first_attempt_ms?: number | null;
          last_attempt_ms?: number | null;
          lease_expires_at_ms?: number | null;
          active_worker_id?: string | null;
          active_fencing_token?: number | null;
          parent_task_results?: Json;
          progress?: Json | null;
          active_pipeline_step_index?: number | null;
          pipeline_step_results?: Json;
          result?: Json | null;
          last_error?: Json | null;
          created_at_ms?: number;
          updated_at_ms?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      galx_task_attempts: {
        Row: {
          id: string;
          task_id: string;
          attempt_number: number;
          started_at_ms: number;
          completed_at_ms: number | null;
          duration_ms: number | null;
          response_status_code: number | null;
          error_message: string | null;
          error_details: Json | null;
          shard_id_used: string | null;
          model_used: string | null;
          worker_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          attempt_number: number;
          started_at_ms: number;
          completed_at_ms?: number | null;
          duration_ms?: number | null;
          response_status_code?: number | null;
          error_message?: string | null;
          error_details?: Json | null;
          shard_id_used?: string | null;
          model_used?: string | null;
          worker_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          attempt_number?: number;
          started_at_ms?: number;
          completed_at_ms?: number | null;
          duration_ms?: number | null;
          response_status_code?: number | null;
          error_message?: string | null;
          error_details?: Json | null;
          shard_id_used?: string | null;
          model_used?: string | null;
          worker_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      galx_queue_events: {
        Row: {
          id: string;
          event_id: string;
          queue_id: string;
          task_id: string | null;
          event_type: string;
          data: Json;
          timestamp_ms: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          queue_id: string;
          task_id?: string | null;
          event_type: string;
          data?: Json;
          timestamp_ms: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          queue_id?: string;
          task_id?: string | null;
          event_type?: string;
          data?: Json;
          timestamp_ms?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      galx_wallets: {
        Row: {
          id: string;
          workspace_id: string | null;
          user_id: string;
          balance_usd: number;
          payment_debt_usd: number;
          introductory_grant_usd: number;
          deposited_total_usd: number;
          promotional_match_usd: number;
          lifetime_spent_usd: number;
          auto_reload_enabled: boolean;
          auto_reload_threshold_usd: number;
          auto_reload_amount_usd: number;
          auto_reload_payment_method_id: string | null;
          proof_of_deposit_verified: boolean;
          verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id?: string | null;
          user_id: string;
          balance_usd?: number;
          introductory_grant_usd?: number;
          deposited_total_usd?: number;
          promotional_match_usd?: number;
          lifetime_spent_usd?: number;
          auto_reload_enabled?: boolean;
          auto_reload_threshold_usd?: number;
          auto_reload_amount_usd?: number;
          auto_reload_payment_method_id?: string | null;
          proof_of_deposit_verified?: boolean;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string | null;
          user_id?: string;
          balance_usd?: number;
          introductory_grant_usd?: number;
          deposited_total_usd?: number;
          promotional_match_usd?: number;
          lifetime_spent_usd?: number;
          auto_reload_enabled?: boolean;
          auto_reload_threshold_usd?: number;
          auto_reload_amount_usd?: number;
          auto_reload_payment_method_id?: string | null;
          proof_of_deposit_verified?: boolean;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      galx_wallet_transactions: {
        Row: {
          id: string;
          wallet_id: string;
          user_id: string;
          transaction_type: GalxWalletTransactionType;
          amount_usd: number;
          balance_after_usd: number;
          description: string;
          api_key_id: string | null;
          shard_id: string | null;
          model: string | null;
          prompt_tokens: number;
          completion_tokens: number;
          cached_tokens: number;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          wallet_id: string;
          user_id: string;
          transaction_type: GalxWalletTransactionType;
          amount_usd: number;
          balance_after_usd: number;
          description: string;
          api_key_id?: string | null;
          shard_id?: string | null;
          model?: string | null;
          prompt_tokens?: number;
          completion_tokens?: number;
          cached_tokens?: number;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          wallet_id?: string;
          user_id?: string;
          transaction_type?: GalxWalletTransactionType;
          amount_usd?: number;
          balance_after_usd?: number;
          description?: string;
          api_key_id?: string | null;
          shard_id?: string | null;
          model?: string | null;
          prompt_tokens?: number;
          completion_tokens?: number;
          cached_tokens?: number;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      galx_metrics_telemetry: {
        Row: {
          id: string;
          workspace_id: string | null;
          user_id: string | null;
          provider: GalxProviderType;
          model_id: string;
          shard_id: string;
          latency_ms: number;
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
          is_error: boolean;
          status_code: number;
          timestamp_ms: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id?: string | null;
          user_id?: string | null;
          provider: GalxProviderType;
          model_id: string;
          shard_id: string;
          latency_ms: number;
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
          is_error?: boolean;
          status_code?: number;
          timestamp_ms: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string | null;
          user_id?: string | null;
          provider?: GalxProviderType;
          model_id?: string;
          shard_id?: string;
          latency_ms?: number;
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
          is_error?: boolean;
          status_code?: number;
          timestamp_ms?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      galx_embeddings_store: {
        Row: {
          id: string;
          workspace_id: string | null;
          collection_name: string;
          document_id: string;
          chunk_index: number;
          content: string;
          metadata: Json;
          embedding: number[] | null;
          tsv_content?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id?: string | null;
          collection_name?: string;
          document_id: string;
          chunk_index?: number;
          content: string;
          metadata?: Json;
          embedding?: number[] | null;
          tsv_content?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string | null;
          collection_name?: string;
          document_id?: string;
          chunk_index?: number;
          content?: string;
          metadata?: Json;
          embedding?: number[] | null;
          tsv_content?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      galx_audit_logs: {
        Row: {
          id: string;
          workspace_id: string | null;
          user_id: string | null;
          shard_id: string | null;
          action: string;
          resource_type: string | null;
          resource_id: string | null;
          metadata: Json;
          ip_address: string | null;
          user_agent: string | null;
          timestamp_ms: number;
          created_at: string;
        };
        Insert: {
          id: string;
          workspace_id?: string | null;
          user_id?: string | null;
          shard_id?: string | null;
          action: string;
          resource_type?: string | null;
          resource_id?: string | null;
          metadata?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          timestamp_ms: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string | null;
          user_id?: string | null;
          shard_id?: string | null;
          action?: string;
          resource_type?: string | null;
          resource_id?: string | null;
          metadata?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          timestamp_ms?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      galx_user_sessions: {
        Row: {
          id: string;
          workspace_id: string | null;
          user_id: string;
          provider: string;
          shard_id: string | null;
          session_family_id: string | null;
          sequence_number: number;
          scopes: string[];
          sudo_elevated_until_ms: number | null;
          risk_score: number;
          token_hash: string;
          previous_token_hash: string | null;
          grace_period_until_ms: number | null;
          refresh_token_hash: string | null;
          fingerprint_hash: string | null;
          ip_address: string | null;
          user_agent: string | null;
          is_revoked: boolean;
          revoked_at: string | null;
          revoked_reason: string | null;
          issued_at_ms: number;
          expires_at_ms: number;
          last_active_at_ms: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          workspace_id?: string | null;
          user_id: string;
          provider: string;
          shard_id?: string | null;
          session_family_id?: string | null;
          sequence_number?: number;
          scopes?: string[];
          sudo_elevated_until_ms?: number | null;
          risk_score?: number;
          token_hash: string;
          previous_token_hash?: string | null;
          grace_period_until_ms?: number | null;
          refresh_token_hash?: string | null;
          fingerprint_hash?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          is_revoked?: boolean;
          revoked_at?: string | null;
          revoked_reason?: string | null;
          issued_at_ms: number;
          expires_at_ms: number;
          last_active_at_ms: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string | null;
          user_id?: string;
          provider?: string;
          shard_id?: string | null;
          session_family_id?: string | null;
          sequence_number?: number;
          scopes?: string[];
          sudo_elevated_until_ms?: number | null;
          risk_score?: number;
          token_hash?: string;
          previous_token_hash?: string | null;
          grace_period_until_ms?: number | null;
          refresh_token_hash?: string | null;
          fingerprint_hash?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          is_revoked?: boolean;
          revoked_at?: string | null;
          revoked_reason?: string | null;
          issued_at_ms?: number;
          expires_at_ms?: number;
          last_active_at_ms?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      galx_token_revocation_log: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          token_hash: string;
          revocation_reason: string;
          is_threat_event: boolean;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          token_hash: string;
          revocation_reason: string;
          is_threat_event?: boolean;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          token_hash?: string;
          revocation_reason?: string;
          is_threat_event?: boolean;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      galx_session_risk_events: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          risk_score: number;
          risk_factors: Json;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          risk_score: number;
          risk_factors?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          risk_score?: number;
          risk_factors?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      galx_oauth_identities: {
        Row: {
          id: string;
          user_id: string;
          provider: 'openai';
          provider_account_id: string;
          email: string;
          display_name: string | null;
          shard_id: string | null;
          session_family_id: string | null;
          sequence_number: number;
          refresh_token_hash: string | null;
          previous_refresh_token_hash: string | null;
          grace_period_until: string | null;
          encrypted_access_token: Json;
          encrypted_refresh_token: Json | null;
          id_token_claims: Json | null;
          scopes: string[] | null;
          expires_at: string | null;
          last_refreshed_at: string | null;
          status: 'active' | 'expired' | 'revoked' | 'needs_reauth';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          provider: 'openai';
          provider_account_id: string;
          email: string;
          display_name?: string | null;
          shard_id?: string | null;
          session_family_id?: string | null;
          sequence_number?: number;
          refresh_token_hash?: string | null;
          previous_refresh_token_hash?: string | null;
          grace_period_until?: string | null;
          encrypted_access_token: Json;
          encrypted_refresh_token?: Json | null;
          id_token_claims?: Json | null;
          scopes?: string[] | null;
          expires_at?: string | null;
          last_refreshed_at?: string | null;
          status?: 'active' | 'expired' | 'revoked' | 'needs_reauth';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: 'openai';
          provider_account_id?: string;
          email?: string;
          display_name?: string | null;
          shard_id?: string | null;
          session_family_id?: string | null;
          sequence_number?: number;
          refresh_token_hash?: string | null;
          previous_refresh_token_hash?: string | null;
          grace_period_until?: string | null;
          encrypted_access_token?: Json;
          encrypted_refresh_token?: Json | null;
          id_token_claims?: Json | null;
          scopes?: string[] | null;
          expires_at?: string | null;
          last_refreshed_at?: string | null;
          status?: 'active' | 'expired' | 'revoked' | 'needs_reauth';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      galx_oauth_requests: {
        Row: {
          id: string;
          state: string;
          code_verifier: string;
          provider: 'openai';
          redirect_uri: string;
          mode: string;
          workspace_id: string | null;
          user_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          is_consumed: boolean;
          consumed_at: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id: string;
          state: string;
          code_verifier: string;
          provider: 'openai';
          redirect_uri: string;
          mode?: string;
          workspace_id?: string | null;
          user_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          is_consumed?: boolean;
          consumed_at?: string | null;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          state?: string;
          code_verifier?: string;
          provider?: 'openai';
          redirect_uri?: string;
          mode?: string;
          workspace_id?: string | null;
          user_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          is_consumed?: boolean;
          consumed_at?: string | null;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      galx_oauth_device_codes: {
        Row: {
          id: string;
          device_code: string;
          user_code: string;
          provider: 'openai';
          status: 'pending' | 'approved' | 'denied' | 'expired';
          session_token: string | null;
          token_record: Json | null;
          user_id: string | null;
          workspace_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          polling_interval_sec: number;
          last_polled_at_ms: number | null;
          failed_attempts: number;
          max_attempts: number;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id: string;
          device_code: string;
          user_code: string;
          provider: 'openai';
          status?: 'pending' | 'approved' | 'denied' | 'expired';
          session_token?: string | null;
          token_record?: Json | null;
          user_id?: string | null;
          workspace_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          polling_interval_sec?: number;
          last_polled_at_ms?: number | null;
          failed_attempts?: number;
          max_attempts?: number;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          device_code?: string;
          user_code?: string;
          provider?: 'openai';
          status?: 'pending' | 'approved' | 'denied' | 'expired';
          session_token?: string | null;
          token_record?: Json | null;
          user_id?: string | null;
          workspace_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          polling_interval_sec?: number;
          last_polled_at_ms?: number | null;
          failed_attempts?: number;
          max_attempts?: number;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      galx_oauth_pushed_requests: {
        Row: {
          id: string;
          request_uri: string;
          provider: 'openai';
          client_id: string;
          redirect_uri: string;
          scope: string | null;
          code_challenge: string | null;
          code_challenge_method: string;
          state: string | null;
          response_type: string;
          workspace_id: string | null;
          is_consumed: boolean;
          consumed_at: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id: string;
          request_uri: string;
          provider: 'openai';
          client_id: string;
          redirect_uri: string;
          scope?: string | null;
          code_challenge?: string | null;
          code_challenge_method?: string;
          state?: string | null;
          response_type?: string;
          workspace_id?: string | null;
          is_consumed?: boolean;
          consumed_at?: string | null;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          request_uri?: string;
          provider?: 'openai';
          client_id?: string;
          redirect_uri?: string;
          scope?: string | null;
          code_challenge?: string | null;
          code_challenge_method?: string;
          state?: string | null;
          response_type?: string;
          workspace_id?: string | null;
          is_consumed?: boolean;
          consumed_at?: string | null;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      galx_oauth_dpop_proofs: {
        Row: {
          jti: string;
          access_token_hash: string | null;
          http_method: string;
          http_uri: string;
          issued_at: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          jti: string;
          access_token_hash?: string | null;
          http_method: string;
          http_uri: string;
          issued_at: string;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          jti?: string;
          access_token_hash?: string | null;
          http_method?: string;
          http_uri?: string;
          issued_at?: string;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      galx_oauth_backchannel_logouts: {
        Row: {
          id: string;
          provider: 'openai';
          sub: string;
          sid: string | null;
          jti: string | null;
          iss: string;
          events: Json;
          raw_logout_token: string;
          is_processed: boolean;
          identities_revoked: number;
          sessions_revoked: number;
          processed_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          provider: 'openai';
          sub: string;
          sid?: string | null;
          jti?: string | null;
          iss: string;
          events?: Json;
          raw_logout_token: string;
          is_processed?: boolean;
          identities_revoked?: number;
          sessions_revoked?: number;
          processed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          provider?: 'openai';
          sub?: string;
          sid?: string | null;
          jti?: string | null;
          iss?: string;
          events?: Json;
          raw_logout_token?: string;
          is_processed?: boolean;
          identities_revoked?: number;
          sessions_revoked?: number;
          processed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      galx_shard_health_probes: {
        Row: {
          id: string;
          shard_id: string;
          worker_id: string;
          latency_ms: number;
          status_code: number;
          is_success: boolean;
          error_message: string | null;
          probe_timestamp_ms: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          shard_id: string;
          worker_id: string;
          latency_ms: number;
          status_code: number;
          is_success: boolean;
          error_message?: string | null;
          probe_timestamp_ms?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          shard_id?: string;
          worker_id?: string;
          latency_ms?: number;
          status_code?: number;
          is_success?: boolean;
          error_message?: string | null;
          probe_timestamp_ms?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      galx_webhook_dispatches: {
        Row: {
          id: string;
          target_url: string;
          event_type: string;
          event_id: string;
          payload: Json;
          signature: string;
          status_code: number | null;
          is_success: boolean;
          error_message: string | null;
          dispatched_at: string;
        };
        Insert: {
          id?: string;
          target_url: string;
          event_type: string;
          event_id: string;
          payload: Json;
          signature: string;
          status_code?: number | null;
          is_success: boolean;
          error_message?: string | null;
          dispatched_at?: string;
        };
        Update: {
          id?: string;
          target_url?: string;
          event_type?: string;
          event_id?: string;
          payload?: Json;
          signature?: string;
          status_code?: number | null;
          is_success?: boolean;
          error_message?: string | null;
          dispatched_at?: string;
        };
        Relationships: [];
      };
      galx_stripe_customers: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string;
          email: string | null;
          currency: string;
          default_payment_method_id: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_customer_id: string;
          email?: string | null;
          currency?: string;
          default_payment_method_id?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_customer_id?: string;
          email?: string | null;
          currency?: string;
          default_payment_method_id?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      galx_stripe_checkout_sessions: {
        Row: {
          session_id: string;
          user_id: string;
          customer_id: string | null;
          amount_usd: number;
          match_grant_usd: number;
          total_credited_usd: number;
          status: string;
          payment_status: string;
          payment_intent_id: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          session_id: string;
          user_id: string;
          customer_id?: string | null;
          amount_usd: number;
          match_grant_usd?: number;
          total_credited_usd: number;
          status?: string;
          payment_status?: string;
          payment_intent_id?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          session_id?: string;
          user_id?: string;
          customer_id?: string | null;
          amount_usd?: number;
          match_grant_usd?: number;
          total_credited_usd?: number;
          status?: string;
          payment_status?: string;
          payment_intent_id?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      galx_stripe_invoices: {
        Row: {
          id: string;
          user_id: string;
          stripe_invoice_id: string;
          amount_due_usd: number;
          amount_paid_usd: number;
          status: string;
          hosted_invoice_url: string | null;
          invoice_pdf_url: string | null;
          period_start: string | null;
          period_end: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_invoice_id: string;
          amount_due_usd?: number;
          amount_paid_usd?: number;
          status?: string;
          hosted_invoice_url?: string | null;
          invoice_pdf_url?: string | null;
          period_start?: string | null;
          period_end?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_invoice_id?: string;
          amount_due_usd?: number;
          amount_paid_usd?: number;
          status?: string;
          hosted_invoice_url?: string | null;
          invoice_pdf_url?: string | null;
          period_start?: string | null;
          period_end?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      galx_stripe_events: {
        Row: {
          event_id: string;
          event_type: string;
          status: string;
          error_message: string | null;
          payload_hash: string;
          created_at: string;
        };
        Insert: {
          event_id: string;
          event_type: string;
          status?: string;
          error_message?: string | null;
          payload_hash: string;
          created_at?: string;
        };
        Update: {
          event_id?: string;
          event_type?: string;
          status?: string;
          error_message?: string | null;
          payload_hash?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      galx_organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          tier: string;
          seat_capacity: number;
          billing_email: string;
          default_role: string;
          jurisdiction: string;
          sso_config: Json;
          security_policy: Json;
          spend_safety_policy: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          slug: string;
          tier?: string;
          seat_capacity?: number;
          billing_email: string;
          default_role?: string;
          jurisdiction?: string;
          sso_config?: Json;
          security_policy?: Json;
          spend_safety_policy?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          tier?: string;
          seat_capacity?: number;
          billing_email?: string;
          default_role?: string;
          jurisdiction?: string;
          sso_config?: Json;
          security_policy?: Json;
          spend_safety_policy?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      galx_organization_members: {
        Row: {
          id: string;
          org_id: string;
          user_id: string | null;
          name: string;
          email: string;
          role: string;
          avatar_bg: string | null;
          assigned_keys_count: number;
          monthly_spend_usd: number;
          monthly_spend_cap_usd: number;
          throttle_mode: string;
          status: string;
          sso_enabled: boolean;
          two_factor_enabled: boolean;
          department: string;
          cost_center_code: string | null;
          last_active_at: string;
          joined_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          org_id: string;
          user_id?: string | null;
          name: string;
          email: string;
          role?: string;
          avatar_bg?: string | null;
          assigned_keys_count?: number;
          monthly_spend_usd?: number;
          monthly_spend_cap_usd?: number;
          throttle_mode?: string;
          status?: string;
          sso_enabled?: boolean;
          two_factor_enabled?: boolean;
          department?: string;
          cost_center_code?: string | null;
          last_active_at?: string;
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          user_id?: string | null;
          name?: string;
          email?: string;
          role?: string;
          avatar_bg?: string | null;
          assigned_keys_count?: number;
          monthly_spend_usd?: number;
          monthly_spend_cap_usd?: number;
          throttle_mode?: string;
          status?: string;
          sso_enabled?: boolean;
          two_factor_enabled?: boolean;
          department?: string;
          cost_center_code?: string | null;
          last_active_at?: string;
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "galx_organization_members_org_id_fkey";
            columns: ["org_id"];
            referencedRelation: "galx_organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      galx_team_cost_centers: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          code: string;
          lead_email: string;
          keys_count: number;
          monthly_budget_cap_usd: number;
          current_spend_usd: number;
          auto_throttle_mode: string;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          org_id: string;
          name: string;
          code: string;
          lead_email: string;
          keys_count?: number;
          monthly_budget_cap_usd: number;
          current_spend_usd?: number;
          auto_throttle_mode?: string;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          code?: string;
          lead_email?: string;
          keys_count?: number;
          monthly_budget_cap_usd?: number;
          current_spend_usd?: number;
          auto_throttle_mode?: string;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "galx_team_cost_centers_org_id_fkey";
            columns: ["org_id"];
            referencedRelation: "galx_organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      galx_team_invitations: {
        Row: {
          id: string;
          org_id: string;
          email: string;
          role: string;
          spend_cap_usd: number;
          invited_by_email: string;
          status: string;
          invite_token: string;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          org_id: string;
          email: string;
          role?: string;
          spend_cap_usd?: number;
          invited_by_email: string;
          status?: string;
          invite_token: string;
          expires_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          email?: string;
          role?: string;
          spend_cap_usd?: number;
          invited_by_email?: string;
          status?: string;
          invite_token?: string;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "galx_team_invitations_org_id_fkey";
            columns: ["org_id"];
            referencedRelation: "galx_organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      galx_governance_audit_events: {
        Row: {
          id: string;
          org_id: string;
          actor_name: string;
          actor_email: string;
          action: string;
          category: string;
          details: string;
          ip_address: string;
          user_agent: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id: string;
          org_id: string;
          actor_name: string;
          actor_email: string;
          action: string;
          category: string;
          details: string;
          ip_address: string;
          user_agent?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          actor_name?: string;
          actor_email?: string;
          action?: string;
          category?: string;
          details?: string;
          ip_address?: string;
          user_agent?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "galx_governance_audit_events_org_id_fkey";
            columns: ["org_id"];
            referencedRelation: "galx_organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      galx_rate_limit_quotas: {
        Row: {
          id: string;
          workspace_id: string;
          api_key_id: string | null;
          model_id: string;
          rpm_limit: number;
          tpm_limit: number;
          burst_multiplier: number;
          tokens_remaining: number;
          window_started_at_ms: number;
          last_replenished_at_ms: number;
          is_throttled: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          workspace_id: string;
          api_key_id?: string | null;
          model_id: string;
          rpm_limit?: number;
          tpm_limit?: number;
          burst_multiplier?: number;
          tokens_remaining?: number;
          window_started_at_ms: number;
          last_replenished_at_ms: number;
          is_throttled?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          api_key_id?: string | null;
          model_id?: string;
          rpm_limit?: number;
          tpm_limit?: number;
          burst_multiplier?: number;
          tokens_remaining?: number;
          window_started_at_ms?: number;
          last_replenished_at_ms?: number;
          is_throttled?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "galx_rate_limit_quotas_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "galx_workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "galx_rate_limit_quotas_api_key_id_fkey";
            columns: ["api_key_id"];
            referencedRelation: "galx_api_keys";
            referencedColumns: ["id"];
          }
        ];
      };
      galx_prompt_cache_registry: {
        Row: {
          id: string;
          workspace_id: string;
          model_id: string;
          prefix_hash_sha256: string;
          token_count: number;
          hit_count: number;
          total_dollars_saved_usd: number;
          edge_pop_locations: string[];
          ttl_seconds: number;
          expires_at: string;
          created_at: string;
          last_accessed_at: string;
        };
        Insert: {
          id: string;
          workspace_id: string;
          model_id: string;
          prefix_hash_sha256: string;
          token_count: number;
          hit_count?: number;
          total_dollars_saved_usd?: number;
          edge_pop_locations?: string[];
          ttl_seconds?: number;
          expires_at: string;
          created_at?: string;
          last_accessed_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          model_id?: string;
          prefix_hash_sha256?: string;
          token_count?: number;
          hit_count?: number;
          total_dollars_saved_usd?: number;
          edge_pop_locations?: string[];
          ttl_seconds?: number;
          expires_at?: string;
          created_at?: string;
          last_accessed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "galx_prompt_cache_registry_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "galx_workspaces";
            referencedColumns: ["id"];
          }
        ];
      };
      galx_edge_shard_metrics: {
        Row: {
          id: string;
          shard_id: string;
          edge_pop: string;
          latency_p50_ms: number;
          latency_p90_ms: number;
          latency_p99_ms: number;
          ttft_avg_ms: number;
          consecutive_errors: number;
          circuit_status: 'closed' | 'half_open' | 'tripped_open';
          last_health_ping_at_ms: number;
          created_at: string;
        };
        Insert: {
          id: string;
          shard_id: string;
          edge_pop: string;
          latency_p50_ms?: number;
          latency_p90_ms?: number;
          latency_p99_ms?: number;
          ttft_avg_ms?: number;
          consecutive_errors?: number;
          circuit_status?: 'closed' | 'half_open' | 'tripped_open';
          last_health_ping_at_ms: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          shard_id?: string;
          edge_pop?: string;
          latency_p50_ms?: number;
          latency_p90_ms?: number;
          latency_p99_ms?: number;
          ttft_avg_ms?: number;
          consecutive_errors?: number;
          circuit_status?: 'closed' | 'half_open' | 'tripped_open';
          last_health_ping_at_ms?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "galx_edge_shard_metrics_shard_id_fkey";
            columns: ["shard_id"];
            referencedRelation: "galx_shards";
            referencedColumns: ["id"];
          }
        ];
      };
      galx_compliance_records: {
        Row: {
          id: string;
          workspace_id: string;
          framework: 'SOC2_TYPE2' | 'GDPR' | 'HIPAA' | 'PCI_DSS' | 'CCPA' | 'EU_AI_ACT';
          record_type: 'ZDR_ATTESTATION' | 'DATA_ERASURE_RECEIPT' | 'DPA_EXECUTION' | 'KEY_ROTATION_PROOF' | 'ACCESS_REVIEW';
          cryptographic_digest_sha256: string;
          attestation_signature: string;
          verified_by: string;
          metadata: Json;
          issued_at: string;
          expires_at: string | null;
        };
        Insert: {
          id: string;
          workspace_id: string;
          framework: 'SOC2_TYPE2' | 'GDPR' | 'HIPAA' | 'PCI_DSS' | 'CCPA' | 'EU_AI_ACT';
          record_type: 'ZDR_ATTESTATION' | 'DATA_ERASURE_RECEIPT' | 'DPA_EXECUTION' | 'KEY_ROTATION_PROOF' | 'ACCESS_REVIEW';
          cryptographic_digest_sha256: string;
          attestation_signature: string;
          verified_by: string;
          metadata?: Json;
          issued_at?: string;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          framework?: 'SOC2_TYPE2' | 'GDPR' | 'HIPAA' | 'PCI_DSS' | 'CCPA' | 'EU_AI_ACT';
          record_type?: 'ZDR_ATTESTATION' | 'DATA_ERASURE_RECEIPT' | 'DPA_EXECUTION' | 'KEY_ROTATION_PROOF' | 'ACCESS_REVIEW';
          cryptographic_digest_sha256?: string;
          attestation_signature?: string;
          verified_by?: string;
          metadata?: Json;
          issued_at?: string;
          expires_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "galx_compliance_records_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "galx_workspaces";
            referencedColumns: ["id"];
          }
        ];
      };
      galx_project_spend_allocations: {
        Row: {
          id: string;
          project_id: string;
          environment_name: string;
          monthly_budget_cap_usd: number;
          current_spend_usd: number;
          auto_pause_on_cap: boolean;
          warning_threshold_pct: number;
          burst_headroom_pct: number;
          is_paused: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          project_id: string;
          environment_name?: string;
          monthly_budget_cap_usd?: number;
          current_spend_usd?: number;
          auto_pause_on_cap?: boolean;
          warning_threshold_pct?: number;
          burst_headroom_pct?: number;
          is_paused?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          environment_name?: string;
          monthly_budget_cap_usd?: number;
          current_spend_usd?: number;
          auto_pause_on_cap?: boolean;
          warning_threshold_pct?: number;
          burst_headroom_pct?: number;
          is_paused?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "galx_project_spend_allocations_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "galx_projects";
            referencedColumns: ["id"];
          }
        ];
      };
      galx_model_routing_rules: {
        Row: {
          id: string;
          workspace_id: string;
          rule_name: string;
          priority: number;
          primary_model: string;
          fallback_model: string;
          max_latency_threshold_ms: number;
          on_status_codes: number[];
          preserve_prompt_cache: boolean;
          is_active: boolean;
          routing_strategy: 'latency_and_health' | 'cost_optimized' | 'priority_failover' | 'round_robin';
          total_reroutes: number;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          workspace_id: string;
          rule_name: string;
          priority?: number;
          primary_model: string;
          fallback_model: string;
          max_latency_threshold_ms?: number;
          on_status_codes?: number[];
          preserve_prompt_cache?: boolean;
          is_active?: boolean;
          routing_strategy?: 'latency_and_health' | 'cost_optimized' | 'priority_failover' | 'round_robin';
          total_reroutes?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          rule_name?: string;
          priority?: number;
          primary_model?: string;
          fallback_model?: string;
          max_latency_threshold_ms?: number;
          on_status_codes?: number[];
          preserve_prompt_cache?: boolean;
          is_active?: boolean;
          routing_strategy?: 'latency_and_health' | 'cost_optimized' | 'priority_failover' | 'round_robin';
          total_reroutes?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "galx_model_routing_rules_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "galx_workspaces";
            referencedColumns: ["id"];
          }
        ];
      };
      galx_billing_notification_channels: {
        Row: {
          id: string;
          workspace_id: string;
          channel_type: 'slack' | 'discord' | 'pagerduty' | 'email_dl' | 'webhook' | 'teams';
          destination_url: string;
          channel_name: string;
          is_enabled: boolean;
          quiet_hours_start_utc: string | null;
          quiet_hours_end_utc: string | null;
          min_severity: 'info' | 'warning' | 'critical';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          workspace_id: string;
          channel_type: 'slack' | 'discord' | 'pagerduty' | 'email_dl' | 'webhook' | 'teams';
          destination_url: string;
          channel_name: string;
          is_enabled?: boolean;
          quiet_hours_start_utc?: string | null;
          quiet_hours_end_utc?: string | null;
          min_severity?: 'info' | 'warning' | 'critical';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          channel_type?: 'slack' | 'discord' | 'pagerduty' | 'email_dl' | 'webhook' | 'teams';
          destination_url?: string;
          channel_name?: string;
          is_enabled?: boolean;
          quiet_hours_start_utc?: string | null;
          quiet_hours_end_utc?: string | null;
          min_severity?: 'info' | 'warning' | 'critical';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "galx_billing_notification_channels_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "galx_workspaces";
            referencedColumns: ["id"];
          }
        ];
      };
      galx_department_cost_allocations: {
        Row: {
          id: string;
          workspace_id: string;
          cost_center_code: string;
          department_name: string;
          gl_account_code: string;
          allocated_percentage: number;
          monthly_budget_cap_usd: number;
          current_month_spend_usd: number;
          burn_velocity_daily_usd: number;
          owner_email: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          workspace_id: string;
          cost_center_code: string;
          department_name: string;
          gl_account_code?: string;
          allocated_percentage?: number;
          monthly_budget_cap_usd?: number;
          current_month_spend_usd?: number;
          burn_velocity_daily_usd?: number;
          owner_email: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          cost_center_code?: string;
          department_name?: string;
          gl_account_code?: string;
          allocated_percentage?: number;
          monthly_budget_cap_usd?: number;
          current_month_spend_usd?: number;
          burn_velocity_daily_usd?: number;
          owner_email?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "galx_department_cost_allocations_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "galx_workspaces";
            referencedColumns: ["id"];
          }
        ];
      };
      galx_slo_agreements: {
        Row: {
          id: string;
          workspace_id: string;
          tier: string;
          target_uptime_pct: number;
          target_latency_p95_ms: number;
          target_latency_p99_ms: number;
          error_budget_total_seconds: number;
          error_budget_spent_seconds: number;
          current_month_uptime_pct: number;
          sla_credit_multiplier: number;
          is_active: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          workspace_id: string;
          tier?: string;
          target_uptime_pct?: number;
          target_latency_p95_ms?: number;
          target_latency_p99_ms?: number;
          error_budget_total_seconds?: number;
          error_budget_spent_seconds?: number;
          current_month_uptime_pct?: number;
          sla_credit_multiplier?: number;
          is_active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          tier?: string;
          target_uptime_pct?: number;
          target_latency_p95_ms?: number;
          target_latency_p99_ms?: number;
          error_budget_total_seconds?: number;
          error_budget_spent_seconds?: number;
          current_month_uptime_pct?: number;
          sla_credit_multiplier?: number;
          is_active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "galx_slo_agreements_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "galx_workspaces";
            referencedColumns: ["id"];
          }
        ];
      };
      galx_synthetic_canary_probes: {
        Row: {
          id: string;
          probe_name: string;
          edge_pop: string;
          model_id: string;
          status_code: number;
          ttft_latency_ms: number;
          total_duration_ms: number;
          tls_handshake_ms: number;
          is_healthy: boolean;
          error_message: string | null;
          probed_at_ms: number;
          created_at: string;
        };
        Insert: {
          id: string;
          probe_name: string;
          edge_pop: string;
          model_id: string;
          status_code?: number;
          ttft_latency_ms: number;
          total_duration_ms: number;
          tls_handshake_ms?: number;
          is_healthy?: boolean;
          error_message?: string | null;
          probed_at_ms: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          probe_name?: string;
          edge_pop?: string;
          model_id?: string;
          status_code?: number;
          ttft_latency_ms?: number;
          total_duration_ms?: number;
          tls_handshake_ms?: number;
          is_healthy?: boolean;
          error_message?: string | null;
          probed_at_ms?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      galx_incident_outage_ledger: {
        Row: {
          id: string;
          incident_number: string;
          title: string;
          severity: 'minor' | 'major' | 'critical';
          affected_components: string[];
          affected_providers: string[];
          root_cause_summary: string;
          started_at: string;
          resolved_at: string | null;
          duration_seconds: number | null;
          automatic_sla_credits_issued_usd: number;
          postmortem_slug: string | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          incident_number: string;
          title: string;
          severity: 'minor' | 'major' | 'critical';
          affected_components?: string[];
          affected_providers?: string[];
          root_cause_summary: string;
          started_at: string;
          resolved_at?: string | null;
          duration_seconds?: number | null;
          automatic_sla_credits_issued_usd?: number;
          postmortem_slug?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          incident_number?: string;
          title?: string;
          severity?: 'minor' | 'major' | 'critical';
          affected_components?: string[];
          affected_providers?: string[];
          root_cause_summary?: string;
          started_at?: string;
          resolved_at?: string | null;
          duration_seconds?: number | null;
          automatic_sla_credits_issued_usd?: number;
          postmortem_slug?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      galx_scheduled_maintenance_windows: {
        Row: {
          id: string;
          title: string;
          description: string;
          scheduled_start: string;
          scheduled_end: string;
          expected_impact: string;
          is_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          title: string;
          description: string;
          scheduled_start: string;
          scheduled_end: string;
          expected_impact?: string;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          scheduled_start?: string;
          scheduled_end?: string;
          expected_impact?: string;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      galx_spend_governance_policies: {
        Row: {
          id: string;
          workspace_id: string;
          department: string | null;
          cost_center: string | null;
          environment: string;
          mode: 'observe' | 'recommend' | 'enforce';
          tier_cascading_enabled: boolean;
          dynamic_prefix_cache_enabled: boolean;
          circuit_breaker_max_turns: number;
          staging_spend_ceiling_daily_usd: number;
          max_output_tokens: number | null;
          max_estimated_request_cost_usd: number | null;
          require_attribution: boolean;
          minimum_evaluation_samples: number;
          maximum_quality_regression: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          workspace_id: string;
          department?: string | null;
          cost_center?: string | null;
          environment?: string;
          mode?: 'observe' | 'recommend' | 'enforce';
          tier_cascading_enabled?: boolean;
          dynamic_prefix_cache_enabled?: boolean;
          circuit_breaker_max_turns?: number;
          staging_spend_ceiling_daily_usd?: number;
          max_output_tokens?: number | null;
          max_estimated_request_cost_usd?: number | null;
          require_attribution?: boolean;
          minimum_evaluation_samples?: number;
          maximum_quality_regression?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          department?: string | null;
          cost_center?: string | null;
          environment?: string;
          mode?: 'observe' | 'recommend' | 'enforce';
          tier_cascading_enabled?: boolean;
          dynamic_prefix_cache_enabled?: boolean;
          circuit_breaker_max_turns?: number;
          staging_spend_ceiling_daily_usd?: number;
          max_output_tokens?: number | null;
          max_estimated_request_cost_usd?: number | null;
          require_attribution?: boolean;
          minimum_evaluation_samples?: number;
          maximum_quality_regression?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "galx_spend_governance_policies_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "galx_workspaces";
            referencedColumns: ["id"];
          }
        ];
      };
      galx_model_route_evidence: {
        Row: {
          id: string;
          workspace_id: string;
          requested_model: string;
          target_model: string;
          workload: string;
          status: 'draft' | 'approved' | 'revoked';
          sample_size: number;
          baseline_success_rate: number;
          candidate_success_rate: number;
          lower_bound_quality_delta: number;
          attestation_digest: string;
          evaluated_at: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id: string;
          workspace_id: string;
          requested_model: string;
          target_model: string;
          workload: string;
          status?: 'draft' | 'approved' | 'revoked';
          sample_size: number;
          baseline_success_rate: number;
          candidate_success_rate: number;
          lower_bound_quality_delta: number;
          attestation_digest: string;
          evaluated_at: string;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          requested_model?: string;
          target_model?: string;
          workload?: string;
          status?: 'draft' | 'approved' | 'revoked';
          sample_size?: number;
          baseline_success_rate?: number;
          candidate_success_rate?: number;
          lower_bound_quality_delta?: number;
          attestation_digest?: string;
          evaluated_at?: string;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "galx_model_route_evidence_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "galx_workspaces";
            referencedColumns: ["id"];
          }
        ];
      };
      galx_forensic_waste_incidents: {
        Row: {
          id: string;
          workspace_id: string;
          incident_type: 'FRONTIER_MISALLOCATION' | 'CACHE_BUSTING_PREFIX' | 'UNCAPPED_STAGING_KEY' | 'RUNAWAY_AGENT_LOOP' | 'REDUNDANT_SEMANTIC_QUERY' | 'CONTEXT_BLOAT' | 'OUTPUT_EXPLOSION';
          severity: 'low' | 'medium' | 'high' | 'critical';
          requested_model: string;
          remediation_action: string;
          estimated_waste_usd: number;
          recovered_savings_usd: number;
          department: string | null;
          cost_center: string | null;
          repository_name: string | null;
          service_name: string | null;
          fingerprint: string;
          metadata: Json;
          detected_at: string;
        };
        Insert: {
          id: string;
          workspace_id: string;
          incident_type: 'FRONTIER_MISALLOCATION' | 'CACHE_BUSTING_PREFIX' | 'UNCAPPED_STAGING_KEY' | 'RUNAWAY_AGENT_LOOP' | 'REDUNDANT_SEMANTIC_QUERY' | 'CONTEXT_BLOAT' | 'OUTPUT_EXPLOSION';
          severity?: 'low' | 'medium' | 'high' | 'critical';
          requested_model: string;
          remediation_action: string;
          estimated_waste_usd?: number;
          recovered_savings_usd?: number;
          department?: string | null;
          cost_center?: string | null;
          repository_name?: string | null;
          service_name?: string | null;
          fingerprint?: string;
          metadata?: Json;
          detected_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          incident_type?: 'FRONTIER_MISALLOCATION' | 'CACHE_BUSTING_PREFIX' | 'UNCAPPED_STAGING_KEY' | 'RUNAWAY_AGENT_LOOP' | 'REDUNDANT_SEMANTIC_QUERY' | 'CONTEXT_BLOAT' | 'OUTPUT_EXPLOSION';
          severity?: 'low' | 'medium' | 'high' | 'critical';
          requested_model?: string;
          remediation_action?: string;
          estimated_waste_usd?: number;
          recovered_savings_usd?: number;
          department?: string | null;
          cost_center?: string | null;
          repository_name?: string | null;
          service_name?: string | null;
          fingerprint?: string;
          metadata?: Json;
          detected_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "galx_forensic_waste_incidents_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "galx_workspaces";
            referencedColumns: ["id"];
          }
        ];
      };
      galx_departmental_spend_attributions: {
        Row: {
          id: string;
          workspace_id: string;
          period_date: string;
          department: string;
          cost_center: string;
          gross_retail_spend_usd: number;
          net_galx_spend_usd: number;
          total_requests: number;
          total_input_tokens: number;
          total_output_tokens: number;
          cached_input_tokens: number;
          avoided_waste_usd: number;
          cache_rebate_usd: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          workspace_id: string;
          period_date: string;
          department: string;
          cost_center: string;
          gross_retail_spend_usd?: number;
          net_galx_spend_usd?: number;
          total_requests?: number;
          total_input_tokens?: number;
          total_output_tokens?: number;
          cached_input_tokens?: number;
          avoided_waste_usd?: number;
          cache_rebate_usd?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          period_date?: string;
          department?: string;
          cost_center?: string;
          gross_retail_spend_usd?: number;
          net_galx_spend_usd?: number;
          total_requests?: number;
          total_input_tokens?: number;
          total_output_tokens?: number;
          cached_input_tokens?: number;
          avoided_waste_usd?: number;
          cache_rebate_usd?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "galx_departmental_spend_attributions_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "galx_workspaces";
            referencedColumns: ["id"];
          }
        ];
      };
      chat_conversations: {
        Row: {
          id: string;
          user_id: string | null;
          persona_id: string | null;
          title: string;
          model_id: string;
          is_pinned: boolean;
          is_archived: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id?: string | null;
          persona_id?: string | null;
          title: string;
          model_id?: string;
          is_pinned?: boolean;
          is_archived?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['chat_conversations']['Insert']>;
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          alternative_contents: Json;
          active_index: number;
          thinking_content: string | null;
          model_id: string | null;
          persona_id: string | null;
          metrics: Json | null;
          attachments: Json | null;
          created_at: string;
        };
        Insert: {
          id: string;
          conversation_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          alternative_contents?: Json;
          active_index?: number;
          thinking_content?: string | null;
          model_id?: string | null;
          persona_id?: string | null;
          metrics?: Json | null;
          attachments?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['chat_messages']['Insert']>;
        Relationships: [];
      };
      galx_chat_rolling_memory: {
        Row: {
          conversation_id: string;
          user_id: string;
          summary_content: string;
          compacted_turns_count: number;
          last_compacted_message_id: string | null;
          pinned_document_refs: Json;
          token_count: number;
          user_profile: Json;
          active_decisions: Json;
          file_index: Json;
          pending_tasks: Json;
          cache_hash: string | null;
          stable_cache_hash: string | null;
          atomic_turn_boundary: number;
          code_diff_manifest: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          conversation_id: string;
          user_id: string;
          summary_content: string;
          compacted_turns_count?: number;
          last_compacted_message_id?: string | null;
          pinned_document_refs?: Json;
          token_count?: number;
          user_profile?: Json;
          active_decisions?: Json;
          file_index?: Json;
          pending_tasks?: Json;
          cache_hash?: string | null;
          stable_cache_hash?: string | null;
          atomic_turn_boundary?: number;
          code_diff_manifest?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['galx_chat_rolling_memory']['Insert']>;
        Relationships: [];
      };
      galx_chat_document_chunks: {
        Row: {
          id: string;
          conversation_id: string;
          document_name: string;
          chunk_index: number;
          page_start: number;
          page_end: number;
          content: string;
          token_count: number;
          doc_sha256: string | null;
          search_vector: unknown;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          document_name: string;
          chunk_index?: number;
          page_start?: number;
          page_end?: number;
          content: string;
          token_count?: number;
          doc_sha256?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['galx_chat_document_chunks']['Insert']>;
        Relationships: [];
      };
      galx_chat_memory_graph_edges: {
        Row: {
          id: string;
          conversation_id: string;
          source_entity: string;
          relation_type: string;
          target_entity: string;
          turn_index: number;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          source_entity: string;
          relation_type?: string;
          target_entity: string;
          turn_index?: number;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['galx_chat_memory_graph_edges']['Insert']>;
        Relationships: [];
      };
      galx_chat_context_episodes: {
        Row: {
          id: string;
          conversation_id: string;
          episode_index: number;
          start_turn_index: number;
          end_turn_index: number;
          thematic_topic: string;
          executive_summary: string;
          key_artifacts: Json;
          resolved_decisions: Json;
          token_volume: number;
          compressed_tokens: number;
          compression_ratio: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          episode_index?: number;
          start_turn_index?: number;
          end_turn_index?: number;
          thematic_topic?: string;
          executive_summary: string;
          key_artifacts?: Json;
          resolved_decisions?: Json;
          token_volume?: number;
          compressed_tokens?: number;
          compression_ratio?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['galx_chat_context_episodes']['Insert']>;
        Relationships: [];
      };
      galx_chat_universal_workspace_anchors: {
        Row: {
          id: string;
          workspace_id: string;
          anchor_type: string;
          anchor_key: string;
          anchor_content: string;
          token_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id?: string;
          anchor_type?: string;
          anchor_key: string;
          anchor_content: string;
          token_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['galx_chat_universal_workspace_anchors']['Insert']>;
        Relationships: [];
      };
      galx_seat_rolling_usage_events: {
        Row: {
          id: string;
          user_id: string;
          org_id: string | null;
          model_id: string;
          units: number;
          tokens_consumed: number;
          cost_usd: number;
          request_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          org_id?: string | null;
          model_id: string;
          units?: number;
          tokens_consumed?: number;
          cost_usd?: number;
          request_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['galx_seat_rolling_usage_events']['Insert']>;
        Relationships: [];
      };
      galx_seat_rolling_windows_state: {
        Row: {
          user_id: string;
          org_id: string | null;
          tier: 'developer' | 'small-business' | 'enterprise' | 'apex';
          five_hour_used_units: number;
          five_hour_limit_units: number;
          five_hour_reset_at: string;
          weekly_used_units: number;
          weekly_limit_units: number;
          weekly_reset_at: string;
          active_concurrent_streams: number;
          concurrency_limit: number;
          last_event_at: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          org_id?: string | null;
          tier?: 'developer' | 'small-business' | 'enterprise' | 'apex';
          five_hour_used_units?: number;
          five_hour_limit_units?: number;
          five_hour_reset_at?: string;
          weekly_used_units?: number;
          weekly_limit_units?: number;
          weekly_reset_at?: string;
          active_concurrent_streams?: number;
          concurrency_limit?: number;
          last_event_at?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['galx_seat_rolling_windows_state']['Insert']>;
        Relationships: [];
      };
      galx_seat_request_leases: {
        Row: {
          request_id: string;
          user_id: string;
          org_id: string | null;
          model_id: string;
          tier: 'developer' | 'small-business' | 'enterprise' | 'apex';
          reserved_units: number;
          actual_units: number | null;
          is_stream: boolean;
          expires_at: string;
          settled_at: string | null;
          released_at: string | null;
          created_at: string;
        };
        Insert: {
          request_id: string;
          user_id: string;
          org_id?: string | null;
          model_id: string;
          tier: 'developer' | 'small-business' | 'enterprise' | 'apex';
          reserved_units?: number;
          actual_units?: number | null;
          is_stream?: boolean;
          expires_at: string;
          settled_at?: string | null;
          released_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['galx_seat_request_leases']['Insert']>;
        Relationships: [];
      };
      user_image_library: {
        Row: {
          id: string;
          user_id: string;
          session_id: string;
          status: 'queued' | 'generating' | 'completed' | 'failed';
          prompt: string;
          revised_prompt: string | null;
          model: string;
          aspect_ratio: string;
          dimensions: string;
          quality: string;
          public_url: string;
          r2_key: string;
          content_type: string;
          size_bytes: number;
          sha256: string;
          lqip: string | null;
          seed: string | null;
          latency_ms: number;
          cost_usd: number;
          is_favorite: boolean;
          tags: string[];
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          session_id?: string;
          status?: 'queued' | 'generating' | 'completed' | 'failed';
          prompt: string;
          revised_prompt?: string | null;
          model: string;
          aspect_ratio?: string;
          dimensions?: string;
          quality?: string;
          public_url: string;
          r2_key: string;
          content_type?: string;
          size_bytes?: number;
          sha256: string;
          lqip?: string | null;
          seed?: string | null;
          latency_ms?: number;
          cost_usd?: number;
          is_favorite?: boolean;
          tags?: string[];
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_image_library']['Insert']>;
        Relationships: [];
      };
      image_library_gc_outbox: {
        Row: {
          r2_key: string;
          user_id: string;
          asset_id: string;
          enqueued_at: string;
          attempts: number;
          last_error: string | null;
        };
        Insert: {
          r2_key: string;
          user_id: string;
          asset_id: string;
          enqueued_at?: string;
          attempts?: number;
          last_error?: string | null;
        };
        Update: Partial<Database['public']['Tables']['image_library_gc_outbox']['Insert']>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      fn_batch_upsert_image_library: {
        Args: { p_records: Json };
        Returns: number;
      };
      fn_ack_image_library_gc: {
        Args: { p_r2_keys: string[] };
        Returns: number;
      };
      fn_batch_mutate_image_library: {
        Args: {
          p_user_id: string;
          p_asset_ids: string[];
          p_action: 'favorite' | 'delete';
          p_is_favorite?: boolean;
        };
        Returns: Json;
      };
      fn_get_user_image_library_stats: {
        Args: { p_user_id: string };
        Returns: Json;
      };
      fn_query_user_image_library: {
        Args: {
          p_user_id: string;
          p_limit?: number;
          p_cursor_created_at?: string;
          p_cursor_id?: string;
          p_session_id?: string;
          p_aspect_ratio?: string;
          p_is_favorite?: boolean;
          p_search?: string;
          p_sort?: 'newest' | 'oldest';
        };
        Returns: Json;
      };
      fn_upsert_owned_chat_messages: {
        Args: { p_conversation_id: string; p_user_id: string; p_messages: Json };
        Returns: Json;
      };
      galx_sync_chat_session: {
        Args: {
          p_id: string;
          p_user_id: string;
          p_title: string;
          p_model_id: string;
          p_persona_id?: string | null;
          p_is_pinned?: boolean;
          p_is_archived?: boolean;
        };
        Returns: Json;
      };
      galx_delete_chat_conversation: {
        Args: { p_id: string; p_user_id?: string | null; p_hard_delete?: boolean };
        Returns: boolean;
      };
      fn_get_chat_composite_bootstrap: {
        Args: { p_user_id?: string | null; p_active_session_id?: string | null };
        Returns: Json;
      };
      fn_sync_chat_bundle: {
        Args: {
          p_session?: Json | null;
          p_messages?: Json | null;
          p_user_id?: string | null;
          p_delete_session_id?: string | null;
        };
        Returns: Json;
      };
      fn_get_chat_delta_sync: {
        Args: {
          p_user_id?: string | null;
          p_client_etag?: string | null;
          p_since_epoch?: number | null;
          p_active_session_id?: string | null;
        };
        Returns: Json;
      };
      fn_upsert_semantic_rolling_memory: {
        Args: {
          p_conversation_id: string;
          p_user_id: string;
          p_summary_content: string;
          p_compacted_turns_count?: number;
          p_last_compacted_message_id?: string | null;
          p_user_profile?: Json;
          p_active_decisions?: Json;
          p_file_index?: Json;
          p_pending_tasks?: Json;
          p_token_count?: number;
          p_cache_hash?: string | null;
        };
        Returns: Json;
      };
      fn_upsert_semantic_rolling_memory_v2: {
        Args: {
          p_conversation_id: string;
          p_user_id: string;
          p_summary_content: string;
          p_compacted_turns_count?: number;
          p_last_compacted_message_id?: string | null;
          p_user_profile?: Json;
          p_active_decisions?: Json;
          p_file_index?: Json;
          p_pending_tasks?: Json;
          p_token_count?: number;
          p_cache_hash?: string | null;
          p_stable_cache_hash?: string | null;
          p_atomic_turn_boundary?: number;
          p_code_diff_manifest?: Json;
        };
        Returns: Json;
      };
      fn_search_relevant_document_chunks: {
        Args: { p_conversation_id: string; p_query_text: string; p_limit?: number };
        Returns: Json;
      };
      fn_evaluate_and_acquire_seat_gate_v2: {
        Args: {
          p_user_id: string;
          p_request_id: string;
          p_requested_model?: string;
          p_org_id?: string | null;
          p_is_stream?: boolean;
          p_reserved_units?: number;
          p_lease_ttl_seconds?: number;
          p_fallback_tier?: string;
        };
        Returns: Json;
      };
      fn_settle_seat_request_lease_v2: {
        Args: {
          p_user_id: string;
          p_request_id: string;
          p_model_id: string;
          p_tokens?: number;
          p_cost_usd?: number;
          p_units?: number | null;
          p_conversation_id?: string | null;
          p_user_message?: Json | null;
          p_assistant_message?: Json | null;
        };
        Returns: Json;
      };
      fn_release_seat_request_lease_v2: {
        Args: { p_user_id: string; p_request_id: string };
        Returns: boolean;
      };
      galx_record_synthetic_canary_result: {
        Args: {
          p_probe_name: string;
          p_edge_pop: string;
          p_model_id: string;
          p_status_code: number;
          p_ttft_ms: number;
          p_total_duration_ms: number;
          p_tls_ms?: number;
          p_error_msg?: string | null;
        };
        Returns: void;
      };
      galx_calculate_slo_error_budget: {
        Args: {
          p_workspace_id: string;
          p_slo_id: string;
        };
        Returns: Json;
      };
      galx_evaluate_smart_model_route: {
        Args: {
          p_workspace_id: string;
          p_requested_model: string;
          p_observed_latency_ms: number;
        };
        Returns: Json;
      };
      galx_allocate_department_spend: {
        Args: {
          p_workspace_id: string;
          p_cost_center_code: string;
          p_spend_delta: number;
        };
        Returns: Json;
      };
      galx_record_prompt_cache_hit: {
        Args: {
          p_cache_id: string;
          p_dollars_saved: number;
          p_edge_pop: string;
        };
        Returns: void;
      };
      galx_evaluate_adaptive_rate_limit: {
        Args: {
          p_workspace_id: string;
          p_model_id: string;
          p_tokens_requested: number;
        };
        Returns: Json;
      };
      galx_record_governance_event: {
        Args: {
          p_org_id: string;
          p_actor_name: string;
          p_actor_email: string;
          p_action: string;
          p_category: string;
          p_details: string;
          p_ip_address?: string;
          p_metadata?: Json;
        };
        Returns: string;
      };
      fn_lease_queue_tasks: {
        Args: {
          p_queue_id: string;
          p_worker_id: string;
          p_max_tasks?: number;
          p_lease_duration_ms?: number;
          p_tag_filter?: string;
          p_group_id_filter?: string;
          p_now_ms?: number;
        };
        Returns: Database['public']['Tables']['galx_tasks']['Row'][];
      };
      fn_lease_queue_tasks_batch_cf: {
        Args: {
          p_queue_id: string;
          p_worker_id: string;
          p_max_tasks?: number;
          p_lease_duration_ms?: number;
          p_now_ms?: number;
        };
        Returns: Json;
      };
      fn_idempotency_begin: {
        Args: {
          p_idempotency_key: string;
          p_user_id: string;
          p_endpoint: string;
          p_request_hash: string;
          p_ttl_ms?: number;
        };
        Returns: Json;
      };
      fn_idempotency_commit: {
        Args: {
          p_idempotency_key: string;
          p_status_code: number;
          p_response_headers: Json;
          p_response_body: Json;
        };
        Returns: void;
      };
      fn_acquire_distributed_lock: {
        Args: {
          p_lock_key: string;
          p_owner_id: string;
          p_ttl_ms?: number;
          p_now_ms?: number;
        };
        Returns: Json;
      };
      fn_release_distributed_lock: {
        Args: {
          p_lock_key: string;
          p_owner_id: string;
          p_fencing_token?: number;
        };
        Returns: boolean;
      };
      fn_draw_wallet_tokens: {
        Args: {
          p_user_id: string;
          p_cost_usd: number;
          p_description: string;
          p_api_key_id?: string;
          p_shard_id?: string;
          p_model?: string;
          p_prompt_tokens?: number;
          p_completion_tokens?: number;
          p_cached_tokens?: number;
          p_metadata?: Json;
        };
        Returns: Json;
      };
      fn_verify_deposit_and_match: {
        Args: {
          p_user_id: string;
          p_deposit_amount_usd: number;
          p_payment_ref?: string;
        };
        Returns: Json;
      };
      fn_record_wallet_refund_or_adjustment: {
        Args: {
          p_user_id: string;
          p_refund_amount_usd: number;
          p_reason?: string;
          p_payment_ref?: string;
          p_reverse_bonus?: boolean;
        };
        Returns: Json;
      };
      fn_try_acquire_advisory_xact_lock: {
        Args: {
          p_lock_key: string;
        };
        Returns: Json;
      };
      fn_search_audit_logs: {
        Args: {
          p_query: string;
          p_limit?: number;
        };
        Returns: Array<{
          id: string;
          action: string;
          user_id: string;
          resource_id: string;
          metadata: Json;
          timestamp_ms: number;
          created_at: string;
          rank: number;
        }>;
      };
      fn_reserve_wallet_hold: {
        Args: {
          p_user_id: string;
          p_estimated_cost_usd: number;
          p_hold_ttl_ms?: number;
          p_metadata?: Json;
        };
        Returns: Json;
      };
      fn_commit_wallet_hold: {
        Args: {
          p_hold_id: string;
          p_actual_cost_usd: number;
          p_description?: string;
          p_model?: string;
          p_prompt_tokens?: number;
          p_completion_tokens?: number;
          p_cached_tokens?: number;
          p_metadata?: Json;
        };
        Returns: Json;
      };
      fn_release_expired_wallet_holds: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      fn_record_tamper_proof_transaction: {
        Args: {
          p_wallet_id: string;
          p_user_id: string;
          p_transaction_type: string;
          p_amount_usd: number;
          p_balance_after_usd: number;
          p_description: string;
          p_api_key_id?: string;
          p_shard_id?: string;
          p_model?: string;
          p_prompt_tokens?: number;
          p_completion_tokens?: number;
          p_cached_tokens?: number;
          p_metadata?: Json;
        };
        Returns: Json;
      };
      fn_atomic_merkle_leaf_append: {
        Args: {
          p_wallet_id: string;
          p_user_id: string;
          p_tx_type: string;
          p_amount: number;
          p_desc: string;
          p_metadata?: Json;
        };
        Returns: Json;
      };
      fn_ingest_canary_probe_and_eval_slo: {
        Args: {
          p_probe_data: Json;
        };
        Returns: Json;
      };
      fn_batch_multi_rpc_dispatch: {
        Args: {
          p_calls: Json;
        };
        Returns: Json;
      };
      fn_get_organization_full_hierarchy_state: {
        Args: {
          p_org_id: string;
        };
        Returns: Json;
      };
      fn_batch_verify_tokens: {
        Args: {
          p_token_hashes: string[];
        };
        Returns: Json;
      };
      fn_verify_merkle_chain_window: {
        Args: {
          p_wallet_id: string;
          p_limit?: number;
        };
        Returns: Json;
      };
      fn_get_workspace_composite_state: {
        Args: {
          p_workspace_id: string;
        };
        Returns: Json;
      };
      fn_bulk_verify_deposit_and_match: {
        Args: {
          p_deposits: Json;
        };
        Returns: Json;
      };
      fn_route_model_atomic_eval: {
        Args: {
          p_workspace_id?: string;
          p_requested_model: string;
          p_prompt_preview?: string;
          p_max_cost?: number;
        };
        Returns: Json;
      };
      fn_gateway_preflight_composite_mesh: {
        Args: {
          p_key_hash: string;
          p_requested_model: string;
          p_estimated_cost?: number;
          p_worker_id?: string;
        };
        Returns: Json;
      };
      fn_gateway_preflight_composite_mesh_v2: {
        Args: {
          p_key_hash: string;
          p_requested_model: string;
          p_estimated_cost?: number;
          p_worker_id?: string;
          p_request_id?: string;
          p_estimated_tokens?: number;
        };
        Returns: Json;
      };
      fn_gateway_postflight_composite_mesh: {
        Args: {
          p_user_id: string;
          p_workspace_id?: string;
          p_shard_id?: string;
          p_lease_id?: string;
          p_actual_cost: number;
          p_model: string;
          p_prompt_tokens?: number;
          p_completion_tokens?: number;
          p_cached_tokens?: number;
          p_latency_ms?: number;
          p_status_code?: number;
          p_client_ip?: string;
        };
        Returns: Json;
      };
      fn_gateway_postflight_composite_mesh_v2: {
        Args: {
          p_user_id: string;
          p_workspace_id?: string;
          p_shard_id?: string;
          p_lease_id?: string;
          p_actual_cost: number;
          p_model: string;
          p_prompt_tokens?: number;
          p_completion_tokens?: number;
          p_cached_tokens?: number;
          p_latency_ms?: number;
          p_status_code?: number;
          p_client_ip?: string;
        };
        Returns: Json;
      };
      fn_lease_wallet_credit_slice: {
        Args: {
          p_user_id: string;
          p_slice_amount_usd: number;
          p_slice_ttl_ms?: number;
        };
        Returns: Json;
      };
      fn_reconcile_wallet_credit_slice: {
        Args: {
          p_user_id: string;
          p_lease_id: string;
          p_actual_spent_usd: number;
        };
        Returns: Json;
      };
      fn_batch_probabilistic_recompute_lock: {
        Args: {
          p_keys: string[];
          p_worker_id: string;
          p_ttl_ms?: number;
        };
        Returns: Json;
      };
      fn_coalesced_wallet_batch_draw: {
        Args: {
          p_coalesced_draws: Json;
        };
        Returns: Json;
      };
      fn_bulk_unnest_draw_wallet_tokens: {
        Args: {
          p_user_ids: string[];
          p_costs: number[];
          p_descriptions: string[];
          p_models: string[];
          p_prompt_tokens: number[];
          p_completion_tokens: number[];
          p_cached_tokens: number[];
        };
        Returns: Json;
      };
      fn_bulk_touch_sessions: {
        Args: {
          p_token_hashes: string[];
          p_now_ms: number;
        };
        Returns: Json;
      };
      fn_batch_get_wallets_by_users: {
        Args: {
          p_user_ids: string[];
        };
        Returns: Json;
      };
      fn_batch_get_developer_keys_by_hashes: {
        Args: {
          p_key_hashes: string[];
        };
        Returns: Json;
      };
      fn_batch_record_telemetry: {
        Args: {
          p_samples: Json;
        };
        Returns: Json;
      };
      fn_batch_record_audit_events: {
        Args: {
          p_events: Json;
        };
        Returns: Json;
      };
      fn_get_wallet_by_user: {
        Args: {
          p_user_id: string;
        };
        Returns: Json;
      };
      fn_verify_wallet_ledger_integrity: {
        Args: {
          p_user_id?: string;
          p_wallet_id?: string;
        };
        Returns: Json;
      };
      fn_acquire_shard_lease: {
        Args: {
          p_shard_id: string;
          p_user_id: string;
          p_estimated_tokens?: number;
          p_lease_ttl_ms?: number;
          p_job_id?: string;
          p_now_ms?: number;
        };
        Returns: Json;
      };
      fn_extend_shard_lease: {
        Args: {
          p_lease_id: string;
          p_fencing_token: number;
          p_extension_ms?: number;
          p_now_ms?: number;
        };
        Returns: Json;
      };
      fn_release_shard_lease: {
        Args: {
          p_lease_id: string;
          p_actual_tokens?: number;
          p_latency_ms?: number;
          /** null settles usage without making a provider health judgment. */
          p_success?: boolean | null;
          p_now_ms?: number;
        };
        Returns: Json;
      };
      fn_cleanup_expired_leases: {
        Args: {
          p_now_ms?: number;
        };
        Returns: number;
      };
      fn_upsert_shard_registry: {
        Args: {
          p_row: Json;
        };
        Returns: Json;
      };
      fn_vector_search: {
        Args: {
          p_query_embedding: number[];
          p_workspace_id?: string;
          p_collection_name?: string;
          p_match_threshold?: number;
          p_match_count?: number;
        };
        Returns: {
          id: string;
          document_id: string;
          chunk_index: number;
          content: string;
          metadata: Json;
          similarity: number;
        }[];
      };
      fn_hybrid_vector_search: {
        Args: {
          p_query_text: string;
          p_query_embedding: number[];
          p_workspace_id?: string;
          p_collection_name?: string;
          p_alpha?: number;
          p_limit?: number;
        };
        Returns: {
          id: string;
          document_id: string;
          chunk_index: number;
          content: string;
          metadata: Json;
          vector_score: number;
          text_score: number;
          combined_score: number;
        }[];
      };
      fn_batch_draw_wallet_tokens_cf: {
        Args: {
          p_draws: Json;
        };
        Returns: Json;
      };
      fn_batch_commit_task_attempts_cf: {
        Args: {
          p_attempts: Json;
        };
        Returns: number;
      };
      fn_batch_record_telemetry_cf: {
        Args: {
          p_samples: Json;
        };
        Returns: number;
      };
      fn_check_budget_thresholds: {
        Args: {
          p_workspace_id: string;
          p_additional_spend_usd?: number;
        };
        Returns: Json;
      };
      fn_validate_api_key_access_ultra: {
        Args: {
          p_key_hash: string;
          p_model?: string;
          p_client_ip?: string;
        };
        Returns: Json;
      };
      fn_report_shard_health_cf: {
        Args: {
          p_probes: Json;
        };
        Returns: Json;
      };
      fn_create_user_session: {
        Args: {
          p_id: string;
          p_user_id: string;
          p_provider: string;
          p_shard_id?: string;
          p_token_hash: string;
          p_refresh_token_hash?: string;
          p_ip_address?: string;
          p_user_agent?: string;
          p_issued_at_ms?: number;
          p_expires_at_ms?: number;
          p_workspace_id?: string;
        };
        Returns: Json;
      };
      fn_verify_user_session: {
        Args: {
          p_token_hash: string;
          p_now_ms?: number;
        };
        Returns: Json;
      };
      fn_revoke_user_session: {
        Args: {
          p_session_id: string;
          p_reason?: string;
          p_now_ms?: number;
        };
        Returns: Json;
      };
      fn_revoke_all_user_sessions: {
        Args: {
          p_user_id: string;
          p_reason?: string;
          p_now_ms?: number;
        };
        Returns: Json;
      };
      fn_cleanup_expired_sessions: {
        Args: {
          p_now_ms?: number;
        };
        Returns: number;
      };
      fn_rotate_session_token_atomic: {
        Args: {
          p_old_token_hash: string;
          p_new_token_hash: string;
          p_new_expires_at_ms: number;
          p_new_fingerprint?: string;
          p_grace_window_ms?: number;
          p_now_ms?: number;
        };
        Returns: Json;
      };
      fn_revoke_other_user_sessions: {
        Args: {
          p_user_id: string;
          p_current_session_id: string;
          p_reason?: string;
          p_now_ms?: number;
        };
        Returns: Json;
      };
      fn_revoke_session_family: {
        Args: {
          p_family_id: string;
          p_reason?: string;
          p_now_ms?: number;
        };
        Returns: Json;
      };
      fn_elevate_session_sudo: {
        Args: {
          p_session_id: string;
          p_user_id: string;
          p_duration_ms?: number;
          p_now_ms?: number;
        };
        Returns: Json;
      };
      fn_reencrypt_vault_shard_record: {
        Args: {
          p_shard_id: string;
          p_new_encrypted_payload: Json;
          p_new_version?: string;
          p_now_ms?: number;
        };
        Returns: Json;
      };
      fn_consume_oauth_request: {
        Args: {
          p_state: string;
          p_provider?: string;
        };
        Returns: Json;
      };
      fn_approve_device_code: {
        Args: {
          p_user_code: string;
          p_session_token: string;
          p_token_record?: Json;
          p_user_id?: string;
        };
        Returns: boolean;
      };
      fn_purge_expired_oauth_states: {
        Args: Record<string, never>;
        Returns: number;
      };
      fn_record_dpop_proof: {
        Args: {
          p_jti: string;
          p_ath?: string;
          p_htm?: string;
          p_htu?: string;
          p_iat_ms?: number;
          p_exp_ms?: number;
        };
        Returns: Json;
      };
      fn_poll_device_code: {
        Args: {
          p_device_code: string;
          p_now_ms?: number;
        };
        Returns: Json;
      };
      fn_consume_pushed_request: {
        Args: {
          p_request_uri: string;
        };
        Returns: Json;
      };
      fn_rotate_oauth_identity_tokens: {
        Args: {
          p_identity_id: string;
          p_old_refresh_hash: string;
          p_new_encrypted_access: Json;
          p_new_encrypted_refresh: Json;
          p_new_refresh_hash: string;
          p_expires_at: string;
          p_grace_window_sec?: number;
        };
        Returns: Json;
      };
      fn_process_backchannel_logout: {
        Args: {
          p_id: string;
          p_provider: string;
          p_sub: string;
          p_iss: string;
          p_raw_token: string;
          p_sid?: string;
          p_jti?: string;
        };
        Returns: Json;
      };
      fn_scavenge_oauth_substrate_cron: {
        Args: Record<string, never>;
        Returns: Json;
      };
      fn_save_oauth_identity: {
        Args: {
          p_id: string;
          p_user_id: string;
          p_provider: string;
          p_provider_account_id: string;
          p_email: string;
          p_encrypted_access_token: Json;
          p_display_name?: string | null;
          p_shard_id?: string | null;
          p_session_family_id?: string | null;
          p_sequence_number?: number;
          p_refresh_token_hash?: string | null;
          p_previous_refresh_token_hash?: string | null;
          p_grace_period_until?: string | null;
          p_encrypted_refresh_token?: Json | null;
          p_id_token_claims?: Json | null;
          p_scopes?: string[] | null;
          p_expires_at?: string | null;
          p_last_refreshed_at?: string | null;
          p_status?: string;
        };
        Returns: Json;
      };
      fn_get_oauth_identity_by_id: {
        Args: {
          p_id: string;
        };
        Returns: Json;
      };
      fn_get_oauth_identities_by_user: {
        Args: {
          p_user_id: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      galx_provider_type: GalxProviderType;
      galx_auth_type: GalxAuthType;
      galx_shard_mode: GalxShardMode;
      galx_credential_status: GalxCredentialStatus;
      galx_rotation_strategy: GalxRotationStrategy;
      galx_queue_state: GalxQueueState;
      galx_task_status: GalxTaskStatus;
      galx_dispatch_target_type: GalxDispatchTargetType;
      galx_wallet_transaction_type: GalxWalletTransactionType;
      galx_workspace_role: GalxWorkspaceRole;
      galx_environment_type: GalxEnvironmentType;
      galx_idempotency_state: GalxIdempotencyState;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
