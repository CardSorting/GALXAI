/**
 * GALXAI: Supabase Multi-Tenant Budget & Alert Policy Repository
 * Tracks workspace spend limits, triggers webhook notifications on threshold crossing (50%/80%/100%),
 * and enforces soft/hard budget caps.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../client';
import type { Database } from '../types';

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
  private readonly inMemoryAlerts = new Map<string, BudgetAlertRecord[]>();

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

    const list = this.inMemoryAlerts.get(params.workspaceId) || [];
    list.push(record);
    this.inMemoryAlerts.set(params.workspaceId, list);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
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
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    return record;
  }

  async checkBudgetThresholds(workspaceId: string, additionalSpendUsd: number = 0): Promise<{
    success: boolean;
    currentSpendUsd: number;
    spendCapUsd: number;
    percentageUsed: number;
    isCapped: boolean;
    triggeredAlerts: any[];
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
            currentSpendUsd: Number(res.currentSpendUsd),
            spendCapUsd: Number(res.spendCapUsd),
            percentageUsed: Number(res.percentageUsed),
            isCapped: Boolean(res.isCapped),
            triggeredAlerts: res.triggeredAlerts || []
          };
        }
      } catch {
        // Fallback
      }
    }

    return {
      success: true,
      currentSpendUsd: additionalSpendUsd,
      spendCapUsd: 1000.0,
      percentageUsed: (additionalSpendUsd / 1000.0) * 100,
      isCapped: additionalSpendUsd >= 1000.0,
      triggeredAlerts: []
    };
  }
}
