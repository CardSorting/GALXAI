/**
 * GALXAI: Core Universal Gateway Contracts
 * High-concurrency routing, cryptographic secret vaulting, and circuit governance.
 */

export type ProviderType = 'openai';
export type ShardIsolationMode = 'private' | 'pooled';
export type CredentialStatus =
  | 'healthy'
  | 'warming_up'
  | 'half_open'
  | 'cooldown'
  | 'exhausted'
  | 'dead'
  | 'paused'
  | 'revoked'
  | 'soft_draining'
  | 'quarantined';
export type GalxRotationStrategy =
  | 'adaptive_headroom'
  | 'smooth_weighted_round_robin'
  | 'least_utilized'
  | 'priority_failover';
export type AuthType = 'oauth' | 'api_key';

export interface SlidingWindowQuotaState {
  readonly windowDurationMs: number; // e.g. 5 * 3600 * 1000 (5 hours) or 3600000 (1 hour)
  readonly maxRequestsPerWindow: number; // e.g. 5 or 40
  readonly usedRequestsInWindow: number;
  readonly windowStartTimestampMs: number;
  readonly requestHistoryTimestampsMs: number[];
  readonly dynamicDiscoveredCap?: number;
  readonly lastExhaustionResetAtMs?: number;
}

export type FailureClassificationCategory =
  | 'request_rejected'
  | 'cancelled'
  | 'rolling_window_exhausted'
  | 'tpm_rpm_rate_limited'
  | 'billing_depleted'
  | 'model_incompatible'
  | 'auth_terminal'
  | 'origin_overloaded'
  | 'socket_timeout'
  | 'transient_5xx'
  | 'unknown';

export interface DeadlineConfig {
  readonly connectTimeoutMs?: number;
  readonly ttftTimeoutMs?: number;
  readonly intraChunkTimeoutMs?: number;
}

export interface HedgingOptions {
  readonly enabled?: boolean;
  readonly triggerDelayMs?: number;
  readonly maxHedgedAttempts?: number;
}

export interface AdmissionQueueConfig {
  readonly maxQueueDepth?: number;
  readonly maxWaitTimeoutMs?: number;
  readonly priorityBoost?: boolean;
}

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

export type PrivacyProfileType =
  | 'standard'
  | 'hipaa'
  | 'hipaa_strict'
  | 'gdpr'
  | 'gdpr_eu'
  | 'lgpd_brazil'
  | 'pipeda_canada'
  | 'appi_japan'
  | 'australia_privacy'
  | 'swiss_fadp'
  | 'singapore_pdpa'
  | 'zdr'
  | 'confidential'
  | 'strict'
  | 'fintech_pci'
  | 'maximum_shield';

export type DataResidencyRegion = 'global' | 'eu' | 'us' | 'apac' | 'latam' | 'ca' | 'ch' | 'uk';

export interface PrivacyCapabilities {
  readonly hipaaCompliant: boolean;
  readonly zdrCertified: boolean;
  readonly dataResidency: DataResidencyRegion;
  readonly baaSigned: boolean;
  readonly piiFiltering: boolean;
}

export interface StreamingDeidentifyWindowOptions {
  readonly windowSizeChars?: number;
  readonly flushTimeoutMs?: number;
}

export interface ComplianceProvenanceMetadata {
  readonly watermarkId: string;
  readonly provenanceSha256: string;
  readonly syntheticClassification: 'fully_synthetic' | 'hybrid_assisted' | 'verifiable_attested';
  readonly humanOversightLevel: 'none' | 'monitored' | 'required_clinical_review';
  readonly jurisdiction: string;
  readonly generatedAt: string;
}

export interface PrivacyOptions {
  readonly profile?: PrivacyProfileType;
  readonly deidentifyPhi?: boolean;
  readonly piiMasking?: boolean;
  readonly dataResidency?: DataResidencyRegion;
  readonly zdr?: boolean;
  readonly optOutSale?: boolean;
  readonly syntheticWatermark?: boolean;
  readonly preserveTokenMapInMemory?: boolean;
  readonly allowModelTraining?: boolean;
  readonly streamingWindow?: StreamingDeidentifyWindowOptions;
}

export type ReasoningParadigm =
  | 'deductive_formal_proof'
  | 'inductive_code_synthesis'
  | 'abductive_root_cause_diagnosis'
  | 'first_principles_decomposition'
  | 'counterfactual_critique'
  | 'direct_factual_qa'
  | 'creative_generative';

export type VerifiabilityRating =
  | 'programmatically_executable'
  | 'symbolically_checkable'
  | 'empirically_verifiable'
  | 'subjective_creative';

export type CurriculumTier =
  | 'tier_1_foundational'
  | 'tier_2_intermediate'
  | 'tier_3_advanced'
  | 'tier_4_expert_competition'
  | 'tier_5_frontier_research'
  | 'tier_1_facts'
  | 'tier_2_reasoning'
  | 'tier_3_code'
  | 'tier_4_frontier'
  | 'tier_5_agentic';

export interface FrontierTaxonomyLabel {
  readonly primaryDomain: string;        // e.g. 'code.rust', 'code.typescript', 'math.algebra', 'finance.tax', 'general'
  readonly rootDomain: string;           // 'code', 'math', 'finance', 'cybersecurity', 'general'
  readonly subDomain: string;            // 'rust', 'typescript', 'algebra', 'tax', 'qa'
  readonly microSpecialty: string;       // e.g. 'memory_safety_concurrency', 'type_gymnastics_async'
  readonly taskType: 'code_generation' | 'debugging' | 'refactoring' | 'explanation' | 'qa' | 'summarization' | 'tool_invocation';
  readonly reasoningParadigm: ReasoningParadigm;
  readonly verifiability: VerifiabilityRating;
  readonly curriculumTier: CurriculumTier;
  readonly educationalValueScore: number; // 1.00 - 5.00 (FineWeb-Edu standard)
  readonly responseRigorScore: number;   // 0.00 - 1.00
  readonly instructionDifficulty: number; // 1.0 - 5.0
  readonly informationDensityScore: number; // 0.00 - 1.00
  readonly noveltyScore: number;         // 0.00 - 1.00 (MinHash LSH Jaccard novelty)
  readonly clusterCentroidId: string;
  readonly minHashSignature: string;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly piiRedacted: boolean;
  readonly isRefusal: boolean;
  readonly language: string;             // 'en', 'zh', 'ja', etc.
  readonly provenanceHmac: string;       // SHA-256 HMAC
  readonly taxonomyBitmask: string;      // 64-bit compact hex signature
  readonly lexicalMetrics?: {
    readonly mtld: number;
    readonly hdd: number;
    readonly yulesK: number;
    readonly maas: number;
    readonly shannonEntropy: number;
  };
  readonly backtrackingCount?: number;
  readonly crucibleDebate?: boolean;
}


export type LeanTrainingTaxonomy = FrontierTaxonomyLabel;

export interface DistilledTrainingPair {
  readonly id: string;
  readonly source: 'web_chat' | 'internal_distillation';
  readonly modelId: string;
  readonly messages: Array<{
    readonly role: 'system' | 'user' | 'assistant';
    readonly content: string;
    readonly lossWeight?: number;
  }>;
  readonly qualityScore: number;
  readonly piiRedacted: boolean;
  readonly entitiesScrubbedCount: number;
  readonly estimatedTokens: number;
  readonly promptTokens?: number;
  readonly completionTokens?: number;
  readonly taxonomy?: FrontierTaxonomyLabel;
  readonly timestamp: string;
}

export interface DistilledDPOPair {
  readonly id: string;
  readonly source: 'web_chat_swipe' | 'user_rating' | 'synthetic_critique';
  readonly modelId: string;
  readonly prompt: string;
  readonly chosen: string;
  readonly rejected: string;
  readonly qualityDelta: number;
  readonly piiRedacted: boolean;
  readonly taxonomy?: FrontierTaxonomyLabel;
  readonly timestamp: string;
}

export interface DistilledKTOPair {
  readonly id: string;
  readonly source: 'user_thumb_rating' | 'feedback_vote';
  readonly modelId: string;
  readonly prompt: string;
  readonly completion: string;
  readonly label: boolean; // true = desirable, false = undesirable
  readonly klWeight: number; // Prospect theory multiplier (e.g. 1.0 desirable, 1.33 loss aversion undesirable)
  readonly piiRedacted: boolean;
  readonly taxonomy?: FrontierTaxonomyLabel;
  readonly timestamp: string;
}

export interface MicroBatchPacket {
  readonly batchId: string;
  readonly totalSamples: number;
  readonly totalPackedTokens: number;
  readonly sequenceLength: number;
  readonly targetModels: string[];
  readonly dominantDomain?: string;
  readonly averageEducationalScore?: number;
  readonly datasetType: 'sft' | 'dpo' | 'kto' | 'hybrid';
  readonly samples: any[];
  readonly differentialPrivacyEpsilon: number;
  readonly createdAt: string;
}

export interface TrainingStreamTelemetry {
  readonly active: boolean;
  readonly totalInteractionsSeen: number;
  readonly totalSamplesDistilled: number;
  readonly totalDPOPairsDistilled: number;
  readonly totalKTOPairsDistilled: number;
  readonly totalTokensCaptured: number;
  readonly totalPIIRedactedCount: number;
  readonly totalOptOutBypasses: number;
  readonly totalApiPrivateBypasses: number;
  readonly bloomFilterChecks: number;
  readonly bloomDuplicatesFiltered: number;
  readonly simHashDuplicatesFiltered: number;
  readonly inMemorySFTTableSize: number;
  readonly inMemoryDPOTableSize: number;
  readonly inMemoryKTOTableSize: number;
  readonly inMemoryMicroBatchesCompiled: number;
  readonly inMemoryBufferCapacity: number;
  readonly differentialPrivacyBudget: {
    readonly epsilon: number;
    readonly delta: number;
  };
  readonly lastIngestedAt: string | null;
}

export interface PHIEntity {
  readonly type: string;
  readonly originalText: string;
  readonly redactedToken: string;
  readonly startIndex: number;
  readonly endIndex: number;
  readonly category: 'hipaa_safe_harbor_18' | 'eu_gdpr_pii' | 'financial_pci' | 'global_privacy_id';
}

export interface RedactionResult {
  readonly sanitizedText: string;
  readonly entitiesDetected: PHIEntity[];
  readonly hasPhi: boolean;
  readonly hasPii: boolean;
  readonly hasPci?: boolean;
  readonly tokenMap?: Record<string, string>;
}

export interface DSARDataExport {
  readonly userId: string;
  readonly exportedAt: string;
  readonly legalBasis: string;
  readonly sessions: any[];
  readonly shards: any[];
  readonly apiKeys: any[];
  readonly auditLogReferences: Array<{ id: string; action: string; timestamp: string }>;
  readonly complianceCertifications: string[];
}

export interface DSARPurgeResult {
  readonly success: boolean;
  readonly userId: string;
  readonly purgedAt: string;
  readonly recordsDeleted: {
    readonly sessions: number;
    readonly shards: number;
    readonly apiKeys: number;
    readonly auditLogsAnonymized: number;
  };
  readonly cryptographicProof: string;
}

export interface AuditIntegrityVerificationResult {
  readonly valid: boolean;
  readonly totalEntries: number;
  readonly verifiedEntries: number;
  readonly tamperedEntryId?: string;
  readonly genesisHash: string;
  readonly latestHash: string;
  readonly verificationTimestamp: string;
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
  readonly privacyCapabilities?: PrivacyCapabilities;
  readonly fencingToken?: number;
  readonly permissionRetracted?: boolean;
  readonly expiresAtMs?: number;
  readonly accountId?: string;
  readonly cooldownUntilMs?: number;
  readonly cooldownUntilTimestampMs?: number;
  readonly slidingWindowQuota?: SlidingWindowQuotaState;
  readonly supportedModels?: string[];
  readonly unsupportedModels?: string[];
  readonly flappingCount?: number;
  readonly lastFlappedAtMs?: number;
  readonly outOfBandUsageDetectedAtMs?: number;
  readonly warmupStartedAtMs?: number;
  readonly adaptiveInFlightLimit?: number;
  /** Monotonic PostgreSQL control-plane version; never synthesized by a transport. */
  readonly registryRevision?: number;
  readonly registrySource?: 'api' | 'oauth' | 'operator_import' | 'environment_bootstrap' | 'legacy_migration';
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
  readonly privacyProfile?: PrivacyProfileType;
  readonly hipaaRequired?: boolean;
  readonly dataResidency?: DataResidencyRegion;
  readonly zdrRequired?: boolean;
  readonly targetAccountId?: string;
  readonly targetShardId?: string;
  readonly queueIfExhausted?: boolean;
  readonly maxQueueWaitMs?: number;
  readonly signal?: AbortSignal;
  readonly idempotencyKey?: string;
  readonly tenantId?: string;
  readonly deadlineMs?: number;
}

export interface ShardAcquisitionResult {
  readonly lease?: ShardLease;
  readonly reason?: string;
  readonly status?:
    | 'tenant_pool_quota_capped'
    | 'all_shards_cooldown'
    | 'no_healthy_shards'
    | 'success'
    | 'pool_exhausted'
    | 'privacy_policy_mismatch'
    | 'no_compliant_shards'
    | 'queued'
    | 'queue_timeout'
    | 'cancelled'
    | 'shed_overflow'
    | 'invalid_request'
    | 'authority_unavailable';
  readonly queuedPromise?: Promise<ShardAcquisitionResult>;
  readonly estimatedWaitMs?: number;
  readonly earliestPoolResetMs?: number;
}

export interface CircuitEvaluationResult {
  readonly status: CredentialStatus;
  readonly canAttempt: boolean;
  readonly cooldownMs?: number;
  readonly canaryMultiplier?: number;
  readonly isCanaryCandidate?: boolean;
  readonly remainingWindowRequests?: number;
  readonly windowResetMs?: number;
}

export interface CircuitFailureClassification {
  /** False when a failed request says nothing about provider/account health. */
  readonly affectsHealth?: boolean;
  readonly newStatus: CredentialStatus;
  readonly cooldownMs?: number;
  readonly reason: string;
  readonly isPermanent?: boolean;
  readonly category?: FailureClassificationCategory;
  readonly resetAtTimestampMs?: number;
  readonly retryAfterSeconds?: number;
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
  readonly environment?: 'live' | 'test';
  readonly scopes?: string[];
  readonly ipWhitelist?: string[];
  readonly expiresAtMs?: number;
  readonly description?: string;
  readonly checksum?: string;
  readonly computePool?: 'shared_community' | 'priority_dedicated';
  readonly freeMonthlyGrantUsd?: number;
  readonly defaultCompactionMode?: 'auto' | 'raw';
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

export interface ChatMessageContentPart {
  type: string;
  text?: string;
  image_url?: { url: string };
  prompt_cache_breakpoint?: { mode: 'explicit' };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'developer' | 'tool';
  content: string | ChatMessageContentPart[] | null;
  name?: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  /** GALX logical conversation identity; independent of socket and credential identity. */
  conversation_id?: string;
  /** Explicit lifecycle intent for the logical conversation. */
  session_mode?: 'new' | 'continue' | 'stateless';
  /** Idempotent identity for one user-visible turn. */
  turn_id?: string;
  user_message_id?: string;
  assistant_message_id?: string;
  system?: string | any[];
  prompt?: string | string[];
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  stop?: string | string[];
  max_tokens?: number;
  max_completion_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  user?: string;
  response_format?: any;
  tools?: any[];
  tool_choice?: any;
  store?: boolean;
  prompt_cache_key?: string;
  prompt_cache_options?: {
    mode?: 'implicit' | 'explicit';
    ttl?: '30m';
  };
  safety_identifier?: string;
  privacy?: PrivacyOptions;
  compact_prompts?: boolean;
  enable_prompt_compaction?: boolean;
  compaction_mode?: 'auto' | 'raw';
  transforms?: string[];
  reasoning_effort?: 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'auto';
  extra_body?: any;
}

export type ReasoningEffortLevel = 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'auto';

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
  conversation_id?: string;
  turn_id?: string;
  session_mode?: 'new' | 'continue' | 'stateless';
  privacyProof?: {
    profile: PrivacyProfileType;
    zdrVerified: boolean;
    digest: string;
    dataResidency: DataResidencyRegion;
  };
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
  sessionId?: string;
  idempotencyKey?: string;
  privacy?: PrivacyOptions;
}

export interface ImageGenerationResponse {
  execution?: { requestedModel: string; executionModel: string; routingMode: 'exact' | 'codex_image_tool_alias'; tool?: string; imageModelSelection: string };
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
    asset_id?: string;
    r2_url?: string;
    r2_key?: string;
    user_id?: string;
    session_id?: string;
    content_type?: string;
    size_bytes?: number;
    sha256?: string;
    lqip?: string;
  }>;
  modelUsed: string;
  shardId?: string;
  telemetry?: {
    latencyMs: number;
    cached?: boolean;
    storageMode?: 'cloudflare_r2' | 'local_fallback';
  };
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
  readonly provider: ProviderType;
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
  readonly provider: ProviderType;
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
  readonly provider: ProviderType;
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
  readonly token?: string;
  readonly error?: string;
  readonly rateLimitRemaining?: number;
  readonly rateLimitResetMs?: number;
}

export interface OAuthUrlDetails {
  readonly url: string;
  readonly codeVerifier: string;
  readonly state: string;
}

export interface OAuthAuthorizationRequest {
  readonly id: string;
  readonly state: string;
  readonly codeVerifier: string;
  readonly provider: ProviderType;
  readonly redirectUri: string;
  readonly mode: ShardIsolationMode;
  readonly workspaceId?: string;
  readonly userId?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly isConsumed: boolean;
  readonly consumedAtMs?: number;
  readonly expiresAtMs: number;
  readonly createdAtMs: number;
}

export interface OAuthIdentityRecord {
  readonly id: string;
  readonly userId: string;
  readonly provider: ProviderType;
  readonly providerAccountId: string;
  readonly email: string;
  readonly displayName?: string;
  readonly shardId?: string;
  readonly sessionFamilyId?: string;
  readonly sequenceNumber?: number;
  readonly refreshTokenHash?: string;
  readonly previousRefreshTokenHash?: string;
  readonly gracePeriodUntilMs?: number;
  readonly encryptedAccessToken: EncryptedSecretPayload;
  readonly encryptedRefreshToken?: EncryptedSecretPayload;
  readonly idTokenClaims?: Record<string, any>;
  readonly scopes?: string[];
  readonly expiresAtMs?: number;
  readonly lastRefreshedAtMs?: number;
  readonly status: 'active' | 'expired' | 'revoked' | 'needs_reauth';
  readonly createdAtMs: number;
  readonly updatedAtMs: number;
}

export interface OAuthTokenRecord {
  readonly provider: ProviderType;
  readonly accessToken: string;
  readonly refreshToken?: string;
  readonly idToken?: string;
  readonly accountId?: string;
  readonly email?: string;
  readonly name?: string;
  readonly expiresAtMs: number;
}

export interface OAuthDeviceCodeDetails {
  readonly deviceCode: string;
  readonly userCode: string;
  readonly verificationUri: string;
  readonly verificationUriComplete: string;
  readonly expiresIn: number;
  readonly interval: number;
}

export interface OAuthDeviceCodeRecord {
  readonly id: string;
  readonly deviceCode: string;
  readonly userCode: string;
  readonly provider: ProviderType;
  readonly status: 'pending' | 'approved' | 'denied' | 'expired';
  readonly tokenRecord?: OAuthTokenRecord;
  readonly sessionToken?: string;
  readonly userId?: string;
  readonly workspaceId?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly pollingIntervalSec: number;
  readonly lastPolledAtMs?: number;
  readonly expiresAtMs: number;
  readonly createdAtMs: number;
}

export interface DPoPProofClaims {
  readonly htm: string;
  readonly htu: string;
  readonly iat: number;
  readonly jti: string;
  readonly ath?: string;
}

export interface PushedAuthorizationRequestRecord {
  readonly id: string;
  readonly requestUri: string;
  readonly provider: ProviderType;
  readonly clientId: string;
  readonly redirectUri: string;
  readonly scope?: string;
  readonly codeChallenge?: string;
  readonly codeChallengeMethod?: string;
  readonly state?: string;
  readonly responseType?: string;
  readonly workspaceId?: string;
  readonly isConsumed: boolean;
  readonly consumedAtMs?: number;
  readonly expiresAtMs: number;
  readonly createdAtMs: number;
}

export interface PushedAuthorizationResponse {
  readonly request_uri: string;
  readonly expires_in: number;
}

export interface OAuthExchangeResult {
  readonly success: boolean;
  readonly tokens?: OAuthTokenRecord;
  readonly error?: string;
}

export interface ProviderAuthParams {
  readonly apiKey?: string;
  readonly accessToken?: string;
  readonly refreshToken?: string;
  readonly accountId?: string;
  readonly idToken?: string;
  readonly expiresAtMs?: number;
  readonly authType?: 'oauth' | 'api_key';
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
    readonly provider: ProviderType;
    readonly shardId: string;
    readonly shardMode: ShardIsolationMode;
    readonly token: string;
    readonly scopes: string[];
    readonly expiresAtMs: number;
  };
  readonly error?: string;
}

export interface SOC2ControlMapping {
  readonly controlId: string; // e.g. 'CC6.1', 'CC6.6', 'CC7.2', 'A1.2', 'C1.2', 'PI1.1', 'P3.1'
  readonly criteriaCategory: 'Security' | 'Availability' | 'Confidentiality' | 'Processing Integrity' | 'Privacy';
  readonly controlTitle: string;
  readonly description: string;
  readonly implementationProof: string;
  readonly automatedVerificationStatus: 'verified' | 'enforced' | 'monitored';
  readonly lastAuditTimestamp: string;
}

export interface ThreatDetectionEvent {
  readonly eventId: string;
  readonly threatType: 'THREAT_TOKEN_SPIKE' | 'THREAT_IMPOSSIBLE_TRAVEL' | 'THREAT_FORGED_TOKEN' | 'THREAT_PHI_PROMPT_INJECTION' | 'THREAT_RATE_ANOMALY';
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly userId?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly details: Record<string, any>;
  readonly mitigationAction: 'flagged' | 'throttled' | 'step_up_sudo_required' | 'blocked';
  readonly timestamp: string;
}

export interface SOC2PostureReport {
  readonly overallComplianceScore: number; // 0 - 100
  readonly auditReadinessStatus: 'audit_ready' | 'provisional' | 'remediation_required';
  readonly assessmentTimestamp: string;
  readonly criteriaPillars: {
    readonly security: {
      readonly score: number;
      readonly controlsActive: number;
      readonly totalControls: number;
      readonly accessControlsEnforced: boolean;
      readonly tls13StrictActive: boolean;
      readonly dpopFingerprintingActive: boolean;
    };
    readonly availability: {
      readonly score: number;
      readonly uptimePercentile: number;
      readonly circuitBreakerAutoHealing: boolean;
      readonly multiRegionFailoverActive: boolean;
    };
    readonly confidentiality: {
      readonly score: number;
      readonly zeroDataRetentionEnforced: boolean;
      readonly memoryZeroizationVerified: boolean;
      readonly ephemeralSessionKekActive: boolean;
    };
    readonly processingIntegrity: {
      readonly score: number;
      readonly payloadSchemaValidation: boolean;
      readonly streamingDigestAttestation: boolean;
      readonly slidingWindowPiiFiltering: boolean;
    };
    readonly privacy: {
      readonly score: number;
      readonly hipaaSafeHarbor18Active: boolean;
      readonly gdprDsarAutomated: boolean;
      readonly gpcSecHeaderEnforced: boolean;
      readonly internationalChecksumEngines: number;
    };
  };
  readonly unbrokenAuditChainVerified: boolean;
  readonly auditChainLength: number;
}

export interface SOC2EvidenceDossier {
  readonly dossierId: string;
  readonly tenantId: string;
  readonly generatedAt: string;
  readonly standard: 'AICPA SOC 2 Type II (Trust Services Criteria)';
  readonly periodCoverage: string;
  readonly complianceOfficerSignoff: string;
  readonly controlsVerifiedCount: number;
  readonly controlsMatrix: SOC2ControlMapping[];
  readonly cryptographicProof: {
    readonly auditChainValid: boolean;
    readonly totalEntriesVerified: number;
    readonly latestAuditHash: string;
    readonly zdrAttestationDigestSha256: string;
    readonly dossierSignatureSha256: string;
  };
}

export interface SOC2ControlDriftItem {
  readonly controlId: string;
  readonly criteriaCategory: 'Security' | 'Availability' | 'Confidentiality' | 'Processing Integrity' | 'Privacy';
  readonly controlTitle: string;
  readonly currentStatus: 'compliant' | 'drift_detected' | 'remediated';
  readonly driftReason?: string;
  readonly autoRemediationAvailable: boolean;
  readonly lastEvaluatedTimestamp: string;
}

export interface SOC2DriftReport {
  readonly reportId: string;
  readonly generatedAt: string;
  readonly totalControlsMonitored: number;
  readonly compliantControlsCount: number;
  readonly driftedControlsCount: number;
  readonly overallDriftPosture: 'pristine' | 'minor_drift' | 'critical_drift';
  readonly driftedControls: SOC2ControlDriftItem[];
  readonly cryptographicProof: string;
}

export interface RoPARegisterEntry {
  readonly activityId: string;
  readonly processingPurpose: string;
  readonly legalBasis: 'Article 6(1)(b) Contract' | 'Article 6(1)(f) Legitimate Interest' | 'Article 6(1)(c) Legal Obligation';
  readonly dataSubjectCategories: string[];
  readonly personalDataCategories: string[];
  readonly recipientCategories: string[];
  readonly internationalTransferSafeguards: string;
  readonly retentionPolicy: string;
  readonly technicalSecurityMeasures: string[];
}

export interface RoPAReport {
  readonly organization: string;
  readonly dpoContact: string;
  readonly generatedAt: string;
  readonly gdprArticle: 'Article 30 Records of Processing Activities';
  readonly controllerActivities: RoPARegisterEntry[];
  readonly processorActivities: RoPARegisterEntry[];
  readonly cryptographicSealSha256: string;
}

export interface DataPortabilityPackage {
  readonly schemaVersion: 'https://schema.org/DataFeed';
  readonly userId: string;
  readonly exportedAt: string;
  readonly format: 'JSON-LD / W3C Portable Data Format';
  readonly entities: {
    readonly userProfile: Record<string, any>;
    readonly sessions: any[];
    readonly auditTrail: any[];
    readonly modelUsageSummaries: any[];
  };
  readonly digitalSignatureSha256: string;
}

export interface HIPAAReidentificationRiskResult {
  readonly evaluatedTextLength: number;
  readonly reidentificationRiskScore: number; // 0.0000 to 1.0000
  readonly meetsExpertDeterminationThreshold: boolean; // score < 0.04 (HHS guidance)
  readonly quasiIdentifiersDetected: Array<{ type: string; snippet: string; entropyScore: number }>;
  readonly recommendedDeidentificationStrategy: 'safe_harbor_18_sufficient' | 'expert_determination_approved' | 'additional_generalization_required';
  readonly assessmentTimestamp: string;
}

export interface EUAIActAnnexIVDossier {
  readonly dossierId: string;
  readonly modelId: string;
  readonly generalDescription: string;
  readonly classification: 'General Purpose AI (GPAI) with Systemic Risk' | 'High-Risk AI System' | 'Minimal Risk';
  readonly technicalDocumentation: {
    readonly dataGovernance: {
      readonly trainingDataProvenance: string;
      readonly copyrightComplianceVerified: boolean;
      readonly privacyPreflightActive: boolean;
    };
    readonly cybersecurityArchitecture: {
      readonly inFlightEncryption: string;
      readonly memoryZeroizationProtocol: string;
      readonly continuousThreatMonitoring: boolean;
    };
    readonly humanOversightMeasures: {
      readonly interventionCapability: string;
      readonly auditTrailIntegrity: string;
    };
    readonly energyAndEfficiencyMetrics: {
      readonly estimatedFlops: string;
      readonly latencyP99Ms: number;
    };
  };
  readonly complianceOfficerSignoff: string;
  readonly cryptographicProofSha256: string;
}

export interface OSCALAssessmentReport {
  readonly oscalVersion: '1.0.0';
  readonly assessmentPlan: {
    readonly id: string;
    readonly title: string;
    readonly assessedFrameworks: string[];
    readonly controlsCount: number;
    readonly results: Array<{
      readonly controlId: string;
      readonly status: 'satisfied' | 'not-satisfied';
      readonly implementationReference: string;
    }>;
  };
  readonly digitalSignatureSha256: string;
}

export interface SecurityProbeResult {
  readonly probeId: string;
  readonly totalProbesExecuted: number;
  readonly totalProbesBlocked: number;
  readonly mitigationRatePercent: number; // 100%
  readonly probes: Array<{
    readonly attackVector: 'SQL_INJECTION' | 'PROMPT_INJECTION_PHI' | 'FORGED_JWE_TOKEN' | 'EXPIRED_SUDO_ELEVATION' | 'TOKEN_BURST_FLOOD';
    readonly payloadSnippet: string;
    readonly outcome: 'blocked' | 'throttled' | 'mitigated';
    readonly ruleEnforced: string;
  }>;
  readonly allProbesPassed: boolean;
  readonly executedAt: string;
}

export interface MerkleAuditLeaf {
  readonly id: string;
  readonly action: string;
  readonly userId?: string;
  readonly timestampMs: number;
  readonly leafSha256: string;
}

export interface MerkleAuditBatch {
  readonly batchId: string;
  readonly timestampMs: number;
  readonly leafCount: number;
  readonly merkleRootSha256: string;
  readonly previousLedgerRootSha256: string;
  readonly chainedLedgerRootSha256: string;
}

export interface HighThroughputAuditBatchMetrics {
  readonly totalEventsProcessed: number;
  readonly batchesCommitted: number;
  readonly averageBatchLatencyMs: number;
  readonly currentQueueDepth: number;
  readonly peakThroughputEventsPerSec: number;
  readonly activeLedgerRootSha256: string;
}

export interface MemorySlab {
  readonly id: string;
  readonly sizeBytes: number;
  readonly buffer: Buffer;
  isLeased: boolean;
  lease(): Buffer;
  release(): void;
}

export interface ImageGenerationRecord {
  readonly id: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly status: 'queued' | 'generating' | 'completed' | 'failed';
  readonly prompt: string;
  readonly revisedPrompt?: string | null;
  readonly model: string;
  readonly aspectRatio: string;
  readonly dimensions: string;
  readonly quality: string;
  readonly publicUrl: string;
  readonly r2Key: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly sha256: string;
  readonly lqip?: string | null;
  readonly seed?: string | null;
  readonly latencyMs?: number;
  readonly costUsd?: number;
  readonly isFavorite: boolean;
  readonly tags: string[];
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ImageLibraryStats {
  readonly totalImages: number;
  readonly totalBytes: number;
  readonly favoriteCount: number;
  readonly sessionCount: number;
  readonly aspectRatios: Record<string, number>;
}

export interface ImageLibraryFilterOptions {
  readonly sessionId?: string;
  readonly aspectRatio?: string;
  readonly isFavorite?: boolean;
  readonly search?: string;
  readonly sort?: 'newest' | 'oldest';
  readonly limit?: number;
  readonly cursor?: string;
}

export interface ImageLibraryPage {
  readonly records: ImageGenerationRecord[];
  readonly totalCount: number;
  readonly stats: ImageLibraryStats;
  readonly availableSessions: Array<{ sessionId: string; count: number }>;
  readonly nextCursor: string | null;
}

export * from './GalxQueueContracts';
