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
}
