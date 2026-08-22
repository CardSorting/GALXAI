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
  readonly nowMs?: number;
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
  response_format?: any;
  tools?: any[];
  tool_choice?: any;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
      refusal?: string | null;
      tool_calls?: any[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_tokens_details?: {
      cached_tokens?: number;
    };
  };
  shardId?: string;
  modelUsed?: string;
  provider?: ProviderType;
}

export interface ChatCompletionChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string | null;
      tool_calls?: any[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
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

export type SessionStatus = 'active' | 'expired' | 'revoked';

export interface AuthSessionClaims {
  readonly sub: string; // User ID
  readonly email?: string;
  readonly name?: string;
  readonly provider: ProviderType | 'guest';
  readonly shardId?: string;
  readonly shardMode?: ShardIsolationMode;
  readonly role?: 'developer' | 'admin' | 'owner' | 'viewer';
  readonly workspaceId?: string;
  readonly scopes?: string[]; // e.g. ['*'] or ['chat:*', 'images:*']
  readonly sudoUntilMs?: number; // SUDO elevation expiration
  readonly iat: number; // Issued at timestamp ms
  readonly exp: number; // Expiration timestamp ms
  readonly jti: string; // Cryptographic nonce
  readonly iss: string; // Issuer e.g. 'galxai-auth-v2'
  readonly fpt?: string; // Client environment fingerprint hash (DPoP)
  readonly familyId?: string; // Session lineage family ID
  readonly seq?: number; // Monotonic sequence counter
  readonly version?: 'v1' | 'v2';
}

export interface GalxUserSession {
  readonly id: string;
  readonly userId: string;
  readonly provider: ProviderType | 'guest';
  readonly shardId?: string;
  readonly sessionFamilyId?: string;
  readonly sequenceNumber?: number;
  readonly scopes?: string[];
  readonly sudoElevatedUntilMs?: number;
  readonly riskScore?: number;
  readonly tokenHash: string;
  readonly previousTokenHash?: string;
  readonly gracePeriodUntilMs?: number;
  readonly refreshTokenHash?: string;
  readonly fingerprintHash?: string;
  readonly workspaceId?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly isRevoked: boolean;
  readonly revokedAt?: string;
  readonly revokedReason?: string;
  readonly issuedAtMs: number;
  readonly expiresAtMs: number;
  readonly lastActiveAtMs: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SessionDeviceInfo {
  readonly id: string;
  readonly userId: string;
  readonly provider: ProviderType | 'guest';
  readonly shardId?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly browser: string;
  readonly os: string;
  readonly isCurrent: boolean;
  readonly sudoActive: boolean;
  readonly riskScore: number;
  readonly lastActiveAtMs: number;
  readonly expiresAtMs: number;
  readonly createdAt: string;
}

export interface UserSecurityPosture {
  readonly overallGrade: 'A+' | 'A' | 'B' | 'C';
  readonly riskScore: number;
  readonly riskLevel: 'low' | 'medium' | 'high' | 'critical';
  readonly activeSessionsCount: number;
  readonly sudoActive: boolean;
  readonly sudoExpiresInMs: number;
  readonly primaryKeyringVersion: string;
  readonly recommendations: string[];
  readonly lastAuditedAt: string;
}

export interface SudoElevationResult {
  readonly success: boolean;
  readonly sudoActive: boolean;
  readonly sudoElevatedUntilMs: number;
  readonly expiresInMs: number;
  readonly error?: string;
}

export interface RestrictedTokenParams {
  readonly scopes: string[]; // e.g. ['chat:*']
  readonly ttlMs?: number; // e.g. 3600000 (1 hour)
  readonly name?: string;
}

export interface RestrictedTokenResult {
  readonly success: boolean;
  readonly token?: string;
  readonly scopes?: string[];
  readonly expiresAtMs?: number;
  readonly error?: string;
}

export interface SessionRiskEvaluation {
  readonly riskScore: number; // 0 - 100
  readonly riskLevel: 'low' | 'medium' | 'high' | 'critical';
  readonly isHighRisk: boolean;
  readonly riskFactors: string[];
}

export interface SessionRotationResult {
  readonly success: boolean;
  readonly token?: string;
  readonly expiresAtMs?: number;
  readonly claims?: AuthSessionClaims;
  readonly reuseDetected?: boolean;
  readonly error?: string;
}

export interface AuthIdentityResult {
  readonly authenticated: boolean;
  readonly userId: string;
  readonly authType: 'developer_key' | 'session_token' | 'anonymous';
  readonly isPriorityUser: boolean;
  readonly isSudoElevated?: boolean;
  readonly scopes?: string[];
  readonly claims?: AuthSessionClaims;
  readonly apiKey?: DeveloperGatewayKey;
  readonly session?: GalxUserSession;
  readonly error?: string;
}

export interface ProviderAuthParams {
  readonly apiKey?: string;
  readonly email?: string;
  readonly displayName?: string;
  readonly mode?: ShardIsolationMode;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly workspaceId?: string;
  readonly scopes?: string[];
}

export interface ProviderAuthResult {
  readonly success: boolean;
  readonly user: {
    readonly id: string;
    readonly email: string;
    readonly name: string;
    readonly provider: ProviderType | 'guest';
    readonly shardId: string;
    readonly shardMode: ShardIsolationMode;
    readonly token: string;
    readonly scopes: string[];
    readonly expiresAtMs: number;
  };
  readonly error?: string;
}

export * from './GalxQueueContracts';




