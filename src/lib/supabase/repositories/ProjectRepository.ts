/**
 * GALXAI: Supabase Project & Environment Isolation Repository + BroccoliDB Hot Tables
 * Manages Projects and Environments (production, staging, dev) with spend budgets.
 * Backed by BroccoliDB L1 reactive tables with secondary indexing and natural query parsing.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../client';
import type { Database, GalxEnvironmentType } from '../types';
import { BroccoliDbTable } from '../../../core/broccolidb/broccolidb-table';
import { BroccoliNaturalQueryParser } from '../../../core/broccolidb/broccolidb-natural-query';

export interface ProjectRecord {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnvironmentRecord {
  id: string;
  projectId: string;
  name: string;
  environmentType: GalxEnvironmentType;
  monthlyBudgetUsd: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class ProjectRepository {
  private static instance: ProjectRepository;
  public readonly projectTable: BroccoliDbTable<ProjectRecord>;
  public readonly envTable: BroccoliDbTable<EnvironmentRecord>;

  private constructor() {
    this.projectTable = new BroccoliDbTable<ProjectRecord>('projects');
    this.projectTable.createIndex('workspaceId');
    this.projectTable.createIndex('slug');

    this.envTable = new BroccoliDbTable<EnvironmentRecord>('environments');
    this.envTable.createIndex('projectId');
    this.envTable.createIndex('environmentType');
    this.envTable.createIndex('isActive');
  }

  static getInstance(): ProjectRepository {
    if (!ProjectRepository.instance) {
      ProjectRepository.instance = new ProjectRepository();
    }
    return ProjectRepository.instance;
  }

  async createProject(params: {
    workspaceId: string;
    name: string;
    slug: string;
    description?: string;
  }): Promise<ProjectRecord> {
    const id = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record: ProjectRecord = {
      id,
      workspaceId: params.workspaceId,
      name: params.name,
      slug: params.slug,
      description: params.description || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.projectTable.put(id, record);

    // Auto-create default development and production environments
    const envProd: EnvironmentRecord = {
      id: `env_${Date.now()}_prod`,
      projectId: id,
      name: 'Production',
      environmentType: 'production',
      monthlyBudgetUsd: 500,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const envDev: EnvironmentRecord = {
      id: `env_${Date.now()}_dev`,
      projectId: id,
      name: 'Development',
      environmentType: 'development',
      monthlyBudgetUsd: 100,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.envTable.put(envProd.id, envProd);
    this.envTable.put(envDev.id, envDev);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('galx_projects')
          .insert({
            workspace_id: params.workspaceId,
            name: params.name,
            slug: params.slug,
            description: params.description || null
          })
          .select()
          .single();

        if (!error && data) {
          const mapped: ProjectRecord = {
            id: data.id,
            workspaceId: data.workspace_id,
            name: data.name,
            slug: data.slug,
            description: data.description,
            createdAt: data.created_at,
            updatedAt: data.updated_at
          };
          this.projectTable.put(mapped.id, mapped);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    return record;
  }

  async getProjects(workspaceId: string): Promise<ProjectRecord[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('galx_projects')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped: ProjectRecord[] = data.map(d => ({
            id: d.id,
            workspaceId: d.workspace_id,
            name: d.name,
            slug: d.slug,
            description: d.description,
            createdAt: d.created_at,
            updatedAt: d.updated_at
          }));
          for (const p of mapped) this.projectTable.put(p.id, p);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    return this.projectTable.query({
      where: { workspaceId: { $eq: workspaceId } }
    }) as ProjectRecord[];
  }

  async getEnvironments(projectId: string): Promise<EnvironmentRecord[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('galx_environments')
          .select('*')
          .eq('project_id', projectId);

        if (!error && data && data.length > 0) {
          const mapped: EnvironmentRecord[] = data.map(d => ({
            id: d.id,
            projectId: d.project_id,
            name: d.name,
            environmentType: d.environment_type,
            monthlyBudgetUsd: d.monthly_budget_usd ? Number(d.monthly_budget_usd) : null,
            isActive: d.is_active,
            createdAt: d.created_at,
            updatedAt: d.updated_at
          }));
          for (const e of mapped) this.envTable.put(e.id, e);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    return this.envTable.query({
      where: { projectId: { $eq: projectId } }
    }) as EnvironmentRecord[];
  }

  public queryProjectsNatural(naturalQuery: string): ProjectRecord[] {
    const parsed = BroccoliNaturalQueryParser.parse(naturalQuery, 'projects');
    return this.projectTable.query(parsed.queryOptions) as ProjectRecord[];
  }
}
