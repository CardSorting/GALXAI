/**
 * GALXAI: Supabase Developer Compute Wallet & Micro-Billing Repository + BroccoliDB Hot Tables
 * High-precision ledger, 50% instant match compute verification ($10 deposit -> $15 credit),
 * real-time token deduction down to $0.000001 precision, and auto-reload safeguards.
 * Backed by BroccoliDB L1 reactive tables with secondary indexing, natural query parsing, and aggregation.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../client';
import type { Database, GalxWalletTransactionType } from '../types';
import { BroccoliDbTable } from '../../../core/broccolidb/broccolidb-table';
import { BroccoliNaturalQueryParser } from '../../../core/broccolidb/broccolidb-natural-query';
import type { DbQueryOptions, DbAggregateQuery, DbAggregateResult } from '../../../core/broccolidb/broccolidb.contracts';

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
  public readonly walletTable: BroccoliDbTable<WalletRecord>;
  public readonly txTable: BroccoliDbTable<WalletTransactionRecord>;

  private constructor() {
    this.walletTable = new BroccoliDbTable<WalletRecord>('wallets');
    this.walletTable.createIndex('userId');
    this.walletTable.createIndex('workspaceId');
    this.walletTable.createIndex('proofOfDepositVerified');
    this.walletTable.createSortedIndex('balanceUsd');
    this.walletTable.createSortedIndex('lifetimeSpentUsd');

    this.txTable = new BroccoliDbTable<WalletTransactionRecord>('wallet_transactions');
    this.txTable.createIndex('walletId');
    this.txTable.createIndex('userId');
    this.txTable.createIndex('transactionType');
    this.txTable.createIndex('apiKeyId');
    this.txTable.createIndex('shardId');
    this.txTable.createIndex('model');
    this.txTable.createSortedIndex('amountUsd');
  }

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
          this.walletTable.put(userId, mapped);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    const matches = this.walletTable.query({
      where: { userId: { $eq: userId } }
    }) as WalletRecord[];

    return matches[0] || null;
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
    this.walletTable.put(userId, newRecord);

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
          this.walletTable.put(userId, mapped);
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
            previousBalance: Number(res.previous_balance),
            costUsd: Number(res.cost_usd),
            newBalance: Number(res.new_balance),
            triggerAutoReload: res.trigger_auto_reload
          };
        }
      } catch {
        // Fallback
      }
    }

    return this.drawTokensFallback(params);
  }

  async drawTokensBatch(draws: Array<{
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
  }>): Promise<number> {
    if (draws.length === 0) return 0;
    for (const d of draws) {
      await this.drawTokens(d);
    }
    return draws.length;
  }

  async getTransactions(userId: string, limit = 50): Promise<WalletTransactionRecord[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('galx_wallet_transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (!error && data && data.length > 0) {
          const mapped = data.map(this.mapRowToTransaction);
          for (const tx of mapped) this.txTable.put(tx.id, tx);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    return this.txTable.query({
      where: { userId: { $eq: userId } },
      limit
    }) as WalletTransactionRecord[];
  }

  public queryTransactionsNatural(naturalQuery: string): WalletTransactionRecord[] {
    const parsed = BroccoliNaturalQueryParser.parse(naturalQuery, 'wallet_transactions');
    return this.txTable.query(parsed.queryOptions) as WalletTransactionRecord[];
  }

  public aggregateTransactions(query: DbAggregateQuery): DbAggregateResult {
    return this.txTable.aggregate(query);
  }

  private async verifyDepositFallback(params: {
    userId: string;
    depositAmountUsd: number;
    paymentRef?: string;
  }) {
    const wallet = await this.createOrGetWallet(params.userId);
    const deposit = params.depositAmountUsd;
    let match = 0;

    // Minimum $10 deposit matches 50% with the $5 introductory developer compute grant
    if (deposit >= 10.0 && !wallet.proofOfDepositVerified) {
      match = 5.0;
    }

    const totalCredit = deposit + match;
    const newBalance = wallet.balanceUsd + totalCredit;

    wallet.balanceUsd = newBalance;
    wallet.depositedTotalUsd += deposit;
    wallet.promotionalMatchUsd += match;
    wallet.proofOfDepositVerified = true;
    wallet.verifiedAt = new Date().toISOString();
    wallet.updatedAt = new Date().toISOString();
    this.walletTable.put(params.userId, wallet);

    const txId = `tx_${Date.now()}_deposit`;
    this.txTable.put(txId, {
      id: txId,
      walletId: wallet.id,
      userId: params.userId,
      transactionType: 'deposit',
      amountUsd: totalCredit,
      balanceAfterUsd: newBalance,
      description: `Compute deposit of $${deposit} with 50% match grant of $${match}`,
      apiKeyId: null,
      shardId: null,
      model: null,
      promptTokens: 0,
      completionTokens: 0,
      cachedTokens: 0,
      metadata: { deposit, match, paymentRef: params.paymentRef },
      createdAt: new Date().toISOString()
    });

    return {
      success: true,
      depositAmount: deposit,
      matchGrant: match,
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
    this.walletTable.put(params.userId, wallet);

    const txId = `tx_${Date.now()}_draw`;
    this.txTable.put(txId, {
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
