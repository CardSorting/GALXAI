/**
 * GALXAI: Supabase Workspace & Multi-Tenancy Repository + BroccoliDB Hot Tables
 * Governs workspace creation, spend caps, tiers, and member RBAC roles.
 * Backed by BroccoliDB L1 reactive tables with secondary indexing and natural query AST parsing.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../client';
import type { Database, GalxWorkspaceRole } from '../types';
import { BroccoliDbTable } from '../../../core/broccolidb/broccolidb-table';
import { BroccoliNaturalQueryParser } from '../../../core/broccolidb/broccolidb-natural-query';
import type { DbQueryOptions, DbAggregateQuery, DbAggregateResult } from '../../../core/broccolidb/broccolidb.contracts';

export interface WorkspaceRecord {
  id: string;
  slug: string;
  name: string;
  tier: string;
  isActive: boolean;
  monthlySpendCapUsd: number;
  currentMonthSpendUsd: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMemberRecord {
  id: string;
  workspaceId: string;
  userId: string;
  role: GalxWorkspaceRole;
  createdAt: string;
  updatedAt: string;
}

export class WorkspaceRepository {
  private static instance: WorkspaceRepository;
  public readonly workspaceTable: BroccoliDbTable<WorkspaceRecord>;
  public readonly memberTable: BroccoliDbTable<WorkspaceMemberRecord>;

  private constructor() {
    this.workspaceTable = new BroccoliDbTable<WorkspaceRecord>('workspaces');
    this.workspaceTable.createIndex('slug');
    this.workspaceTable.createIndex('tier');
    this.workspaceTable.createIndex('isActive');
    this.workspaceTable.createSortedIndex('monthlySpendCapUsd');
    this.workspaceTable.createSortedIndex('currentMonthSpendUsd');

    this.memberTable = new BroccoliDbTable<WorkspaceMemberRecord>('workspace_members');
    this.memberTable.createIndex('workspaceId');
    this.memberTable.createIndex('userId');
    this.memberTable.createIndex('role');
  }

  static getInstance(): WorkspaceRepository {
    if (!WorkspaceRepository.instance) {
      WorkspaceRepository.instance = new WorkspaceRepository();
    }
    return WorkspaceRepository.instance;
  }

  async getWorkspaceById(id: string): Promise<WorkspaceRecord | null> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('galx_workspaces')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) {
          const mapped = this.mapWorkspaceRow(data);
          this.workspaceTable.put(mapped.id, mapped);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    return this.workspaceTable.get(id) || null;
  }

  async getWorkspace(id: string): Promise<WorkspaceRecord | null> {
    return this.getWorkspaceById(id);
  }

  async getWorkspaceBySlug(slug: string): Promise<WorkspaceRecord | null> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('galx_workspaces')
          .select('*')
          .eq('slug', slug)
          .single();

        if (!error && data) {
          const mapped = this.mapWorkspaceRow(data);
          this.workspaceTable.put(mapped.id, mapped);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    const matches = this.workspaceTable.query({
      where: { slug: { $eq: slug } }
    }) as WorkspaceRecord[];

    return matches[0] || null;
  }

  async createWorkspace(params: {
    slug: string;
    name: string;
    tier?: string;
    ownerUserId: string;
    monthlySpendCapUsd?: number;
    metadata?: Record<string, any>;
  }): Promise<WorkspaceRecord> {
    const wsId = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const wsRecord: WorkspaceRecord = {
      id: wsId,
      slug: params.slug,
      name: params.name,
      tier: params.tier || 'standard',
      isActive: true,
      monthlySpendCapUsd: params.monthlySpendCapUsd || 1000.0,
      currentMonthSpendUsd: 0,
      metadata: params.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.workspaceTable.put(wsId, wsRecord);

    const member: WorkspaceMemberRecord = {
      id: `mem_${Date.now()}`,
      workspaceId: wsId,
      userId: params.ownerUserId,
      role: 'owner',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.memberTable.put(member.id, member);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data: wsData, error: wsError } = await supabase
          .from('galx_workspaces')
          .insert({
            slug: params.slug,
            name: params.name,
            tier: params.tier || 'standard',
            monthly_spend_cap_usd: params.monthlySpendCapUsd || 1000.0,
            metadata: params.metadata || {}
          })
          .select()
          .single();

        if (!wsError && wsData) {
          await supabase.from('galx_workspace_members').insert({
            workspace_id: wsData.id,
            user_id: params.ownerUserId,
            role: 'owner'
          });
          const mapped = this.mapWorkspaceRow(wsData);
          this.workspaceTable.put(mapped.id, mapped);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    return wsRecord;
  }

  async updateSpendCap(workspaceId: string, monthlySpendCapUsd: number): Promise<void> {
    const ws = this.workspaceTable.get(workspaceId);
    if (ws) {
      this.workspaceTable.put(workspaceId, {
        ...ws,
        monthlySpendCapUsd,
        updatedAt: new Date().toISOString()
      });
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase
          .from('galx_workspaces')
          .update({ monthly_spend_cap_usd: monthlySpendCapUsd })
          .eq('id', workspaceId);
      } catch {
        // Fallback
      }
    }
  }

  async getMembers(workspaceId: string): Promise<WorkspaceMemberRecord[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('galx_workspace_members')
          .select('*')
          .eq('workspace_id', workspaceId);

        if (!error && data && data.length > 0) {
          const members: WorkspaceMemberRecord[] = data.map(d => ({
            id: d.id,
            workspaceId: d.workspace_id,
            userId: d.user_id,
            role: d.role,
            createdAt: d.created_at,
            updatedAt: d.updated_at
          }));
          for (const m of members) this.memberTable.put(m.id, m);
          return members;
        }
      } catch {
        // Fallback
      }
    }

    return this.memberTable.query({
      where: { workspaceId: { $eq: workspaceId } }
    }) as WorkspaceMemberRecord[];
  }

  public queryNatural(naturalQuery: string): WorkspaceRecord[] {
    const parsed = BroccoliNaturalQueryParser.parse(naturalQuery, 'workspaces');
    return this.workspaceTable.query(parsed.queryOptions) as WorkspaceRecord[];
  }

  public aggregate(query: DbAggregateQuery): DbAggregateResult {
    return this.workspaceTable.aggregate(query);
  }

  private mapWorkspaceRow(data: Database['public']['Tables']['galx_workspaces']['Row']): WorkspaceRecord {
    return {
      id: data.id,
      slug: data.slug,
      name: data.name,
      tier: data.tier,
      isActive: data.is_active,
      monthlySpendCapUsd: Number(data.monthly_spend_cap_usd),
      currentMonthSpendUsd: Number(data.current_month_spend_usd),
      metadata: (data.metadata as Record<string, any>) || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}
