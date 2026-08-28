/**
 * GALXAI Spend Governance & Forensic Remediation Repository
 * 
 * Provides type-safe access to enterprise spend policies, quality route evidence,
 * forensic waste incidents, and departmental cost attribution.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types';

export type SpendPolicyRow = Database['public']['Tables']['galx_spend_governance_policies']['Row'];
export type ModelRouteEvidenceRow = Database['public']['Tables']['galx_model_route_evidence']['Row'];
export type WasteIncidentRow = Database['public']['Tables']['galx_forensic_waste_incidents']['Row'];
export type DepartmentalSpendRow = Database['public']['Tables']['galx_departmental_spend_attributions']['Row'];

export class SpendGovernanceRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Retrieves active spend governance policy for a workspace & environment
   */
  async getSpendPolicy(
    workspaceId: string,
    environment = 'production',
    department?: string
  ): Promise<SpendPolicyRow | null> {
    let query = this.supabase
      .from('galx_spend_governance_policies')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('environment', environment);

    if (department) {
      query = query.eq('department', department);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
  }

  /**
   * Upserts spend governance policy
   */
  async upsertSpendPolicy(
    policy: Database['public']['Tables']['galx_spend_governance_policies']['Insert']
  ): Promise<SpendPolicyRow> {
    const { data, error } = await this.supabase
      .from('galx_spend_governance_policies')
      .upsert(policy)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Stores an approved statistical model route evidence record
   */
  async saveRouteEvidence(
    evidence: Database['public']['Tables']['galx_model_route_evidence']['Insert']
  ): Promise<ModelRouteEvidenceRow> {
    const { data, error } = await this.supabase
      .from('galx_model_route_evidence')
      .upsert(evidence)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Fetches approved route evidence records for a workspace
   */
  async getApprovedRoutes(workspaceId: string): Promise<ModelRouteEvidenceRow[]> {
    const { data, error } = await this.supabase
      .from('galx_model_route_evidence')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'approved')
      .gt('expires_at', new Date().toISOString());

    if (error) throw error;
    return data || [];
  }

  /**
   * Logs a detected forensic waste incident
   */
  async recordWasteIncident(
    incident: Database['public']['Tables']['galx_forensic_waste_incidents']['Insert']
  ): Promise<WasteIncidentRow> {
    const { data, error } = await this.supabase
      .from('galx_forensic_waste_incidents')
      .insert(incident)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Retrieves recent forensic waste incidents for audit dashboard
   */
  async getRecentWasteIncidents(workspaceId: string, limit = 50): Promise<WasteIncidentRow[]> {
    const { data, error } = await this.supabase
      .from('galx_forensic_waste_incidents')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('detected_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Retrieves departmental cost attribution breakdown for a date range
   */
  async getDepartmentalSpend(
    workspaceId: string,
    startDate: string,
    endDate: string
  ): Promise<DepartmentalSpendRow[]> {
    const { data, error } = await this.supabase
      .from('galx_departmental_spend_attributions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .gte('period_date', startDate)
      .lte('period_date', endDate)
      .order('period_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}
