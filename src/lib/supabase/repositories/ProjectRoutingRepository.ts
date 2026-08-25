/**
 * GALXAI: Supabase Project Spend Allocations, Smart Model Routing, & Notification Channels Repository
 * Backed by Supabase PostgreSQL tables and atomic stored procedures.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../client';
import type { Database } from '../types';

export interface ProjectSpendAllocationRecord {
  id: string;
  projectId: string;
  environmentName: string;
  monthlyBudgetCapUsd: number;
  currentSpendUsd: number;
  autoPauseOnCap: boolean;
  warningThresholdPct: number;
  burstHeadroomPct: number;
  isPaused: boolean;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ModelRoutingRuleRecord {
  id: string;
  workspaceId: string;
  ruleName: string;
  priority: number;
  primaryModel: string;
  fallbackModel: string;
  maxLatencyThresholdMs: number;
  onStatusCodes: number[];
  preservePromptCache: boolean;
  isActive: boolean;
  routingStrategy: 'latency_and_health' | 'cost_optimized' | 'priority_failover' | 'round_robin';
  totalReroutes: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface BillingNotificationChannelRecord {
  id: string;
  workspaceId: string;
  channelType: 'slack' | 'discord' | 'pagerduty' | 'email_dl' | 'webhook' | 'teams';
  destinationUrl: string;
  channelName: string;
  isEnabled: boolean;
  quietHoursStartUtc?: string | null;
  quietHoursEndUtc?: string | null;
  minSeverity: 'info' | 'warning' | 'critical';
  createdAt: string;
  updatedAt: string;
}

export class ProjectRoutingRepository {
  private static instance: ProjectRoutingRepository;

  private constructor() {}

  static getInstance(): ProjectRoutingRepository {
    if (!ProjectRoutingRepository.instance) {
      ProjectRoutingRepository.instance = new ProjectRoutingRepository();
    }
    return ProjectRoutingRepository.instance;
  }

  /**
   * Evaluates smart model routing based on real-time latency and health.
   */
  async evaluateSmartRoute(params: {
    workspaceId: string;
    requestedModel: string;
    observedLatencyMs: number;
  }): Promise<{
    effectiveModel: string;
    requestedModel: string;
    isRerouted: boolean;
    reason: string;
    preservePromptCache: boolean;
  }> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('galx_evaluate_smart_model_route', {
          p_workspace_id: params.workspaceId,
          p_requested_model: params.requestedModel,
          p_observed_latency_ms: params.observedLatencyMs
        });

        if (!error && data) {
          const res = data as any;
          return {
            effectiveModel: res.effective_model || params.requestedModel,
            requestedModel: params.requestedModel,
            isRerouted: Boolean(res.is_rerouted),
            reason: res.reason || 'PRIMARY_EXECUTION',
            preservePromptCache: Boolean(res.preserve_prompt_cache ?? true)
          };
        }
      } catch {
        // Fallback
      }
    }

    return {
      effectiveModel: params.requestedModel,
      requestedModel: params.requestedModel,
      isRerouted: false,
      reason: 'PRIMARY_EXECUTION',
      preservePromptCache: true
    };
  }

  /**
   * Creates or updates a declarative model routing rule.
   */
  async saveRoutingRule(rule: {
    id?: string;
    workspaceId: string;
    ruleName: string;
    priority?: number;
    primaryModel: string;
    fallbackModel: string;
    maxLatencyThresholdMs?: number;
    onStatusCodes?: number[];
    preservePromptCache?: boolean;
    isActive?: boolean;
    routingStrategy?: 'latency_and_health' | 'cost_optimized' | 'priority_failover' | 'round_robin';
  }): Promise<ModelRoutingRuleRecord> {
    const id = rule.id || `rule_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record: ModelRoutingRuleRecord = {
      id,
      workspaceId: rule.workspaceId,
      ruleName: rule.ruleName,
      priority: rule.priority ?? 10,
      primaryModel: rule.primaryModel,
      fallbackModel: rule.fallbackModel,
      maxLatencyThresholdMs: rule.maxLatencyThresholdMs ?? 35.0,
      onStatusCodes: rule.onStatusCodes || [429, 500, 502, 503, 504],
      preservePromptCache: rule.preservePromptCache ?? true,
      isActive: rule.isActive ?? true,
      routingStrategy: rule.routingStrategy || 'latency_and_health',
      totalReroutes: 0,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase.from('galx_model_routing_rules').upsert({
          id,
          workspace_id: rule.workspaceId,
          rule_name: rule.ruleName,
          priority: record.priority,
          primary_model: rule.primaryModel,
          fallback_model: rule.fallbackModel,
          max_latency_threshold_ms: record.maxLatencyThresholdMs,
          on_status_codes: record.onStatusCodes,
          preserve_prompt_cache: record.preservePromptCache,
          is_active: record.isActive,
          routing_strategy: record.routingStrategy,
          metadata: record.metadata
        });
      } catch {
        // Fallback
      }
    }

    return record;
  }

  /**
   * Configures a multi-channel billing alert destination.
   */
  async registerNotificationChannel(channel: {
    id?: string;
    workspaceId: string;
    channelType: 'slack' | 'discord' | 'pagerduty' | 'email_dl' | 'webhook' | 'teams';
    destinationUrl: string;
    channelName: string;
    minSeverity?: 'info' | 'warning' | 'critical';
  }): Promise<BillingNotificationChannelRecord> {
    const id = channel.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record: BillingNotificationChannelRecord = {
      id,
      workspaceId: channel.workspaceId,
      channelType: channel.channelType,
      destinationUrl: channel.destinationUrl,
      channelName: channel.channelName,
      isEnabled: true,
      minSeverity: channel.minSeverity || 'warning',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase.from('galx_billing_notification_channels').upsert({
          id,
          workspace_id: channel.workspaceId,
          channel_type: channel.channelType,
          destination_url: channel.destinationUrl,
          channel_name: channel.channelName,
          is_enabled: true,
          min_severity: record.minSeverity
        });
      } catch {
        // Fallback
      }
    }

    return record;
  }
}
