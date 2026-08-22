/**
 * GALXAI: Supabase Project & Environment Isolation Repository
 * Manages Projects and Environments (production, staging, dev) with spend budgets.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../client';
import type { Database, GalxEnvironmentType } from '../types';

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
  private readonly inMemoryProjects = new Map<string, ProjectRecord>();
  private readonly inMemoryEnvironments = new Map<string, EnvironmentRecord[]>();

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
    this.inMemoryProjects.set(id, record);

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
    this.inMemoryEnvironments.set(id, [envProd, envDev]);

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
          this.inMemoryProjects.set(mapped.id, mapped);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    return record;
  }

  async getProjectsByWorkspace(workspaceId: string): Promise<ProjectRecord[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('galx_projects')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map(d => ({
            id: d.id,
            workspaceId: d.workspace_id,
            name: d.name,
            slug: d.slug,
            description: d.description,
            createdAt: d.created_at,
            updatedAt: d.updated_at
          }));
        }
      } catch {
        // Fallback
      }
    }

    return Array.from(this.inMemoryProjects.values()).filter(p => p.workspaceId === workspaceId);
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
          return data.map(d => ({
            id: d.id,
            projectId: d.project_id,
            name: d.name,
            environmentType: d.environment_type as GalxEnvironmentType,
            monthlyBudgetUsd: d.monthly_budget_usd ? Number(d.monthly_budget_usd) : null,
            isActive: d.is_active,
            createdAt: d.created_at,
            updatedAt: d.updated_at
          }));
        }
      } catch {
        // Fallback
      }
    }

    return this.inMemoryEnvironments.get(projectId) || [];
  }
}
