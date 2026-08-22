/**
 * GALXAI: Supabase Audit Logs & Security Compliance Repository
 * Immutable event trail for key generation, credential decryption, shard mutations, and admin events.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../client';
import type { Database } from '../types';

export interface AuditLogRecord {
  id: string;
  workspaceId: string | null;
  userId: string | null;
  shardId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, any>;
  ipAddress: string | null;
  userAgent: string | null;
  timestampMs: number;
  createdAt: string;
}

export class AuditRepository {
  private static instance: AuditRepository;
  private readonly inMemoryLogs: AuditLogRecord[] = [];

  static getInstance(): AuditRepository {
    if (!AuditRepository.instance) {
      AuditRepository.instance = new AuditRepository();
    }
    return AuditRepository.instance;
  }

  async logAudit(params: {
    action: string;
    metadata?: Record<string, any>;
    shardId?: string;
    userId?: string;
    workspaceId?: string;
    resourceType?: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    timestampMs?: number;
  }): Promise<string> {
    const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = params.timestampMs || Date.now();

    const record: AuditLogRecord = {
      id,
      workspaceId: params.workspaceId || null,
      userId: params.userId || null,
      shardId: params.shardId || null,
      action: params.action,
      resourceType: params.resourceType || null,
      resourceId: params.resourceId || null,
      metadata: params.metadata || {},
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
      timestampMs: now,
      createdAt: new Date(now).toISOString()
    };

    this.inMemoryLogs.unshift(record);
    if (this.inMemoryLogs.length > 2000) {
      this.inMemoryLogs.splice(2000);
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase.from('galx_audit_logs').insert({
          id,
          workspace_id: params.workspaceId || null,
          user_id: params.userId || null,
          shard_id: params.shardId || null,
          action: params.action,
          resource_type: params.resourceType || null,
          resource_id: params.resourceId || null,
          metadata: params.metadata || {},
          ip_address: params.ipAddress || null,
          user_agent: params.userAgent || null,
          timestamp_ms: now
        });
      } catch {
        // Fallback
      }
    }

    return id;
  }

  async getAuditLogs(params?: {
    userId?: string;
    shardId?: string;
    workspaceId?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogRecord[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        let query = supabase
          .from('galx_audit_logs')
          .select('*')
          .order('timestamp_ms', { ascending: false });

        if (params?.userId) query = query.eq('user_id', params.userId);
        if (params?.shardId) query = query.eq('shard_id', params.shardId);
        if (params?.workspaceId) query = query.eq('workspace_id', params.workspaceId);
        if (params?.action) query = query.eq('action', params.action);
        if (params?.limit) query = query.limit(params.limit);
        if (params?.offset) query = query.range(params.offset, params.offset + (params.limit || 50) - 1);

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data.map(this.mapRowToAuditLog);
        }
      } catch {
        // Fallback
      }
    }

    let filtered = this.inMemoryLogs;
    if (params?.userId) filtered = filtered.filter(l => l.userId === params.userId);
    if (params?.shardId) filtered = filtered.filter(l => l.shardId === params.shardId);
    if (params?.workspaceId) filtered = filtered.filter(l => l.workspaceId === params.workspaceId);
    if (params?.action) filtered = filtered.filter(l => l.action === params.action);

    const start = params?.offset || 0;
    const end = start + (params?.limit || 50);
    return filtered.slice(start, end);
  }

  private mapRowToAuditLog(data: Database['public']['Tables']['galx_audit_logs']['Row']): AuditLogRecord {
    return {
      id: data.id,
      workspaceId: data.workspace_id,
      userId: data.user_id,
      shardId: data.shard_id,
      action: data.action,
      resourceType: data.resource_type,
      resourceId: data.resource_id,
      metadata: (data.metadata as Record<string, any>) || {},
      ipAddress: data.ip_address,
      userAgent: data.user_agent,
      timestampMs: Number(data.timestamp_ms),
      createdAt: data.created_at
    };
  }
}
