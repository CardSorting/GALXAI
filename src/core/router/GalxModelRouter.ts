import type {
  ChatCompletionRequest,
  ImageGenerationRequest,
  ImageGenerationResponse,
  ProviderType,
  ShardLease
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

export interface RouteChatOptions {
  request: ChatCompletionRequest;
  userId: string;
  requestId: string;
  isPriorityUser?: boolean;
}

export interface RouteImageOptions {
  request: ImageGenerationRequest;
  userId: string;
  requestId: string;
  isPriorityUser?: boolean;
}

/**
 * Universal Model Router & API Gateway Orchestrator for GALXAI.
 * Routes incoming AI workloads across the pooled credential fleet using
 * Adaptive Hydraulic Headroom cycling and circuit governor failover.
 */
export class GalxModelRouter {
  private static instance: GalxModelRouter;
  public readonly substrate: GalxCredentialSubstrate;
  public readonly rateGovernor: ContinuousTokenBucketRateGovernor;
  public readonly circuitBreaker: GalxCircuitBreaker;
  public readonly pool: GalxCredentialPool;
  public readonly metrics: GalxMetricsEngine;

  constructor(
    substrate?: GalxCredentialSubstrate,
    rateGovernor?: ContinuousTokenBucketRateGovernor,
    circuitBreaker?: GalxCircuitBreaker,
    pool?: GalxCredentialPool,
    metrics?: GalxMetricsEngine
  ) {
    this.substrate = substrate || new GalxCredentialSubstrate();
    this.rateGovernor = rateGovernor || new ContinuousTokenBucketRateGovernor();
    this.circuitBreaker = circuitBreaker || new GalxCircuitBreaker();
    this.pool = pool || new GalxCredentialPool(this.substrate, this.rateGovernor, this.circuitBreaker);
    this.metrics = metrics || GalxMetricsEngine.getInstance();
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
   * Routes OpenAI/Grok chat completion across pooled quota shards with automatic failover and memory zeroization.
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
    const { request, userId, requestId, isPriorityUser } = options;
    const modelSpec = ModelCatalog.resolveModel(request.model);
    if (!modelSpec) {
      throw new Error(`Unsupported model: '${request.model}'. Supported models: ${ModelCatalog.listAll().map(m => m.id).join(', ')}`);
    }
    const provider = modelSpec.provider;

    const maxRetries = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Intelligent model-tailored token reservation baseline
      const estimatedTokens = request.max_tokens
        ? request.max_tokens
        : modelSpec.supportsReasoning
        ? 4000
        : 2000;

      // 1. Acquire atomic execution lease via Adaptive Hydraulic Headroom cycling
      const acqResult = this.pool.acquireLease({
        userId,
        jobId: requestId,
        provider,
        targetModel: modelSpec.id,
        isPriorityUser,
        estimatedTokens
      });

      if (!acqResult.lease) {
        throw new Error(
          acqResult.reason || `No healthy ${provider} shard credentials currently available in the pool`
        );
      }

      const lease = acqResult.lease;
      let rawTokenSecret: string | undefined = undefined;
      const requestStartMs = Date.now();

      try {
        // 2. Decrypt shard credentials with AAD verification
        const encrypted = lease.account.encryptedPayload || lease.account.encryptedSecrets!;
        const decrypted = GalxCryptoVault.decryptSecret(
          encrypted,
          lease.account.userId,
          lease.account.id,
          provider
        );

        rawTokenSecret = decrypted.apiKey || decrypted.accessToken;

        // 3. Dispatch to Provider Adapter
        let adapterResult: { response: Response; headers: Record<string, string> };
        if (provider === 'xai-grok') {
          adapterResult = await GrokAdapter.executeChatCompletion(request, decrypted, modelSpec);
        } else {
          adapterResult = await OpenAIAdapter.executeChatCompletion(request, decrypted, modelSpec);
        }

        const { response } = adapterResult;
        const latencyMs = Date.now() - requestStartMs;

        // 4. Handle non-2xx responses for circuit classification and retry
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
            continue; // Retry with next available shard in pool
          }

          throw new Error(`Upstream ${provider} returned HTTP ${response.status}: ${errorBody}`);
        }

        const isStream = request.stream === true;
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

        // 5. Handle Streaming Response
        if (isStream && response.body) {
          const wrappedStream = this.wrapStreamingResponse(
            response.body,
            lease,
            modelSpec.id,
            provider,
            adapterResult.headers,
            requestStartMs
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

        // 6. Handle Non-Streaming Response
        const responseText = await response.text();
        let tokensUsed = 500;
        try {
          const parsed = JSON.parse(responseText);
          tokensUsed = parsed.usage?.total_tokens || 500;
        } catch {}

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
        // 7. Ephemeral RAM Scrubbing - Overwrite plaintext key memory
        if (rawTokenSecret) {
          try {
            const buf = Buffer.from(rawTokenSecret);
            GalxCryptoVault.zeroizeBuffer(buf);
          } catch {}
        }
      }
    }

    throw lastError || new Error(`Failed to route request after ${maxRetries} pool attempts`);
  }

  /**
   * Wraps an SSE streaming response body to track token throughput, EWMA latency, and release the lease on stream close.
   */
  private wrapStreamingResponse(
    upstreamBody: ReadableStream<Uint8Array>,
    lease: ShardLease,
    modelId: string,
    provider: ProviderType,
    upstreamHeaders?: Record<string, string>,
    requestStartMs?: number
  ): ReadableStream<Uint8Array> {
    let estimatedTokens = 0;
    const decoder = new TextDecoder();
    const routerPool = this.pool;
    const routerMetrics = this.metrics;
    let leaseReleased = false;

    const releaseOnce = (success: boolean, errReason?: string) => {
      if (leaseReleased) return;
      leaseReleased = true;
      const totalDurationMs = requestStartMs ? Date.now() - requestStartMs : 300;
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
            releaseOnce(true);
            controller.close();
            return;
          }
          if (value) {
            const text = decoder.decode(value, { stream: true });
            estimatedTokens += Math.max(1, Math.ceil(text.length / 4));
            controller.enqueue(value);
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
        releaseOnce(false, `Client aborted stream: ${String(reason || 'disconnect')}`);
      }
    });
  }

  /**
   * Dispatches visual synthesis request to optimal pooled shard with latency telemetry.
   */
  async routeImageGeneration(options: RouteImageOptions): Promise<ImageGenerationResponse> {
    const { request, userId, requestId, isPriorityUser } = options;
    const modelSpec = ModelCatalog.resolveModel(request.model || 'openai-gpt-image-2');
    if (!modelSpec) {
      throw new Error(`Unsupported image model: '${request.model}'`);
    }
    const provider = modelSpec.provider;

    const acqResult = this.pool.acquireLease({
      userId,
      jobId: requestId,
      provider,
      targetModel: modelSpec.id,
      isPriorityUser,
      estimatedTokens: request.quality === 'hd' ? 200 : 100
    });

    if (!acqResult.lease) {
      throw new Error(
        acqResult.reason || `No healthy ${provider} shard credentials available in the pool`
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
        result = await GrokAdapter.executeImageGeneration(request, decrypted, modelSpec, lease.shardId);
      } else {
        result = await OpenAIAdapter.executeImageGeneration(request, decrypted, modelSpec, lease.shardId);
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
          GalxCryptoVault.zeroizeBuffer(buf);
        } catch {}
      }
    }
  }
}

export const galxRouter = GalxModelRouter.getInstance();
