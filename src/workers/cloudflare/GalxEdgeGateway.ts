/**
 * GALXAI: Cloudflare Edge Universal Gateway
 * Zero-Egress edge routing for chat completions, images, and embeddings for standard wholesale API keys.
 * Pipes upstream SSE chunks directly to clients with zero intermediate database egress.
 *
 * ARCHITECTURAL BOUNDARY:
 * Governs standard wholesale REST API keys (OPENAI_API_KEY, XAI_API_KEY) and R2 multimodal assets.
 * Does NOT govern ChatGPT Codex WebSocket sessions. Per ADR 0112 and ADR 0115, Codex WebSocket
 * inference is governed authoritatively by the dedicated Always-On VM Relay (LUMI-NEW/src/relay/relay-server.ts)
 * or local direct native WebSocket wire.
 */

import { ModelCatalog } from '../../core/router/ModelCatalog';
import type { ChatCompletionRequest } from '../../core/contracts/GalxContracts';
import {
  GalxSpendGovernanceEngine,
  type GovernanceDecision
} from '../../core/governance/GalxSpendGovernanceEngine';
import { ContextCompactor } from '../../core/optimization/ContextCompactor';
import { OutputVerbosityOptimizer } from '../../core/optimization/OutputVerbosityOptimizer';
import { BroccoliSpendSubstrate } from '../../core/broccolidb/BroccoliSpendSubstrate';
import {
  ChatRequestValidationError,
  resolveChatIdentity,
} from '../../core/chat/GalxChatRequestNormalizer';
import { USAGE_PRICING } from '../../lib/billing/usage-pricing';

export interface CloudflareEnv {
  ENVIRONMENT?: string;
  /** Test-only transport fixture; production cannot override the public status. */
  USAGE_PRICING_TEST_OVERRIDE?: 'published';
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  GALX_VAULT_MASTER_SECRET?: string;
  PUBLIC_ASSETS_URL?: string;
  OPENAI_API_KEY?: string;
  GATEWAY_AUTH_MODE?: string;
  ALLOW_SYNTHETIC_RESPONSES?: string;
  GOVERNANCE_MODE?: string;
  GOVERNANCE_POLICY_JSON?: string;
  HYPERDRIVE?: {
    connectionString: string;
  };
  RATE_LIMIT_KV?: any;
  EDGE_CACHE?: any;
  ASSET_BUCKET?: any;
  TRAINING_DATASET_BUCKET?: any;
  USER_WEBAPPS_BUCKET?: any;
  DREAMBEES_BUCKET?: any;
  STICKER_BUCKET?: any;
}

interface AuthenticatedGatewayKey {
  id: string;
  userId: string;
  keyHash: string;
  rateLimitPerMinute: number;
  allowedModels?: string[];
  spendCapUsd?: number;
  currentSpendUsd: number;
}

type GatewayAuthenticationResult =
  | { ok: true; key: AuthenticatedGatewayKey }
  | { ok: false; status: 401 | 402 | 503; code: string; message: string };

export class GalxEdgeGateway {
  constructor(private readonly env: CloudflareEnv) {}

  async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // 1. CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': [
            'Content-Type',
            'Authorization',
            'x-api-key',
            'x-galx-key',
            'x-galx-client',
            'x-galx-session',
            'x-galx-session-id',
            'x-galx-session-mode',
            'x-galx-turn-id',
            'x-galx-workspace',
            'x-galx-project',
            'x-galx-department',
            'x-galx-cost-center',
            'x-galx-environment',
            'x-galx-workload'
          ].join(', '),
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    // 2. Unauthenticated Public Health Probes
    if (url.pathname === '/health' || url.pathname === '/v1/health' || url.pathname === '/ping') {
      return new Response(
        JSON.stringify({
          status: 'healthy',
          timestamp: Date.now()
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // 3. API Key & Session Authentication Guard with Universal Ingestion
    const queryCredentialsAllowed =
      this.env.ENVIRONMENT === 'test' || this.env.ENVIRONMENT === 'development';
    let rawAuth =
      request.headers.get('Authorization') ||
      request.headers.get('authorization') ||
      request.headers.get('x-api-key') ||
      request.headers.get('x-galx-key') ||
      request.headers.get('api-key') ||
      request.headers.get('apikey') ||
      request.headers.get('x-auth-token') ||
      (queryCredentialsAllowed ? url.searchParams.get('api_key') : null) ||
      (queryCredentialsAllowed ? url.searchParams.get('apiKey') : null) ||
      (queryCredentialsAllowed ? url.searchParams.get('key') : null) ||
      '';

    const rawKey = rawAuth
      .replace(/^(Bearer|Token)\s+/i, '')
      .replace(/^['"]+|['"]+$/g, '')
      .trim();

    if (!rawKey || !this.isValidKeyFormat(rawKey)) {
      return new Response(
        JSON.stringify({
          error: {
            message: 'Authentication required. Please provide a valid API key via Authorization header (Bearer galx_live_...) or x-api-key.',
            type: 'invalid_request_error',
            code: 'invalid_api_key'
          }
        }),
        {
          status: 401,
          headers: {
            'content-type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    const authResult = await this.authenticateGatewayKey(rawKey);
    if (!authResult.ok) {
      return this.errorResponse(authResult.status, authResult.code, authResult.message);
    }

    // Check the same approval authority on every request, including cached keys.
    try {
      const access = await fetch('https://galx.ai/api/developer-access/check', {
        method: 'POST', headers: { Authorization: `Bearer ${rawKey}` },
        // Workers accepts manual/follow; manual keeps credentials on this exact destination.
        redirect: 'manual', signal: AbortSignal.timeout(5000), cache: 'no-store',
      });
      if (!access.ok) {
        await access.body?.cancel();
        const status = access.status === 401 ? 401 : access.status === 403 ? 403 : 503;
        return this.previewDenied(status);
      }
      const value = await access.json() as { approved?: unknown };
      if (value.approved !== true) return this.previewDenied(503);
    } catch { return this.previewDenied(503); }

    // API admission and consumption approval are separate decisions. Keep
    // model discovery available, but never dispatch a billable Developer
    // request while the separate usage contract is unpublished.
    const path = url.pathname.replace(/\/+$/, '') || '/';
    if (this.isDeveloperConsumptionPath(path, request.method) && !this.usagePricingPublished()) {
      return this.usagePricingUnavailable();
    }

    // 4. Rate Limiting Check via KV (Sliding Window)
    const isAllowed = await this.checkRateLimit(
      authResult.key.keyHash,
      authResult.key.rateLimitPerMinute,
      60
    );
    if (!isAllowed) {
      return new Response(
        JSON.stringify({
          error: {
            message: `Rate limit exceeded (${authResult.key.rateLimitPerMinute} req/min). Please back off.`,
            type: 'rate_limit_error',
            code: 'rate_limit_exceeded'
          }
        }),
        {
          status: 429,
          headers: {
            'content-type': 'application/json',
            'retry-after': '60',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // 5. Protected Path Routing (Zero-friction path matching)
    if ((path === '/v1/chat/completions' || path === '/chat/completions' || path === '/api/chat' || path === '/v1/completions' || path === '/completions' || path === '/api/generate') && (request.method === 'POST' || request.method === 'GET')) {
      return this.handleChatCompletions(request, authResult.key);
    }

    if ((path === '/v1/messages' || path === '/messages') && request.method === 'POST') {
      return this.handleChatCompletions(request, authResult.key);
    }

    if ((path === '/v1/models' || path === '/models' || path === '/api/tags') && request.method === 'GET') {
      return this.handleListModels();
    }

    if (path.startsWith('/v1/models/') && request.method === 'GET') {
      const modelId = path.replace('/v1/models/', '');
      return this.handleSingleModel(modelId);
    }

    if (path === '/api/version' && request.method === 'GET') {
      return new Response(JSON.stringify({ version: '0.5.12-galxai-gateway' }), {
        status: 200,
        headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (path === '/api/show' && request.method === 'POST') {
      return this.handleOllamaShow(request);
    }

    if ((path === '/v1/embeddings' || path === '/embeddings') && request.method === 'POST') {
      return this.handleEmbeddings(request);
    }

    if ((path === '/v1/images/generations' || path === '/images/generations') && request.method === 'POST') {
      return this.handleImageGenerations(request);
    }

    if (path.startsWith('/v1/images/') || path === '/images/generations') {
      return this.handleImageGenerations(request);
    }

    if ((path === '/v1/assets/upload' || path === '/assets/upload') && request.method === 'PUT') {
      return this.handleAssetUpload(request);
    }

    return new Response(
      JSON.stringify({ error: { message: `Route not found: ${url.pathname}`, code: 'route_not_found' } }),
      {
        status: 404,
        headers: {
          'content-type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }

  private previewDenied(status: number): Response {
    return new Response(JSON.stringify({ error: {
      code: status === 403 ? 'developer_preview_required' : status === 401 ? 'authentication_required' : 'access_check_unavailable',
      message: status === 403 ? 'An active GALX Nova Developer Access subscription or approved private-preview account is required.' : status === 401 ? 'Use an active account’s API key.' : 'We couldn’t check your access. Please try again.',
    }, request_access_url: 'https://galx.ai/developers' }), { status, headers: {
      'Content-Type': 'application/json', 'Cache-Control': 'private, no-store',
      'Access-Control-Allow-Origin': '*', 'X-Robots-Tag': 'noindex, nofollow',
    } });
  }

  private isDeveloperConsumptionPath(path: string, method: string): boolean {
    if (!['GET', 'POST'].includes(method)) return false;
    if (path === '/v1/chat/completions' || path === '/chat/completions' || path === '/api/chat' ||
      path === '/v1/completions' || path === '/completions' || path === '/api/generate' ||
      path === '/v1/messages' || path === '/messages') return true;
    if (method === 'POST' && (path === '/v1/embeddings' || path === '/embeddings' ||
      path === '/v1/images/generations' || path === '/images/generations')) return true;
    return false;
  }

  private usagePricingPublished(): boolean {
    return USAGE_PRICING.ratesPublished ||
      (this.env.ENVIRONMENT === 'test' && this.env.USAGE_PRICING_TEST_OVERRIDE === 'published');
  }

  private usagePricingUnavailable(): Response {
    return new Response(JSON.stringify({ error: {
      message: 'API usage is not available until the separate per-message usage-pricing terms are published. Developer Access includes no usage credits.',
      type: 'service_unavailable',
      code: 'usage_pricing_not_published',
      usage_pricing_url: USAGE_PRICING.path,
    } }), { status: 503, headers: {
      'content-type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    } });
  }

  private handleSingleModel(modelId: string): Response {
    const spec = ModelCatalog.resolveModel(modelId);
    return new Response(
      JSON.stringify({
        id: spec.id,
        object: 'model',
        created: 1720000000,
        owned_by: spec.provider,
        permission: [],
        root: spec.id,
        parent: null
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    );
  }

  private async handleOllamaShow(request: Request): Promise<Response> {
    let body: any = {};
    try {
      body = await request.json();
    } catch {}
    const requestedName = body.name || body.model || 'sol';
    const spec = ModelCatalog.resolveModel(requestedName);
    return new Response(
      JSON.stringify({
        license: 'Enterprise Commercial Wholesale License',
        modelfile: `# Modelfile for ${spec.id}\nFROM ${spec.id}\nPARAMETER temperature 0.7\n`,
        parameters: 'stop\t"<|im_end|>"\nstop\t"<|endoftext|>"',
        template: '{{ if .System }}<|im_start|>system\n{{ .System }}<|im_end|>\n{{ end }}<|im_start|>user\n{{ .Prompt }}<|im_end|>\n<|im_start|>assistant\n',
        details: {
          parent_model: '',
          format: 'gguf',
          family: spec.provider,
          families: [spec.provider],
          parameter_size: spec.id.includes('sol') ? '1.8T' : '70B',
          quantization_level: 'FP8-Enterprise'
        }
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    );
  }

  private static readonly edgeAuthCache = new Map<string, { result: GatewayAuthenticationResult; cachedAt: number }>();
  private static readonly EDGE_AUTH_CACHE_TTL_MS = 15000;
  private static readonly EDGE_NEG_CACHE_TTL_MS = 10000;

  /**
   * Authenticates the SHA-256 digest of a gateway key against the authoritative
   * Supabase record. Production never falls back to prefix/shape validation.
   * Employs edge in-memory caching and negative caching to protect Supabase from stampedes.
   */
  private async authenticateGatewayKey(rawKey: string): Promise<GatewayAuthenticationResult> {
    const keyHash = await this.sha256(rawKey);
    const now = Date.now();

    // 1. Edge In-Memory Cache & Negative Cache Check (<0.01ms)
    const cached = GalxEdgeGateway.edgeAuthCache.get(keyHash);
    if (cached) {
      const ttl = cached.result.ok ? GalxEdgeGateway.EDGE_AUTH_CACHE_TTL_MS : GalxEdgeGateway.EDGE_NEG_CACHE_TTL_MS;
      if (now - cached.cachedAt < ttl) {
        return cached.result;
      }
    }

    const isLocalFormatOnly =
      this.env.GATEWAY_AUTH_MODE === 'format-only' &&
      (this.env.ENVIRONMENT === 'test' || this.env.ENVIRONMENT === 'development');

    if (isLocalFormatOnly) {
      return {
        ok: true,
        key: {
          id: `local_${keyHash.slice(0, 16)}`,
          userId: 'local_test_user',
          keyHash,
          rateLimitPerMinute: 120,
          currentSpendUsd: 0
        }
      };
    }

    if (!this.env.SUPABASE_URL || !this.env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        ok: false,
        status: 503,
        code: 'authentication_backend_unavailable',
        message: 'Gateway authentication is not configured. The request was denied fail-closed.'
      };
    }

    try {
      const endpoint = new URL('/rest/v1/galx_developer_keys', this.env.SUPABASE_URL);
      endpoint.searchParams.set('key_hash', `eq.${keyHash}`);
      endpoint.searchParams.set('is_revoked', 'eq.false');
      endpoint.searchParams.set(
        'select',
        'id,user_id,rate_limit_per_minute,spend_cap_usd,current_spend_usd,allowed_models'
      );
      endpoint.searchParams.set('limit', '1');

      const response = await fetch(endpoint, {
        headers: {
          apikey: this.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${this.env.SUPABASE_SERVICE_ROLE_KEY}`,
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        return {
          ok: false,
          status: 503,
          code: 'authentication_backend_unavailable',
          message: 'Gateway authentication could not be verified. The request was denied fail-closed.'
        };
      }

      const rows = await response.json() as Array<{
        id: string;
        user_id: string;
        rate_limit_per_minute: number;
        spend_cap_usd: number | string | null;
        current_spend_usd: number | string | null;
        allowed_models: string[] | null;
      }>;
      const row = rows[0];

      if (!row) {
        const failureResult: GatewayAuthenticationResult = {
          ok: false,
          status: 401,
          code: 'invalid_api_key',
          message: 'The supplied gateway key is invalid or revoked.'
        };
        GalxEdgeGateway.edgeAuthCache.set(keyHash, { result: failureResult, cachedAt: now });
        return failureResult;
      }

      const spendCapUsd = row.spend_cap_usd === null ? undefined : Number(row.spend_cap_usd);
      const currentSpendUsd = Number(row.current_spend_usd || 0);
      if (spendCapUsd !== undefined && currentSpendUsd >= spendCapUsd) {
        const cappedResult: GatewayAuthenticationResult = {
          ok: false,
          status: 402,
          code: 'spend_cap_exceeded',
          message: 'This gateway key has reached its configured spend cap.'
        };
        GalxEdgeGateway.edgeAuthCache.set(keyHash, { result: cappedResult, cachedAt: now });
        return cappedResult;
      }

      const successResult: GatewayAuthenticationResult = {
        ok: true,
        key: {
          id: row.id,
          userId: row.user_id,
          keyHash,
          rateLimitPerMinute: Math.max(1, Number(row.rate_limit_per_minute) || 120),
          allowedModels: row.allowed_models || undefined,
          spendCapUsd,
          currentSpendUsd
        }
      };
      GalxEdgeGateway.edgeAuthCache.set(keyHash, { result: successResult, cachedAt: now });
      return successResult;
    } catch {
      return {
        ok: false,
        status: 503,
        code: 'authentication_backend_unavailable',
        message: 'Gateway authentication could not be verified. The request was denied fail-closed.'
      };
    }
  }

  private async sha256(value: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private syntheticResponsesAllowed(): boolean {
    return (
      this.env.ALLOW_SYNTHETIC_RESPONSES === 'true' &&
      (this.env.ENVIRONMENT === 'test' || this.env.ENVIRONMENT === 'development')
    );
  }

  private withGovernanceHeaders(
    headers: Record<string, string>,
    decision: GovernanceDecision
  ): Record<string, string> {
    return {
      ...headers,
      'x-galx-governance-mode': decision.mode,
      'x-galx-governance-action': decision.action,
      'x-galx-model-requested': decision.requestedModel,
      'x-galx-model-effective': decision.effectiveModel,
      'x-galx-governance-reasons': decision.reasonCodes.join(','),
      'x-galx-estimated-max-cost-usd': decision.estimatedMaximumCostUsd.toFixed(6),
      'Access-Control-Expose-Headers': [
        headers['Access-Control-Expose-Headers'],
        'x-galx-governance-mode',
        'x-galx-governance-action',
        'x-galx-model-requested',
        'x-galx-model-effective',
        'x-galx-model-recommended',
        'x-galx-governance-reasons',
        'x-galx-estimated-max-cost-usd',
        'x-galx-route-evidence-id'
      ].filter(Boolean).join(', '),
      ...(decision.recommendedModel ? { 'x-galx-model-recommended': decision.recommendedModel } : {}),
      ...(decision.routeEvidenceId ? { 'x-galx-route-evidence-id': decision.routeEvidenceId } : {})
    };
  }

  private errorResponse(
    status: number,
    code: string,
    message: string,
    governanceDecision?: GovernanceDecision
  ): Response {
    const headers = {
      'content-type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    };
    return new Response(
      JSON.stringify({ error: { message, type: 'gateway_error', code } }),
      {
        status,
        headers: governanceDecision
          ? this.withGovernanceHeaders(headers, governanceDecision)
          : headers
      }
    );
  }

  private async checkRateLimit(key: string, limit = 120, windowSeconds = 60): Promise<boolean> {
    if (!this.env.RATE_LIMIT_KV) return true;
    try {
      const windowSlot = Math.floor(Date.now() / 1000 / windowSeconds);
      const bucketKey = `ratelimit:${key.substring(0, 16)}:${windowSlot}`;
      const current = await this.env.RATE_LIMIT_KV.get(bucketKey);
      const count = current ? parseInt(current, 10) : 0;
      if (count >= limit) return false;
      await this.env.RATE_LIMIT_KV.put(bucketKey, (count + 1).toString(), { expirationTtl: windowSeconds * 2 });
      return true;
    } catch {
      return true; // fail-open for high availability
    }
  }

  private async handleChatCompletions(
    request: Request,
    gatewayKey: AuthenticatedGatewayKey
  ): Promise<Response> {
    let rawBody: any = {};
    const url = new URL(request.url);

    if (request.method === 'GET') {
      rawBody = {
        model: url.searchParams.get('model') || 'galx-nova',
        prompt: url.searchParams.get('prompt') || url.searchParams.get('q') || url.searchParams.get('message') || 'Hello',
        stream: url.searchParams.get('stream') !== 'false'
      };
    } else {
      try {
        const text = await request.text();
        if (!text || text.trim() === '') {
          rawBody = { messages: [{ role: 'user', content: 'Hello' }] };
        } else {
          try {
            rawBody = JSON.parse(text);
          } catch {
            rawBody = { messages: [{ role: 'user', content: text.trim() }] };
          }
        }
      } catch {
        rawBody = { messages: [{ role: 'user', content: 'Hello' }] };
      }
    }

    // 1. Hyper-Forgiving Messages Ingestion
    const normalizedMessages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: any }> = [];
    if (rawBody.system) {
      const systemStr = typeof rawBody.system === 'string' ? rawBody.system : Array.isArray(rawBody.system) ? rawBody.system.map((s: any) => s.text || '').join('\n') : String(rawBody.system);
      if (systemStr.trim()) normalizedMessages.push({ role: 'system', content: systemStr });
    }
    if (rawBody.messages) {
      if (Array.isArray(rawBody.messages)) {
        for (const msg of rawBody.messages) {
          if (typeof msg === 'string') {
            normalizedMessages.push({ role: 'user', content: msg });
          } else if (msg && typeof msg === 'object') {
            normalizedMessages.push({ role: msg.role || 'user', content: msg.content !== undefined ? msg.content : (msg.text || '') });
          }
        }
      } else if (typeof rawBody.messages === 'string') {
        normalizedMessages.push({ role: 'user', content: rawBody.messages });
      }
    } else if (rawBody.prompt) {
      normalizedMessages.push({ role: 'user', content: Array.isArray(rawBody.prompt) ? rawBody.prompt.join('\n') : String(rawBody.prompt) });
    } else if (rawBody.input) {
      normalizedMessages.push({ role: 'user', content: Array.isArray(rawBody.input) ? rawBody.input.join('\n') : String(rawBody.input) });
    }

    if (normalizedMessages.length === 0) {
      normalizedMessages.push({ role: 'user', content: 'Hello' });
    }

    // 2. Resolve Model Specification & Target Upstream. The request path is
    // deliberately strict: a typo must not silently become a different model.
    const requestedModelId = typeof rawBody.model === 'string' && rawBody.model.trim()
      ? rawBody.model.trim()
      : 'galx-nova';
    const requestedModelSpec = ModelCatalog.listAll().find(model =>
      model.id === requestedModelId && model.category === 'llm'
    );
    if (!requestedModelSpec) {
      return this.errorResponse(
        400,
        'unsupported_model',
        `The requested chat model "${requestedModelId}" is not supported. Use an exact model ID returned by /v1/models.`
      );
    }
    const isStream = rawBody.stream === true || rawBody.stream === 'true' || rawBody.stream === 1;
    const maxTokens = rawBody.max_tokens ?? rawBody.max_completion_tokens ?? 2048;

    const identityHeaders = new Headers(request.headers);
    const legacySessionId = request.headers.get('x-galx-session');
    if (legacySessionId && !identityHeaders.has('x-galx-session-id')) {
      identityHeaders.set('x-galx-session-id', legacySessionId);
    }
    let chatIdentity;
    try {
      chatIdentity = resolveChatIdentity({ body: rawBody, headers: identityHeaders });
    } catch (error) {
      if (error instanceof ChatRequestValidationError) {
        return this.errorResponse(error.status, error.code, error.message);
      }
      throw error;
    }
    const identityResponseHeaders = {
      'x-galx-conversation-id': chatIdentity.conversationId || '',
      'x-galx-session-mode': chatIdentity.mode,
      'x-galx-turn-id': chatIdentity.turnId,
      'x-galx-session-authority': 'client-context',
      'Access-Control-Expose-Headers': 'X-Galx-Conversation-Id, X-Galx-Session-Mode, X-Galx-Turn-Id, X-Galx-Session-Authority',
    };

    const body: ChatCompletionRequest = {
      model: requestedModelSpec.id,
      messages: normalizedMessages as any,
      temperature: rawBody.temperature !== undefined ? parseFloat(String(rawBody.temperature)) : 0.7,
      max_tokens: Number(maxTokens) || 2048,
      stream: isStream,
      top_p: rawBody.top_p,
      presence_penalty: rawBody.presence_penalty,
      frequency_penalty: rawBody.frequency_penalty,
      response_format: rawBody.response_format,
      tools: Array.isArray(rawBody.tools) ? rawBody.tools : undefined,
      tool_choice: rawBody.tool_choice,
      user: rawBody.user,
      conversation_id: chatIdentity.conversationId,
      session_mode: chatIdentity.mode,
      turn_id: chatIdentity.turnId,
    };

    const configuredPolicy = GalxSpendGovernanceEngine.parsePolicy(
      this.env.GOVERNANCE_POLICY_JSON,
      this.env.GOVERNANCE_MODE
    );
    const governanceDecision = GalxSpendGovernanceEngine.evaluate(
      body,
      {
        workspaceId: request.headers.get('x-galx-workspace') || undefined,
        projectId: request.headers.get('x-galx-project') || undefined,
        department: request.headers.get('x-galx-department') || undefined,
        costCenter: request.headers.get('x-galx-cost-center') || undefined,
        environment: request.headers.get('x-galx-environment') || undefined,
        workload: request.headers.get('x-galx-workload') || undefined,
        sessionId: body.conversation_id || undefined
      },
      {
        ...configuredPolicy,
        allowedModels: gatewayKey.allowedModels || configuredPolicy.allowedModels
      }
    );

    if (governanceDecision.action === 'block') {
      return new Response(
        JSON.stringify({
          error: {
            message: 'Request blocked by the active GALXAI spend governance policy.',
            type: 'policy_violation_error',
            code: 'governance_policy_block',
            reason_codes: governanceDecision.reasonCodes
          }
        }),
        {
          status: 403,
          headers: this.withGovernanceHeaders({
            'content-type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }, governanceDecision)
        }
      );
    }

    const modelSpec = ModelCatalog.resolveModel(governanceDecision.effectiveModel);
    body.model = modelSpec.id;

    const explicitFalse =
      body.compact_prompts === false ||
      body.enable_prompt_compaction === false ||
      body.compaction_mode === 'raw' ||
      body.extra_body?.compact_prompts === false ||
      body.extra_body?.enable_prompt_compaction === false ||
      (Array.isArray(body.transforms) && body.transforms.length === 0) ||
      request.headers.get('x-galx-compact') === 'false' ||
      request.headers.get('x-galx-compact-prompts') === 'false' ||
      request.headers.get('x-galx-compaction-mode') === 'raw' ||
      request.headers.get('x-compaction-mode') === 'raw' ||
      request.headers.get('x-skip-compaction') === 'true';

    const explicitTrue =
      body.compact_prompts === true ||
      body.enable_prompt_compaction === true ||
      body.compaction_mode === 'auto' ||
      (Array.isArray(body.transforms) && body.transforms.length > 0) ||
      request.headers.get('x-galx-compact') === 'true' ||
      request.headers.get('x-galx-compact-prompts') === 'true' ||
      request.headers.get('x-galx-compaction-mode') === 'auto';

    const compactPrompts = !explicitFalse && explicitTrue;

    if (compactPrompts) {
      // Apply Context Compaction (Deflate O(N^2) History Bloat)
      const compaction = ContextCompactor.compact(body.messages as any);
      if (compaction.wasCompacted) {
        body.messages = compaction.compactedMessages as any;
      }

      // Apply Output Verbosity Optimization (Slash Conversational Fluff)
      const verbosity = OutputVerbosityOptimizer.optimizeRequest(body.messages as any, { isApiCall: true });
      if (verbosity.result.wasOptimized) {
        body.messages = verbosity.optimizedMessages as any;
      }
    }

    // Ingest into Unified BroccoliDB AI Spend Substrate (CAS Vault, WAL, Lease, CDC)
    const promptText = (body.messages as any[]).map((m: any) => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content || ''))).join('\n');
    BroccoliSpendSubstrate.processLifecycle({
      traceId: `trace_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      department: request.headers.get('x-galx-department') || 'general',
      costCenter: request.headers.get('x-galx-cost-center') || 'infrastructure',
      serviceId: request.headers.get('x-galx-workload') || 'chat',
      model: modelSpec.id,
      promptText,
      estimatedCostUsd: governanceDecision.estimatedMaximumCostUsd,
      promptTokens: Math.ceil(promptText.length / 4),
      completionTokens: body.max_tokens || 2048,
      durationMs: 25.0,
    });

    const allowSyntheticResponses = this.syntheticResponsesAllowed();

    // 3. Upstream OpenAI Pass-Through if OPENAI_API_KEY is configured and provider is openai
    if (this.env.OPENAI_API_KEY && modelSpec.provider === 'openai') {
      try {
        // GALX identities govern local policy/correlation and are not provider API fields.
        const {
          conversation_id: _conversationId,
          session_mode: _sessionMode,
          turn_id: _turnId,
          user_message_id: _userMessageId,
          assistant_message_id: _assistantMessageId,
          ...providerBody
        } = body;
        const upstreamResp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${this.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            ...providerBody,
            model: modelSpec.upstreamId || 'gpt-4o'
          })
        });

        if (body.stream && upstreamResp.body) {
          return new Response(upstreamResp.body, {
            status: upstreamResp.status,
            headers: this.withGovernanceHeaders({
              'content-type': 'text/event-stream; charset=utf-8',
              'cache-control': 'no-cache, no-transform',
              connection: 'keep-alive',
              'Access-Control-Allow-Origin': '*',
              ...identityResponseHeaders,
              'x-galx-edge-pop': request.headers.get('cf-ray') || 'edge',
              'x-galx-model-resolved': modelSpec.id
            }, governanceDecision)
          });
        }

        return new Response(upstreamResp.body, {
          status: upstreamResp.status,
          headers: this.withGovernanceHeaders({
            'content-type': upstreamResp.headers.get('content-type') || 'application/json',
            'Access-Control-Allow-Origin': '*',
            ...identityResponseHeaders,
            'x-galx-edge-pop': request.headers.get('cf-ray') || 'edge',
            'x-galx-model-resolved': modelSpec.id
          }, governanceDecision)
        });
      } catch {
        if (!allowSyntheticResponses) {
          return this.errorResponse(
            502,
            'upstream_unavailable',
            'The model provider could not be reached. No synthetic response was substituted.',
            governanceDecision
          );
        }
      }
    }

    if (!this.env.OPENAI_API_KEY && !allowSyntheticResponses) {
      return this.errorResponse(
        503,
        'upstream_not_configured',
        'The model provider is not configured. No synthetic response was substituted.',
        governanceDecision
      );
    }

    // Zero-Egress Streaming Transform Stream
    if (body.stream) {
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      // Background stream worker on Cloudflare Edge
      (async () => {
        try {
          const timestamp = Math.floor(Date.now() / 1000);
          const chunkId = `chatcmpl-${Date.now()}`;
          const content = `[Cloudflare Edge PoP Gateway]: Stream processing for model "${body.model}".`;

          const chunk1 = {
            id: chunkId,
            object: 'chat.completion.chunk',
            created: timestamp,
            model: body.model,
            choices: [{ index: 0, delta: { role: 'assistant', content }, finish_reason: null }]
          };
          await writer.write(encoder.encode(`data: ${JSON.stringify(chunk1)}\n\n`));

          const chunk2 = {
            id: chunkId,
            object: 'chat.completion.chunk',
            created: timestamp,
            model: body.model,
            choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
            usage: { prompt_tokens: 15, completion_tokens: 20, total_tokens: 35 },
            conversation_id: chatIdentity.conversationId,
            turn_id: chatIdentity.turnId,
            session_mode: chatIdentity.mode,
          };
          await writer.write(encoder.encode(`data: ${JSON.stringify(chunk2)}\n\n`));
          await writer.write(encoder.encode('data: [DONE]\n\n'));
        } finally {
          await writer.close();
        }
      })();

      return new Response(readable, {
        status: 200,
        headers: this.withGovernanceHeaders({
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'no-cache, no-transform',
          connection: 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          ...identityResponseHeaders,
          'x-galx-edge-pop': request.headers.get('cf-ray') || 'edge',
          'x-galx-simulated': 'true'
        }, governanceDecision)
      });
    }

    // Non-Streaming Response
    const responsePayload = {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: body.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: `Processed by GALXAI Cloudflare Edge Gateway for model "${body.model}".`
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 25,
        completion_tokens: 30,
        total_tokens: 55
      },
      conversation_id: chatIdentity.conversationId,
      turn_id: chatIdentity.turnId,
      session_mode: chatIdentity.mode,
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: this.withGovernanceHeaders({
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        ...identityResponseHeaders,
        'x-galx-edge-pop': request.headers.get('cf-ray') || 'edge',
        'x-galx-simulated': 'true'
      }, governanceDecision)
    });
  }

  private async handleListModels(): Promise<Response> {
    const cacheKey = 'models:catalog:list:v3';
    if (this.env.EDGE_CACHE) {
      try {
        const cached = await this.env.EDGE_CACHE.get(cacheKey);
        if (cached) {
          return new Response(cached, {
            status: 200,
            headers: {
              'content-type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'x-galx-cache': 'HIT'
            }
          });
        }
      } catch {}
    }

    const models = [
      { id: 'galx-nova', object: 'model', owned_by: 'galxai', pricing_tier: 'provider_public' },
      { id: 'galx-nova-image', object: 'model', owned_by: 'galxai', pricing_tier: 'provider_public' },
    ];

    const payload = JSON.stringify({ object: 'list', data: models });

    if (this.env.EDGE_CACHE) {
      try {
        await this.env.EDGE_CACHE.put(cacheKey, payload, { expirationTtl: 300 });
      } catch {}
    }

    return new Response(payload, {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'x-galx-cache': 'MISS'
      }
    });
  }

  private async handleAssetUpload(request: Request): Promise<Response> {
    if (!this.env.ASSET_BUCKET) {
      return new Response(JSON.stringify({ error: { message: 'R2 storage not configured' } }), {
        status: 500,
        headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const contentType = request.headers.get('content-type') || 'application/octet-stream';
    const assetId = `asset_${crypto.randomUUID()}`;
    const extension = contentType.split('/')[1] || 'bin';
    const key = `generations/${assetId}.${extension}`;

    const buffer = await request.arrayBuffer();
    await this.env.ASSET_BUCKET.put(key, buffer, {
      httpMetadata: { contentType }
    });

    const publicBase = this.env.PUBLIC_ASSETS_URL || 'https://pub-9aab2b19ca7947c59240e3869c544e20.r2.dev';
    const publicUrl = `${publicBase}/${key}`;

    return new Response(
      JSON.stringify({
        assetId,
        publicUrl,
        sizeBytes: buffer.byteLength,
        contentType,
        uploadedAtMs: Date.now()
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    );
  }

  private async handleEmbeddings(request: Request): Promise<Response> {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: { message: 'Invalid JSON body' } }), {
        status: 400,
        headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (this.env.OPENAI_API_KEY) {
      try {
        const upstreamResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${this.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify(body)
        });
        return new Response(upstreamResponse.body, {
          status: upstreamResponse.status,
          headers: {
            'content-type': upstreamResponse.headers.get('content-type') || 'application/json',
            'Access-Control-Allow-Origin': '*',
            'x-galx-edge-pop': request.headers.get('cf-ray') || 'edge'
          }
        });
      } catch {
        if (!this.syntheticResponsesAllowed()) {
          return this.errorResponse(
            502,
            'upstream_unavailable',
            'The embeddings provider could not be reached. No synthetic vector was substituted.'
          );
        }
      }
    } else if (!this.syntheticResponsesAllowed()) {
      return this.errorResponse(
        503,
        'upstream_not_configured',
        'The embeddings provider is not configured. No synthetic vector was substituted.'
      );
    }

    const model = body.model || 'text-embedding-3-small';
    const input = body.input || '';
    const inputs = Array.isArray(input) ? input : [input];

    // High-velocity edge embedding vector generator (1536 dims)
    const data = inputs.map((text: string, index: number) => {
      const vector = new Array(1536).fill(0).map((_, i) => {
        const hash = (text.charCodeAt(i % Math.max(1, text.length)) || 42) * (i + 1);
        return Math.sin(hash) / 10;
      });
      return { object: 'embedding', index, embedding: vector };
    });

    return new Response(
      JSON.stringify({
        object: 'list',
        data,
        model,
        usage: { prompt_tokens: inputs.length * 8, total_tokens: inputs.length * 8 }
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'x-galx-edge-pop': request.headers.get('cf-ray') || 'edge',
          'x-galx-simulated': 'true'
        }
      }
    );
  }

  private async handleImageGenerations(request: Request): Promise<Response> {
    const requestId = crypto.randomUUID();
    try {
      // All image delivery uses the existing image service's normalization boundary.
      const headers = new Headers({ 'Content-Type': 'application/json' });
      for (const key of ['authorization', 'accept', 'prefer', 'idempotency-key', 'x-galx-async', 'x-galx-webhook-url', 'x-galx-webhook-secret']) {
        const value = request.headers.get(key);
        if (value) headers.set(key, value);
      }
      if (!headers.has('authorization') && request.headers.get('x-api-key')) headers.set('authorization', `Bearer ${request.headers.get('x-api-key')}`);
      const inputUrl = new URL(request.url);
      const path = inputUrl.pathname === '/images/generations' ? '/v1/images/generations' : inputUrl.pathname;
      const response = await fetch(`https://galx.ai${path}${inputUrl.search}`, {
        method: request.method, headers, ...(request.method === 'POST' ? { body: await request.text() } : {}), redirect: 'manual', signal: request.signal,
      });
      // Do not follow or publish redirects: credentials and image data stay on the trusted site.
      if (response.status >= 300 && response.status < 400) { await response.body?.cancel(); throw new Error('Image redirect rejected'); }
      if (!['image/png', 'image/jpeg', 'image/webp', 'application/json', 'text/event-stream'].includes(response.headers.get('content-type')?.split(';')[0] || '')) throw new Error('Invalid response');
      const publicHeaders = new Headers();
      for (const key of ['content-type', 'cache-control', 'x-content-type-options', 'x-request-id', 'retry-after', 'location', 'x-should-retry', 'access-control-allow-origin', 'access-control-expose-headers']) {
        const value = response.headers.get(key);
        if (value) publicHeaders.set(key, value);
      }
      if (!response.ok) {
        const code = response.status === 401 ? 'unauthorized' : response.status === 429 ? 'rate_limited' : response.status === 504 ? 'timeout' : response.status === 404 ? 'not_found' : response.status === 400 ? 'invalid_request' : 'generation_failed';
        return new Response(JSON.stringify({ error: { code, message: 'The image request could not be completed. Check your request or try again later.', request_id: requestId } }), {
          status: response.status, headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store', 'x-request-id': requestId, 'x-should-retry': 'false' },
        });
      }
      if (response.headers.get('content-type')?.includes('application/json')) {
        const value = await response.json() as any;
        const imageData = (input: any) => ({ created: Number(input.created) || Math.floor(Date.now() / 1000),
          data: input.data.map((item: any) => {
            if (typeof item.b64_json === 'string') return { b64_json: item.b64_json };
            if (typeof item.url === 'string' && /^(https:\/\/galx\.ai\/v1\/images\/assets\/|data:image\/(png|jpeg|webp);base64,)/.test(item.url)) return { url: item.url };
            throw new Error('Invalid image item');
          }) });
        const taskData = (input: any) => ({ id: typeof input.id === 'string' ? input.id : '', status: ['queued', 'generating', 'completed', 'failed', 'cancelled'].includes(input.status) ? input.status : 'failed',
          ...(input.result?.data?.data ? { result: { data: imageData(input.result.data) } } : {}) });
        const dto = Array.isArray(value.data) ? imageData(value)
          : value.task ? { task: taskData(value.task) }
          : typeof value.cancelled === 'boolean' ? { id: typeof value.id === 'string' ? value.id : '', cancelled: value.cancelled }
          : { id: typeof value.id === 'string' ? value.id : '', status: ['queued', 'generating', 'completed', 'failed', 'cancelled'].includes(value.status) ? value.status : 'failed', ...(typeof value.task_url === 'string' ? { task_url: value.task_url } : {}) };
        return new Response(JSON.stringify(dto), { status: response.status, headers: publicHeaders });
      }
      // Binary artifacts and SSE have already passed the trusted application's image boundary.
      return new Response(response.body, { status: response.status, headers: publicHeaders });
    } catch {
      return new Response(JSON.stringify({ error: { code: 'temporarily_unavailable', message: 'Image generation is temporarily unavailable.', request_id: requestId } }), {
        status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Request-Id': requestId, 'X-Should-Retry': 'false' },
      });
    }
  }

  private isValidKeyFormat(key: string): boolean {
    if (!key || typeof key !== 'string') return false;
    const cleanKey = key.trim();
    if (cleanKey.length < 8) return false;
    // Allow recognized GALX API key formats and standard session tokens
    if (
      cleanKey.startsWith('galx_live_') ||
      cleanKey.startsWith('galx_test_') ||
      cleanKey.startsWith('galx_sec_') ||
      cleanKey.startsWith('galx_') ||
      cleanKey.startsWith('sess_') ||
      cleanKey.startsWith('user_') ||
      cleanKey.startsWith('jwt_') ||
      cleanKey.startsWith('tok_')
    ) {
      return true;
    }
    // Reject explicit foreign or malformed prefixes (e.g. sk-invalid..., bad_...)
    if (cleanKey.startsWith('sk-') || cleanKey.startsWith('bad_') || cleanKey.startsWith('invalid_')) {
      return false;
    }
    // Allow long base64/hex session tokens
    return cleanKey.length >= 24 && /^[a-zA-Z0-9._-]+$/.test(cleanKey);
  }
}
