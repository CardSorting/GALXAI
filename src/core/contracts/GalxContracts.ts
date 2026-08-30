/**
 * GALXAI: Core Universal Gateway Contracts
 * High-concurrency routing, cryptographic secret vaulting, and circuit governance.
 */

export type ProviderType = 'openai';
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
  | 'tier_5_frontier_research';

export interface NegativeConstraintReport {
  readonly totalConstraints: number;
  readonly satisfiedCount: number;
  readonly satisfactionRatio: number;
  readonly violatedConstraints: string[];
}

export interface RlaifRubricScore {
  readonly factualAccuracyConfidence: number; // 0.00 - 1.00
  readonly sycophancyAvoidanceScore: number; // 0.00 - 1.00
  readonly instructionFidelityScore: number; // 0.00 - 1.00
  readonly formattingStrictness: number; // 0.00 - 1.00
  readonly safetyConstitutionalScore: number; // 0.00 - 1.00
}

export interface SelfConsistencyEvaluation {
  readonly finalAnswerCanonical?: string;
  readonly selfConsistencyScore: number; // 0.00 - 1.00
  readonly derivationCoherence: number; // 0.00 - 1.00
}

export interface VerbosityCalibration {
  readonly lengthRatio: number; // completionTokens / promptTokens
  readonly concisenessEfficiencyScore: number; // 0.00 - 1.00
  readonly fluffTokenRatio: number; // 0.00 - 1.00
  readonly fillerPhrasesDetected: string[];
}

export interface SyntheticLineage {
  readonly teacherModelFamily: string; // e.g. 'gpt-5.6-sol', 'deepseek-r1-distill', 'claude-3.5-sonnet'
  readonly distillationMethod: 'zero_shot_direct' | 'cot_critique_refined' | 'dpo_pairwise_swipe' | 'kto_binary_feedback';
  readonly provenanceHmac: string; // Cryptographic HMAC-SHA256 certifying data lineage
  readonly verifiedAt: string;
}

export interface PrmStepSupervision {
  readonly isSupervised: boolean;
  readonly totalSteps: number;
  readonly stepRewardScores: number[]; // e.g. [0.98, 0.95, 0.92, 0.99]
  readonly minStepConfidence: number; // Lowest step score in chain
  readonly erroneousStepIndex?: number; // Step where reasoning failed, if any
}

export interface MultiTurnDependencyGraph {
  readonly turnIndex: number;
  readonly contextDependencyScore: number; // 0.00 - 1.00 (0 = standalone, 1 = heavily dependent on history)
  readonly coreferenceDepth: number; // Number of antecedent coreferences resolved
  readonly antecedentTurnIds: string[];
}

export interface HardNegativeSample {
  readonly mutationType: 'off_by_one' | 'formula_sign_flip' | 'inverted_boolean' | 'subtle_type_mismatch';
  readonly perturbedText: string;
  readonly semanticDistance: number; // 0.00 - 1.00
}

export interface InferenceCalibrationProfile {
  readonly recommendedTemperature: number; // 0.0 - 1.2
  readonly recommendedTopP: number; // 0.1 - 1.0
  readonly recommendedMinP: number; // 0.0 - 0.2
  readonly recommendedRepetitionPenalty: number; // 1.0 - 1.2
}

export interface KvCacheSaliencyMask {
  readonly anchorTokensCount: number;
  readonly totalTokensCount: number;
  readonly saliencyRatio: number; // 0.00 - 1.00
  readonly isCacheOptimal: boolean;
}

export interface DifferentialPrivacyBudgetLedger {
  readonly epsilonPerSample: number; // e.g. 0.5
  readonly delta: number; // e.g. 1e-6
  readonly cumulativeEpsilonSpent: number;
  readonly remainingEpsilonBudget: number;
  readonly renyiDivergenceOrder: number; // alpha order e.g. 8.0
}

export interface DpoImplicitRewardVector {
  readonly implicitRewardMargin: number; // Δr = β * (qualityDelta - lengthBiasPenalty)
  readonly lengthNormalizedFactor: number;
  readonly betaParameter: number; // e.g. 0.1
}

export interface KtoProspectUtility {
  readonly prospectValue: number; // S-curve utility value: +z^0.88 for gain, -1.33*(-z)^0.88 for loss
  readonly lossAversionMultiplier: number; // 1.33
  readonly isDesirable: boolean;
}

export interface SemanticInvariantTest {
  readonly assertionCode: string;
  readonly invariantType: 'length_check' | 'positivity_check' | 'formula_identity' | 'null_safety';
  readonly isExecutable: boolean;
}

export interface RlvrRewardSignal {
  readonly ruleVerifierStatus: 'passed' | 'failed' | 'partial' | 'unverifiable';
  readonly deterministicReward: number; // 1.0 = verified, 0.0 = violated
  readonly ruleType: 'unit_test_assertion' | 'symbolic_math_exact_match' | 'json_schema_conformity' | 'compiler_ast_syntax';
  readonly verificationConfidence: number; // 0.00 - 1.00
}

export interface LossMaskingVector {
  readonly promptTokensCount: number; // Tokens where loss is masked (0)
  readonly completionTokensCount: number; // Tokens where loss is active (1)
  readonly lossMaskDensity: number; // Ratio of active tokens
  readonly sequencePackingOffset: number;
}

export interface LossWeightScaling {
  readonly sampleLossWeight: number; // Scaling factor e.g. 1.25 for loss gradients
  readonly baseMultiplier: number;
  readonly eduBonus: number;
  readonly noveltyBonus: number;
  readonly rlvrMultiplier: number;
}

export interface GrpoRewardNormalization {
  readonly groupSize: number;
  readonly groupMeanReward: number;
  readonly groupStdReward: number;
  readonly normalizedAdvantage: number; // A_i = (r_i - mean) / (std + 1e-6)
}

export interface NeedleEntropyDensity {
  readonly shannonEntropy: number; // H(X) = -sum(p * log2(p))
  readonly uniqueTokenRatio: number;
  readonly isNeedleDense: boolean;
}

export interface ConfidenceCalibrationVector {
  readonly expressedConfidenceScore: number; // 0.00 - 1.00 (from epistemic markers)
  readonly calibrationGap: number; // |expressedConfidence - deterministicReward|
  readonly isOverconfident: boolean;
}

export interface ToolSandboxSignature {
  readonly toolName?: string;
  readonly argumentConformityScore: number; // 0.00 - 1.00
  readonly sandboxIntegritySignature: string;
  readonly isSandboxedExecution: boolean;
}

export interface SpeculativeDraftVector {
  readonly estimatedDraftAcceptanceRate: number; // gamma: 0.00 - 1.00
  readonly tokenTransitionEntropy: number;
  readonly isOptimalForSpeculation: boolean;
}

export interface RefusalBoundaryRobustness {
  readonly isAdversarialAttackAttempt: boolean;
  readonly refusalAppropriatenessScore: number; // 0.00 - 1.00 (penalizes over-refusal)
  readonly dualUseBenignIntentConfidence: number; // 0.00 - 1.00
  readonly isOverRefusalRisk: boolean;
}

export interface TokenBudgetAllocation {
  readonly promptCompressionSavings: number; // 0.00 - 1.00
  readonly reasoningBudgetRatio: number; // Tokens allocated to CoT reasoning
  readonly completionHeadroomTokens: number;
}

export interface DynamicCurriculumProgression {
  readonly progressionReadiness: number; // 0.00 - 1.00
  readonly isEligibleForTierPromotion: boolean;
  readonly recommendedTargetTier: CurriculumTier;
}

export type CurriculumSequenceBucket = 'bucket_short_512' | 'bucket_medium_2048' | 'bucket_long_8192' | 'bucket_ultra_32k';

export interface TeacherStudentDiscrepancyVector {
  readonly klDivergenceEstimate: number; // D_KL(P_teacher || Q_student)
  readonly isHighUtilityDistillation: boolean;
  readonly knowledgeDensityFactor: number;
}

export interface CrossChunkAttentionAnchor {
  readonly crossChunkAnchorCount: number;
  readonly chunkSparsityRatio: number; // 0.00 - 1.00
  readonly requiresGlobalAttention: boolean;
}

export interface GradientAnomalyPreFilter {
  readonly isLossSpikeRisk: boolean;
  readonly gradientStabilityScore: number; // 0.00 - 1.00
  readonly anomalyFlags: string[];
}

export interface CotBranchingExplorationVector {
  readonly branchingFactor: number; // Number of distinct solution hypotheses
  readonly backtrackingDepth: number; // Depth of course-correction
  readonly reflectionEfficiencyRatio: number; // 0.00 - 1.00
  readonly isTreeSearchCoT: boolean;
}

export interface SycophancyDriftVector {
  readonly stanceStabilityScore: number; // 0.00 - 1.00
  readonly isSycophanticDriftDetected: boolean;
  readonly resistanceConfidence: number; // 0.00 - 1.00
}

export interface PerTokenRewardAttributionVector {
  readonly pivotTokensCount: number;
  readonly attributionEntropy: number;
  readonly topAttributedKeywords: string[];
}

export interface ContextCompactionVector {
  readonly contextCompactionRatio: number; // 0.00 - 1.00
  readonly pivotSummaryCandidate: string;
  readonly isCompactionRecommended: boolean;
}

export interface RewardEnsembleConsensus {
  readonly ensembleMeanScore: number; // 0.00 - 1.00
  readonly interCriticAgreementVariance: number; // 0.00 - 1.00
  readonly isHighConsensusSample: boolean;
}

export interface LabelSmoothingRegularizer {
  readonly labelSmoothingAlpha: number; // 0.00 - 0.15
  readonly isExactTargetRequired: boolean;
}

export interface CollectionTelemetryVector {
  readonly ingestionLatencyMs: number;
  readonly tokenThroughputPerSec: number;
  readonly burstinessIndex: number;
  readonly captureTimestampMs: number;
}

export interface DataCleaningVector {
  readonly boilerplateRemovedRatio: number; // 0.00 - 1.00
  readonly unicodeNormalizationPass: boolean;
  readonly cleanedTokenCount: number;
  readonly isPristineQuality: boolean;
}

export interface DatasetSchemaComplianceVector {
  readonly schemaType: 'chatml' | 'alpaca' | 'sharegpt' | 'raw_completion';
  readonly isValidTurnAlternation: boolean;
  readonly schemaConformityScore: number; // 0.00 - 1.00
}

export interface CryptographicProvenanceVector {
  readonly chainOfCustodyHmac: string;
  readonly parentShardHash: string;
  readonly tamperProofAuditSignature: string;
  readonly custodyTimestampMs: number;
}

export interface InterleavedModalityVector {
  readonly codeTokensRatio: number;
  readonly mathTokensRatio: number;
  readonly structuredJsonRatio: number;
  readonly primaryModalityMixture: 'pure_text' | 'code_heavy' | 'symbolic_math' | 'polyglot_hybrid';
}

export interface GradientNormBoundVector {
  readonly estimatedGradientNorm: number;
  readonly recommendedGradClipThreshold: number;
  readonly isGradientOutlier: boolean;
}

export interface PopulationDriftVector {
  readonly jensenShannonDivergence: number;
  readonly isDistributionDriftDetected: boolean;
  readonly baselineSampleWindowSize: number;
}

export interface ActiveLearningAcquisitionVector {
  readonly acquisitionUtilityScore: number; // 0.00 - 1.00
  readonly acquisitionStrategy: 'maximum_entropy' | 'margin_sampling' | 'expected_gradient_length';
  readonly isPriorityForHumanReview: boolean;
}

export interface SpanMaskingWarmupVector {
  readonly spanMaskingRatio: number; // 0.00 - 0.50
  readonly meanSpanLength: number;
  readonly corruptedTokensCount: number;
}

export interface FocalLossCalibrationVector {
  readonly focalGammaParameter: number; // e.g. 2.0
  readonly hardBoundaryModulationWeight: number; // 1.00 - 4.00
  readonly isHardBoundarySample: boolean;
}

export interface PerStepAnnealingScheduleVector {
  readonly explorationPhaseTemperature: number; // e.g. 0.70
  readonly convergencePhaseTemperature: number; // e.g. 0.05
  readonly annealingDecayRate: number; // e.g. 0.85
}

export interface DataDenoisingVector {
  readonly homoglyphDensity: number; // 0.00 - 1.00
  readonly syntacticNoiseRatio: number; // 0.00 - 1.00
  readonly isDenoisedAndClean: boolean;
}

export interface QuantizationSensitivityVector {
  readonly outlierActivationRatio: number; // 0.00 - 1.00
  readonly quantizationRobustnessScore: number; // 0.00 - 1.00
  readonly recommendedPrecision: 'fp8_e4m3' | 'int4_awq' | 'fp16_bfloat16';
}

export interface ContrastiveAnchorVector {
  readonly anchorEmbeddingCosineSimilarity: number; // 0.00 - 1.00
  readonly positiveAugmentationVariant: string;
  readonly hardNegativeContrastiveDistance: number; // 0.00 - 1.00
}

export interface PerTurnStateRetentionVector {
  readonly stateRetentionRate: number; // 0.00 - 1.00
  readonly forgottenEntityCount: number;
  readonly isRetentionOptimal: boolean;
}

export interface ModelConfidenceCalibrationScore {
  readonly expectedCalibrationError: number; // 0.00 - 1.00 (ECE)
  readonly brierReliabilityScore: number; // 0.00 - 1.00
  readonly isWellCalibrated: boolean;
}

export interface PerTokenDynamicSamplingVector {
  readonly recommendedTopK: number; // e.g. 1 (greedy) or 40 (nucleus)
  readonly recommendedTopP: number; // e.g. 0.95
  readonly recommendedMinP: number; // e.g. 0.05
  readonly isGreedySamplingPreferred: boolean;
}

export interface FimPretrainingVector {
  readonly fimPrefixTokenCount: number;
  readonly fimSuffixTokenCount: number;
  readonly fimMiddleTokenCount: number;
  readonly isFimEligible: boolean;
}

export interface ShardCompressionProfile {
  readonly rawByteSize: number;
  readonly compressedGzipByteSize: number;
  readonly compressionRatio: number; // e.g. 0.28
  readonly isUltraCompressed: boolean;
}

export interface RopeScalingFactorVector {
  readonly ropeBaseFrequency: number; // e.g. 10000 or 500000
  readonly yarnContextScaleFactor: number; // e.g. 1.0 or 4.0
  readonly isLongContextExtensionRequired: boolean;
}

export interface GrammarConstrainedDecodingVector {
  readonly grammarConstraintType: 'gbnf_json_schema' | 'regex_pattern' | 'freeform_text';
  readonly schemaConformityMargin: number; // 0.00 - 1.00
  readonly isGrammarConstrained: boolean;
}

export interface KvCacheEvictionPriorityVector {
  readonly evictionPriorityScore: number; // 0.00 - 1.00 (lower = preserve in cache)
  readonly prefixCachingReusabilityScore: number; // 0.00 - 1.00
  readonly isCachePinnedCandidate: boolean;
}

export interface TotTreeOfThoughtVerificationVector {
  readonly exploredNodeCount: number;
  readonly prunedSubtreeCount: number;
  readonly treeSearchOptimalityScore: number; // 0.00 - 1.00
  readonly isOptimalSearchTrajectory: boolean;
}

export interface PreferenceMarginCalibrationVector {
  readonly bradleyTerryLikelihood: number; // 0.00 - 1.00
  readonly implicitMarginDelta: number; // e.g. 0.35
  readonly isMarginSeparable: boolean;
}

export interface MlaCompressionVector {
  readonly latentKvDimension: number; // e.g. 512
  readonly kvCompressionRatio: number; // e.g. 0.18
  readonly isMlaOptimizedCandidate: boolean;
}

export interface TokenEntropyRoutingVector {
  readonly routingConfidenceScore: number; // 0.00 - 1.00
  readonly top2ExpertAgreementMargin: number; // 0.00 - 1.00
  readonly isMoeRoutingCandidate: boolean;
}

export interface FlashAttentionChunkingVector {
  readonly blockTileSize: number; // e.g. 128
  readonly blockCount: number;
  readonly isSramTileAligned: boolean;
}

export interface MultiTokenPredictionVector {
  readonly predictionDepth: number; // e.g. 2 future tokens
  readonly futureTokenAgreementScore: number; // 0.00 - 1.00
  readonly isMtpSupervisionEligible: boolean;
}

export interface AuxLossFreeMoEVector {
  readonly expertBalanceVariance: number; // e.g. 0.02
  readonly biasAdjustmentFactor: number; // e.g. 1.05
  readonly isLoadBalanceOptimal: boolean;
}

export interface DualPipeParallelismProfile {
  readonly stageOverlapRatio: number; // e.g. 0.45
  readonly bubbleOverheadSavingsRatio: number; // e.g. 0.38
  readonly isDualPipeOptimal: boolean;
}

export interface Fp8GemmScalingVector {
  readonly fp8GemmFormat: 'fp8_e4m3' | 'fp8_e5m2';
  readonly dynamicScaleFactor: number; // e.g. 128.0
  readonly isOverflowSafe: boolean;
}

export interface DynamicContextRoutingVector {
  readonly targetCluster: 'gpu_h100_dense' | 'gpu_h100_long' | 'tpu_v5p_pod';
  readonly tokenEfficiencyScore: number; // 0.00 - 1.00
  readonly isHighThroughputRoute: boolean;
}

export interface SelfCorrectionReflectionVector {
  readonly selfCorrectionOccurred: boolean;
  readonly correctionConfidenceGain: number; // e.g. 0.28
  readonly isPristineAfterCorrection: boolean;
}

export interface LatentKvDequantizationVector {
  readonly dequantScaleFactor: number; // e.g. 0.0078125 (1/128)
  readonly fp8PrecisionType: 'fp8_e4m3' | 'fp8_e5m2';
  readonly isLosslessDequant: boolean;
}

export interface SpeculativeVerificationTreeVector {
  readonly treeBranchFactor: number; // e.g. 3
  readonly verifiedDraftPathLength: number; // e.g. 4
  readonly treeAcceptanceYield: number; // 0.00 - 1.00
  readonly isMultiBranchSpeculationOptimal: boolean;
}

export interface AdaptiveActivationCheckpointingProfile {
  readonly checkpointInterval: number; // e.g. 4 layers
  readonly memorySavingsRatio: number; // e.g. 0.62
  readonly isRecomputationOptimal: boolean;
}

export interface MlaQueryProjectionVector {
  readonly latentQueryDimension: number; // e.g. 512
  readonly ropeKeyDimension: number; // e.g. 64
  readonly isQueryCompressed: boolean;
}

export interface Eagle2SpeculativeTreeVector {
  readonly featureDraftTreeDepth: number; // e.g. 3
  readonly contextualConfidenceFactor: number; // 0.00 - 1.00
  readonly isEagleOptimal: boolean;
}

export interface BatchGradientDiversityVector {
  readonly batchOrthogonalityScore: number; // 0.00 - 1.00
  readonly multiTaskInterferenceRatio: number; // e.g. 0.04
  readonly isGradientDiverse: boolean;
}

export interface AttentionHeadEntropyPruningVector {
  readonly prunableHeadCount: number; // e.g. 4
  readonly activeHeadEntropyRatio: number; // e.g. 0.88
  readonly isPruningRecommended: boolean;
}

export interface MedusaSpeculativeTreeProfile {
  readonly medusaHeadCount: number; // e.g. 4
  readonly multiHeadTreeAcceptanceRate: number; // 0.00 - 1.00
  readonly isMedusaReady: boolean;
}

export interface SequencePackingMaskSlicingProfile {
  readonly cumulativeSeqOffsets: number[]; // e.g. [0, 24, 92]
  readonly isBlockDiagonalOptimal: boolean;
}

export interface MlaContextCachingIndexProfile {
  readonly prefixCacheChunkHash: string; // SHA-256 16-hex prefix
  readonly prefixChunkLength: number; // e.g. 32 tokens
  readonly isCacheReusable: boolean;
}

export interface OnlineDpoLengthDebiasingProfile {
  readonly lengthPenaltyWeight: number; // e.g. 0.12
  readonly debiasedRewardMargin: number; // e.g. 0.82
  readonly isLengthDebiased: boolean;
}

export interface LossTruncatedGradientShieldVector {
  readonly lossTruncationUpperQuantile: number; // e.g. 4.5
  readonly isSampleWithinSafeBound: boolean;
}

export interface IndexShareSparseAttentionProfile {
  readonly indexerBlockSize: number; // e.g. 4 layers per shared indexer
  readonly sparseAttentionFlopsReduction: number; // e.g. 2.9x
  readonly sparseActiveTokenRatio: number; // e.g. 0.25 (top-k active sparse tokens)
  readonly isIndexShareOptimal: boolean;
}

export interface SlimeAsyncRlTrajectoryVector {
  readonly isAsynchronousRollout: boolean; // true if actor decoupled from learner
  readonly actorCriticCreditWeight: number; // 0.00 - 1.00 centralized critic score
  readonly longHorizonToolStepCount: number; // multi-tool trajectory step count
  readonly isSlimeTrainingEligible: boolean;
}

export interface GlmHybridThinkingModeProfile {
  readonly operationalMode: 'thinking_mode' | 'non_thinking_mode' | 'adaptive_hybrid';
  readonly thinkingBudgetTokens: number; // allocated reasoning token budget
  readonly isInstantResponseCandidate: boolean;
}

export interface PipelineStageReport {
  readonly collection: CollectionTelemetryVector;
  readonly cleaning: DataCleaningVector;
  readonly schema: DatasetSchemaComplianceVector;
  readonly provenance: CryptographicProvenanceVector;
}

export interface FrontierTaxonomyLabel {
  readonly primaryDomain: string; // e.g. 'code.typescript', 'math.algebra', 'finance.tax'
  readonly rootDomain: string; // e.g. 'code', 'math', 'finance', 'reasoning'
  readonly subDomain: string; // e.g. 'typescript', 'algebra', 'tax'
  readonly microSpecialty: string; // e.g. 'type_gymnastics', 'concurrency', 'depreciation'
  readonly taskType: 'code_generation' | 'debugging' | 'refactoring' | 'explanation' | 'qa' | 'summarization' | 'tool_invocation' | 'safety_critique';
  readonly reasoningParadigm: ReasoningParadigm;
  readonly verifiability: VerifiabilityRating;
  readonly curriculumTier: CurriculumTier;
  readonly sequenceBucket: CurriculumSequenceBucket;
  readonly negativeConstraints: NegativeConstraintReport;
  readonly rlaifRubric: RlaifRubricScore;
  readonly selfConsistency: SelfConsistencyEvaluation;
  readonly verbosityCalibration: VerbosityCalibration;
  readonly syntheticLineage: SyntheticLineage;
  readonly prmSupervision: PrmStepSupervision;
  readonly multiTurnGraph: MultiTurnDependencyGraph;
  readonly inferenceCalibration: InferenceCalibrationProfile;
  readonly kvCacheSaliency: KvCacheSaliencyMask;
  readonly rlvrReward: RlvrRewardSignal;
  readonly lossMasking: LossMaskingVector;
  readonly lossWeight: LossWeightScaling;
  readonly needleEntropy: NeedleEntropyDensity;
  readonly confidenceCalibration: ConfidenceCalibrationVector;
  readonly speculativeDraft: SpeculativeDraftVector;
  readonly refusalRobustness: RefusalBoundaryRobustness;
  readonly tokenBudgetAllocation: TokenBudgetAllocation;
  readonly curriculumProgression: DynamicCurriculumProgression;
  readonly gradientAnomalyFilter: GradientAnomalyPreFilter;
  readonly cotBranching: CotBranchingExplorationVector;
  readonly sycophancyDrift: SycophancyDriftVector;
  readonly perTokenAttribution: PerTokenRewardAttributionVector;
  readonly contextCompaction: ContextCompactionVector;
  readonly rewardEnsemble: RewardEnsembleConsensus;
  readonly labelSmoothing: LabelSmoothingRegularizer;
  readonly pipelineStageReport: PipelineStageReport;
  readonly interleavedModality: InterleavedModalityVector;
  readonly gradientNormBound: GradientNormBoundVector;
  readonly populationDrift: PopulationDriftVector;
  readonly activeLearning: ActiveLearningAcquisitionVector;
  readonly spanMaskingWarmup: SpanMaskingWarmupVector;
  readonly focalLossCalibration: FocalLossCalibrationVector;
  readonly annealingSchedule: PerStepAnnealingScheduleVector;
  readonly dataDenoising: DataDenoisingVector;
  readonly quantizationSensitivity: QuantizationSensitivityVector;
  readonly contrastiveAnchor: ContrastiveAnchorVector;
  readonly stateRetention: PerTurnStateRetentionVector;
  readonly calibrationScore: ModelConfidenceCalibrationScore;
  readonly dynamicSampling: PerTokenDynamicSamplingVector;
  readonly fimPretraining: FimPretrainingVector;
  readonly shardCompression: ShardCompressionProfile;
  readonly ropeScaling: RopeScalingFactorVector;
  readonly grammarConstraint: GrammarConstrainedDecodingVector;
  readonly kvCacheEviction: KvCacheEvictionPriorityVector;
  readonly totVerification: TotTreeOfThoughtVerificationVector;
  readonly preferenceMargin: PreferenceMarginCalibrationVector;
  readonly mlaCompression: MlaCompressionVector;
  readonly entropyRouting: TokenEntropyRoutingVector;
  readonly flashChunking: FlashAttentionChunkingVector;
  readonly mtpPrediction: MultiTokenPredictionVector;
  readonly auxLossFreeMoe: AuxLossFreeMoEVector;
  readonly dualPipeSchedule: DualPipeParallelismProfile;
  readonly fp8GemmScaling: Fp8GemmScalingVector;
  readonly contextRouting: DynamicContextRoutingVector;
  readonly selfCorrection: SelfCorrectionReflectionVector;
  readonly latentKvDequant: LatentKvDequantizationVector;
  readonly speculativeTree: SpeculativeVerificationTreeVector;
  readonly activationCheckpoint: AdaptiveActivationCheckpointingProfile;
  readonly mlaQueryProjection: MlaQueryProjectionVector;
  readonly eagle2SpeculativeTree: Eagle2SpeculativeTreeVector;
  readonly batchGradientDiversity: BatchGradientDiversityVector;
  readonly headPruning: AttentionHeadEntropyPruningVector;
  readonly medusaProfile: MedusaSpeculativeTreeProfile;
  readonly maskSlicing: SequencePackingMaskSlicingProfile;
  readonly mlaCaching: MlaContextCachingIndexProfile;
  readonly dpoLengthDebiasing: OnlineDpoLengthDebiasingProfile;
  readonly gradientShield: LossTruncatedGradientShieldVector;
  readonly indexShare: IndexShareSparseAttentionProfile;
  readonly slimeAsyncRl: SlimeAsyncRlTrajectoryVector;
  readonly glmThinkingMode: GlmHybridThinkingModeProfile;
  readonly teacherStudentDiscrepancy?: TeacherStudentDiscrepancyVector;
  readonly crossChunkAnchor?: CrossChunkAttentionAnchor;
  readonly toolSandbox?: ToolSandboxSignature;
  readonly grpoAdvantage?: GrpoRewardNormalization;
  readonly dpoRewardMargin?: DpoImplicitRewardVector;
  readonly ktoUtility?: KtoProspectUtility;
  readonly invariantTest?: SemanticInvariantTest;
  readonly hardNegative?: HardNegativeSample;
  readonly educationalValueScore: number; // 0.00 - 5.00 (FineWeb-Edu standard)
  readonly informationDensityScore: number; // 0.00 - 1.00
  readonly instructionDifficulty: number; // 1.0 - 5.0
  readonly responseRigorScore: number; // 0.00 - 1.00
  readonly noveltyScore: number; // 0.00 - 1.00 (MinHash LSH Jaccard novelty)
  readonly clusterCentroidId: string;
  readonly minHashSignature: string;
  readonly stepCountEstimate: number;
  readonly backtrackingCount: number;
  readonly alignmentAxis: 'helpfulness' | 'harmlessness' | 'honesty_calibration' | 'sycophancy_avoidance' | 'instruction_fidelity';
  readonly formatArchetypes: string[];
  readonly language: string;
  readonly taxonomyBitmask: string; // Hex representation of 64-bit compact taxonomy signature
}

export interface DistilledTrainingPair {
  readonly id: string;
  readonly source: 'web_chat' | 'internal_distillation';
  readonly modelId: string;
  readonly messages: Array<{
    readonly role: 'system' | 'user' | 'assistant';
    readonly content: string;
  }>;
  readonly qualityScore: number;
  readonly piiRedacted: boolean;
  readonly entitiesScrubbedCount: number;
  readonly estimatedTokens: number;
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
  shardId?: string;
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

export * from './GalxQueueContracts';




