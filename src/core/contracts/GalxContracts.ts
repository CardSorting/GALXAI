/**
 * GALXAI: Core Universal Gateway Contracts
 * High-concurrency routing, cryptographic secret vaulting, and circuit governance.
 */

export type ProviderType = 'openai' | 'xai-grok';
export type ShardIsolationMode = 'private' | 'pooled';
export type CredentialStatus = 'healthy' | 'cooldown' | 'exhausted' | 'dead' | 'paused' | 'revoked';
export type GalxRotationStrategy =
  | 'adaptive_headroom'
  | 'smooth_weighted_round_robin'
  | 'least_utilized'
  | 'priority_failover';
export type AuthType = 'oauth' | 'api_key';

export interface TokenBucketState {
  readonly maxTokens: number;
  readonly remainingTokens: number;
  readonly refillRatePerMinute: number;
  readonly maxRequests: number;
  readonly remainingRequests: number;
  readonly lastRefillTimestampMs: number;
  readonly reservedTokens?: number;
}

export interface ShardUsageStats {
  readonly totalRequestsServed: number;
  readonly totalTokensConsumed: number;
  readonly consecutiveFailures: number;
  readonly consecutiveSuccesses?: number;
  readonly lastUsedTimestampMs?: number;
  readonly averageLatencyMs?: number;
  readonly lastLatencyMs?: number;
  readonly successfulRequests?: number;
  readonly failedRequests?: number;
}

export interface EncryptedSecretPayload {
  readonly ciphertext: string;
  readonly iv: string;
  readonly tag: string;
  readonly keyVersion?: string;
}

export interface DecryptedGalxSecret {
  readonly accessToken?: string;
  readonly apiKey?: string;
  readonly refreshToken?: string;
  readonly expiresAtMs?: number;
  readonly accountId?: string;
  readonly tenantUid?: string;
  readonly email?: string;
  readonly name?: string;
}

export interface GalxShardAccount {
  readonly id: string;
  readonly userId: string;
  readonly provider: ProviderType;
  readonly authType: AuthType;
  readonly accountLabel: string;
  readonly apiKeyMasked: string;
  readonly encryptedPayload?: EncryptedSecretPayload;
  readonly encryptedSecrets?: EncryptedSecretPayload;
  readonly shardMode?: ShardIsolationMode;
  readonly priority: number; // 1-100 (higher = priority)
  readonly weight: number; // 1-10 (traffic share)
  readonly status: CredentialStatus;
  readonly tokenBucket: TokenBucketState;
  readonly stats: ShardUsageStats;
  readonly fencingToken?: number;
  readonly permissionRetracted?: boolean;
  readonly cooldownUntilMs?: number;
  readonly cooldownUntilTimestampMs?: number;
  readonly createdAtMs: number;
  readonly updatedAtMs: number;
}

export interface ShardLease {
  readonly leaseId: string;
  readonly shardId: string;
  readonly userId: string;
  readonly jobId?: string;
  readonly fencingToken: number;
  readonly acquiredAtMs: number;
  expiresAtMs: number;
  readonly estimatedTokens: number;
  readonly account: GalxShardAccount;
}

export interface ExecutionLease {
  readonly leaseId: string;
  readonly shardId: string;
  readonly provider: ProviderType;
  readonly decryptedSecret: DecryptedGalxSecret;
  readonly fencingToken: number;
  readonly expiresAtMs: number;
}

export interface ShardAcquisitionRequest {
  readonly userId: string;
  readonly jobId?: string;
  readonly provider: ProviderType;
  readonly estimatedTokens?: number;
  readonly isPriorityUser?: boolean;
  readonly maxTenantPooledInFlight?: number;
  readonly leaseTtlMs?: number;
  readonly maxInFlightPerShard?: number;
  readonly targetModel?: string;
}

export interface ShardAcquisitionResult {
  readonly lease?: ShardLease;
  readonly reason?: string;
  readonly status?:
    | 'tenant_pool_quota_capped'
    | 'all_shards_cooldown'
    | 'no_healthy_shards'
    | 'success'
    | 'pool_exhausted';
}

export interface CircuitEvaluationResult {
  readonly status: CredentialStatus;
  readonly canAttempt: boolean;
  readonly cooldownMs?: number;
  readonly canaryMultiplier?: number;
}

export interface CircuitFailureClassification {
  readonly newStatus: CredentialStatus;
  readonly cooldownMs?: number;
  readonly reason: string;
  readonly isPermanent?: boolean;
}

export interface PoolStats {
  readonly totalShards: number;
  readonly healthyShards: number;
  readonly cooldownShards: number;
  readonly exhaustedShards: number;
  readonly deadShards?: number;
  readonly totalTokensAvailable?: number;
  readonly totalMaxTokens?: number;
  readonly totalRequestsServed?: number;
  readonly totalTokensConsumed?: number;
  readonly totalTokensServedLifetime?: number;
  readonly totalRequestsServedLifetime?: number;
  readonly tokensPerMinuteThroughput?: number;
  readonly averageFleetLatencyMs?: number;
  readonly activeLeases?: number;
  readonly activeLeasesCount?: number;
  readonly rotationStrategy: GalxRotationStrategy;
  readonly totalPooledShards?: number;
  readonly totalPrivateShards?: number;
  readonly providerBreakdown?: {
    openai: { total: number; healthy: number };
    'xai-grok': { total: number; healthy: number };
  };
}

export interface GatewayApiKey {
  readonly id: string;
  readonly keyHash: string;
  readonly prefix: string;
  readonly keyPrefix?: string;
  readonly name: string;
  readonly userId: string;
  readonly rateLimitPerMinute: number;
  readonly totalRequests: number;
  readonly totalTokens: number;
  readonly createdAtMs: number;
  readonly lastUsedAtMs?: number;
  readonly revoked: boolean;
}

export type DeveloperGatewayKey = GatewayApiKey;

export interface ModelSpecItem {
  readonly id: string;
  readonly upstreamId: string;
  readonly name: string;
  readonly provider: ProviderType;
  readonly category: 'llm' | 'image' | 'embedding';
  readonly contextWindowTokens: number;
  readonly maxOutputTokens: number;
  readonly inputPricePer1M: number;
  readonly outputPricePer1M: number;
  readonly listPricePer1MInput?: number;
  readonly listPricePer1MOutput?: number;
  readonly cachedInputPricePer1M?: number;
  readonly discountPercentage?: number;
  readonly supportsVision: boolean;
  readonly supportsReasoning: boolean;
  readonly supportsStreaming: boolean;
  readonly description: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'developer';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  name?: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  max_tokens?: number;
  max_completion_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  user?: string;
}

export interface ImageGenerationRequest {
  prompt: string;
  model?: string;
  n?: number;
  size?: string;
  quality?: 'standard' | 'hd';
  aspect_ratio?: string;
  response_format?: 'url' | 'b64_json';
  user?: string;
}

export interface ImageGenerationResponse {
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
  modelUsed: string;
  shardId: string;
}

export interface UpstreamRateLimitHeaders {
  readonly limitRequests?: number;
  readonly limitTokens?: number;
  readonly remainingRequests?: number;
  readonly remainingTokens?: number;
  readonly resetRequestsMs?: number;
  readonly resetTokensMs?: number;
}
