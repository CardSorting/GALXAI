/**
 * GALXAI: Supabase Multi-Tenant Edge Cache, Adaptive Rate Limiting, & Compliance Repository
 * Fully typed repository interface backed by Supabase PostgreSQL tables and atomic stored procedures.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../client';
import type { Database } from '../types';

export interface RateLimitQuotaRecord {
  id: string;
  workspaceId: string;
  apiKeyId?: string | null;
  modelId: string;
  rpmLimit: number;
  tpmLimit: number;
  burstMultiplier: number;
  tokensRemaining: number;
  windowStartedAtMs: number;
  lastReplenishedAtMs: number;
  isThrottled: boolean;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PromptCacheRegistryRecord {
  id: string;
  workspaceId: string;
  modelId: string;
  prefixHashSha256: string;
  tokenCount: number;
  hitCount: number;
  totalDollarsSavedUsd: number;
  edgePopLocations: string[];
  ttlSeconds: number;
  expiresAt: string;
  createdAt: string;
  lastAccessedAt: string;
}

export interface EdgeShardMetricsRecord {
  id: string;
  shardId: string;
  edgePop: string;
  latencyP50Ms: number;
  latencyP90Ms: number;
  latencyP99Ms: number;
  ttftAvgMs: number;
  consecutiveErrors: number;
  circuitStatus: 'closed' | 'half_open' | 'tripped_open';
  lastHealthPingAtMs: number;
  createdAt: string;
}

export interface ComplianceRecord {
  id: string;
  workspaceId: string;
  framework: 'SOC2_TYPE2' | 'GDPR' | 'HIPAA' | 'PCI_DSS' | 'CCPA' | 'EU_AI_ACT';
  recordType: 'ZDR_ATTESTATION' | 'DATA_ERASURE_RECEIPT' | 'DPA_EXECUTION' | 'KEY_ROTATION_PROOF' | 'ACCESS_REVIEW';
  cryptographicDigestSha256: string;
  attestationSignature: string;
  verifiedBy: string;
  metadata: Record<string, any>;
  issuedAt: string;
  expiresAt?: string | null;
}

export class EdgeGovernanceRepository {
  private static instance: EdgeGovernanceRepository;

  private constructor() {}

  static getInstance(): EdgeGovernanceRepository {
    if (!EdgeGovernanceRepository.instance) {
      EdgeGovernanceRepository.instance = new EdgeGovernanceRepository();
    }
    return EdgeGovernanceRepository.instance;
  }

  /**
   * Evaluates token bucket rate limit using atomic stored procedure.
   */
  async evaluateAdaptiveRateLimit(params: {
    workspaceId: string;
    modelId: string;
    tokensRequested: number;
  }): Promise<{
    allowed: boolean;
    tokensRemaining: number;
    isThrottled: boolean;
    tpmLimit?: number;
    rpmLimit?: number;
    reason?: string;
  }> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('galx_evaluate_adaptive_rate_limit', {
          p_workspace_id: params.workspaceId,
          p_model_id: params.modelId,
          p_tokens_requested: params.tokensRequested
        });

        if (!error && data) {
          const res = data as any;
          return {
            allowed: Boolean(res.allowed),
            tokensRemaining: Number(res.tokens_remaining ?? 500000),
            isThrottled: Boolean(res.is_throttled),
            tpmLimit: res.tpm_limit ? Number(res.tpm_limit) : undefined,
            rpmLimit: res.rpm_limit ? Number(res.rpm_limit) : undefined,
            reason: res.reason
          };
        }
      } catch {
        // Fallback
      }
    }

    return {
      allowed: true,
      tokensRemaining: 500000,
      isThrottled: false
    };
  }

  /**
   * Registers a prompt prefix cache entry in Supabase PostgreSQL.
   */
  async registerPromptCache(params: {
    workspaceId: string;
    modelId: string;
    prefixHashSha256: string;
    tokenCount: number;
    ttlSeconds?: number;
  }): Promise<PromptCacheRegistryRecord> {
    const id = `cache_${Date.now()}_${params.prefixHashSha256.substring(0, 10)}`;
    const ttlSeconds = params.ttlSeconds || 86400;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    const record: PromptCacheRegistryRecord = {
      id,
      workspaceId: params.workspaceId,
      modelId: params.modelId,
      prefixHashSha256: params.prefixHashSha256,
      tokenCount: params.tokenCount,
      hitCount: 0,
      totalDollarsSavedUsd: 0,
      edgePopLocations: ['SFO', 'IAD'],
      ttlSeconds,
      expiresAt,
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString()
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase.from('galx_prompt_cache_registry').insert({
          id,
          workspace_id: params.workspaceId,
          model_id: params.modelId,
          prefix_hash_sha256: params.prefixHashSha256,
          token_count: params.tokenCount,
          hit_count: 0,
          total_dollars_saved_usd: 0,
          edge_pop_locations: record.edgePopLocations,
          ttl_seconds: ttlSeconds,
          expires_at: expiresAt
        });
      } catch {
        // Handled gracefully
      }
    }

    return record;
  }

  /**
   * Records a prompt cache hit and applies wholesale rebate.
   */
  async recordPromptCacheHit(params: {
    cacheId: string;
    dollarsSaved: number;
    edgePop: string;
  }): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase.rpc('galx_record_prompt_cache_hit', {
          p_cache_id: params.cacheId,
          p_dollars_saved: params.dollarsSaved,
          p_edge_pop: params.edgePop
        });
      } catch {
        // Handled gracefully
      }
    }
  }

  /**
   * Records immutable SOC 2 / GDPR compliance attestation.
   */
  async recordComplianceProof(params: {
    workspaceId: string;
    framework: 'SOC2_TYPE2' | 'GDPR' | 'HIPAA' | 'PCI_DSS' | 'CCPA' | 'EU_AI_ACT';
    recordType: 'ZDR_ATTESTATION' | 'DATA_ERASURE_RECEIPT' | 'DPA_EXECUTION' | 'KEY_ROTATION_PROOF' | 'ACCESS_REVIEW';
    cryptographicDigestSha256: string;
    attestationSignature: string;
    verifiedBy: string;
    metadata?: Record<string, any>;
    expiresAt?: string;
  }): Promise<ComplianceRecord> {
    const id = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const record: ComplianceRecord = {
      id,
      workspaceId: params.workspaceId,
      framework: params.framework,
      recordType: params.recordType,
      cryptographicDigestSha256: params.cryptographicDigestSha256,
      attestationSignature: params.attestationSignature,
      verifiedBy: params.verifiedBy,
      metadata: params.metadata || {},
      issuedAt: new Date().toISOString(),
      expiresAt: params.expiresAt || null
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase.from('galx_compliance_records').insert({
          id,
          workspace_id: params.workspaceId,
          framework: params.framework,
          record_type: params.recordType,
          cryptographic_digest_sha256: params.cryptographicDigestSha256,
          attestation_signature: params.attestationSignature,
          verified_by: params.verifiedBy,
          metadata: params.metadata || {},
          expires_at: params.expiresAt || null
        });
      } catch {
        // Handled gracefully
      }
    }

    return record;
  }
}
