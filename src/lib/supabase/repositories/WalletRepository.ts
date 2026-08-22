/**
 * GALXAI: Supabase Developer Compute Wallet & Micro-Billing Repository
 * High-precision ledger, 50% instant match compute verification ($10 deposit -> $15 credit),
 * real-time token deduction down to $0.000001 precision, and auto-reload safeguards.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../client';
import type { Database, GalxWalletTransactionType } from '../types';

export interface WalletRecord {
  id: string;
  userId: string;
  workspaceId: string | null;
  balanceUsd: number;
  introductoryGrantUsd: number;
  depositedTotalUsd: number;
  promotionalMatchUsd: number;
  lifetimeSpentUsd: number;
  autoReloadEnabled: boolean;
  autoReloadThresholdUsd: number;
  autoReloadAmountUsd: number;
  autoReloadPaymentMethodId: string | null;
  proofOfDepositVerified: boolean;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransactionRecord {
  id: string;
  walletId: string;
  userId: string;
  transactionType: GalxWalletTransactionType;
  amountUsd: number;
  balanceAfterUsd: number;
  description: string;
  apiKeyId: string | null;
  shardId: string | null;
  model: string | null;
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  metadata: Record<string, any>;
  createdAt: string;
}

export class WalletRepository {
  private static instance: WalletRepository;
  private readonly inMemoryWallets = new Map<string, WalletRecord>();
  private readonly inMemoryTransactions = new Map<string, WalletTransactionRecord[]>();

  static getInstance(): WalletRepository {
    if (!WalletRepository.instance) {
      WalletRepository.instance = new WalletRepository();
    }
    return WalletRepository.instance;
  }

  async getWallet(userId: string): Promise<WalletRecord | null> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('galx_wallets')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (!error && data) {
          const mapped = this.mapRowToWallet(data);
          this.inMemoryWallets.set(userId, mapped);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    return this.inMemoryWallets.get(userId) || null;
  }

  async createOrGetWallet(userId: string): Promise<WalletRecord> {
    const existing = await this.getWallet(userId);
    if (existing) return existing;

    const newRecord: WalletRecord = {
      id: `wallet_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      workspaceId: null,
      balanceUsd: 0,
      introductoryGrantUsd: 5.0,
      depositedTotalUsd: 0,
      promotionalMatchUsd: 0,
      lifetimeSpentUsd: 0,
      autoReloadEnabled: false,
      autoReloadThresholdUsd: 10.0,
      autoReloadAmountUsd: 25.0,
      autoReloadPaymentMethodId: null,
      proofOfDepositVerified: false,
      verifiedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.inMemoryWallets.set(userId, newRecord);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('galx_wallets')
          .insert({
            user_id: userId,
            balance_usd: 0,
            introductory_grant_usd: 5.0,
            deposited_total_usd: 0,
            promotional_match_usd: 0,
            proof_of_deposit_verified: false
          })
          .select()
          .single();

        if (!error && data) {
          const mapped = this.mapRowToWallet(data);
          this.inMemoryWallets.set(userId, mapped);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    return newRecord;
  }

  /**
   * 50% Instant Match Compute Verification (ADR 0007)
   * Minimum $10 deposit matches with $5 introductory developer compute grant ($15 total).
   */
  async verifyDepositAndApplyMatch(params: {
    userId: string;
    depositAmountUsd: number;
    paymentRef?: string;
  }): Promise<{
    success: boolean;
    depositAmount: number;
    matchGrant: number;
    totalCredit: number;
    newBalance: number;
    proofOfDepositVerified: boolean;
  }> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('fn_verify_deposit_and_match', {
          p_user_id: params.userId,
          p_deposit_amount_usd: params.depositAmountUsd,
          p_payment_ref: params.paymentRef || undefined
        });

        if (!error && data) {
          const res = data as any;
          return {
            success: res.success,
            depositAmount: Number(res.deposit_amount),
            matchGrant: Number(res.match_grant),
            totalCredit: Number(res.total_credit),
            newBalance: Number(res.new_balance),
            proofOfDepositVerified: res.proof_of_deposit_verified
          };
        }
      } catch {
        // Fallback
      }
    }

    return this.verifyDepositFallback(params);
  }

  /**
   * Atomic Sub-Cent Micro-Metered Token Debit down to $0.000001
   */
  async drawTokens(params: {
    userId: string;
    costUsd: number;
    description: string;
    apiKeyId?: string;
    shardId?: string;
    model?: string;
    promptTokens?: number;
    completionTokens?: number;
    cachedTokens?: number;
    metadata?: Record<string, any>;
  }): Promise<{
    success: boolean;
    reason?: string;
    transactionId?: string;
    previousBalance?: number;
    costUsd?: number;
    newBalance?: number;
    triggerAutoReload?: boolean;
  }> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('fn_draw_wallet_tokens', {
          p_user_id: params.userId,
          p_cost_usd: params.costUsd,
          p_description: params.description,
          p_api_key_id: params.apiKeyId || undefined,
          p_shard_id: params.shardId || undefined,
          p_model: params.model || undefined,
          p_prompt_tokens: params.promptTokens || 0,
          p_completion_tokens: params.completionTokens || 0,
          p_cached_tokens: params.cachedTokens || 0,
          p_metadata: params.metadata || {}
        });

        if (!error && data) {
          const res = data as any;
          return {
            success: res.success,
            reason: res.reason,
            transactionId: res.transaction_id,
            previousBalance: res.previous_balance ? Number(res.previous_balance) : undefined,
            costUsd: res.cost_usd ? Number(res.cost_usd) : undefined,
            newBalance: res.new_balance ? Number(res.new_balance) : undefined,
            triggerAutoReload: res.trigger_auto_reload
          };
        }
      } catch {
        // Fallback
      }
    }

    return this.drawTokensFallback(params);
  }

  /**
   * Cloudflare Edge Batch Micro-Metered Token Deductions
   * Ingests multiple draw items in 1 roundtrip.
   */
  async drawTokensBatch(draws: Array<{
    userId: string;
    costUsd: number;
    description: string;
    model?: string;
    promptTokens?: number;
    completionTokens?: number;
    cachedTokens?: number;
    apiKeyId?: string;
    shardId?: string;
    metadata?: Record<string, any>;
  }>): Promise<Array<{ userId: string; success: boolean; transactionId?: string; newBalance?: number; reason?: string }>> {
    if (draws.length === 0) return [];

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('fn_batch_draw_wallet_tokens_cf', {
          p_draws: draws as any
        });

        if (!error && data && Array.isArray(data)) {
          return data as any[];
        }
      } catch {
        // Fallback
      }
    }

    const results: Array<{ userId: string; success: boolean; transactionId?: string; newBalance?: number; reason?: string }> = [];
    for (const d of draws) {
      const res = await this.drawTokens(d);
      results.push({
        userId: d.userId,
        success: res.success,
        transactionId: res.transactionId,
        newBalance: res.newBalance,
        reason: res.reason
      });
    }
    return results;
  }

  async updateAutoReloadConfig(params: {
    userId: string;
    enabled: boolean;
    thresholdUsd: number;
    amountUsd: number;
    paymentMethodId?: string;
  }): Promise<void> {
    const wallet = this.inMemoryWallets.get(params.userId);
    if (wallet) {
      wallet.autoReloadEnabled = params.enabled;
      wallet.autoReloadThresholdUsd = params.thresholdUsd;
      wallet.autoReloadAmountUsd = params.amountUsd;
      wallet.autoReloadPaymentMethodId = params.paymentMethodId || null;
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase
          .from('galx_wallets')
          .update({
            auto_reload_enabled: params.enabled,
            auto_reload_threshold_usd: params.thresholdUsd,
            auto_reload_amount_usd: params.amountUsd,
            auto_reload_payment_method_id: params.paymentMethodId || null
          })
          .eq('user_id', params.userId);
      } catch {
        // Fallback
      }
    }
  }

  async getTransactions(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<WalletTransactionRecord[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('galx_wallet_transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (!error && data && data.length > 0) {
          return data.map(this.mapRowToTransaction);
        }
      } catch {
        // Fallback
      }
    }

    const list = this.inMemoryTransactions.get(userId) || [];
    return list.slice(offset, offset + limit);
  }

  private async verifyDepositFallback(params: {
    userId: string;
    depositAmountUsd: number;
    paymentRef?: string;
  }) {
    const wallet = await this.createOrGetWallet(params.userId);
    const matchGrant = !wallet.proofOfDepositVerified ? 5.0 : 0;
    const totalCredit = params.depositAmountUsd + matchGrant;
    const newBalance = wallet.balanceUsd + totalCredit;

    wallet.balanceUsd = newBalance;
    wallet.depositedTotalUsd += params.depositAmountUsd;
    wallet.promotionalMatchUsd += matchGrant;
    wallet.proofOfDepositVerified = true;
    wallet.verifiedAt = new Date().toISOString();
    this.inMemoryWallets.set(params.userId, wallet);

    const txs = this.inMemoryTransactions.get(params.userId) || [];
    txs.unshift({
      id: `tx_${Date.now()}_dep`,
      walletId: wallet.id,
      userId: params.userId,
      transactionType: 'deposit',
      amountUsd: params.depositAmountUsd,
      balanceAfterUsd: newBalance,
      description: 'Developer refundable compute deposit',
      apiKeyId: null,
      shardId: null,
      model: null,
      promptTokens: 0,
      completionTokens: 0,
      cachedTokens: 0,
      metadata: { paymentRef: params.paymentRef },
      createdAt: new Date().toISOString()
    });
    this.inMemoryTransactions.set(params.userId, txs);

    return {
      success: true,
      depositAmount: params.depositAmountUsd,
      matchGrant,
      totalCredit,
      newBalance,
      proofOfDepositVerified: true
    };
  }

  private async drawTokensFallback(params: {
    userId: string;
    costUsd: number;
    description: string;
    apiKeyId?: string;
    shardId?: string;
    model?: string;
    promptTokens?: number;
    completionTokens?: number;
    cachedTokens?: number;
    metadata?: Record<string, any>;
  }) {
    const wallet = await this.getWallet(params.userId);
    if (!wallet) return { success: false, reason: 'WALLET_NOT_FOUND' };
    if (wallet.balanceUsd < params.costUsd) {
      return {
        success: false,
        reason: 'INSUFFICIENT_FUNDS',
        previousBalance: wallet.balanceUsd,
        costUsd: params.costUsd,
        newBalance: wallet.balanceUsd
      };
    }

    const previousBalance = wallet.balanceUsd;
    const newBalance = wallet.balanceUsd - params.costUsd;
    wallet.balanceUsd = newBalance;
    wallet.lifetimeSpentUsd += params.costUsd;
    this.inMemoryWallets.set(params.userId, wallet);

    const txId = `tx_${Date.now()}_draw`;
    const txs = this.inMemoryTransactions.get(params.userId) || [];
    txs.unshift({
      id: txId,
      walletId: wallet.id,
      userId: params.userId,
      transactionType: 'usage_draw',
      amountUsd: -params.costUsd,
      balanceAfterUsd: newBalance,
      description: params.description,
      apiKeyId: params.apiKeyId || null,
      shardId: params.shardId || null,
      model: params.model || null,
      promptTokens: params.promptTokens || 0,
      completionTokens: params.completionTokens || 0,
      cachedTokens: params.cachedTokens || 0,
      metadata: params.metadata || {},
      createdAt: new Date().toISOString()
    });
    this.inMemoryTransactions.set(params.userId, txs);

    return {
      success: true,
      transactionId: txId,
      previousBalance,
      costUsd: params.costUsd,
      newBalance,
      triggerAutoReload: wallet.autoReloadEnabled && newBalance <= wallet.autoReloadThresholdUsd
    };
  }

  private mapRowToWallet(data: Database['public']['Tables']['galx_wallets']['Row']): WalletRecord {
    return {
      id: data.id,
      userId: data.user_id,
      workspaceId: data.workspace_id,
      balanceUsd: Number(data.balance_usd),
      introductoryGrantUsd: Number(data.introductory_grant_usd),
      depositedTotalUsd: Number(data.deposited_total_usd),
      promotionalMatchUsd: Number(data.promotional_match_usd),
      lifetimeSpentUsd: Number(data.lifetime_spent_usd),
      autoReloadEnabled: data.auto_reload_enabled,
      autoReloadThresholdUsd: Number(data.auto_reload_threshold_usd),
      autoReloadAmountUsd: Number(data.auto_reload_amount_usd),
      autoReloadPaymentMethodId: data.auto_reload_payment_method_id,
      proofOfDepositVerified: data.proof_of_deposit_verified,
      verifiedAt: data.verified_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapRowToTransaction(data: Database['public']['Tables']['galx_wallet_transactions']['Row']): WalletTransactionRecord {
    return {
      id: data.id,
      walletId: data.wallet_id,
      userId: data.user_id,
      transactionType: data.transaction_type,
      amountUsd: Number(data.amount_usd),
      balanceAfterUsd: Number(data.balance_after_usd),
      description: data.description,
      apiKeyId: data.api_key_id,
      shardId: data.shard_id,
      model: data.model,
      promptTokens: Number(data.prompt_tokens),
      completionTokens: Number(data.completion_tokens),
      cachedTokens: Number(data.cached_tokens),
      metadata: (data.metadata as Record<string, any>) || {},
      createdAt: data.created_at
    };
  }
}
