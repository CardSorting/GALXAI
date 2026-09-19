/**
-- ============================================================================
-- GALXAI: Supabase PostgreSQL Team Governance & Seats Repository
-- Governs Organizations, Seat Rosters, GL Cost Centers, Invites & Audit Events.
-- ============================================================================
*/

import { getSupabaseAdmin, isSupabaseConfigured } from '../client';
import type { Database } from '../types';
import {
  WorkspaceOrganization,
  TeamMember,
  TeamCostCenter,
  TeamInvite,
  GovernanceAuditEvent
} from '../../data/organizationData';

export class TeamGovernanceRepository {
  private static instance: TeamGovernanceRepository;

  private constructor() {}

  static getInstance(): TeamGovernanceRepository {
    if (!TeamGovernanceRepository.instance) {
      TeamGovernanceRepository.instance = new TeamGovernanceRepository();
    }
    return TeamGovernanceRepository.instance;
  }

  // Organizations
  async getOrganization(orgId: string): Promise<Database['public']['Tables']['galx_organizations']['Row'] | null> {
    if (!isSupabaseConfigured()) return null;
    const client = getSupabaseAdmin();
    const { data, error } = await client
      .from('galx_organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (error || !data) return null;
    return data;
  }

  async getOrganizationBySlug(slug: string): Promise<Database['public']['Tables']['galx_organizations']['Row'] | null> {
    if (!isSupabaseConfigured()) return null;
    const client = getSupabaseAdmin();
    const { data, error } = await client
      .from('galx_organizations')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) return null;
    return data;
  }

  // Members & Seats
  async listMembers(orgId: string): Promise<Database['public']['Tables']['galx_organization_members']['Row'][]> {
    if (!isSupabaseConfigured()) return [];
    const client = getSupabaseAdmin();
    const { data, error } = await client
      .from('galx_organization_members')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data;
  }

  async updateMemberRole(memberId: string, role: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return true;
    const client = getSupabaseAdmin();
    const { error } = await client
      .from('galx_organization_members')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', memberId);

    return !error;
  }

  async updateMemberSpendCap(memberId: string, capUsd: number, mode?: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return true;
    const client = getSupabaseAdmin();
    const payload: any = {
      monthly_spend_cap_usd: capUsd,
      updated_at: new Date().toISOString()
    };
    if (mode) payload.throttle_mode = mode;

    const { error } = await client
      .from('galx_organization_members')
      .update(payload)
      .eq('id', memberId);

    return !error;
  }

  /**
   * Atomically increments a member's monthly spend USD in real-time.
   */
  async incrementMemberSpend(userIdOrMemberId: string, deltaUsd: number): Promise<boolean> {
    if (!isSupabaseConfigured() || deltaUsd <= 0) return true;
    try {
      const client = getSupabaseAdmin();
      const { data: member } = await (client.from as any)('galx_organization_members')
        .select('id, monthly_spend_usd')
        .or(`id.eq.${userIdOrMemberId},user_id.eq.${userIdOrMemberId}`)
        .maybeSingle();

      if (member) {
        const newSpend = (Number(member.monthly_spend_usd) || 0) + deltaUsd;
        await (client.from as any)('galx_organization_members')
          .update({ monthly_spend_usd: newSpend, updated_at: new Date().toISOString() })
          .eq('id', member.id);
        return true;
      }
    } catch {}
    return false;
  }

  // Cost Centers
  async listCostCenters(orgId: string): Promise<Database['public']['Tables']['galx_team_cost_centers']['Row'][]> {
    if (!isSupabaseConfigured()) return [];
    const client = getSupabaseAdmin();
    const { data, error } = await client
      .from('galx_team_cost_centers')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data;
  }

  // Invitations
  async listInvitations(orgId: string): Promise<Database['public']['Tables']['galx_team_invitations']['Row'][]> {
    if (!isSupabaseConfigured()) return [];
    const client = getSupabaseAdmin();
    const { data, error } = await client
      .from('galx_team_invitations')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data;
  }

  // Audit Events
  async recordAuditEvent(event: {
    orgId: string;
    actorName: string;
    actorEmail: string;
    action: string;
    category: string;
    details: string;
    ipAddress?: string;
    metadata?: any;
  }): Promise<string | null> {
    if (!isSupabaseConfigured()) return null;
    const client = getSupabaseAdmin();
    const { data, error } = await client.rpc('galx_record_governance_event', {
      p_org_id: event.orgId,
      p_actor_name: event.actorName,
      p_actor_email: event.actorEmail,
      p_action: event.action,
      p_category: event.category,
      p_details: event.details,
      p_ip_address: event.ipAddress || '127.0.0.1',
      p_metadata: event.metadata || {}
    });

    if (error || !data) return null;
    return data as string;
  }

  // Dual Rolling Window & Concurrency Mesh
  async recordSeatRollingUsage(params: {
    userId: string;
    modelId: string;
    units?: number;
    tokens?: number;
    costUsd?: number;
    requestId?: string;
    tier?: string;
    orgId?: string;
  }): Promise<any> {
    if (!isSupabaseConfigured() || !params.userId) return null;
    const client = getSupabaseAdmin();
    const { data, error } = await (client as any).rpc('fn_record_seat_rolling_usage', {
      p_user_id: params.userId,
      p_model_id: params.modelId,
      p_units: params.units ?? 1.0,
      p_tokens: params.tokens ?? 0,
      p_cost_usd: params.costUsd ?? 0.0,
      p_request_id: params.requestId || null,
      p_tier: params.tier || 'developer',
      p_org_id: params.orgId || null
    });

    if (error || !data) return null;
    return data;
  }

  /**
   * Enqueue one completed message for future Stripe meter delivery. The
   * database function owns the unique key so retries cannot double-count.
   */
  async enqueueMessageBillingEvent(params: {
    userId: string;
    modelId: string;
    requestId: string;
    contractVersion?: string;
  }): Promise<any> {
    if (!isSupabaseConfigured() || !params.userId || !params.requestId) return null;
    const client = getSupabaseAdmin();
    const { data, error } = await (client as any).rpc('fn_enqueue_message_billing_event', {
      p_user_id: params.userId,
      p_model_id: params.modelId,
      p_request_id: params.requestId,
      p_contract_version: params.contractVersion || 'nova-message-v1',
    });

    if (error || !data) return null;
    return data;
  }

  async reserveNovaMessage(params: { userId: string; requestId: string; unitAmountMicros?: number; capMicros?: number }): Promise<{ allowed: boolean; code?: string; [key: string]: unknown } | null> {
    if (!isSupabaseConfigured() || !params.userId || !params.requestId) return { allowed: true, degraded: true };
    const client = getSupabaseAdmin();
    const { data, error } = await (client as any).rpc('fn_reserve_nova_message', {
      p_user_id: params.userId,
      p_request_id: params.requestId,
      p_unit_amount_micros: params.unitAmountMicros ?? 20_000,
      p_cap_micros: params.capMicros ?? 25_000_000,
    });
    if (error || !data) return null;
    return data as { allowed: boolean; code?: string; [key: string]: unknown };
  }

  async commitNovaMessage(params: { userId: string; requestId: string }): Promise<any> {
    if (!isSupabaseConfigured() || !params.userId || !params.requestId) return null;
    const client = getSupabaseAdmin();
    const { data, error } = await (client as any).rpc('fn_commit_nova_message', {
      p_user_id: params.userId,
      p_request_id: params.requestId,
    });
    return error ? null : data;
  }

  async releaseNovaMessage(params: { userId: string; requestId: string }): Promise<any> {
    if (!isSupabaseConfigured() || !params.userId || !params.requestId) return null;
    const client = getSupabaseAdmin();
    const { data, error } = await (client as any).rpc('fn_release_nova_message', {
      p_user_id: params.userId,
      p_request_id: params.requestId,
    });
    return error ? null : data;
  }

  async getNovaMessageUsageSummary(userId: string): Promise<Record<string, unknown> | null> {
    if (!isSupabaseConfigured() || !userId) return null;
    const client = getSupabaseAdmin();
    const { data, error } = await (client as any).rpc('fn_get_nova_message_usage_summary', {
      p_user_id: userId,
    });
    if (error || !data || typeof data !== 'object') return null;
    return data as Record<string, unknown>;
  }

  async getSeatRollingTelemetry(userId: string, tier: string = 'developer'): Promise<any> {
    if (!isSupabaseConfigured() || !userId) return null;
    const client = getSupabaseAdmin();
    const { data, error } = await (client as any).rpc('fn_get_seat_rolling_telemetry', {
      p_user_id: userId,
      p_tier: tier
    });

    if (error || !data) return null;
    return data;
  }

  async acquireSeatConcurrencySlot(userId: string, limit: number = 20): Promise<boolean> {
    if (!isSupabaseConfigured() || !userId) return true;
    const client = getSupabaseAdmin();
    const { data, error } = await (client as any).rpc('fn_acquire_seat_concurrency_slot', {
      p_user_id: userId,
      p_limit: limit
    });

    if (error) return true;
    return data === true;
  }

  async releaseSeatConcurrencySlot(userId: string): Promise<void> {
    if (!isSupabaseConfigured() || !userId) return;
    const client = getSupabaseAdmin();
    try {
      await (client as any).rpc('fn_release_seat_concurrency_slot', {
        p_user_id: userId
      });
    } catch {}
  }

  // 1-Hop Zero-Roundtrip Pre-Inference Gate
  async evaluateAndAcquireSeatGate(params: {
    userId: string;
    requestedModel: string;
    orgId?: string;
    isStream?: boolean;
  }): Promise<any> {
    if (!isSupabaseConfigured() || !params.userId) return null;
    const client = getSupabaseAdmin();
    const { data, error } = await (client as any).rpc('fn_evaluate_and_acquire_seat_gate', {
      p_user_id: params.userId,
      p_requested_model: params.requestedModel,
      p_org_id: params.orgId || null,
      p_is_stream: params.isStream !== false
    });

    if (error || !data) return null;
    return data;
  }

  // 1-Hop Zero-Roundtrip Post-Inference Stream Tap Settlement
  async settleSeatStreamCompletionComposite(params: {
    userId: string;
    modelId: string;
    tokens?: number;
    costUsd?: number;
    units?: number;
    requestId?: string;
    conversationId?: string;
    userMessage?: any;
    assistantMessage?: any;
    isStream?: boolean;
  }): Promise<any> {
    if (!isSupabaseConfigured() || !params.userId) return null;
    const client = getSupabaseAdmin();
    const { data, error } = await (client as any).rpc('fn_settle_seat_stream_completion_composite', {
      p_user_id: params.userId,
      p_model_id: params.modelId,
      p_tokens: params.tokens ?? 0,
      p_cost_usd: params.costUsd ?? 0.0,
      p_units: params.units ?? 1.0,
      p_request_id: params.requestId || null,
      p_conversation_id: params.conversationId || null,
      p_user_message: params.userMessage || null,
      p_assistant_message: params.assistantMessage || null,
      p_is_stream: params.isStream !== false
    });

    if (error || !data) return null;
    return data;
  }

  async evaluateAndAcquireSeatGateV2(params: {
    userId: string;
    requestId: string;
    requestedModel: string;
    orgId?: string;
    isStream: boolean;
    reservedUnits: number;
    leaseTtlSeconds?: number;
    fallbackTier?: string;
  }): Promise<any | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const client = getSupabaseAdmin();
      const { data, error } = await (client as any).rpc('fn_evaluate_and_acquire_seat_gate_v2', {
        p_user_id: params.userId,
        p_request_id: params.requestId,
        p_requested_model: params.requestedModel,
        p_org_id: params.orgId || null,
        p_is_stream: params.isStream,
        p_reserved_units: params.reservedUnits,
        p_lease_ttl_seconds: params.leaseTtlSeconds ?? 180,
        p_fallback_tier: params.fallbackTier || 'developer',
      });
      if (error) {
        console.warn('[TeamGovernanceRepository] fn_evaluate_and_acquire_seat_gate_v2 RPC notice:', error.message);
        return null;
      }
      if (!data || typeof data.allowed !== 'boolean') {
        return null;
      }
      return data;
    } catch (err: any) {
      console.warn('[TeamGovernanceRepository] Remote seat gate evaluation fallback:', err?.message || err);
      return null;
    }
  }

  async settleSeatRequestLeaseV2(params: {
    userId: string;
    requestId: string;
    modelId: string;
    tokens?: number;
    costUsd?: number;
    units?: number;
    conversationId?: string;
    userMessage?: any;
    assistantMessage?: any;
  }): Promise<any | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const client = getSupabaseAdmin();
      const { data, error } = await (client as any).rpc('fn_settle_seat_request_lease_v2', {
        p_user_id: params.userId,
        p_request_id: params.requestId,
        p_model_id: params.modelId,
        p_tokens: Math.max(0, Math.trunc(params.tokens || 0)),
        p_cost_usd: Math.max(0, params.costUsd || 0),
        p_units: params.units ?? null,
        p_conversation_id: params.conversationId || null,
        p_user_message: params.userMessage || null,
        p_assistant_message: params.assistantMessage || null,
      });
      if (error) {
        console.warn('[TeamGovernanceRepository] fn_settle_seat_request_lease_v2 RPC notice:', error.message);
        return null;
      }
      return data;
    } catch (err: any) {
      console.warn('[TeamGovernanceRepository] Remote lease settlement fallback:', err?.message || err);
      return null;
    }
  }

  async releaseSeatRequestLeaseV2(userId: string, requestId: string): Promise<boolean | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const client = getSupabaseAdmin();
      const { data, error } = await (client as any).rpc('fn_release_seat_request_lease_v2', {
        p_user_id: userId,
        p_request_id: requestId,
      });
      if (error) {
        console.warn('[TeamGovernanceRepository] fn_release_seat_request_lease_v2 RPC notice:', error.message);
        return false;
      }
      return data === true;
    } catch (err: any) {
      console.warn('[TeamGovernanceRepository] Remote lease release fallback:', err?.message || err);
      return false;
    }
  }
}
