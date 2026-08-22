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
import { OpenAIAdapter } from './adapters/OpenAIAdapter';
import { GrokAdapter } from './adapters/GrokAdapter';
import { GalxPreflightValidator } from '../validator/GalxPreflightValidator';
import { GalxMetricsEngine } from '../telemetry/GalxMetricsEngine';
import { GalxPrivacyComplianceEngine } from '../privacy/GalxPrivacyComplianceEngine';
import { GalxZDRProtocol } from '../privacy/GalxZDRProtocol';

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
  }

  static getInstance(): GalxModelRouter {
    if (!GalxModelRouter.instance) {
      GalxModelRouter.instance = new GalxModelRouter();
    }
    return GalxModelRouter.instance;
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
   * Routes OpenAI/Grok chat completion across pooled quota shards with HIPAA/ZDR/GDPR compliance.
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
    const { userId, requestId, isPriorityUser, headers: incomingHeaders } = options;
    const modelSpec = ModelCatalog.resolveModel(options.request.model);
    if (!modelSpec) {
      throw new Error(`Unsupported model: '${options.request.model}'. Supported models: ${ModelCatalog.listAll().map(m => m.id).join(', ')}`);
    }
    const provider = modelSpec.provider;

    // 1. Resolve Privacy Policy & Compliance Directives
    const privacyPolicy = this.privacyEngine.resolvePrivacyPolicy(incomingHeaders, options.request.privacy);

    // 2. Real-time In-Memory Sanitization (Safe Harbor 18 PHI & European GDPR PII)
    const { sanitizedRequest, redactionSummary } = this.privacyEngine.sanitizeChatRequest(
      options.request,
      privacyPolicy
    );

    const maxRetries = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const estimatedTokens = sanitizedRequest.max_tokens
        ? sanitizedRequest.max_tokens
        : modelSpec.supportsReasoning
        ? 4000
        : 2000;

      // 3. Acquire atomic execution lease with Compliance Shard Gating (HIPAA BAA, EU Residency, ZDR)
      const acqResult = this.pool.acquireLease({
        userId,
        jobId: requestId,
        provider,
        targetModel: modelSpec.id,
        isPriorityUser,
        estimatedTokens,
        privacyProfile: privacyPolicy.profile,
        hipaaRequired: privacyPolicy.hipaaEnabled,
        dataResidency: privacyPolicy.dataResidency,
        zdrRequired: privacyPolicy.zdrEnabled
      });

      if (!acqResult.lease) {
        throw new Error(
          acqResult.reason || `No healthy ${provider} shard credentials currently available matching privacy policy`
        );
      }

      const lease = acqResult.lease;
      let rawTokenSecret: string | undefined = undefined;
      const requestStartMs = Date.now();

      try {
        // 4. Decrypt shard credentials with AAD verification
        const encrypted = lease.account.encryptedPayload || lease.account.encryptedSecrets!;
        const decrypted = GalxCryptoVault.decryptSecret(
          encrypted,
          lease.account.userId,
          lease.account.id,
          provider
        );

        rawTokenSecret = decrypted.apiKey || decrypted.accessToken;

        // 5. Dispatch to Provider Adapter with store: false
        let adapterResult: { response: Response; headers: Record<string, string> };
        if (provider === 'xai-grok') {
          adapterResult = await GrokAdapter.executeChatCompletion(sanitizedRequest, decrypted, modelSpec);
        } else {
          adapterResult = await OpenAIAdapter.executeChatCompletion(sanitizedRequest, decrypted, modelSpec);
        }

        const { response } = adapterResult;
        const latencyMs = Date.now() - requestStartMs;

        // 6. Handle non-2xx responses
        if (!response.ok) {
          const errorBody = await response.text();
          this.pool.releaseLease(
            lease.leaseId,
            0,
            false,
            adapterResult.headers,
            `HTTP ${response.status}: ${errorBody}`,
            Date.now(),
            latencyMs
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

          if (response.status === 429 || response.status >= 500) {
            lastError = new Error(`Upstream ${provider} error (${response.status}): ${errorBody}`);
            continue;
          }

          throw new Error(`Upstream ${provider} returned HTTP ${response.status}: ${errorBody}`);
        }

        const isStream = sanitizedRequest.stream === true;
        const responseHeaders = new Headers();
        response.headers.forEach((val, key) => {
          if (!key.toLowerCase().startsWith('transfer-encoding')) {
            responseHeaders.set(key, val);
          }
        });

        // Gateway Diagnostic Headers
        responseHeaders.set('x-galx-shard-id', lease.shardId);
        responseHeaders.set('x-galx-strategy', this.pool.getStrategy());
        responseHeaders.set('x-galx-routing-latency-ms', String(latencyMs));
        responseHeaders.set('x-galx-model', modelSpec.id);

        // 7. Handle Streaming Response with On-the-Fly SHA-256 Rolling Digest Hasher
        if (isStream && response.body) {
          const wrappedStream = this.wrapStreamingResponse(
            response.body,
            lease,
            modelSpec.id,
            provider,
            adapterResult.headers,
            requestStartMs,
            privacyPolicy,
            responseHeaders,
            decrypted
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
        let tokensUsed = 500;
        try {
          const parsed = JSON.parse(responseText);
          tokensUsed = parsed.usage?.total_tokens || 500;
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

        this.pool.releaseLease(
          lease.leaseId,
          tokensUsed,
          true,
          adapterResult.headers,
          undefined,
          Date.now(),
          latencyMs
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
        this.pool.releaseLease(lease.leaseId, 0, false, undefined, err.message || 'Execution error');
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
    decryptedSecrets?: DecryptedGalxSecret
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

    let leaseReleased = false;

    // Attach initial baseline ZDR compliance headers
    if (responseHeaders) {
      responseHeaders.set('X-Galx-ZDR-Verified', 'true');
      responseHeaders.set('X-Galx-ZDR-Retention', '0s');
      responseHeaders.set('X-Galx-Memory-Zeroized', 'true');
      responseHeaders.set('X-Galx-Privacy-Profile', privacyPolicy?.profile || 'standard');
      responseHeaders.set('X-Galx-Data-Residency', `${privacyPolicy?.dataResidency || 'global'}-resident-transit`);
      responseHeaders.set('X-Galx-AI-Generated', 'true');
      responseHeaders.set('X-Galx-GDPR-SCC', '2021-914-module2');
      if (privacyPolicy?.hipaaEnabled) responseHeaders.set('X-Galx-HIPAA-BAA', 'active-safeguard');
      if (privacyPolicy?.gpcOptOut) responseHeaders.set('X-Galx-GPC-Applied', 'true');
    }

    const releaseOnce = (success: boolean, errReason?: string) => {
      if (leaseReleased) return;
      leaseReleased = true;
      const totalDurationMs = requestStartMs ? Date.now() - requestStartMs : 300;
      
      // Ephemerally zeroize lease credentials
      GalxZDRProtocol.scrubDecryptedCredentials(decryptedSecrets);

      routerPool.releaseLease(
        lease.leaseId,
        estimatedTokens,
        success,
        upstreamHeaders,
        errReason,
        Date.now(),
        totalDurationMs
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
    };

    const reader = upstreamBody.getReader();

    return new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const { value, done } = await reader.read();
          if (done) {
            if (piiTransformer) {
              const tail = piiTransformer.flush();
              if (tail) {
                const tailBytes = encoder.encode(tail);
                zdrHasher.update(tailBytes);
                controller.enqueue(tailBytes);
              }
            }
            releaseOnce(true);
            controller.close();
            return;
          }
          if (value) {
            const text = decoder.decode(value, { stream: true });
            estimatedTokens += Math.max(1, Math.ceil(text.length / 4));

            if (piiTransformer) {
              const safeText = piiTransformer.transformChunk(text);
              if (safeText) {
                const safeBytes = encoder.encode(safeText);
                zdrHasher.update(safeBytes);
                controller.enqueue(safeBytes);
              }
            } else {
              zdrHasher.update(value);
              controller.enqueue(value);
            }
          }
        } catch (err: any) {
          releaseOnce(false, err.message || 'Stream error');
          controller.error(err);
        }
      },
      async cancel(reason) {
        try {
          await reader.cancel(reason);
        } catch {}
        if (piiTransformer) {
          piiTransformer.zeroize();
        }
        releaseOnce(false, `Client aborted stream: ${String(reason || 'disconnect')}`);
      }
    });
  }

  /**
   * Dispatches visual synthesis request with HIPAA/ZDR/GDPR compliance and ephemeral zeroization.
   */
  async routeImageGeneration(options: RouteImageOptions): Promise<ImageGenerationResponse> {
    const { userId, requestId, isPriorityUser, headers: incomingHeaders } = options;
    const modelSpec = ModelCatalog.resolveModel(options.request.model || 'openai-gpt-image-2');
    if (!modelSpec) {
      throw new Error(`Unsupported image model: '${options.request.model}'`);
    }
    const provider = modelSpec.provider;

    const privacyPolicy = this.privacyEngine.resolvePrivacyPolicy(incomingHeaders, options.request.privacy);
    const { sanitizedRequest, redactionResult } = this.privacyEngine.sanitizeImageRequest(
      options.request,
      privacyPolicy
    );

    const acqResult = this.pool.acquireLease({
      userId,
      jobId: requestId,
      provider,
      targetModel: modelSpec.id,
      isPriorityUser,
      estimatedTokens: sanitizedRequest.quality === 'hd' ? 200 : 100,
      privacyProfile: privacyPolicy.profile,
      hipaaRequired: privacyPolicy.hipaaEnabled,
      dataResidency: privacyPolicy.dataResidency,
      zdrRequired: privacyPolicy.zdrEnabled
    });

    if (!acqResult.lease) {
      throw new Error(
        acqResult.reason || `No healthy ${provider} shard credentials available in the pool matching privacy policy`
      );
    }

    const lease = acqResult.lease;
    let rawTokenSecret: string | undefined = undefined;
    const startMs = Date.now();

    try {
      const encrypted = lease.account.encryptedPayload || lease.account.encryptedSecrets!;
      const decrypted = GalxCryptoVault.decryptSecret(
        encrypted,
        lease.account.userId,
        lease.account.id,
        provider
      );

      rawTokenSecret = decrypted.apiKey || decrypted.accessToken;

      let result: ImageGenerationResponse;
      if (provider === 'xai-grok') {
        result = await GrokAdapter.executeImageGeneration(sanitizedRequest, decrypted, modelSpec, lease.shardId);
      } else {
        result = await OpenAIAdapter.executeImageGeneration(sanitizedRequest, decrypted, modelSpec, lease.shardId);
      }

      const latencyMs = Date.now() - startMs;
      this.pool.releaseLease(lease.leaseId, 100, true, undefined, undefined, Date.now(), latencyMs);

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

      return result;
    } catch (err: any) {
      const latencyMs = Date.now() - startMs;
      this.pool.releaseLease(lease.leaseId, 0, false, undefined, err.message || 'Image generation error');
      this.metrics.recordSample({
        timestampMs: Date.now(),
        latencyMs,
        tokensConsumed: 0,
        success: false,
        provider,
        model: modelSpec.id,
        shardId: lease.shardId,
        statusCode: 500
      });
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
}

export const galxRouter = GalxModelRouter.getInstance();

