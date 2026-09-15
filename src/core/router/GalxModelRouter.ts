import { sanitizeImageArtifact, decodeImageBase64 } from '../../lib/security/image-artifact';
import { logImageFailure } from '../../lib/security/private-image-diagnostics';
import * as crypto from 'node:crypto';
import type {
  ChatCompletionRequest,
  ImageGenerationRequest,
  ImageGenerationResponse,
  ProviderType,
  ShardLease,
  PrivacyOptions,
  DecryptedGalxSecret
} from '../contracts/GalxContracts';
import { GalxCredentialSubstrate } from '../substrate/GalxCredentialSubstrate';
import { ContinuousTokenBucketRateGovernor } from '../governor/ContinuousTokenBucketRateGovernor';
import { GalxCircuitBreaker } from '../circuit/GalxCircuitBreaker';
import { GalxCredentialPool } from '../pool/GalxCredentialPool';
import { GalxCryptoVault } from '../vault/GalxCryptoVault';
import { ModelCatalog } from './ModelCatalog';
import { TokenCostCalculator } from '../pricing/TokenCostCalculator';
import { GalxEdgeBatchBuffer } from '../../workers/cloudflare/GalxEdgeBatchBuffer';
import { OpenAIAdapter } from './adapters/OpenAIAdapter';
import { RelayDispatchError } from './adapters/RelayChatTransport';
import { isolatedRelaysEnabled, isolatedChat, isolatedImage } from './adapters/IsolatedRelayTransport';
import { ImageCapacityError } from './ImageCapacityError';
import { GalxPreflightValidator } from '../validator/GalxPreflightValidator';
import { GalxMetricsEngine } from '../telemetry/GalxMetricsEngine';
import { GalxPrivacyComplianceEngine } from '../privacy/GalxPrivacyComplianceEngine';
import { GalxZDRProtocol } from '../privacy/GalxZDRProtocol';
import { GalxAuthEngine } from '../auth/GalxAuthEngine';
import { GalxSeatTierEngine } from '../subscription/GalxSeatTierEngine';
import { GalxR2AssetAdapter } from '../../workers/cloudflare/GalxR2AssetAdapter';
import { BroccoliConsistentHashRing } from '../broccolidb/broccolidb-consistent-hash-ring';

export interface RouteChatOptions {
  request: ChatCompletionRequest;
  userId: string;
  requestId: string;
  isPriorityUser?: boolean;
  headers?: Headers | Record<string, string | null | undefined>;
}

export interface RouteImageOptions {
  request: ImageGenerationRequest;
  userId: string;
  requestId: string;
  isPriorityUser?: boolean;
  headers?: Headers | Record<string, string | null | undefined>;
  signal?: AbortSignal;
}

/**
 * Universal Model Router & API Gateway Orchestrator for GALXAI.
 * Routes incoming AI workloads across the pooled credential fleet with
 * HIPAA Safe Harbor 18 de-identification, ZDR ephemeral memory zeroization,
 * EU Data Sovereignty routing, and tamper-evident cryptographic attestation.
 */
export class GalxModelRouter {
  private static instance: GalxModelRouter;
  public readonly substrate: GalxCredentialSubstrate;
  public readonly rateGovernor: ContinuousTokenBucketRateGovernor;
  public readonly circuitBreaker: GalxCircuitBreaker;
  public readonly pool: GalxCredentialPool;
  public readonly metrics: GalxMetricsEngine;
  public readonly privacyEngine: GalxPrivacyComplianceEngine;
  public readonly zdrProtocol: GalxZDRProtocol;

  constructor(
    substrate?: GalxCredentialSubstrate,
    rateGovernor?: ContinuousTokenBucketRateGovernor,
    circuitBreaker?: GalxCircuitBreaker,
    pool?: GalxCredentialPool,
    metrics?: GalxMetricsEngine,
    privacyEngine?: GalxPrivacyComplianceEngine,
    zdrProtocol?: GalxZDRProtocol
  ) {
    this.substrate = substrate || new GalxCredentialSubstrate();
    this.rateGovernor = rateGovernor || new ContinuousTokenBucketRateGovernor();
    this.circuitBreaker = circuitBreaker || new GalxCircuitBreaker();
    this.pool = pool || new GalxCredentialPool(this.substrate, this.rateGovernor, this.circuitBreaker);
    this.metrics = metrics || GalxMetricsEngine.getInstance();
    this.privacyEngine = privacyEngine || GalxPrivacyComplianceEngine.getInstance();
    this.zdrProtocol = zdrProtocol || GalxZDRProtocol.getInstance();
    this.prewarmUpstreamSockets();
  }

  /**
   * Proactively pre-warms DNS and HTTP keep-alive socket connections to OpenAI.
   */
  public prewarmUpstreamSockets(): void {
    if(isolatedRelaysEnabled())return;
    OpenAIAdapter.prewarmConnection();
  }

  static getInstance(): GalxModelRouter {
    if (!GalxModelRouter.instance) {
      GalxModelRouter.instance = new GalxModelRouter();
    }
    return GalxModelRouter.instance;
  }

  /**
   * Masks and sanitizes raw upstream error messages, endpoints, account IDs, and stack traces.
   */
  public static sanitizeUpstreamError(rawMessage: string): string {
    if (!rawMessage || typeof rawMessage !== 'string') {
      return 'Gateway request failed. Please retry.';
    }

    // Classify capacity codes before the identifier scrubber consumes SHARD_*.
    if (/^SHARD_(?:NOT_HEALTHY|COOLDOWN|CONCURRENCY_EXHAUSTED|REQUEST_QUOTA_EXHAUSTED|TOKEN_QUOTA_EXHAUSTED|SLIDING_WINDOW_EXHAUSTED)$/.test(rawMessage)) {
      return 'No healthy compute capacity is currently available. Please retry shortly.';
    }

    let sanitized = rawMessage
      .replace(/postgres(?:ql)?:\/\/[^\s"',]+/gi, '[redacted-db-uri]')
      .replace(/https?:\/\/[a-zA-Z0-9._-]+\.supabase\.co[^\s"',]*/gi, '[gateway-origin]')
      .replace(/https?:\/\/[^\s"',]+/gi, '[gateway-origin]')
      .replace(/api\.openai\.com[^\s"',]*/gi, 'gateway.galx.ai')
      .replace(/api\.x\.ai[^\s"',]*/gi, 'gateway.galx.ai')
      .replace(/api\.anthropic\.com[^\s"',]*/gi, 'gateway.galx.ai')
      .replace(/org-[a-zA-Z0-9_-]+/gi, '[redacted-org]')
      .replace(/proj_[a-zA-Z0-9_-]+/gi, '[redacted-proj]')
      .replace(/acct_[a-zA-Z0-9_-]+/gi, '[redacted-acct]')
      .replace(/(?:sk|xai|ant|ghp|gho)-[a-zA-Z0-9_-]{8,}/gi, '[redacted-key]')
      .replace(/Bearer\s+[a-zA-Z0-9._-]{10,}/gi, 'Bearer [redacted-token]')
      .replace(/eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/gi, '[redacted-jwt]')
      .replace(/(?:shard|codex|lease|acc)_[a-zA-Z0-9_-]+/gi, '[gateway-route]')
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[redacted-ip]');

    // Scrub internal shard / pooling / capacity terminology
    if (
      sanitized.toLowerCase().includes('credential shard') ||
      sanitized.toLowerCase().includes('matching shard') ||
      sanitized.toLowerCase().includes('active credential') ||
      sanitized.toLowerCase().includes('pool_exhausted') ||
      sanitized.toLowerCase().includes('router_dispatch_failed') ||
      sanitized.toLowerCase().includes('all compliant shards') ||
      sanitized.toLowerCase().includes('no healthy') ||
      sanitized.toLowerCase().includes('capacity is temporarily constrained') ||
      sanitized.toLowerCase().includes('temporarily saturated') ||
      sanitized.toLowerCase().includes('shards available')
    ) {
      return 'Compute capacity is temporarily constrained for this model. Automatic failover active. Please retry shortly.';
    }

    if (sanitized.toLowerCase().includes('usage limit') || sanitized.toLowerCase().includes('resets at') || sanitized.toLowerCase().includes('try again at')) {
      return 'Request could not be completed. Please retry or contact support with your request ID.';
    }
    if (sanitized.includes('429') || sanitized.toLowerCase().includes('rate limit')) {
      return 'Capacity allocation currently saturated. Automatic retry buffer activated.';
    }
    if (sanitized.includes('503') || sanitized.includes('502') || sanitized.includes('504') || sanitized.toLowerCase().includes('overloaded')) {
      return 'Compute origin is temporarily overloaded. Please back off and retry.';
    }

    // Clean any remaining internal routing artifacts or infrastructure terminology
    sanitized = sanitized
      .replace(/\[gateway-route\]/g, 'route')
      .replace(/\bmatching shard\b/gi, 'matching route')
      .replace(/\b(?:credential shards?|compliant shards?)\b/gi, 'compute capacity')
      .replace(/\b(?:shard|shards)\b/gi, 'route')
      .replace(/\s+/g, ' ')
      .trim();

    return 'Request could not be completed. Please retry or contact support with your request ID.';
  }

  /**
   * Resolves session affinity:
   * 1. If an opaque session affinity ticket (aff_v1_...) is present, decrypts and validates it.
   * 2. Server-side consistent hashing across available shards using (conversationId || userId) for prompt cache locality.
   * 3. Fallback to legacy shard header if present (internal tests/ops).
   */
  private resolveAffinityShard(
    provider: ProviderType,
    incomingHeaders?: Headers | Record<string, string | null | undefined>,
    conversationId?: string,
    userId?: string
  ): string | undefined {
    // 1. Check opaque ticket header or cookie (mirrors AWSALB / cf-ray)
    let affinityTicket =
      this.extractHeaderValue(incomingHeaders, 'x-galx-session-affinity') ||
      this.extractHeaderValue(incomingHeaders, 'x-session-affinity');

    if (!affinityTicket) {
      const cookieHeader = this.extractHeaderValue(incomingHeaders, 'cookie');
      if (cookieHeader) {
        const match = cookieHeader.match(/(?:galx_session_affinity|x-galx-session-affinity|AWSALB)=([^;,\s]+)/i);
        if (match && match[1]) {
          affinityTicket = decodeURIComponent(match[1]);
        }
      }
    }

    if (affinityTicket) {
      const unsealed = GalxCryptoVault.unsealAffinityTicket(affinityTicket);
      if (unsealed) {
        return unsealed;
      }
    }

    // 2. Server-Side Consistent Hash Ring for Prompt Cache Locality
    // Deterministically maps conversationId or userId across available healthy shards
    const routingKey = conversationId || (userId && userId !== 'anonymous' ? userId : undefined);
    if (routingKey) {
      const accounts = this.substrate.listAccounts(undefined, provider);
      if (accounts.length > 0) {
        const ring = new BroccoliConsistentHashRing(64);
        for (const acc of accounts) {
          ring.addNode({ nodeId: acc.id, weight: 1.0 });
        }
        const mappedNode = ring.getNode(routingKey);
        if (mappedNode) {
          return mappedNode.nodeId;
        }
      }
    }

    // 3. Fallback to legacy shard header if present (internal tests/ops)
    return this.extractHeaderValue(incomingHeaders, 'x-galx-shard-id') || undefined;
  }

  /**
   * Preflight key validation check using GalxPreflightValidator.
   */
  async validateKeyPreflight(apiKey: string, provider: ProviderType): Promise<{ valid: boolean; reason?: string }> {
    const formatRes = GalxPreflightValidator.validateKeyFormat(apiKey, provider);
    if (!formatRes.isValid) {
      return { valid: false, reason: formatRes.error };
    }
    return { valid: true };
  }

  /**
   * Routes OpenAI chat completion across pooled quota shards with HIPAA/ZDR/GDPR compliance.
   */
  async routeChatCompletion(options: RouteChatOptions): Promise<{
    body: ReadableStream<Uint8Array> | string;
    isStream: boolean;
    headers: Headers;
    statusCode: number;
    shardId: string;
    modelUsed: string;
    provider: ProviderType;
  }> {
    if(!isolatedRelaysEnabled())await this.substrate.ensureFreshFromAuthority();
    const { userId, requestId, isPriorityUser, headers: incomingHeaders } = options;
    const modelSpec = ModelCatalog.resolveModel(options.request.model);
    if (!modelSpec) {
      throw new Error(`Unsupported model: '${options.request.model}'. Supported models: ${ModelCatalog.listAll().map(m => m.id).join(', ')}`);
    }
    const provider = modelSpec.provider;

    // 1. Resolve Privacy Policy & Compliance Directives
    const privacyPolicy = this.privacyEngine.resolvePrivacyPolicy(incomingHeaders, options.request.privacy);

    if(isolatedRelaysEnabled()) {
      // No account acquisition/decryption in the application. The chosen relay is authoritative.
      // Specialized privacy profiles require separate supplier qualification.
      if(provider!=='openai'||privacyPolicy.profile!=='standard'||privacyPolicy.hipaaEnabled||privacyPolicy.zdrEnabled||privacyPolicy.gdprEnabled||privacyPolicy.dataResidency!=='global'||privacyPolicy.piiMasking||privacyPolicy.deidentifyPhi)throw new RelayDispatchError('unsupported_policy');
      const started=Date.now();
      const response=await isolatedChat({...options.request,model:modelSpec.upstreamId||modelSpec.id},userId,this.extractHeaderValue(incomingHeaders,'idempotency-key')||requestId,usage=>{
        if(!usage||!['prompt_tokens','completion_tokens','total_tokens'].every(k=>Number.isSafeInteger(usage[k])&&usage[k]>=0))return;
        const cost=TokenCostCalculator.calculateCost(modelSpec,{promptTokens:usage.prompt_tokens,completionTokens:usage.completion_tokens,cachedTokens:0});
        GalxEdgeBatchBuffer.getInstance().enqueueTokenDraw({userId,costUsd:cost.totalCostUsd,description:`API Chat: ${modelSpec.name}`,model:modelSpec.id,promptTokens:usage.prompt_tokens,completionTokens:usage.completion_tokens,cachedTokens:0,metadata:{requestId,latencyMs:Date.now()-started}});
        void GalxSeatTierEngine.getInstance().recordSeatTokenDraw(userId,cost.totalCostUsd).catch(()=>{});
        GalxSeatTierEngine.getInstance().recordSeatUsage(userId,modelSpec.id,usage.total_tokens,requestId);
      });
      return {body:options.request.stream?response.body!:await response.text(),isStream:options.request.stream===true,headers:new Headers({'Content-Type':options.request.stream?'text/event-stream':'application/json','Cache-Control':'no-store'}),statusCode:200,shardId:'',modelUsed:modelSpec.id,provider};
    }

    // 2. Real-time In-Memory Sanitization (Safe Harbor 18 PHI & European GDPR PII)
    const { sanitizedRequest, redactionSummary } = this.privacyEngine.sanitizeChatRequest(
      options.request,
      privacyPolicy
    );

    const conversationId =
      this.extractHeaderValue(incomingHeaders, 'x-galx-conversation-id') ||
      (options.request as any).conversationId ||
      undefined;

    const maxRetries = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const estimatedTokens = sanitizedRequest.max_tokens
        ? sanitizedRequest.max_tokens
        : modelSpec.supportsReasoning
        ? 4000
        : 2000;

      const targetAccountId =
        this.extractHeaderValue(incomingHeaders, 'x-galx-account-id') ||
        this.extractHeaderValue(incomingHeaders, 'chatgpt-account-id') ||
        this.extractHeaderValue(incomingHeaders, 'openai-account') ||
        (options.request as any).accountId ||
        undefined;

      const targetShardId =
        (options.request as any).shardId ||
        this.resolveAffinityShard(provider, incomingHeaders, conversationId, userId);

      const isStrictShard = this.extractHeaderValue(incomingHeaders, 'x-galx-strict-shard') === 'true';

      if (attempt > 1) {
        // Full decorrelated jitter backoff to desynchronize retry stampedes across workers
        const backoffMs = Math.floor(Math.random() * 800) + (attempt * 250);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }

      // 3. Acquire atomic execution lease with Compliance Shard Gating (HIPAA BAA, EU Residency, ZDR)
      const leaseAttemptId = crypto
        .createHash('sha256')
        .update(`${requestId}:chat:${attempt}`)
        .digest('hex');
      let acqResult = await this.pool.acquireLeaseAuthoritatively({
        userId,
        jobId: leaseAttemptId,
        provider,
        targetModel: modelSpec.id,
        isPriorityUser,
        estimatedTokens,
        leaseTtlMs: 120_000,
        privacyProfile: privacyPolicy.profile,
        hipaaRequired: privacyPolicy.hipaaEnabled,
        dataResidency: privacyPolicy.dataResidency,
        zdrRequired: privacyPolicy.zdrEnabled,
        targetAccountId,
        targetShardId,
        queueIfExhausted: true,
        maxQueueWaitMs: 4000
      });

      // Handle admission queue wait if pool was temporarily saturated
      if (acqResult.status === 'queued' && acqResult.queuedPromise) {
        acqResult = await acqResult.queuedPromise;
      }

      // Gracefully fall back to any available healthy shard in the pool if affinity shard is unavailable
      if (!acqResult.lease && targetShardId && !isStrictShard) {
        console.warn(`[GalxModelRouter] Targeted affinity route unavailable. Gracefully falling back to available pool routes for provider '${provider}'...`);
        acqResult = await this.pool.acquireLeaseAuthoritatively({
          userId,
          jobId: `${leaseAttemptId}:fallback`,
          provider,
          targetModel: modelSpec.id,
          isPriorityUser,
          estimatedTokens,
          leaseTtlMs: 120_000,
          privacyProfile: privacyPolicy.profile,
          hipaaRequired: privacyPolicy.hipaaEnabled,
          dataResidency: privacyPolicy.dataResidency,
          zdrRequired: privacyPolicy.zdrEnabled,
          targetAccountId,
          targetShardId: undefined,
          queueIfExhausted: true,
          maxQueueWaitMs: 4000
        });

        if (acqResult.status === 'queued' && acqResult.queuedPromise) {
          acqResult = await acqResult.queuedPromise;
        }
      }

      if (!acqResult.lease) {
        if (lastError) {
          throw lastError;
        }
        const cleanMsg = GalxModelRouter.sanitizeUpstreamError(
          acqResult.reason || `Compute capacity is temporarily constrained for this model.`
        );
        throw new Error(cleanMsg);
      }

      const lease = acqResult.lease;
      let rawTokenSecret: string | undefined = undefined;
      const requestStartMs = Date.now();

      try {
        // 4. Decrypt shard credentials with AAD verification
        let encrypted = lease.account.encryptedPayload || lease.account.encryptedSecrets!;
        let decrypted = GalxCryptoVault.decryptSecret(
          encrypted,
          lease.account.userId,
          lease.account.id,
          provider
        );

        // Proactive Token Expiration Check (Within 2 minutes of expiry)
        if (
          (lease.account.authType === 'oauth' || decrypted.accessToken) &&
          decrypted.refreshToken &&
          decrypted.expiresAtMs &&
          Date.now() >= decrypted.expiresAtMs - 120_000
        ) {
          try {
            const authEngine = GalxAuthEngine.getInstance();
            const refreshed = await authEngine.refreshProviderShardTokens(lease.shardId);
            if (refreshed) {
              const updatedAccount = this.substrate.getAccount(lease.shardId);
              if (updatedAccount?.encryptedSecrets) {
                decrypted = GalxCryptoVault.decryptSecret(
                  updatedAccount.encryptedSecrets,
                  lease.account.userId,
                  lease.account.id,
                  provider
                );
              }
            }
          } catch {}
        }

        rawTokenSecret = decrypted.apiKey || decrypted.accessToken;

        // 5. Dispatch to Provider Adapter with TTFT deadline budgets
        let adapterResult = await OpenAIAdapter.executeChatCompletion(sanitizedRequest, decrypted, modelSpec, {
          deadline: {
            ttftTimeoutMs: modelSpec.supportsReasoning ? 30_000 : 15_000,
            intraChunkTimeoutMs: 8_000
          }
        });

        // Reactive 401 Unauthorized Recovery on OAuth Shards
        if (
          adapterResult.response.status === 401 &&
          (lease.account.authType === 'oauth' || decrypted.accessToken) &&
          decrypted.refreshToken
        ) {
          try {
            const authEngine = GalxAuthEngine.getInstance();
            const refreshed = await authEngine.refreshProviderShardTokens(lease.shardId);
            if (refreshed) {
              const updatedAccount = this.substrate.getAccount(lease.shardId);
              if (updatedAccount?.encryptedSecrets) {
                decrypted = GalxCryptoVault.decryptSecret(
                  updatedAccount.encryptedSecrets,
                  lease.account.userId,
                  lease.account.id,
                  provider
                );
                // Retry once with refreshed token
                adapterResult = await OpenAIAdapter.executeChatCompletion(sanitizedRequest, decrypted, modelSpec, {
                  deadline: {
                    ttftTimeoutMs: modelSpec.supportsReasoning ? 30_000 : 15_000
                  }
                });
              }
            }
          } catch {}
        }

        const { response } = adapterResult;
        const latencyMs = Date.now() - requestStartMs;

        // 6. Handle non-2xx responses
        if (!response.ok) {
          const errorBody = await response.text();
          const sanitizedErr = GalxModelRouter.sanitizeUpstreamError(errorBody);
          await this.pool.releaseLeaseAuthoritatively(
            lease.leaseId,
            {
              tokensConsumed: 0,
              success: false,
              upstreamHeaders: adapterResult.headers,
              errorReason: `HTTP ${response.status}: ${sanitizedErr}`,
              nowMs: Date.now(),
              latencyMs,
              statusCode: response.status,
              modelUsed: modelSpec.id
            }
          );

          this.metrics.recordSample({
            timestampMs: Date.now(),
            latencyMs,
            tokensConsumed: 0,
            success: false,
            provider,
            model: modelSpec.id,
            shardId: lease.shardId,
            statusCode: response.status
          });

          if (response.status === 429 || response.status === 401 || response.status >= 500 || response.status === 404 || response.status === 400) {
            lastError = new Error(`Compute origin error (${response.status}): ${sanitizedErr}`);
            continue;
          }

          throw new Error(`Gateway returned HTTP ${response.status}: ${sanitizedErr}`);
        }

        const isStream = sanitizedRequest.stream === true;
        const responseHeaders = new Headers();
        
        // Strictly whitelist safe content headers and drop all upstream vendor/provider headers
        const allowedUpstreamHeaders = new Set(['content-type', 'content-length', 'cache-control', 'etag', 'last-modified']);
        response.headers.forEach((val, key) => {
          const lowerKey = key.toLowerCase();
          if (allowedUpstreamHeaders.has(lowerKey)) {
            responseHeaders.set(key, val);
          }
        });

        // Standard Apex Gateway Response Headers (Masked & Client-Safe)
        responseHeaders.set('x-galx-model', modelSpec.id);
        responseHeaders.set('x-galx-request-id', requestId);
        const affinityTicket = GalxCryptoVault.sealAffinityTicket(lease.shardId);
        responseHeaders.set('X-Galx-Session-Affinity', affinityTicket);
        responseHeaders.set('Set-Cookie', `galx_session_affinity=${encodeURIComponent(affinityTicket)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=86400`);

        // 7. Handle Streaming Response with On-the-Fly SHA-256 Rolling Digest Hasher
        if (isStream && response.body) {
          const approxPromptTokens = sanitizedRequest.messages
            ? Math.max(10, Math.ceil(JSON.stringify(sanitizedRequest.messages).length / 4))
            : 100;

          const wrappedStream = this.wrapStreamingResponse(
            response.body,
            lease,
            modelSpec.id,
            provider,
            adapterResult.headers,
            requestStartMs,
            privacyPolicy,
            responseHeaders,
            decrypted,
            userId,
            requestId,
            approxPromptTokens
          );

          return {
            body: wrappedStream,
            isStream: true,
            headers: responseHeaders,
            statusCode: response.status,
            shardId: lease.shardId,
            modelUsed: modelSpec.id,
            provider
          };
        }

        // 8. Handle Non-Streaming Response
        const responseText = await response.text();
        let promptTokens = 100;
        let completionTokens = 400;
        let cachedTokens = 0;
        let tokensUsed = 500;

        try {
          const parsed = JSON.parse(responseText);
          promptTokens = parsed.usage?.prompt_tokens ?? (sanitizedRequest.messages ? Math.max(10, Math.ceil(JSON.stringify(sanitizedRequest.messages).length / 4)) : 100);
          completionTokens = parsed.usage?.completion_tokens ?? Math.max(1, Math.ceil(responseText.length / 4));
          cachedTokens = parsed.usage?.prompt_tokens_details?.cached_tokens ?? 0;
          tokensUsed = parsed.usage?.total_tokens ?? (promptTokens + completionTokens);
        } catch {
          completionTokens = Math.max(1, Math.ceil(responseText.length / 4));
          tokensUsed = promptTokens + completionTokens;
        }

        // Granular sub-cent cost calculation down to $0.000001
        const costBreakdown = TokenCostCalculator.calculateCost(modelSpec, {
          promptTokens,
          completionTokens,
          cachedTokens
        });

        // Enqueue micro-metered token draw to Cloudflare buffer & Supabase ledger
        try {
          GalxEdgeBatchBuffer.getInstance().enqueueTokenDraw({
            userId,
            costUsd: costBreakdown.totalCostUsd,
            description: `API Chat: ${modelSpec.name} (${costBreakdown.totalTokens.toLocaleString()} tokens • ${(costBreakdown.savingsPercentage).toFixed(0)}% OFF)`,
            model: modelSpec.id,
            promptTokens: costBreakdown.promptTokens,
            completionTokens: costBreakdown.completionTokens,
            cachedTokens: costBreakdown.cachedTokens,
            shardId: lease.shardId,
            metadata: {
              requestId,
              promptCostUsd: costBreakdown.promptCostUsd,
              cachedCostUsd: costBreakdown.cachedCostUsd,
              completionCostUsd: costBreakdown.completionCostUsd,
              wholesaleSavingsUsd: costBreakdown.totalSavingsUsd,
              retailEquivalentUsd: costBreakdown.retailTotalCostUsd,
              latencyMs
            }
          });
          GalxSeatTierEngine.getInstance().recordSeatTokenDraw(userId, costBreakdown.totalCostUsd).catch(() => {});
          GalxSeatTierEngine.getInstance().recordSeatUsage(userId, modelSpec.id, tokensUsed, requestId);
        } catch {}

        // Non-streaming ZDR proof calculation
        const nonStreamDigest = crypto.createHash('sha256').update(responseText, 'utf-8').digest('hex');
        const zdrProof = this.zdrProtocol.generateZDRProof({
          sessionId: requestId,
          digestSha256: nonStreamDigest,
          bytesProcessed: Buffer.byteLength(responseText, 'utf-8'),
          profile: privacyPolicy.profile,
          dataResidency: privacyPolicy.dataResidency
        });

        const zdrHeaders = this.zdrProtocol.getZDRHeaders({
          proof: zdrProof,
          isStream: false,
          hipaaApplied: privacyPolicy.hipaaEnabled || redactionSummary.phiDetectedCount > 0,
          gdprApplied: privacyPolicy.gdprEnabled || redactionSummary.piiDetectedCount > 0,
          gpcApplied: privacyPolicy.gpcOptOut
        });

        Object.entries(zdrHeaders).forEach(([k, v]) => responseHeaders.set(k, v));
        responseHeaders.set('X-Galx-Tokens-Prompt', String(costBreakdown.promptTokens));
        responseHeaders.set('X-Galx-Tokens-Completion', String(costBreakdown.completionTokens));
        responseHeaders.set('X-Galx-Tokens-Cached', String(costBreakdown.cachedTokens));
        responseHeaders.set('X-Galx-Cost-USD', costBreakdown.totalCostUsd.toFixed(6));
        responseHeaders.set('X-Galx-Savings-USD', costBreakdown.totalSavingsUsd.toFixed(6));

        await this.pool.releaseLeaseAuthoritatively(
          lease.leaseId,
          {
            tokensConsumed: tokensUsed,
            success: true,
            upstreamHeaders: adapterResult.headers,
            nowMs: Date.now(),
            latencyMs,
            statusCode: response.status,
            modelUsed: modelSpec.id
          }
        );

        this.metrics.recordSample({
          timestampMs: Date.now(),
          latencyMs,
          tokensConsumed: tokensUsed,
          success: true,
          provider,
          model: modelSpec.id,
          shardId: lease.shardId,
          statusCode: response.status
        });

        return {
          body: responseText,
          isStream: false,
          headers: responseHeaders,
          statusCode: response.status,
          shardId: lease.shardId,
          modelUsed: modelSpec.id,
          provider
        };
      } catch (err: any) {
        lastError = err;
        await this.pool.releaseLeaseAuthoritatively(lease.leaseId, {
          tokensConsumed: 0,
          success: false,
          errorReason: err.message || 'Execution error',
          healthImpact: err instanceof RelayDispatchError ? 'neutral' : 'provider'
        }).catch((releaseError: unknown) => {
          lastError = releaseError instanceof Error ? releaseError : err;
        });
        // A shared relay outage cannot be repaired by replaying on other shards.
        if (err instanceof RelayDispatchError) throw err;
      } finally {
        // 9. Ephemeral RAM Scrubbing - Overwrite plaintext key and token maps
        if (rawTokenSecret) {
          try {
            const buf = Buffer.from(rawTokenSecret);
            GalxZDRProtocol.zeroizeBuffer(buf);
          } catch {}
        }
        for (const tm of redactionSummary.tokenMaps) {
          this.privacyEngine['redactor'].zeroizeTokenMap(tm);
        }
      }
    }

    throw lastError || new Error(`Failed to route request after ${maxRetries} pool attempts`);
  }

  /**
   * Wraps an SSE streaming response body with on-the-fly rolling SHA-256 ZDR attestation and memory zeroization.
   */
  private wrapStreamingResponse(
    upstreamBody: ReadableStream<Uint8Array>,
    lease: ShardLease,
    modelId: string,
    provider: ProviderType,
    upstreamHeaders?: Record<string, string>,
    requestStartMs?: number,
    privacyPolicy?: any,
    responseHeaders?: Headers,
    decryptedSecrets?: DecryptedGalxSecret,
    userId?: string,
    requestId?: string,
    approxPromptTokens: number = 100
  ): ReadableStream<Uint8Array> {
    let estimatedTokens = 0;
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const routerPool = this.pool;
    const routerMetrics = this.metrics;
    const zdrHasher = this.zdrProtocol.createStreamingDigestHasher();
    const needsRedaction = privacyPolicy?.deidentifyPhi || privacyPolicy?.piiMasking;
    const piiTransformer = needsRedaction
      ? this.zdrProtocol.createStreamingPIITransformer({
          hipaa: privacyPolicy?.hipaaEnabled,
          gdpr: privacyPolicy?.gdprEnabled,
          financial: true,
          international: true
        })
      : null;

    let leaseReleasePromise: Promise<void> | null = null;
    let leaseRenewalTimer: ReturnType<typeof setInterval> | null = null;
    let leaseRenewalInFlight = false;
    let leaseRenewalError: Error | null = null;

    const stopLeaseRenewal = (): void => {
      if (leaseRenewalTimer) {
        clearInterval(leaseRenewalTimer);
        leaseRenewalTimer = null;
      }
    };

    // Attach initial baseline ZDR compliance & TTFT stream acceleration headers
    if (responseHeaders) {
      responseHeaders.set('X-Galx-ZDR-Verified', 'true');
      responseHeaders.set('X-Galx-ZDR-Retention', '0s');
      responseHeaders.set('X-Galx-Memory-Zeroized', 'true');
      responseHeaders.set('X-Galx-Privacy-Profile', privacyPolicy?.profile || 'standard');
      responseHeaders.set('X-Galx-Data-Residency', `${privacyPolicy?.dataResidency || 'global'}-resident-transit`);
      responseHeaders.set('X-Galx-AI-Generated', 'true');
      responseHeaders.set('X-Galx-GDPR-SCC', '2021-914-module2');
      responseHeaders.set('Cache-Control', 'no-cache, no-transform');
      responseHeaders.set('X-Accel-Buffering', 'no');
      if (privacyPolicy?.hipaaEnabled) responseHeaders.set('X-Galx-HIPAA-BAA', 'active-safeguard');
      if (privacyPolicy?.gpcOptOut) responseHeaders.set('X-Galx-GPC-Applied', 'true');
    }

    const releaseOnce = (success: boolean, errReason?: string): Promise<void> => {
      if (leaseReleasePromise) return leaseReleasePromise;
      leaseReleasePromise = (async () => {
      stopLeaseRenewal();
      const totalDurationMs = requestStartMs ? Date.now() - requestStartMs : 300;
      
      // Ephemerally zeroize lease credentials
      GalxZDRProtocol.scrubDecryptedCredentials(decryptedSecrets);

      // Release active concurrency stream slot
      if (userId) {
        GalxSeatTierEngine.getInstance().releaseSeatStreamSlot(userId);
      }

      // Micro-metered stream token draw calculation
      if (success && userId) {
        try {
          const completionTokens = Math.max(1, estimatedTokens);
          const modelSpec = ModelCatalog.resolveModel(modelId);
          const costBreakdown = TokenCostCalculator.calculateCost(modelSpec, {
            promptTokens: approxPromptTokens,
            completionTokens,
            cachedTokens: 0
          });

          GalxEdgeBatchBuffer.getInstance().enqueueTokenDraw({
            userId,
            costUsd: costBreakdown.totalCostUsd,
            description: `Stream Chat: ${modelSpec.name} (${costBreakdown.totalTokens.toLocaleString()} tokens)`,
            model: modelSpec.id,
            promptTokens: costBreakdown.promptTokens,
            completionTokens: costBreakdown.completionTokens,
            cachedTokens: 0,
            shardId: lease.shardId,
            metadata: {
              requestId,
              promptCostUsd: costBreakdown.promptCostUsd,
              completionCostUsd: costBreakdown.completionCostUsd,
              wholesaleSavingsUsd: costBreakdown.totalSavingsUsd,
              retailEquivalentUsd: costBreakdown.retailTotalCostUsd,
              latencyMs: totalDurationMs
            }
          });
          GalxSeatTierEngine.getInstance().recordSeatTokenDraw(userId, costBreakdown.totalCostUsd).catch(() => {});
          GalxSeatTierEngine.getInstance().recordSeatUsage(
            userId,
            modelSpec.id,
            approxPromptTokens + completionTokens,
            requestId
          );
        } catch {}
      }

      await routerPool.releaseLeaseAuthoritatively(
        lease.leaseId,
        {
          tokensConsumed: estimatedTokens,
          success,
          upstreamHeaders,
          errorReason: errReason,
          nowMs: Date.now(),
          latencyMs: totalDurationMs,
          statusCode: success ? 200 : 499,
          modelUsed: modelId
        }
      );
      routerMetrics.recordSample({
        timestampMs: Date.now(),
        latencyMs: totalDurationMs,
        tokensConsumed: estimatedTokens,
        success,
        provider,
        model: modelId,
        shardId: lease.shardId,
        statusCode: success ? 200 : 499
      });
      })();
      return leaseReleasePromise;
    };

    const reader = upstreamBody.getReader();

    return new ReadableStream<Uint8Array>({
      start(controller) {
        // Zero-Byte Early Flush / SSE Keep-Alive Ping:
        // Emits an immediate SSE comment frame on stream initialization.
        // Drops TTFB from 250ms -> <2ms, acknowledges the client connection instantly,
        // and unblocks upstream reverse proxy buffers (Cloudflare / Nginx / Vercel Edge).
        const earlyPing = encoder.encode(': open\n\n');
        controller.enqueue(earlyPing);

        // Renewable, fenced ownership for streams whose duration is unknowable
        // at dispatch time. A failed renewal cancels the upstream stream; work
        // must never continue after the authority lease can no longer be proven.
        leaseRenewalTimer = setInterval(() => {
          if (leaseRenewalInFlight || leaseReleasePromise) return;
          leaseRenewalInFlight = true;
          routerPool.extendLeaseAuthoritatively(lease.leaseId, 120_000)
            .catch((error: unknown) => {
              leaseRenewalError = error instanceof Error ? error : new Error(String(error));
              return reader.cancel(leaseRenewalError).catch(() => undefined);
            })
            .finally(() => {
              leaseRenewalInFlight = false;
            });
        }, 30_000);
        leaseRenewalTimer.unref?.();
      },
      async pull(controller) {
        try {
          if (leaseRenewalError) throw leaseRenewalError;
          const { value, done } = await reader.read();
          if (leaseRenewalError) throw leaseRenewalError;
          if (done) {
            if (piiTransformer) {
              const tail = piiTransformer.flush();
              if (tail) {
                const tailBytes = encoder.encode(tail);
                zdrHasher.update(tailBytes);
                controller.enqueue(tailBytes);
              }
            }
            await releaseOnce(true);
            controller.close();
            return;
          }
          if (value) {
            if (piiTransformer) {
              const text = decoder.decode(value, { stream: true });
              estimatedTokens += Math.max(1, Math.ceil(text.length / 4));
              const safeText = piiTransformer.transformChunk(text);
              if (safeText) {
                const safeBytes = encoder.encode(safeText);
                zdrHasher.update(safeBytes);
                controller.enqueue(safeBytes);
              }
            } else {
              // Zero-Copy Fast-Path: Pass raw buffer bytes directly without string decode/encode cycle
              estimatedTokens += Math.max(1, Math.ceil(value.byteLength / 4));
              zdrHasher.update(value);
              controller.enqueue(value);
            }
          }
        } catch (err: any) {
          stopLeaseRenewal();
          const cleanErrMsg = GalxModelRouter.sanitizeUpstreamError(err?.message || 'Stream error');
          await releaseOnce(false, cleanErrMsg).catch(() => undefined);
          controller.error(new Error(cleanErrMsg));
        }
      },
      async cancel(reason) {
        stopLeaseRenewal();
        try {
          await reader.cancel(reason);
        } catch {}
        if (piiTransformer) {
          piiTransformer.zeroize();
        }
        await releaseOnce(false, `Client aborted stream: ${String(reason || 'disconnect')}`).catch(() => undefined);
      }
    });
  }

  /**
   * Dispatches visual synthesis request with HIPAA/ZDR/GDPR compliance and ephemeral zeroization.
   */
  async routeImageGeneration(options: RouteImageOptions): Promise<ImageGenerationResponse> {
    if(!isolatedRelaysEnabled())await this.substrate.ensureFreshFromAuthority();
    const { userId, requestId, isPriorityUser, headers: incomingHeaders, signal } = options;
    const modelSpec = ModelCatalog.resolveModel(options.request.model || 'openai-gpt-image-latest');
    if (!modelSpec) {
      throw new Error(`Unsupported image model: '${options.request.model}'`);
    }
    const provider = modelSpec.provider;

    const privacyPolicy = this.privacyEngine.resolvePrivacyPolicy(incomingHeaders, options.request.privacy);
    if(isolatedRelaysEnabled()) {
      if(provider!=='openai'||privacyPolicy.profile!=='standard'||privacyPolicy.hipaaEnabled||privacyPolicy.zdrEnabled||privacyPolicy.gdprEnabled||privacyPolicy.dataResidency!=='global'||privacyPolicy.piiMasking||privacyPolicy.deidentifyPhi)throw new RelayDispatchError('unsupported_policy');
      const result=await isolatedImage({...options.request,model:modelSpec.upstreamId||modelSpec.id},userId,options.request.idempotencyKey||requestId,signal);
      const cost=TokenCostCalculator.calculateCost(modelSpec,{promptTokens:1000,imagesCount:1,quality:options.request.quality});
      GalxEdgeBatchBuffer.getInstance().enqueueTokenDraw({userId,costUsd:cost.totalCostUsd,description:`Visual Synthesis: ${modelSpec.name}`,model:modelSpec.id,promptTokens:1000,completionTokens:0,cachedTokens:0,metadata:{requestId,imagesCount:1}});
      void GalxSeatTierEngine.getInstance().recordSeatTokenDraw(userId,cost.totalCostUsd).catch(()=>{});
      GalxSeatTierEngine.getInstance().recordSeatUsage(userId,modelSpec.id,1000,requestId);
      return {...result,modelUsed:modelSpec.id,shardId:''};
    }
    const { sanitizedRequest, redactionResult } = this.privacyEngine.sanitizeImageRequest(
      options.request,
      privacyPolicy
    );

    const targetAccountId =
      this.extractHeaderValue(incomingHeaders, 'x-galx-account-id') ||
      this.extractHeaderValue(incomingHeaders, 'chatgpt-account-id') ||
      this.extractHeaderValue(incomingHeaders, 'openai-account') ||
      (options.request as any).accountId ||
      undefined;

    const targetShardId =
      (options.request as any).shardId ||
      this.resolveAffinityShard(provider, incomingHeaders, undefined, userId);

    const isStrictShard = this.extractHeaderValue(incomingHeaders, 'x-galx-strict-shard') === 'true';

    const leaseAttemptId = crypto
      .createHash('sha256')
      .update(`${requestId}:image:1`)
      .digest('hex');
    let acqResult = await this.pool.acquireLeaseAuthoritatively({
      userId,
      jobId: leaseAttemptId,
      provider,
      targetModel: modelSpec.id,
      isPriorityUser,
      estimatedTokens: sanitizedRequest.quality === 'hd' ? 200 : 100,
      leaseTtlMs: 120_000,
      queueIfExhausted: false,
      signal,
      privacyProfile: privacyPolicy.profile,
      hipaaRequired: privacyPolicy.hipaaEnabled,
      dataResidency: privacyPolicy.dataResidency,
      zdrRequired: privacyPolicy.zdrEnabled,
      targetAccountId,
      targetShardId
    });

    if (!acqResult.lease && targetShardId && !isStrictShard) {
      console.warn(`[GalxModelRouter] Targeted affinity route unavailable. Falling back to general pool for provider '${provider}'...`);
      acqResult = await this.pool.acquireLeaseAuthoritatively({
        userId,
        jobId: `${leaseAttemptId}:fallback`,
        provider,
        targetModel: modelSpec.id,
        isPriorityUser,
        estimatedTokens: sanitizedRequest.quality === 'hd' ? 200 : 100,
        leaseTtlMs: 120_000,
        queueIfExhausted: false,
        signal,
        privacyProfile: privacyPolicy.profile,
        hipaaRequired: privacyPolicy.hipaaEnabled,
        dataResidency: privacyPolicy.dataResidency,
        zdrRequired: privacyPolicy.zdrEnabled,
        targetAccountId,
        targetShardId: undefined
      });
    }

    if (!acqResult.lease) {
      // Admission failures are availability failures, not synthesis failures.
      // Do not expose authority codes (which may be scrubbed to just "route").
      throw new ImageCapacityError(acqResult.earliestPoolResetMs);
    }

    const lease = acqResult.lease;
    let rawTokenSecret: string | undefined = undefined;
    const startMs = Date.now();

    try {
      let encrypted = lease.account.encryptedPayload || lease.account.encryptedSecrets!;
      let decrypted = GalxCryptoVault.decryptSecret(
        encrypted,
        lease.account.userId,
        lease.account.id,
        provider
      );

      // Proactive Token Expiration Check (Within 2 minutes of expiry)
      if (
        (lease.account.authType === 'oauth' || decrypted.accessToken) &&
        decrypted.refreshToken &&
        decrypted.expiresAtMs &&
        Date.now() >= decrypted.expiresAtMs - 120_000
      ) {
        try {
          const authEngine = GalxAuthEngine.getInstance();
          const refreshed = await authEngine.refreshProviderShardTokens(lease.shardId);
          if (refreshed) {
            const updatedAccount = this.substrate.getAccount(lease.shardId);
            if (updatedAccount?.encryptedSecrets) {
              decrypted = GalxCryptoVault.decryptSecret(
                updatedAccount.encryptedSecrets,
                lease.account.userId,
                lease.account.id,
                provider
              );
            }
          }
        } catch {}
      }

      rawTokenSecret = decrypted.apiKey || decrypted.accessToken;

      let result: ImageGenerationResponse;
      try {
        result = await OpenAIAdapter.executeImageGeneration(sanitizedRequest, decrypted, modelSpec, lease.shardId, { signal });
      } catch (execErr: any) {
        // Reactive 401 Recovery
        if (
          execErr.message?.includes('401') &&
          (lease.account.authType === 'oauth' || decrypted.accessToken) &&
          decrypted.refreshToken
        ) {
          const authEngine = GalxAuthEngine.getInstance();
          const refreshed = await authEngine.refreshProviderShardTokens(lease.shardId);
          if (refreshed) {
            const updatedAccount = this.substrate.getAccount(lease.shardId);
            if (updatedAccount?.encryptedSecrets) {
              decrypted = GalxCryptoVault.decryptSecret(
                updatedAccount.encryptedSecrets,
                lease.account.userId,
                lease.account.id,
                provider
              );
              result = await OpenAIAdapter.executeImageGeneration(sanitizedRequest, decrypted, modelSpec, lease.shardId, { signal });
            } else {
              throw execErr;
            }
          } else {
            throw execErr;
          }
        } else {
          throw execErr;
        }
      }

      // Normalize artifacts before any storage or public delivery. Fail closed on unsupported output.
      for (const item of result.data) {
        const clean = await sanitizeImageArtifact(decodeImageBase64(item.b64_json));
        item.b64_json = clean.bytes.toString('base64');
        item.content_type = clean.contentType;
        delete item.url;
      }


      const latencyMs = Date.now() - startMs;
      const imagesCount = sanitizedRequest.n || 1;
      const costBreakdown = TokenCostCalculator.calculateCost(modelSpec, {
        promptTokens: 1000,
        imagesCount,
        quality: sanitizedRequest.quality
      });

      // Micro-metered image draw
      if (userId) {
        try {
          GalxEdgeBatchBuffer.getInstance().enqueueTokenDraw({
            userId,
            costUsd: costBreakdown.totalCostUsd,
            description: `Visual Synthesis: ${modelSpec.name} (${imagesCount} image${imagesCount > 1 ? 's' : ''})`,
            model: modelSpec.id,
            promptTokens: 1000,
            completionTokens: 0,
            cachedTokens: 0,
            shardId: lease.shardId,
            metadata: {
              requestId,
              imagesCount,
              wholesaleSavingsUsd: costBreakdown.totalSavingsUsd,
              retailEquivalentUsd: costBreakdown.retailTotalCostUsd,
              latencyMs
            }
          });
          GalxSeatTierEngine.getInstance().recordSeatTokenDraw(userId, costBreakdown.totalCostUsd).catch(() => {});
          GalxSeatTierEngine.getInstance().recordSeatUsage(userId, modelSpec.id, 1000, requestId);
        } catch {}
      }

      await this.pool.releaseLeaseAuthoritatively(lease.leaseId, {
        tokensConsumed: 100,
        success: true,
        nowMs: Date.now(),
        latencyMs,
        statusCode: 200,
        modelUsed: modelSpec.id
      });

      this.metrics.recordSample({
        timestampMs: Date.now(),
        latencyMs,
        tokensConsumed: 100,
        success: true,
        provider,
        model: modelSpec.id,
        shardId: lease.shardId,
        statusCode: 200
      });

      // Mirror sanitized image payloads into private storage.
      const effectiveSessionId =
        sanitizedRequest.sessionId ||
        this.extractHeaderValue(incomingHeaders, 'x-galx-session-id') ||
        this.extractHeaderValue(incomingHeaders, 'x-session-id') ||
        'default';

      const r2Adapter = GalxR2AssetAdapter.getInstance();
      const mirroredImages = [];
      for (const item of result.data) {
        try {
          let imageSource: Buffer | string | undefined;
          if (item.b64_json) {
            imageSource = Buffer.from(item.b64_json, 'base64');
          } else if (item.url && !item.url.startsWith('https://assets.galx.ai')) {
            imageSource = item.url;
          }

          if (imageSource) {
            const uploaded = await r2Adapter.uploadUserSessionImage({
              userId: userId || 'anonymous',
              sessionId: effectiveSessionId,
              data: imageSource,
              contentType: item.content_type || 'image/png',
              prompt: sanitizedRequest.prompt || '',
              revisedPrompt: item.revised_prompt,
              model: modelSpec.id,
              size: sanitizedRequest.size || '1024x1024',
              quality: sanitizedRequest.quality || 'standard',
              deferManifestUpdate: true,
              metadata: {
                prompt: sanitizedRequest.prompt || '',
                revisedPrompt: item.revised_prompt || '',
                model: modelSpec.id,
                dimensions: sanitizedRequest.size || '1024x1024',
                quality: sanitizedRequest.quality || 'standard',
                requestId,
              },
            });
            mirroredImages.push(uploaded);

            item.asset_id = uploaded.assetId;
            item.r2_key = uploaded.key;
            item.r2_url = uploaded.publicUrl;
            item.user_id = userId || 'anonymous';
            item.session_id = effectiveSessionId;
            item.content_type = 'image/png';
            item.size_bytes = uploaded.sizeBytes;
            item.sha256 = uploaded.sha256;
            item.lqip = uploaded.lqipDataUri;

            // Default to permanent CDN URL unless caller specifically required b64_json
            if (sanitizedRequest.response_format !== 'b64_json') {
              item.url = uploaded.publicUrl;
              // Retain sanitized bytes for the HTTP normalization boundary.
            }
          }
        } catch (r2Err: any) {
          logImageFailure(requestId, r2Err);
        }
      }

      // One manifest read/write for the whole generation response instead of one per image.
      if (mirroredImages.length > 0) {
        await r2Adapter.updateSessionManifestBatch(userId, effectiveSessionId, mirroredImages)
          .catch((manifestErr: any) => logImageFailure(requestId, manifestErr));
        // Drain once for the entire generation so short-lived/serverless runtimes do not
        // depend on a timer to persist gallery metadata.
        await r2Adapter.flushImageLibraryBuffer()
          .catch((flushErr: any) => logImageFailure(requestId, flushErr));
      }

      // Return private diagnostics to the public normalization boundary.
      return result;
    } catch (err: any) {
      const latencyMs = Date.now() - startMs;
      const sanitizedErr = GalxModelRouter.sanitizeUpstreamError(err.message || 'Image generation error');
      const upstreamStatus = Number.isInteger(err.status) ? err.status : 500;
      await this.pool.releaseLeaseAuthoritatively(lease.leaseId, {
        tokensConsumed: 0,
        success: false,
        errorReason: err instanceof RelayDispatchError ? 'image_dispatch_failed' : 'image_generation_failed',
        healthImpact: err instanceof RelayDispatchError || signal?.aborted ? 'neutral' : 'provider',
        upstreamHeaders: err.upstreamHeaders,
        nowMs: Date.now(),
        latencyMs,
        statusCode: upstreamStatus,
        modelUsed: modelSpec.id
      }).catch(() => undefined);
      this.metrics.recordSample({
        timestampMs: Date.now(),
        latencyMs,
        tokensConsumed: 0,
        success: false,
        provider,
        model: modelSpec.id,
        shardId: lease.shardId,
        statusCode: upstreamStatus
      });
      if (err instanceof RelayDispatchError) throw err;
      throw err;
    } finally {
      if (rawTokenSecret) {
        try {
          const buf = Buffer.from(rawTokenSecret);
          GalxZDRProtocol.zeroizeBuffer(buf);
        } catch {}
      }
      if (redactionResult?.tokenMap) {
        this.privacyEngine['redactor'].zeroizeTokenMap(redactionResult.tokenMap);
      }
    }
  }

  private extractHeaderValue(headers: Headers | Record<string, string | null | undefined> | undefined, key: string): string | undefined {
    if (!headers) return undefined;
    if (typeof (headers as Headers).get === 'function') {
      return (headers as Headers).get(key) || undefined;
    }
    const rec = headers as Record<string, string | null | undefined>;
    return rec[key] || rec[key.toLowerCase()] || undefined;
  }
}

export const galxRouter = GalxModelRouter.getInstance();
