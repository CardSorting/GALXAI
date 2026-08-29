/**
 * GALXAI: Supabase Multi-Tenant Budget & Alert Policy Repository + BroccoliDB Hot Table
 * Tracks workspace spend limits, triggers webhook notifications on threshold crossing (50%/80%/100%),
 * and enforces soft/hard budget caps.
 * Backed by BroccoliDB L1 reactive table with secondary indexing and natural query parsing.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../client';
import type { Database } from '../types';
import { BroccoliDbTable } from '../../../core/broccolidb/broccolidb-table';
import { BroccoliNaturalQueryParser } from '../../../core/broccolidb/broccolidb-natural-query';

export interface BudgetAlertRecord {
  id: string;
  workspaceId: string;
  environmentId?: string | null;
  thresholdPercentage: number;
  notificationWebhookUrl: string;
  isTriggered: boolean;
  triggeredAt?: string | null;
  createdAt: string;
}

export class BudgetRepository {
  private static instance: BudgetRepository;
  public readonly alertTable: BroccoliDbTable<BudgetAlertRecord>;

  private constructor() {
    this.alertTable = new BroccoliDbTable<BudgetAlertRecord>('budget_alerts');
    this.alertTable.createIndex('workspaceId');
    this.alertTable.createIndex('isTriggered');
    this.alertTable.createSortedIndex('thresholdPercentage');
  }

  static getInstance(): BudgetRepository {
    if (!BudgetRepository.instance) {
      BudgetRepository.instance = new BudgetRepository();
    }
    return BudgetRepository.instance;
  }

  async createBudgetAlert(params: {
    workspaceId: string;
    thresholdPercentage: number;
    notificationWebhookUrl: string;
    environmentId?: string;
  }): Promise<BudgetAlertRecord> {
    const id = `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record: BudgetAlertRecord = {
      id,
      workspaceId: params.workspaceId,
      environmentId: params.environmentId || null,
      thresholdPercentage: params.thresholdPercentage,
      notificationWebhookUrl: params.notificationWebhookUrl,
      isTriggered: false,
      triggeredAt: null,
      createdAt: new Date().toISOString()
    };

    this.alertTable.put(id, record);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data: rpcData, error: rpcErr } = await supabase.rpc('fn_create_budget_alert' as any, {
          p_workspace_id: params.workspaceId,
          p_threshold_percentage: params.thresholdPercentage,
          p_notification_webhook_url: params.notificationWebhookUrl,
          p_environment_id: params.environmentId || null
        });

        if (!rpcErr && rpcData && (rpcData as any).success && (rpcData as any).alert) {
          const row = (rpcData as any).alert;
          const mapped: BudgetAlertRecord = {
            id: row.id,
            workspaceId: row.workspace_id,
            environmentId: row.environment_id,
            thresholdPercentage: row.threshold_percentage,
            notificationWebhookUrl: row.notification_webhook_url,
            isTriggered: row.is_triggered,
            triggeredAt: row.triggered_at,
            createdAt: row.created_at
          };
          this.alertTable.put(mapped.id, mapped);
          return mapped;
        }

        const { data, error } = await supabase
          .from('galx_budget_alerts')
          .insert({
            workspace_id: params.workspaceId,
            environment_id: params.environmentId || null,
            threshold_percentage: params.thresholdPercentage,
            notification_webhook_url: params.notificationWebhookUrl
          })
          .select()
          .single();

        if (!error && data) {
          const mapped: BudgetAlertRecord = {
            id: data.id,
            workspaceId: data.workspace_id,
            environmentId: data.environment_id,
            thresholdPercentage: data.threshold_percentage,
            notificationWebhookUrl: data.notification_webhook_url,
            isTriggered: data.is_triggered,
            triggeredAt: data.triggered_at,
            createdAt: data.created_at
          };
          this.alertTable.put(mapped.id, mapped);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    return record;
  }

  async getBudgetAlerts(workspaceId: string): Promise<BudgetAlertRecord[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('galx_budget_alerts')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('threshold_percentage', { ascending: true });

        if (!error && data && data.length > 0) {
          const mapped: BudgetAlertRecord[] = data.map(d => ({
            id: d.id,
            workspaceId: d.workspace_id,
            environmentId: d.environment_id,
            thresholdPercentage: d.threshold_percentage,
            notificationWebhookUrl: d.notification_webhook_url,
            isTriggered: d.is_triggered,
            triggeredAt: d.triggered_at,
            createdAt: d.created_at
          }));
          for (const a of mapped) this.alertTable.put(a.id, a);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    return this.alertTable.query({
      where: { workspaceId: { $eq: workspaceId } },
      sortBy: 'thresholdPercentage',
      sortOrder: 'asc'
    }) as BudgetAlertRecord[];
  }

  async markAlertTriggered(alertId: string): Promise<void> {
    const existing = this.alertTable.get(alertId);
    if (existing) {
      this.alertTable.put(alertId, {
        ...existing,
        isTriggered: true,
        triggeredAt: new Date().toISOString()
      });
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase
          .from('galx_budget_alerts')
          .update({
            is_triggered: true,
            triggered_at: new Date().toISOString()
          })
          .eq('id', alertId);
      } catch {
        // Fallback
      }
    }
  }

  async checkBudgetThresholds(
    workspaceId: string,
    additionalSpendUsd = 0
  ): Promise<{
    success: boolean;
    reason?: string;
    currentSpendUsd: number;
    spendCapUsd: number;
    percentageUsed: number;
    isCapped: boolean;
    triggeredAlerts: Array<{
      alertId: string;
      thresholdPercentage: number;
      webhookUrl: string;
      currentSpendUsd: number;
      spendCapUsd: number;
    }>;
  }> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('fn_check_budget_thresholds', {
          p_workspace_id: workspaceId,
          p_additional_spend_usd: additionalSpendUsd
        });

        if (!error && data) {
          const res = data as any;
          return {
            success: res.success,
            reason: res.reason,
            currentSpendUsd: Number(res.currentSpendUsd || 0),
            spendCapUsd: Number(res.spendCapUsd || 0),
            percentageUsed: Number(res.percentageUsed || 0),
            isCapped: Boolean(res.isCapped),
            triggeredAlerts: res.triggeredAlerts || []
          };
        }
      } catch {
        // Fallback
      }
    }

    // Fallback in-memory evaluation
    const wsRepo = (await import('./WorkspaceRepository')).WorkspaceRepository.getInstance();
    const ws = await wsRepo.getWorkspace(workspaceId);
    if (!ws) {
      return {
        success: false,
        reason: 'WORKSPACE_NOT_FOUND',
        currentSpendUsd: 0,
        spendCapUsd: 0,
        percentageUsed: 0,
        isCapped: false,
        triggeredAlerts: []
      };
    }

    const newSpend = ws.currentMonthSpendUsd + additionalSpendUsd;
    ws.currentMonthSpendUsd = newSpend;
    ws.updatedAt = new Date().toISOString();
    wsRepo.workspaceTable.put(ws.id, ws);

    const spendCap = ws.monthlySpendCapUsd;
    const pct = spendCap > 0 ? (newSpend / spendCap) * 100 : 0;
    const isCapped = spendCap > 0 && newSpend >= spendCap;

    const alerts = await this.getBudgetAlerts(workspaceId);
    const triggered: Array<{
      alertId: string;
      thresholdPercentage: number;
      webhookUrl: string;
      currentSpendUsd: number;
      spendCapUsd: number;
    }> = [];

    for (const alert of alerts) {
      if (!alert.isTriggered && alert.thresholdPercentage <= pct) {
        alert.isTriggered = true;
        alert.triggeredAt = new Date().toISOString();
        this.alertTable.put(alert.id, alert);
        triggered.push({
          alertId: alert.id,
          thresholdPercentage: alert.thresholdPercentage,
          webhookUrl: alert.notificationWebhookUrl,
          currentSpendUsd: newSpend,
          spendCapUsd: spendCap
        });
      }
    }

    return {
      success: true,
      currentSpendUsd: newSpend,
      spendCapUsd: spendCap,
      percentageUsed: pct,
      isCapped,
      triggeredAlerts: triggered
    };
  }

  public queryNatural(naturalQuery: string): BudgetAlertRecord[] {
    const parsed = BroccoliNaturalQueryParser.parse(naturalQuery, 'budget_alerts');
    return this.alertTable.query(parsed.queryOptions) as BudgetAlertRecord[];
  }
}

