/**
 * GALXAI: Community Free Compute Pool Governor
 * 
 * Implements $30.00/month free compute grants for every developer while protecting
 * paid infrastructure from being starved:
 * 
 * 1. Shared Ingestion Shards: Free tier guest keys and paid keys share identical model routing
 *    and inference pipelines (zero duplicated backend code/infrastructure).
 * 2. Pool Separation:
 *    - `shared_community`: Free tier requests subject to fair-share queueing and a daily collective cap.
 *    - `priority_dedicated`: Paid/top-up requests with zero queueing, dedicated GPU priority, and unlimited bursts.
 * 3. Graceful DX on Pool Exhaustion:
 *    - Returns structured HTTP 429 with `Retry-After` pointing to 00:00 UTC reset.
 *    - Provides precise countdowns and clear paths to dedicated priority top-ups.
 */

import { BroccoliDbTable } from '../broccolidb/broccolidb-table';
import type { DeveloperGatewayKey } from '../contracts/GalxContracts';

export const FREE_MONTHLY_GRANT_USD = 30.00;
export const DAILY_COMMUNITY_POOL_BUDGET_USD = 500.00; // Daily collective cap across shared free tier
export const FREE_TIER_DEFAULT_RPM = 60;
export const PAID_TIER_DEFAULT_RPM = 1200;

export interface DailyPoolMetrics {
  id: string;
  dateUtc: string; // YYYY-MM-DD
  totalSpendUsd: number;
  totalRequests: number;
  budgetCapUsd: number;
  percentUtilized: number;
  isExhausted: boolean;
  resetsAtMs: number;
  resetsInSeconds: number;
}

export interface PoolEvaluationResult {
  allowed: boolean;
  pool: 'shared_community' | 'priority_dedicated';
  userBalanceUsd: number;
  userMonthlyGrantRemainingUsd: number;
  dailyPoolStatus: DailyPoolMetrics;
  rejectionReason?: {
    code: 'FREE_COMPUTE_POOL_DAILY_LIMIT' | 'MONTHLY_FREE_GRANT_EXHAUSTED';
    message: string;
    resetAt: string;
    resetInSeconds: number;
    upgradeUrl: string;
  };
}

export class GalxCommunityPoolGovernor {
  private static instance: GalxCommunityPoolGovernor;
  private readonly dailyMetricsTable: BroccoliDbTable<DailyPoolMetrics & { id: string }>;
  private readonly userUsageTable: BroccoliDbTable<{ id: string; monthlyUsedUsd: number; lastResetMonth: string }>;

  private constructor() {
    this.dailyMetricsTable = new BroccoliDbTable<DailyPoolMetrics & { id: string }>('community_daily_pool_metrics');
    this.userUsageTable = new BroccoliDbTable<{ id: string; monthlyUsedUsd: number; lastResetMonth: string }>('user_free_grant_usage');
  }

  public static getInstance(): GalxCommunityPoolGovernor {
    if (!GalxCommunityPoolGovernor.instance) {
      GalxCommunityPoolGovernor.instance = new GalxCommunityPoolGovernor();
    }
    return GalxCommunityPoolGovernor.instance;
  }

  /**
   * Returns current UTC date string YYYY-MM-DD
   */
  private getUtcDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Returns current UTC Year-Month string YYYY-MM
   */
  private getUtcMonthString(): string {
    return new Date().toISOString().slice(0, 7);
  }

  /**
   * Computes millisecond timestamp for the next 00:00:00 UTC midnight reset
   */
  private getNextUtcMidnightMs(): number {
    const now = new Date();
    const nextMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
    return nextMidnight.getTime();
  }

  /**
   * Retrieves or initializes today's collective community pool metrics
   */
  public getDailyPoolMetrics(): DailyPoolMetrics {
    const today = this.getUtcDateString();
    let current = this.dailyMetricsTable.get(today);

    const nowMs = Date.now();
    const resetsAtMs = this.getNextUtcMidnightMs();
    const resetsInSeconds = Math.max(0, Math.floor((resetsAtMs - nowMs) / 1000));

    if (!current) {
      current = {
        id: today,
        dateUtc: today,
        totalSpendUsd: 0,
        totalRequests: 0,
        budgetCapUsd: DAILY_COMMUNITY_POOL_BUDGET_USD,
        percentUtilized: 0,
        isExhausted: false,
        resetsAtMs,
        resetsInSeconds
      };
      this.dailyMetricsTable.put(today, current);
    } else {
      current.resetsAtMs = resetsAtMs;
      current.resetsInSeconds = resetsInSeconds;
      current.percentUtilized = Math.min(100, Math.round((current.totalSpendUsd / current.budgetCapUsd) * 100));
      current.isExhausted = current.totalSpendUsd >= current.budgetCapUsd;
    }

    return current;
  }

  /**
   * Retrieves or initializes a user's monthly $30 free compute grant consumption
   */
  public getUserMonthlyUsage(userId: string): { monthlyUsedUsd: number; remainingGrantUsd: number } {
    const currentMonth = this.getUtcMonthString();
    let record = this.userUsageTable.get(userId);

    if (!record || record.lastResetMonth !== currentMonth) {
      record = {
        id: userId,
        monthlyUsedUsd: 0,
        lastResetMonth: currentMonth
      };
      this.userUsageTable.put(userId, record);
    }

    const remainingGrantUsd = Math.max(0, FREE_MONTHLY_GRANT_USD - record.monthlyUsedUsd);
    return {
      monthlyUsedUsd: record.monthlyUsedUsd,
      remainingGrantUsd
    };
  }

  /**
   * Evaluates incoming request against the compute pools
   */
  public evaluateRequest(
    userId: string,
    key?: DeveloperGatewayKey,
    paidWalletBalance: number = 0
  ): PoolEvaluationResult {
    const dailyMetrics = this.getDailyPoolMetrics();
    const { remainingGrantUsd } = this.getUserMonthlyUsage(userId);

    // 1. If user has paid wallet balance or explicitly configured dedicated key -> Priority Dedicated Pool
    const isDedicated = (key?.computePool === 'priority_dedicated') || (paidWalletBalance > 0);

    if (isDedicated) {
      return {
        allowed: true,
        pool: 'priority_dedicated',
        userBalanceUsd: paidWalletBalance,
        userMonthlyGrantRemainingUsd: remainingGrantUsd,
        dailyPoolStatus: dailyMetrics
      };
    }

    // 2. Free Tier / Guest Key Evaluation:
    // Check A: Has user exceeded their monthly $30 free compute grant?
    if (remainingGrantUsd <= 0.001) {
      const resetAt = new Date(this.getNextUtcMidnightMs()).toISOString();
      return {
        allowed: false,
        pool: 'shared_community',
        userBalanceUsd: paidWalletBalance,
        userMonthlyGrantRemainingUsd: 0,
        dailyPoolStatus: dailyMetrics,
        rejectionReason: {
          code: 'MONTHLY_FREE_GRANT_EXHAUSTED',
          message: `You have utilized your $${FREE_MONTHLY_GRANT_USD.toFixed(2)} monthly free compute grant. Top up your compute wallet to continue running requests with dedicated priority.`,
          resetAt,
          resetInSeconds: dailyMetrics.resetsInSeconds,
          upgradeUrl: '/billing/credits'
        }
      };
    }

    // Check B: Has the daily collective community pool reached its capacity ceiling?
    if (dailyMetrics.isExhausted) {
      const resetAt = new Date(dailyMetrics.resetsAtMs).toISOString();
      const hoursLeft = Math.floor(dailyMetrics.resetsInSeconds / 3600);
      const minsLeft = Math.floor((dailyMetrics.resetsInSeconds % 3600) / 60);

      return {
        allowed: false,
        pool: 'shared_community',
        userBalanceUsd: paidWalletBalance,
        userMonthlyGrantRemainingUsd: remainingGrantUsd,
        dailyPoolStatus: dailyMetrics,
        rejectionReason: {
          code: 'FREE_COMPUTE_POOL_DAILY_LIMIT',
          message: `Daily free community compute capacity has reached its daily ceiling across shared ingestion shards. Resets automatically at 00:00 UTC (in ${hoursLeft}h ${minsLeft}m). To bypass shared capacity limits with dedicated priority routing and zero queueing, top up your compute wallet.`,
          resetAt,
          resetInSeconds: dailyMetrics.resetsInSeconds,
          upgradeUrl: '/billing/credits'
        }
      };
    }

    // 3. Permitted in Free Community Pool
    return {
      allowed: true,
      pool: 'shared_community',
      userBalanceUsd: paidWalletBalance,
      userMonthlyGrantRemainingUsd: remainingGrantUsd,
      dailyPoolStatus: dailyMetrics
    };
  }

  /**
   * Records token / compute draw upon completion
   */
  public recordUsage(
    userId: string,
    costUsd: number,
    pool: 'shared_community' | 'priority_dedicated' = 'shared_community'
  ): void {
    if (costUsd <= 0) return;

    if (pool === 'shared_community') {
      // Deduct from daily collective community pool
      const today = this.getUtcDateString();
      const current = this.getDailyPoolMetrics();
      current.totalSpendUsd += costUsd;
      current.totalRequests += 1;
      current.percentUtilized = Math.min(100, Math.round((current.totalSpendUsd / current.budgetCapUsd) * 100));
      current.isExhausted = current.totalSpendUsd >= current.budgetCapUsd;
      this.dailyMetricsTable.put(today, current);

      // Deduct from user's personal monthly $30 free grant
      const currentMonth = this.getUtcMonthString();
      let record = this.userUsageTable.get(userId) || { id: userId, monthlyUsedUsd: 0, lastResetMonth: currentMonth };
      record.monthlyUsedUsd += costUsd;
      this.userUsageTable.put(userId, record);
    }
  }
}
