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

export type GalxProviderType = 'openai' | 'xai-grok';
export type GalxAuthType = 'api_key' | 'oauth';
export type GalxShardMode = 'pooled' | 'private';
export type GalxCredentialStatus = 'healthy' | 'cooldown' | 'exhausted' | 'dead' | 'paused' | 'revoked';
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
          created_at_ms?: number;
          updated_at_ms?: number;
          created_at?: string;
          updated_at?: string;
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
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
      fn_release_shard_lease: {
        Args: {
          p_lease_id: string;
          p_actual_tokens?: number;
          p_latency_ms?: number;
          p_success?: boolean;
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
