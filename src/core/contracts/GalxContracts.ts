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
  readonly streamingWindow?: StreamingDeidentifyWindowOptions;
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
  readonly privacyProfile?: PrivacyProfileType;
  readonly hipaaRequired?: boolean;
  readonly dataResidency?: DataResidencyRegion;
  readonly zdrRequired?: boolean;
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
    | 'no_compliant_shards';
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
  store?: boolean;
  privacy?: PrivacyOptions;
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
  privacy?: PrivacyOptions;
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

export * from './GalxQueueContracts';





