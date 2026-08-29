/**
 * GALXAI: Sovereign Seat Tier & Entitlement Engine (Apex V4)
 * Evaluates caller identity, team organization memberships, seat license status,
 * dual rolling windows (5-Hour & Weekly limits), concurrency shaper limits, and model access permissions.
 * Features an L1 In-Memory Hot Cache (BroccoliDB) for sub-microsecond routing loops.
 */

import { BroccoliDbTable } from '../broccolidb/broccolidb-table';
import { TeamGovernanceRepository } from '../../lib/supabase/repositories/TeamGovernanceRepository';
import type { AuthIdentityResult } from '../contracts/GalxContracts';

export type SeatTierType = 'developer' | 'small-business' | 'enterprise' | 'apex';
export type ThrottleModeType = 'hard_stop' | 'soft_throttle' | 'notify_only';

export interface RollingWindowBucket {
  percentRemaining: number;
  usedUnits: number;
  limitUnits: number;
  refreshIn: string;
  refreshMessage: string;
  resetAtMs: number;
  isExceeded: boolean;
}

export interface SeatTierEntitlement {
  tier: SeatTierType;
  tierLabel: string;
  orgId?: string;
  orgName?: string;
  memberId?: string;
  role: string;
  isPriorityUser: boolean;
  priorityWeight: number;
  concurrencyLimit: number;
  maxTokensAllowed: number;
  allowedModels: string[];
  deepReasoningAllowed: boolean;
  spendCapUsd: number;
  currentSpendUsd: number;
  creditsIncludedUsd: number;
  throttleMode: ThrottleModeType;
  isCapped: boolean;
  zdrRequired: boolean;
  hipaaCompliant: boolean;
  promptCacheRebatePct: number;
  cachedAtMs: number;
}

export interface SeatTierPublicSummary {
  authenticated: boolean;
  tier: SeatTierType;
  tierLabel: string;
  seatRole: string;
  orgName?: string;
  priorityLane: boolean;
  maxTokens: number;
  deepReasoning: boolean;
  monthlyCreditsIncludedUsd: number;
  spendCapUsd: number;
  currentSpendUsd: number;
  remainingSpendUsd: number;
  allowedModels: string[];
  isCapped: boolean;
  promptCacheRebatePct: number;
  concurrencyLimit: number;
  activeConcurrentStreams: number;
  zdrRequired: boolean;
  hipaaCompliant: boolean;
  fiveHourWindow: RollingWindowBucket;
  weeklyWindow: RollingWindowBucket;
}

export interface SeatUsageEvent {
  timestampMs: number;
  units: number;
  modelId: string;
}

export interface SeatRollingStoreRecord {
  id: string; // userId
  events: SeatUsageEvent[];
  lastPrunedMs: number;
}

export interface DistributedSeatGateResult {
  allowed: boolean;
  rejectionCode?: string;
  requestId?: string;
  tier?: SeatTierType;
  role?: string;
  activeStreams?: number;
  concurrencyLimit?: number;
  leaseExpiresAt?: string;
  idempotent?: boolean;
}

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const TIER_CAPACITIES: Record<SeatTierType, { fiveHourLimit: number; weeklyLimit: number }> = {
  developer: {
    fiveHourLimit: 30,
    weeklyLimit: 200
  },
  'small-business': {
    fiveHourLimit: 100,
    weeklyLimit: 1000
  },
  enterprise: {
    fiveHourLimit: 350,
    weeklyLimit: 5000
  },
  apex: {
    fiveHourLimit: 1500,
    weeklyLimit: 25000
  }
};

const TIER_MODEL_WHITELIST: Record<SeatTierType, string[]> = {
  developer: [
    'gpt-5.6-sol',
    'gpt-5.6-luna',
    'sol',
    'luna',
    'auto-router'
  ],
  'small-business': [
    'gpt-5.6-sol',
    'gpt-5.6-terra',
    'gpt-5.6-luna',
    'openai-codex-v3',
    'auto-router',
    'sol',
    'terra',
    'luna',
    'codex-v3'
  ],
  enterprise: [
    'gpt-5.6-sol',
    'gpt-5.6-terra',
    'gpt-5.6-luna',
    'openai-codex-v3',
    'auto-router',
    'openai-gpt-image-2',
    'openai-gpt-image-1.5',
    'openai-gpt-image-1',
    'sol',
    'terra',
    'luna',
    'codex-v3'
  ],
  apex: [
    'gpt-5.6-sol',
    'gpt-5.6-terra',
    'gpt-5.6-luna',
    'openai-codex-v3',
    'auto-router',
    'openai-gpt-image-2',
    'openai-gpt-image-1.5',
    'openai-gpt-image-1',
    'sol',
    'terra',
    'luna',
    'codex-v3'
  ]
};

export class GalxSeatTierEngine {
  private static instance: GalxSeatTierEngine;
  private readonly teamRepo: TeamGovernanceRepository;
  private readonly entitlementCache: BroccoliDbTable<SeatTierEntitlement & { id: string }>;
  private readonly usageEventsTable: BroccoliDbTable<SeatRollingStoreRecord>;
  private readonly activeStreamSlots: Map<string, number> = new Map();
  private readonly CACHE_TTL_MS = 60_000; // 60 seconds

  private constructor() {
    this.teamRepo = TeamGovernanceRepository.getInstance();
    this.entitlementCache = new BroccoliDbTable<SeatTierEntitlement & { id: string }>('seat_tier_entitlements_cache');
    this.entitlementCache.createIndex('tier');
    this.entitlementCache.createIndex('orgId');

    this.usageEventsTable = new BroccoliDbTable<SeatRollingStoreRecord>('seat_rolling_usage_events');
  }

  public static getInstance(): GalxSeatTierEngine {
    if (!GalxSeatTierEngine.instance) {
      GalxSeatTierEngine.instance = new GalxSeatTierEngine();
    }
    return GalxSeatTierEngine.instance;
  }

  /**
   * Helper to format time delta into human-friendly duration (e.g. "4 hours, 17 minutes", "3 days").
   */
  public static formatDuration(ms: number): string {
    if (ms <= 0) return 'a moment';

    if (ms >= 86_400_000) {
      const days = Math.floor(ms / 86_400_000);
      const remHours = Math.floor((ms % 86_400_000) / 3_600_000);
      if (remHours === 0 || days >= 3) {
        return `${days} day${days > 1 ? 's' : ''}`;
      }
      return `${days} day${days > 1 ? 's' : ''}, ${remHours} hour${remHours > 1 ? 's' : ''}`;
    }

    if (ms >= 3_600_000) {
      const hours = Math.floor(ms / 3_600_000);
      const remMins = Math.floor((ms % 3_600_000) / 60_000);
      if (remMins === 0) {
        return `${hours} hour${hours > 1 ? 's' : ''}`;
      }
      return `${hours} hour${hours > 1 ? 's' : ''}, ${remMins} minute${remMins > 1 ? 's' : ''}`;
    }

    const mins = Math.max(1, Math.floor(ms / 60_000));
    return `${mins} minute${mins > 1 ? 's' : ''}`;
  }

  /**
   * Computes the dual rolling window metrics (5-Hour Limit & Weekly Limit Remaining).
   */
  public calculateRollingWindows(userId: string, tier: SeatTierType, now = Date.now()): {
    fiveHourWindow: RollingWindowBucket;
    weeklyWindow: RollingWindowBucket;
  } {
    const capacities = TIER_CAPACITIES[tier] || TIER_CAPACITIES.developer;
    const store = this.usageEventsTable.get(userId);
    const rawEvents = store?.events || [];

    // Prune events older than 7 days
    const activeEvents = rawEvents.filter((e) => e.timestampMs >= now - SEVEN_DAYS_MS);
    if (store && activeEvents.length !== rawEvents.length) {
      this.usageEventsTable.put(userId, { id: userId, events: activeEvents, lastPrunedMs: now });
    }

    // 1. Calculate 5-Hour Window
    const fiveHourCutoff = now - FIVE_HOURS_MS;
    const eventsIn5h = activeEvents.filter((e) => e.timestampMs >= fiveHourCutoff);
    const used5h = eventsIn5h.reduce((acc, e) => acc + (e.units || 1), 0);
    const percent5h = Math.max(0, Math.min(100, Math.round(((capacities.fiveHourLimit - used5h) / capacities.fiveHourLimit) * 100)));
    const is5hExceeded = used5h >= capacities.fiveHourLimit;

    let refreshIn5h = 'fully refreshed';
    let refreshMessage5h = 'You have 100% of your 5-hour limit remaining.';
    let resetAtMs5h = now;

    if (eventsIn5h.length > 0 && used5h > 0) {
      const oldestIn5h = Math.min(...eventsIn5h.map((e) => e.timestampMs));
      const delta5h = Math.max(0, (oldestIn5h + FIVE_HOURS_MS) - now);
      refreshIn5h = GalxSeatTierEngine.formatDuration(delta5h);
      resetAtMs5h = oldestIn5h + FIVE_HOURS_MS;

      if (!is5hExceeded) {
        refreshMessage5h = `You have used some of your 5-hour limit, it will fully refresh in ${refreshIn5h}.`;
      } else {
        refreshMessage5h = `You have reached your 5-hour limit, it will begin refreshing in ${refreshIn5h}.`;
      }
    }

    // 2. Calculate Weekly Window
    const usedWeekly = activeEvents.reduce((acc, e) => acc + (e.units || 1), 0);
    const percentWeekly = Math.max(0, Math.min(100, Math.round(((capacities.weeklyLimit - usedWeekly) / capacities.weeklyLimit) * 100)));
    const isWeeklyExceeded = usedWeekly >= capacities.weeklyLimit;

    let refreshInWeekly = 'fully refreshed';
    let refreshMessageWeekly = 'You have 100% of your weekly limit remaining.';
    let resetAtMsWeekly = now;

    if (activeEvents.length > 0 && usedWeekly > 0) {
      const oldestWeekly = Math.min(...activeEvents.map((e) => e.timestampMs));
      const deltaWeekly = Math.max(0, (oldestWeekly + SEVEN_DAYS_MS) - now);
      refreshInWeekly = GalxSeatTierEngine.formatDuration(deltaWeekly);
      resetAtMsWeekly = oldestWeekly + SEVEN_DAYS_MS;

      if (!isWeeklyExceeded) {
        refreshMessageWeekly = `You have used some of your weekly limit, it will fully refresh in ${refreshInWeekly}.`;
      } else {
        refreshMessageWeekly = `You have reached your weekly limit, it will begin refreshing in ${refreshInWeekly}.`;
      }
    }

    return {
      fiveHourWindow: {
        percentRemaining: percent5h,
        usedUnits: used5h,
        limitUnits: capacities.fiveHourLimit,
        refreshIn: refreshIn5h,
        refreshMessage: refreshMessage5h,
        resetAtMs: resetAtMs5h,
        isExceeded: is5hExceeded
      },
      weeklyWindow: {
        percentRemaining: percentWeekly,
        usedUnits: usedWeekly,
        limitUnits: capacities.weeklyLimit,
        refreshIn: refreshInWeekly,
        refreshMessage: refreshMessageWeekly,
        resetAtMs: resetAtMsWeekly,
        isExceeded: isWeeklyExceeded
      }
    };
  }

  /**
   * Evaluates if the caller's request violates rolling 5-hour or weekly limits.
   */
  public evaluateSeatRollingLimits(userId: string, entitlement: SeatTierEntitlement, requestedModel?: string): void {
    const windows = this.calculateRollingWindows(userId, entitlement.tier);

    if (windows.fiveHourWindow.isExceeded) {
      throw new Error(
        `SEAT_5HOUR_LIMIT_EXCEEDED: You have used all of your 5-hour limit for flagship models on ${entitlement.tierLabel}. It will begin refreshing in ${windows.fiveHourWindow.refreshIn}.`
      );
    }

    if (windows.weeklyWindow.isExceeded) {
      throw new Error(
        `SEAT_WEEKLY_LIMIT_EXCEEDED: You have reached your weekly sustained limit on ${entitlement.tierLabel}. It will begin refreshing in ${windows.weeklyWindow.refreshIn}.`
      );
    }
  }

  /**
   * Records a compute event into the user's sliding rolling windows.
   */
  public getSeatUsageUnits(modelId: string): number {
    const cleanModel = (modelId || '').toLowerCase();
    if (cleanModel.includes('luna')) return 0.25;
    if (cleanModel.includes('image')) return 2.0;
    return 1.0;
  }

  public recordSeatUsage(userId: string, modelId: string, tokens: number = 1000, requestId?: string): void {
    if (!userId || userId === 'anonymous_developer') return;

    const units = this.getSeatUsageUnits(modelId);

    const now = Date.now();
    const existing = this.usageEventsTable.get(userId);
    const events = existing?.events || [];
    events.push({ timestampMs: now, units, modelId });

    this.usageEventsTable.put(userId, {
      id: userId,
      events,
      lastPrunedMs: now
    });

    // Persist to Supabase PostgreSQL in background
    this.teamRepo.recordSeatRollingUsage({
      userId,
      modelId,
      units,
      tokens,
      requestId,
    }).catch(() => {});
  }

  public async evaluateAndAcquireDistributedGate(params: {
    userId: string;
    requestId: string;
    requestedModel: string;
    orgId?: string;
    isStream: boolean;
    leaseTtlSeconds?: number;
    tier?: SeatTierType;
  }): Promise<DistributedSeatGateResult | null> {
    return this.teamRepo.evaluateAndAcquireSeatGateV2({
      ...params,
      reservedUnits: this.getSeatUsageUnits(params.requestedModel),
      fallbackTier: params.tier,
    });
  }

  public async settleDistributedRequest(params: {
    userId: string;
    requestId: string;
    modelId: string;
    tokens?: number;
    costUsd?: number;
    conversationId?: string;
    userMessage?: any;
    assistantMessage?: any;
  }): Promise<any | null> {
    return this.teamRepo.settleSeatRequestLeaseV2({
      ...params,
      units: this.getSeatUsageUnits(params.modelId),
    });
  }

  public async releaseDistributedRequest(userId: string, requestId: string): Promise<boolean | null> {
    return this.teamRepo.releaseSeatRequestLeaseV2(userId, requestId);
  }

  /**
   * Concurrency Shaper: Attempts to acquire a concurrent stream slot under the user's seat limit.
   */
  public acquireSeatStreamSlot(userId: string, limit: number): boolean {
    const current = this.activeStreamSlots.get(userId) || 0;
    if (current >= limit) {
      return false;
    }
    this.activeStreamSlots.set(userId, current + 1);
    return true;
  }

  /**
   * Releases an active concurrent stream slot upon stream completion, error, or client abort.
   */
  public releaseSeatStreamSlot(userId: string): void {
    const current = this.activeStreamSlots.get(userId) || 0;
    if (current <= 1) {
      this.activeStreamSlots.delete(userId);
    } else {
      this.activeStreamSlots.set(userId, current - 1);
    }
  }

  /**
   * Returns the count of active concurrent streaming connections for a seat.
   */
  public getActiveStreamCount(userId: string): number {
    return this.activeStreamSlots.get(userId) || 0;
  }

  /**
   * Resolves the caller's active seat tier entitlement from L1 in-memory cache,
   * database organization rosters, or guest developer sandbox fallback.
   */
  public async resolveUserSeatTier(
    authResult: AuthIdentityResult,
    requestedModel?: string
  ): Promise<SeatTierEntitlement> {
    const userId = authResult.userId || 'anonymous_developer';
    const now = Date.now();

    // 1. Check L1 In-Memory Hot Cache
    const cached = this.entitlementCache.get(userId);
    if (cached && now - cached.cachedAtMs < this.CACHE_TTL_MS) {
      if (requestedModel) {
        this.validateModelEntitlement(cached, requestedModel);
      }
      return cached;
    }

    // 2. Default Baseline for Standard Solo Developer Tier
    if (!authResult.authenticated || userId === 'anonymous_developer' || authResult.authType === 'anonymous') {
      const defaultEntitlement: SeatTierEntitlement = {
        tier: 'developer',
        tierLabel: 'Solo Developer Seat',
        role: 'developer',
        isPriorityUser: false,
        priorityWeight: 1.0,
        concurrencyLimit: 20,
        maxTokensAllowed: 16_384,
        allowedModels: TIER_MODEL_WHITELIST.developer,
        deepReasoningAllowed: true,
        spendCapUsd: 10.0,
        currentSpendUsd: 0.0,
        creditsIncludedUsd: 5.0,
        throttleMode: 'hard_stop',
        isCapped: false,
        zdrRequired: false,
        hipaaCompliant: false,
        promptCacheRebatePct: 75,
        cachedAtMs: now
      };
      this.entitlementCache.put(userId, { ...defaultEntitlement, id: userId });
      if (requestedModel) {
        this.validateModelEntitlement(defaultEntitlement, requestedModel);
      }
      return defaultEntitlement;
    }

    // 3. Resolve Organization & Seat Membership from Supabase PostgreSQL
    let matchedTier: SeatTierType = 'developer';
    let matchedRole = 'developer';
    let orgId: string | undefined = undefined;
    let orgName: string | undefined = undefined;
    let memberId: string | undefined = undefined;
    let monthlySpendCapUsd = 250.0;
    let monthlySpendUsd = 0.0;
    let throttleMode: ThrottleModeType = 'hard_stop';

    try {
      // Check session claims or workspace ID
      const sessionOrgId = authResult.claims?.workspaceId;
      if (sessionOrgId) {
        const org = await this.teamRepo.getOrganization(sessionOrgId);
        if (org) {
          orgId = org.id;
          orgName = org.name;
          matchedTier = this.normalizeTier(org.tier);
        }
      }

      // Check organization members roster
      if (orgId) {
        const members = await this.teamRepo.listMembers(orgId);
        const currentMember = members.find((m) => m.user_id === userId || (authResult.claims?.email && m.email === authResult.claims.email));
        if (currentMember) {
          memberId = currentMember.id;
          matchedRole = currentMember.role || 'developer';
          monthlySpendCapUsd = currentMember.monthly_spend_cap_usd || 250.0;
          monthlySpendUsd = currentMember.monthly_spend_usd || 0.0;
          throttleMode = (currentMember.throttle_mode as ThrottleModeType) || 'hard_stop';
        }
      }
    } catch {
      // Fallback gracefully on DB timeout
    }

    // Explicit claim override if user is developer or demo enterprise
    const rawClaimRole = (authResult.claims as any)?.role;
    if (rawClaimRole === 'enterprise' || rawClaimRole === 'lead') {
      matchedTier = rawClaimRole === 'enterprise' ? 'enterprise' : 'small-business';
    }

    // If developer key with custom tier claims
    const apiKeyMeta = (authResult.apiKey as any)?.metadata;
    if (apiKeyMeta?.tier) {
      matchedTier = this.normalizeTier(apiKeyMeta.tier);
    }

    // Build finalized entitlement based on tier matrix
    const entitlement = this.buildEntitlementProfile({
      userId,
      tier: matchedTier,
      role: matchedRole,
      orgId,
      orgName,
      memberId,
      monthlySpendCapUsd,
      monthlySpendUsd,
      throttleMode,
      now
    });

    // Save to L1 Cache
    this.entitlementCache.put(userId, { ...entitlement, id: userId });

    // Validate Model Entitlement
    if (requestedModel) {
      this.validateModelEntitlement(entitlement, requestedModel);
    }

    return entitlement;
  }

  private buildEntitlementProfile(params: {
    userId: string;
    tier: SeatTierType;
    role: string;
    orgId?: string;
    orgName?: string;
    memberId?: string;
    monthlySpendCapUsd: number;
    monthlySpendUsd: number;
    throttleMode: ThrottleModeType;
    now: number;
  }): SeatTierEntitlement {
    const { tier, role, orgId, orgName, memberId, monthlySpendCapUsd, monthlySpendUsd, throttleMode, now } = params;
    const isCapped = monthlySpendUsd >= monthlySpendCapUsd;

    switch (tier) {
      case 'apex':
        return {
          tier: 'apex',
          tierLabel: 'Apex Sovereign (Dedicated Cluster)',
          orgId,
          orgName: orgName || 'Apex Sovereign Workspace',
          memberId,
          role,
          isPriorityUser: true,
          priorityWeight: 3.0,
          concurrencyLimit: 500,
          maxTokensAllowed: 128_000,
          allowedModels: TIER_MODEL_WHITELIST.apex,
          deepReasoningAllowed: true,
          spendCapUsd: monthlySpendCapUsd || 10000.0,
          currentSpendUsd: monthlySpendUsd,
          creditsIncludedUsd: 5000.0,
          throttleMode,
          isCapped: throttleMode === 'hard_stop' && isCapped,
          zdrRequired: true,
          hipaaCompliant: true,
          promptCacheRebatePct: 100,
          cachedAtMs: now
        };

      case 'enterprise':
        return {
          tier: 'enterprise',
          tierLabel: 'Enterprise Fleet (Sovereign Governance)',
          orgId,
          orgName: orgName || 'Enterprise Workspace',
          memberId,
          role,
          isPriorityUser: true,
          priorityWeight: 2.5,
          concurrencyLimit: 200,
          maxTokensAllowed: 65_536,
          allowedModels: TIER_MODEL_WHITELIST.enterprise,
          deepReasoningAllowed: true,
          spendCapUsd: monthlySpendCapUsd || 2500.0,
          currentSpendUsd: monthlySpendUsd,
          creditsIncludedUsd: 600.0,
          throttleMode,
          isCapped: throttleMode === 'hard_stop' && isCapped,
          zdrRequired: true,
          hipaaCompliant: true,
          promptCacheRebatePct: 85,
          cachedAtMs: now
        };

      case 'small-business':
        return {
          tier: 'small-business',
          tierLabel: 'Small Business & Squads',
          orgId,
          orgName: orgName || 'Engineering Squad',
          memberId,
          role,
          isPriorityUser: true,
          priorityWeight: 1.5,
          concurrencyLimit: 50,
          maxTokensAllowed: 32_768,
          allowedModels: TIER_MODEL_WHITELIST['small-business'],
          deepReasoningAllowed: true,
          spendCapUsd: monthlySpendCapUsd || 250.0,
          currentSpendUsd: monthlySpendUsd,
          creditsIncludedUsd: 100.0,
          throttleMode,
          isCapped: throttleMode === 'hard_stop' && isCapped,
          zdrRequired: false,
          hipaaCompliant: false,
          promptCacheRebatePct: 75,
          cachedAtMs: now
        };

      case 'developer':
      default:
        return {
          tier: 'developer',
          tierLabel: 'Solo Developer Seat',
          orgId,
          orgName: orgName || 'Developer Workspace',
          memberId,
          role,
          isPriorityUser: false,
          priorityWeight: 1.0,
          concurrencyLimit: 20,
          maxTokensAllowed: 16_384,
          allowedModels: TIER_MODEL_WHITELIST.developer,
          deepReasoningAllowed: true,
          spendCapUsd: monthlySpendCapUsd || 25.0,
          currentSpendUsd: monthlySpendUsd,
          creditsIncludedUsd: 5.0,
          throttleMode,
          isCapped: throttleMode === 'hard_stop' && isCapped,
          zdrRequired: false,
          hipaaCompliant: false,
          promptCacheRebatePct: 75,
          cachedAtMs: now
        };
    }
  }

  /**
   * Validates whether the requested model is permitted under the caller's seat tier.
   */
  public validateModelEntitlement(entitlement: SeatTierEntitlement, requestedModel: string): void {
    const cleanModel = requestedModel.toLowerCase().trim();
    const isAllowed = entitlement.allowedModels.some(
      (m) => m === cleanModel || cleanModel.includes(m) || m.includes(cleanModel)
    );

    if (!isAllowed) {
      const allowedList = entitlement.allowedModels.slice(0, 3).join(', ');
      throw new Error(
        `TIER_MODEL_RESTRICTED: Model '${requestedModel}' requires an upgraded Small Business or Enterprise seat license. (Available on your ${entitlement.tierLabel}: ${allowedList})`
      );
    }
  }

  /**
   * Generates a safe, sanitized JSON summary of the caller's seat subscription for frontend badges and telemetry.
   */
  public getPublicSummary(entitlement: SeatTierEntitlement, authenticated: boolean): SeatTierPublicSummary {
    const remaining = Math.max(0, entitlement.spendCapUsd - entitlement.currentSpendUsd);
    const userId = entitlement.memberId || entitlement.orgId || (authenticated ? entitlement.role : 'anonymous_developer');
    const windows = this.calculateRollingWindows(userId, entitlement.tier);

    return {
      authenticated,
      tier: entitlement.tier,
      tierLabel: entitlement.tierLabel,
      seatRole: entitlement.role,
      orgName: entitlement.orgName,
      priorityLane: entitlement.isPriorityUser,
      maxTokens: entitlement.maxTokensAllowed,
      deepReasoning: entitlement.deepReasoningAllowed,
      monthlyCreditsIncludedUsd: entitlement.creditsIncludedUsd,
      spendCapUsd: entitlement.spendCapUsd,
      currentSpendUsd: entitlement.currentSpendUsd,
      remainingSpendUsd: remaining,
      allowedModels: entitlement.allowedModels,
      isCapped: entitlement.isCapped,
      promptCacheRebatePct: entitlement.promptCacheRebatePct,
      concurrencyLimit: entitlement.concurrencyLimit,
      activeConcurrentStreams: this.getActiveStreamCount(userId),
      zdrRequired: entitlement.zdrRequired,
      hipaaCompliant: entitlement.hipaaCompliant,
      fiveHourWindow: windows.fiveHourWindow,
      weeklyWindow: windows.weeklyWindow
    };
  }

  /**
   * Atomically records a token draw against the user's active seat tier and spend cap in real-time.
   */
  public async recordSeatTokenDraw(userId: string, costUsd: number): Promise<void> {
    if (costUsd <= 0 || !userId || userId === 'anonymous_developer') return;

    // Update in-memory L1 hot cache immediately
    const cached = this.entitlementCache.get(userId);
    if (cached) {
      cached.currentSpendUsd += costUsd;
      if (cached.throttleMode === 'hard_stop' && cached.currentSpendUsd >= cached.spendCapUsd) {
        cached.isCapped = true;
      }
      this.entitlementCache.put(userId, cached);
    }

    // Increment member spend in PostgreSQL asynchronously
    this.teamRepo.incrementMemberSpend(userId, costUsd).catch(() => {});
  }

  public invalidateUser(userId: string): void {
    this.entitlementCache.delete(userId);
  }

  public invalidateOrg(orgId: string): void {
    const all = this.entitlementCache.query({ where: { orgId: { $eq: orgId } } });
    for (const item of all) {
      this.entitlementCache.delete(item.id);
    }
  }

  private normalizeTier(rawTier?: string): SeatTierType {
    if (!rawTier) return 'developer';
    const lower = rawTier.toLowerCase().trim();
    if (lower.includes('apex') || lower.includes('sovereign')) return 'apex';
    if (lower.includes('enterprise') || lower.includes('fleet')) return 'enterprise';
    if (lower.includes('business') || lower.includes('team') || lower.includes('pro') || lower.includes('squad')) return 'small-business';
    return 'developer';
  }
}

export const galxSeatTierEngine = GalxSeatTierEngine.getInstance();
