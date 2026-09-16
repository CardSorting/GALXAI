import { RelayDispatchError, publicRelayChatFailure } from '@/core/router/adapters/RelayChatTransport';
import { withDeveloperAccess } from '@/lib/security/developer-access';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { galxRouter, GalxModelRouter } from '@/core/router/GalxModelRouter';
import { GalxCryptoVault } from '@/core/vault/GalxCryptoVault';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { GalxSeatTierEngine } from '@/core/subscription/GalxSeatTierEngine';
import { GalxCommunityPoolGovernor } from '@/core/governor/GalxCommunityPoolGovernor';
import { GalxLumiQoSPoolGovernor } from '@/core/governor/GalxLumiQoSPoolGovernor';
import { GalxElasticContextGovernor } from '@/core/governor/GalxElasticContextGovernor';
import { GalxRollingContextEngine } from '@/core/router/GalxRollingContextEngine';
import { GalxTaskQueueEngine } from '@/core/queue/GalxTaskQueueEngine';
import {
  ChatRepository,
  ChatRepositoryAccessError,
} from '@/lib/supabase/repositories/ChatRepository';
import { GalxTrainingStreamEngine } from '@/core/training/GalxTrainingStreamEngine';
import { vectorizedSyncEngine } from '@/core/sync/GalxVectorizedSyncEngine';
import type { ChatCompletionRequest } from '@/core/contracts/GalxContracts';
import {
  ChatRequestValidationError,
  normalizeChatMessages,
  normalizeChatResourceId,
  normalizeReasoningEffort,
  optionalFiniteNumber,
  parseChatJsonBody,
  resolveChatIdentity,
  resolveAdaptiveReasoningEffort,
} from '@/core/chat/GalxChatRequestNormalizer';

export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';
export const maxDuration = 300;

const PERSISTED_MESSAGE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;

function persistedMessageId(value: unknown, prefix: string): string {
  return typeof value === 'string' && PERSISTED_MESSAGE_ID.test(value)
    ? value
    : `${prefix}_${crypto.randomUUID()}`;
}

// Handle CORS Pre-flight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Galx-Async, X-Galx-Queue, X-Galx-Webhook-Url, X-Galx-Priority, X-Galx-Delay-Ms, X-Galx-Session-Id, X-Galx-Session-Mode, X-Galx-Turn-Id, X-Galx-Protocol-Version, X-Deployment-Id, Idempotency-Key, Prefer',
      'Access-Control-Expose-Headers': 'X-Galx-Request-Id, X-Galx-Conversation-Id, X-Galx-Session-Mode, X-Galx-Turn-Id, X-Galx-Protocol-Version',
      'Access-Control-Max-Age': '86400'
    }
  });
}

/**
 * Universal OpenAI-Compatible POST /v1/chat/completions Endpoint.
 * Governed seamlessly by sovereign Seat Subscription Tiers with zero frontend key leakage.
 */
async function previewPOST(req: NextRequest) {
  let acquiredRequest: {
    userId: string;
    requestId: string;
    distributed: boolean;
    localStream: boolean;
  } | undefined;
  try {
    // 1. Authenticate Request with Hardened Auth Engine
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);

    if (!authResult.authenticated || !authResult.userId) {
      const isRateLimited = authResult.error === 'RATE_LIMIT_EXCEEDED';
      return NextResponse.json(
        {
          error: {
            message: authResult.error || 'Authentication required. Provide a valid bearer token or API key.',
            type: isRateLimited ? 'rate_limit_error' : 'invalid_request_error',
            code: isRateLimited ? 'rate_limit_exceeded' : 'invalid_api_key',
          },
        },
        {
          status: isRateLimited ? 429 : 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
            ...(authResult.rateLimitResetMs ? { 'Retry-After': String(Math.ceil(authResult.rateLimitResetMs / 1000)) } : {})
          }
        }
      );
    }

    // 2. Resolve Sovereign Seat Tier & Entitlements
    const seatEngine = GalxSeatTierEngine.getInstance();
    const entitlement = await seatEngine.resolveUserSeatTier(authResult);

    // Enforce Seat Monthly Spend Cap Safety
    if (entitlement.isCapped) {
      return NextResponse.json(
        {
          error: {
            message: 'Monthly seat compute quota reached. Please contact your organization administrator to increase limits.',
            type: 'rate_limit_error',
            code: 'seat_spend_cap_exceeded',
            tier: entitlement.tier,
            spend_cap_usd: entitlement.spendCapUsd,
            current_spend_usd: entitlement.currentSpendUsd
          }
        },
        { status: 429, headers: { 'Access-Control-Allow-Origin': '*', 'Retry-After': '60' } }
      );
    }

    const userId = authResult.userId;
    const isPriorityUser = entitlement.isPriorityUser;

    // 2. Evaluate Community Free Pool vs Dedicated Priority Pool ($30 Monthly Free Grant)
    const poolGovernor = GalxCommunityPoolGovernor.getInstance();
    const poolResult = poolGovernor.evaluateRequest(userId, authResult.apiKey, entitlement.creditsIncludedUsd || 0);

    if (!poolResult.allowed && poolResult.rejectionReason) {
      return NextResponse.json(
        {
          error: {
            message: poolResult.rejectionReason.message,
            type: 'free_compute_pool_exhausted',
            code: poolResult.rejectionReason.code,
            reset_at: poolResult.rejectionReason.resetAt,
            reset_in_seconds: poolResult.rejectionReason.resetInSeconds,
            upgrade_url: poolResult.rejectionReason.upgradeUrl,
            pool: poolResult.pool
          }
        },
        {
          status: 429,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Retry-After': String(poolResult.rejectionReason.resetInSeconds),
            'X-Galx-Compute-Pool': poolResult.pool,
            'X-Galx-Pool-Reset': poolResult.rejectionReason.resetAt
          }
        }
      );
    }


    // 2. Parse the OpenAI-compatible JSON envelope with bounded input validation.
    const rawBody = await parseChatJsonBody(req);
    const requestedModel = typeof rawBody.model === 'string' && rawBody.model.trim()
      ? rawBody.model.trim()
      : 'gpt-5.6-sol';

    // Enforce Dual Rolling Window Seat Limits (5-Hour & Weekly Limits)
    try {
      seatEngine.validateModelEntitlement(entitlement, requestedModel);
      seatEngine.evaluateSeatRollingLimits(userId, entitlement, requestedModel);
    } catch (limitErr: any) {
      const is5h = limitErr.message.includes('SEAT_5HOUR_LIMIT_EXCEEDED');
      const isLimit = limitErr.message.includes('LIMIT_EXCEEDED');
      return NextResponse.json(
        {
          error: {
            message: limitErr.message.replace(/^SEAT_\w+:\s*/, ''),
            type: isLimit ? 'rate_limit_error' : 'invalid_request_error',
            code: isLimit
              ? (is5h ? 'seat_5hour_limit_exceeded' : 'seat_weekly_limit_exceeded')
              : 'tier_model_restricted',
            tier: entitlement.tier
          }
        },
        {
          status: isLimit ? 429 : 403,
          headers: {
            'Access-Control-Allow-Origin': '*',
            ...(isLimit ? { 'Retry-After': is5h ? '1800' : '86400' } : {}),
            'X-Galx-Seat-Tier': entitlement.tier,
            'X-Galx-Seat-Role': entitlement.role
          }
        }
      );
    }

    // 3. Evaluate Dedicated LUMI QoS Pool Governor (Prevent Shared Pool Exhaustion)
    const lumiGovernor = GalxLumiQoSPoolGovernor.getInstance();
    const isLumiUser: boolean = entitlement.tier === 'developer' || Boolean(entitlement.tierLabel?.toLowerCase().includes('lumi'));
    const lumiResult = lumiGovernor.evaluateRequest(userId, isLumiUser, isPriorityUser, requestedModel);

    if (!lumiResult.allowed && lumiResult.rejectionReason) {
      return NextResponse.json(
        {
          error: {
            message: lumiResult.rejectionReason.message,
            type: 'qos_pool_exhausted',
            code: lumiResult.rejectionReason.code,
            reset_at: lumiResult.rejectionReason.resetAt,
            retry_after_seconds: lumiResult.rejectionReason.retryAfterSeconds,
            upgrade_url: lumiResult.rejectionReason.upgradeUrl,
            pool: lumiResult.pool,
            headroom_preserved_pct: lumiResult.poolStatus.reservedVipFloorPct
          }
        },
        {
          status: 429,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Retry-After': String(lumiResult.rejectionReason.retryAfterSeconds),
            'X-Galx-QoS-Pool': lumiResult.pool,
            'X-Galx-Congestion-State': lumiResult.poolStatus.congestionState,
            'X-Galx-Reserved-Vip-Floor': `${lumiResult.poolStatus.reservedVipFloorPct}%`
          }
        }
      );
    }

    const normalizedMessages = normalizeChatMessages(rawBody);
    const chatIdentity = resolveChatIdentity({ body: rawBody, headers: req.headers });
    const conversationId = chatIdentity.conversationId;
    const isWebChatClient = req.headers.get('x-galx-client') === 'web-chat';

    // Conversation identity is authoritative and user-scoped. The inference client and
    // credential shard are reusable transports; neither is allowed to imply continuity.
    if (conversationId && chatIdentity.mode === 'new') {
      const repo = ChatRepository.getInstance();
      const existing = await repo.getSession(conversationId, userId);
      if (!existing) {
        const firstUserText = normalizedMessages.find((message) => message.role === 'user')?.content;
        const titleSource = typeof firstUserText === 'string' ? firstUserText.trim() : '';
        const now = Date.now();
        try {
          await repo.saveSession({
            id: conversationId,
            title: titleSource ? titleSource.slice(0, 200) : 'New conversation',
            createdAt: now,
            updatedAt: now,
            modelId: requestedModel,
            isPinned: false,
            isArchived: false,
          }, userId);
        } catch (error) {
          if (error instanceof ChatRepositoryAccessError) {
            throw new ChatRequestValidationError(
              'The requested conversation ID is unavailable.',
              'conversation_id_unavailable',
              409
            );
          }
          throw error;
        }
      }
    } else if (conversationId && chatIdentity.mode === 'continue') {
      const existing = await ChatRepository.getInstance().getSession(conversationId, userId);
      if (!existing) {
        throw new ChatRequestValidationError(
          'The requested conversation does not exist or is not accessible. Start a new session before continuing it.',
          'conversation_not_found',
          404
        );
      }
    }

    // B. Parameter Forgiveness & Alias Resolution
    const requestedMaxTokens = optionalFiniteNumber(
      rawBody.max_tokens ?? rawBody.max_completion_tokens ?? rawBody.maxTokens ?? rawBody.max_length,
      'max_tokens',
      { min: 1, max: 128_000, integer: true }
    );
    const temperature = optionalFiniteNumber(rawBody.temperature, 'temperature', { min: 0, max: 2 }) ?? 0.7;
    const topP = optionalFiniteNumber(rawBody.top_p ?? rawBody.topP, 'top_p', { min: 0, max: 1 });
    if (rawBody.stream !== undefined && typeof rawBody.stream !== 'boolean') {
      throw new ChatRequestValidationError('stream must be a boolean.', 'invalid_stream');
    }
    const isStream = rawBody.stream === true;

    // C. Response Format Normalization
    let responseFormat = rawBody.response_format || rawBody.responseFormat;
    if (responseFormat === 'json' || rawBody.json === true) {
      responseFormat = { type: 'json_object' };
    }

    // D. Tool / Function Normalization (converting legacy OpenAI functions to tools)
    let tools = rawBody.tools;
    if (!tools && rawBody.functions && Array.isArray(rawBody.functions)) {
      tools = rawBody.functions.map((fn: any) => ({
        type: 'function',
        function: fn
      }));
    }

    const contextGovernor = GalxElasticContextGovernor.getInstance();
    const provisionalPlan = contextGovernor.resolveElasticContext({
      modelId: requestedModel,
      requestedMaxTokens,
      messages: normalizedMessages,
      entitlement,
    });
    const rollingPromptBudget = Math.max(
      256,
      provisionalPlan.contextWindowTokens - provisionalPlan.allocatedMaxTokens - provisionalPlan.safetyMarginTokens
    );

    // Robust Multi-Strategy Compaction Policy Resolution (RAW / VERBATIM IS SAFE DEFAULT; COMPACTION IS OPT-IN)
    const keyExplicitAuto = authResult.apiKey?.defaultCompactionMode === 'auto';

    const explicitFalse =
      rawBody.compact_prompts === false ||
      rawBody.enable_prompt_compaction === false ||
      rawBody.compaction_mode === 'raw' ||
      rawBody.extra_body?.compact_prompts === false ||
      rawBody.extra_body?.enable_prompt_compaction === false ||
      (Array.isArray(rawBody.transforms) && rawBody.transforms.length === 0) ||
      req.headers.get('x-galx-compact') === 'false' ||
      req.headers.get('x-galx-compact-prompts') === 'false' ||
      req.headers.get('x-galx-compaction-mode') === 'raw' ||
      req.headers.get('x-compaction-mode') === 'raw' ||
      req.headers.get('x-skip-compaction') === 'true';

    const explicitTrue =
      rawBody.compact_prompts === true ||
      rawBody.enable_prompt_compaction === true ||
      rawBody.compaction_mode === 'auto' ||
      (Array.isArray(rawBody.transforms) && rawBody.transforms.length > 0) ||
      req.headers.get('x-galx-compact') === 'true' ||
      req.headers.get('x-galx-compact-prompts') === 'true' ||
      req.headers.get('x-galx-compaction-mode') === 'auto';

    const compactPrompts = !explicitFalse && (explicitTrue || keyExplicitAuto);

    // Hierarchical Rolling Context & Long-Horizon Memory Optimization
    const rollingContext = await GalxRollingContextEngine.getInstance().buildOptimalRollingContextAsync({
      messages: normalizedMessages as any,
      modelId: requestedModel,
      conversationId: conversationId || undefined,
      userId,
      workspaceId: entitlement.orgId,
      maxTokenBudget: rollingPromptBudget,
      recentBufferTurnCount: 8,
      enableCompaction: compactPrompts,
    });

    const activeMessages = rollingContext.optimizedMessages;

    // Dynamic Elastic Context Sizing (Thousands of pages / 1M Context Window ready)
    const contextPlan = contextGovernor.resolveElasticContext({
      modelId: requestedModel,
      requestedMaxTokens,
      messages: activeMessages as any,
      entitlement
    });

    if (!contextPlan.fitsInContext || rollingContext.budgetExceeded) {
      return NextResponse.json(
        {
          error: {
            message: `Context length exceeded: prompt contains ~${contextPlan.estimatedPromptTokens.toLocaleString()} tokens (~${contextPlan.estimatedPages.toLocaleString()} pages), exceeding model limit of ${contextPlan.contextWindowTokens.toLocaleString()} tokens.`,
            type: 'invalid_request_error',
            code: 'context_length_exceeded'
          }
        },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const rawReasoningEffort =
      rawBody.reasoning_effort ||
      rawBody.reasoningEffort ||
      req.headers.get('x-galx-reasoning-effort') ||
      req.nextUrl?.searchParams?.get('reasoning_effort');
    const normalizedReasoningEffort = normalizeReasoningEffort(rawReasoningEffort);
    const effectiveReasoningEffort = resolveAdaptiveReasoningEffort({
      explicitEffort: normalizedReasoningEffort,
      messages: activeMessages as any,
      isStream,
    });

    const body: ChatCompletionRequest = {
      model: contextPlan.modelId,
      messages: activeMessages as any,
      temperature,
      max_tokens: contextPlan.allocatedMaxTokens,
      top_p: topP,
      stream: isStream,
      stop: typeof rawBody.stop === 'string' ? [rawBody.stop] : rawBody.stop,
      response_format: responseFormat,
      tools,
      tool_choice: rawBody.tool_choice || rawBody.toolChoice || (rawBody.function_call ? { type: 'function', function: { name: rawBody.function_call } } : undefined),
      user: typeof rawBody.user === 'string' ? rawBody.user : undefined,
      prompt_cache_key: rollingContext.stableCacheHash
        ? `galx:${rollingContext.stableCacheHash.slice(0, 48)}`
        : undefined,
      prompt_cache_options: contextPlan.promptCacheOptimized
        ? { mode: 'implicit', ttl: '30m' }
        : undefined,
      privacy: rawBody.privacy,
      reasoning_effort: effectiveReasoningEffort,
      conversation_id: conversationId,
      session_mode: chatIdentity.mode,
      turn_id: chatIdentity.turnId,
      user_message_id: normalizeChatResourceId(rawBody.user_message_id, 'user_message_id'),
      assistant_message_id: normalizeChatResourceId(rawBody.assistant_message_id, 'assistant_message_id'),
    };

    const isAsync = req.headers.get('x-galx-async') === 'true' || req.headers.get('prefer') === 'respond-async';
    const rawIdempotencyKey = req.headers.get('idempotency-key')?.trim();
    if (rawIdempotencyKey && rawIdempotencyKey.length > 256) {
      throw new ChatRequestValidationError(
        'Idempotency-Key must contain at most 256 characters.',
        'invalid_idempotency_key'
      );
    }
    const idempotencyKey = rawIdempotencyKey || undefined;
    const requestIdentity = idempotencyKey || `${conversationId || 'stateless'}:${chatIdentity.turnId}`;
    const requestId = `req_${crypto.createHash('sha256').update(`${userId}:${requestIdentity}`).digest('hex').slice(0, 48)}`;

    // 3. The database lease is authoritative across server instances. The process-local
    // slot remains an offline development fallback when Supabase is not configured.
    if (!isAsync) {
      const distributedGate = await seatEngine.evaluateAndAcquireDistributedGate({
        userId,
        requestId,
        requestedModel: contextPlan.modelId,
        orgId: entitlement.orgId,
        tier: entitlement.tier,
        isStream,
        leaseTtlSeconds: Math.max(90, maxDuration + 30),
      });
      if (distributedGate && !distributedGate.allowed) {
        const code = distributedGate.rejectionCode || 'seat_gate_rejected';
        const messages: Record<string, string> = {
          seat_5hour_limit_exceeded: 'The 5-hour rolling seat quota is exhausted.',
          seat_weekly_limit_exceeded: 'The weekly rolling seat quota is exhausted.',
          seat_concurrency_limit_exceeded: 'The active stream concurrency limit is reached.',
          seat_spend_cap_exceeded: 'The monthly seat spend cap is reached.',
          tier_model_restricted: 'This model is not available for the active seat tier.',
          seat_inactive: 'This organization seat is not active.',
          request_in_progress: 'A request with this idempotency key is already in progress.',
          request_already_settled: 'A request with this idempotency key has already completed.',
          request_already_released: 'A previous request with this idempotency key was cancelled.',
        };
        const isIdempotencyConflict = code.startsWith('request_');
        return NextResponse.json(
          {
            error: {
              message: messages[code] || 'The seat request was rejected by policy.',
              type: 'rate_limit_error',
              code,
              tier: entitlement.tier,
              concurrency_limit: distributedGate.concurrencyLimit || entitlement.concurrencyLimit,
            }
          },
          {
            status: isIdempotencyConflict ? 409 : 429,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Retry-After': '5',
              'X-Galx-Seat-Tier': entitlement.tier,
              'X-Galx-Seat-Role': entitlement.role
            }
          }
        );
      }

      if (distributedGate) {
        acquiredRequest = { userId, requestId, distributed: true, localStream: false };
      } else if (isStream) {
        if (!seatEngine.acquireSeatStreamSlot(userId, entitlement.concurrencyLimit)) {
          return NextResponse.json(
            {
              error: {
                message: `Seat concurrency limit of ${entitlement.concurrencyLimit} active streams reached.`,
                type: 'rate_limit_error',
                code: 'seat_concurrency_limit_exceeded',
              }
            },
            { status: 429, headers: { 'Retry-After': '5' } }
          );
        }
        acquiredRequest = { userId, requestId, distributed: false, localStream: true };
      }
    }

    // 4. Asynchronous Queue Processing (CloudTasks / CloudRun pattern)
    if (isAsync) {
      const targetQueue = req.headers.get('x-galx-queue') || 'llm-batch';
      const webhookUrl = req.headers.get('x-galx-webhook-url') || undefined;
      const priorityHeader = req.headers.get('x-galx-priority');
      const priority = priorityHeader ? parseInt(priorityHeader, 10) : (entitlement.isPriorityUser ? 80 : 50);
      const delayHeader = req.headers.get('x-galx-delay-ms');
      const delayMs = delayHeader ? parseInt(delayHeader, 10) : undefined;

      const queueEngine = GalxTaskQueueEngine.getInstance();
      const { task, deduplicated } = queueEngine.createTask({
        queueId: targetQueue,
        userId,
        idempotencyKey: idempotencyKey || chatIdentity.turnId,
        priority,
        delayMs,
        target: {
          type: 'INTERNAL_MODEL',
          taskKind: 'chat_completion',
          chatPayload: body,
          isPriorityUser,
          webhookCompletionUrl: webhookUrl
        }
      });

      return NextResponse.json(
        {
          id: task.id,
          object: 'chat.completion.async',
          status: task.status,
          queue: task.queueId,
          created: Math.floor(task.createdAtMs / 1000),
          model: body.model,
          conversation_id: conversationId,
          turn_id: chatIdentity.turnId,
          session_mode: chatIdentity.mode,
          task_url: `/api/queues/${task.queueId}/tasks/${task.id}`,
          deduplicated
        },
        {
          status: 202,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Location': `/api/queues/${task.queueId}/tasks/${task.id}`,
            'X-Galx-Task-Id': task.id,
            'X-Galx-Queue-Id': task.queueId,
            'X-Galx-Seat-Tier': entitlement.tier,
            'X-Galx-Conversation-Id': conversationId || '',
            'X-Galx-Session-Mode': chatIdentity.mode,
            'X-Galx-Turn-Id': chatIdentity.turnId,
          }
        }
      );
    }

    // 4. Synchronous Route through GALXAI Credential Pool with HIPAA, ZDR & GDPR Safeguards
    const result = await galxRouter.routeChatCompletion({
      request: body,
      userId,
      requestId,
      isPriorityUser,
      headers: req.headers
    });

    // 5. Return formatted response with CORS headers, TTFT streaming optimization & ZDR Attestation
    const isApiCall = authResult.authType === 'developer_key' || !isWebChatClient;

    const headers = new Headers(result.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('X-Galx-Request-Id', requestId);
    headers.set('X-Galx-Conversation-Id', conversationId || '');
    headers.set('X-Galx-Session-Mode', chatIdentity.mode);
    headers.set('X-Galx-Turn-Id', chatIdentity.turnId);
    headers.set('X-Galx-Protocol-Version', '2026-09-04');
    headers.set('Access-Control-Expose-Headers', 'X-Galx-Request-Id, X-Galx-Conversation-Id, X-Galx-Session-Mode, X-Galx-Turn-Id, X-Galx-Protocol-Version, X-Galx-Session-Affinity');
    if (result.shardId) {
      const affinityTicket = GalxCryptoVault.sealAffinityTicket(result.shardId);
      headers.set('X-Galx-Session-Affinity', affinityTicket);
      headers.set('Set-Cookie', `galx_session_affinity=${encodeURIComponent(affinityTicket)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=86400`);
    }
    headers.set(
      'X-Galx-Data-Policy',
      conversationId
        ? 'owner-scoped-durable-conversation'
        : (isApiCall ? 'api-private-zero-retention' : 'chat-model-improvement-opt-out-governed')
    );
    const currentWindows = seatEngine.calculateRollingWindows(userId, entitlement.tier);
    headers.set('X-Galx-Model', result.modelUsed);
    headers.set('X-Galx-Seat-Tier', entitlement.tier);
    headers.set('X-Galx-Seat-Role', entitlement.role);
    headers.set('X-Galx-Seat-5Hour-Remaining-Pct', String(currentWindows.fiveHourWindow.percentRemaining));
    headers.set('X-Galx-Seat-5Hour-Refresh-In', currentWindows.fiveHourWindow.refreshIn);
    headers.set('X-Galx-Seat-5Hour-Reset', String(Math.floor(currentWindows.fiveHourWindow.resetAtMs / 1000)));
    headers.set('X-Galx-Seat-Weekly-Remaining-Pct', String(currentWindows.weeklyWindow.percentRemaining));
    headers.set('X-Galx-Seat-Weekly-Refresh-In', currentWindows.weeklyWindow.refreshIn);
    headers.set('X-Galx-Seat-Weekly-Reset', String(Math.floor(currentWindows.weeklyWindow.resetAtMs / 1000)));
    headers.set('X-Galx-Cache-Rebate-Pct', String(entitlement.promptCacheRebatePct));
    headers.set('X-Galx-Reasoning-Effort', effectiveReasoningEffort);

    if (result.isStream && result.body && typeof (result.body as any).getReader === 'function') {
      headers.set('Content-Type', 'text/event-stream; charset=utf-8');
      headers.set('Cache-Control', 'no-cache, no-transform');
      headers.set('Connection', 'keep-alive');
      headers.set('X-Accel-Buffering', 'no');

      const upstreamReader = (result.body as ReadableStream<Uint8Array>).getReader();
      const decoder = new TextDecoder();
      const lease = acquiredRequest;
      acquiredRequest = undefined;
      let sseBuffer = '';
      let accumulatedContent = '';
      let accumulatedThinking = '';
      let finalized = false;
      let streamFailed = false;

      const consumeSseLines = (flush = false) => {
        const lines = sseBuffer.split('\n');
        sseBuffer = flush ? '' : (lines.pop() || '');
        for (const rawLine of lines) {
          const line = rawLine.trimEnd();
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trimStart();
          if (!payload || payload === '[DONE]') continue;
          try {
            const json = JSON.parse(payload);
            if (json.error) streamFailed = true;
            const delta = json.choices?.[0]?.delta;
            if (typeof delta?.content === 'string') accumulatedContent += delta.content;
            if (typeof delta?.thinking === 'string') accumulatedThinking += delta.thinking;
            if (typeof delta?.reasoning_content === 'string') accumulatedThinking += delta.reasoning_content;
          } catch {
            // Non-JSON SSE events are forwarded untouched and ignored by the persistence tap.
          }
        }
      };

      const finalizeStream = async (completed: boolean) => {
        if (finalized) return;
        finalized = true;
        const lastUser = normalizedMessages.filter((message) => message.role === 'user').pop();
        const userContent = lastUser
          ? (typeof lastUser.content === 'string' ? lastUser.content : JSON.stringify(lastUser.content))
          : undefined;
        try {
          if (lease?.distributed) {
            if (completed) {
              await seatEngine.settleDistributedRequest({
                userId,
                requestId,
                modelId: result.modelUsed,
                tokens: contextPlan.estimatedPromptTokens + Math.ceil((accumulatedContent.length + accumulatedThinking.length) / 4),
                conversationId,
                userMessage: conversationId && userContent !== undefined ? {
                  id: persistedMessageId(body.user_message_id, 'msg_u'),
                  role: 'user',
                  content: userContent,
                  alternative_contents: [userContent],
                  active_index: 0,
                  created_at: new Date(Date.now() - 1000).toISOString(),
                } : undefined,
                assistantMessage: conversationId ? {
                  id: persistedMessageId(body.assistant_message_id, 'msg_a'),
                  role: 'assistant',
                  content: accumulatedContent,
                  alternative_contents: [accumulatedContent],
                  active_index: 0,
                  thinking_content: accumulatedThinking || null,
                  model_id: result.modelUsed,
                  persona_id: rawBody.persona_id || rawBody.personaId || null,
                  created_at: new Date().toISOString(),
                } : undefined,
              });
            } else {
              await seatEngine.releaseDistributedRequest(userId, requestId);
            }
          } else if (completed && conversationId && (accumulatedContent || accumulatedThinking)) {
              ChatRepository.getInstance().recordStreamCompletion({
                conversationId,
                userMessage: userContent !== undefined
                  ? {
                      id: persistedMessageId(body.user_message_id, 'msg_u'),
                      content: userContent,
                      role: 'user',
                    }
                  : undefined,
                assistantMessage: {
                  id: persistedMessageId(body.assistant_message_id, 'msg_a'),
                  content: accumulatedContent,
                  thinkingContent: accumulatedThinking || undefined,
                  modelId: result.modelUsed,
                  personaId: rawBody.persona_id || rawBody.personaId,
                },
                userId,
              });
          }
        } catch (settlementError) {
          console.error('[CompletionsRoute] Stream lease finalization failed:', settlementError);
        } finally {
          if (lease?.localStream) seatEngine.releaseSeatStreamSlot(userId);
          GalxLumiQoSPoolGovernor.getInstance().releaseStreamSlot(userId, isLumiUser);
          
          // Zero-Storage Streaming Training Distillation Tap
          if (completed && (accumulatedContent || accumulatedThinking)) {
            GalxTrainingStreamEngine.getInstance()
              .ingestInteraction({
                source: isApiCall ? 'api_route' : 'web_chat',
                userId,
                modelId: result.modelUsed,
                messages: normalizedMessages,
                userPrompt: userContent,
                completionContent: accumulatedContent,
                allowModelTraining: (rawBody as any).allow_model_training ?? (rawBody as any).privacy?.allowModelTraining,
                isApiCall,
                headers: req.headers,
              })
              .catch((err) => {
                console.warn('[CompletionsRoute] Training ingestion notice:', err?.message);
              });
          }
        }
      };

      const managedStream = new ReadableStream<Uint8Array>({
        async pull(controller) {
          try {
            const { done, value } = await upstreamReader.read();
            if (done) {
              sseBuffer += decoder.decode();
              if (sseBuffer) {
                sseBuffer += '\n';
                consumeSseLines(true);
              }
              await finalizeStream(!streamFailed);
              controller.close();
              return;
            }
            sseBuffer += decoder.decode(value, { stream: true });
            consumeSseLines();
            controller.enqueue(value);
          } catch (streamError) {
            await finalizeStream(false);
            controller.error(streamError);
          }
        },
        async cancel(reason) {
          try {
            await upstreamReader.cancel(reason);
          } finally {
            await finalizeStream(false);
          }
        },
      });

      headers.set('Galx-Transport-Engine', 'zero-copy-v3-zenith');
      return new Response(managedStream, { status: result.statusCode, headers });
    }

    if (acquiredRequest?.distributed) {
      if (result.statusCode >= 200 && result.statusCode < 400) {
        let responseContent = '';
        let usageTokens = contextPlan.estimatedPromptTokens;
        if (typeof result.body === 'string') {
          try {
            const parsed = JSON.parse(result.body);
            responseContent = parsed.choices?.[0]?.message?.content || '';
            usageTokens = parsed.usage?.total_tokens || usageTokens + Math.ceil(responseContent.length / 4);
          } catch {}
        }
        const lastUser = normalizedMessages.filter((message) => message.role === 'user').pop();
        const userContent = lastUser
          ? (typeof lastUser.content === 'string' ? lastUser.content : JSON.stringify(lastUser.content))
          : undefined;
        try {
          await seatEngine.settleDistributedRequest({
            userId,
            requestId,
            modelId: result.modelUsed,
            tokens: usageTokens,
            conversationId,
            userMessage: conversationId && userContent !== undefined ? {
              id: persistedMessageId(body.user_message_id, 'msg_u'),
              role: 'user',
              content: userContent,
              alternative_contents: [userContent],
              active_index: 0,
              created_at: new Date(Date.now() - 1000).toISOString(),
            } : undefined,
            assistantMessage: conversationId ? {
              id: persistedMessageId(body.assistant_message_id, 'msg_a'),
              role: 'assistant',
              content: responseContent,
              alternative_contents: [responseContent],
              active_index: 0,
              model_id: result.modelUsed,
              persona_id: rawBody.persona_id || rawBody.personaId || null,
              created_at: new Date().toISOString(),
            } : undefined,
          });
        } catch (settlementError) {
          console.error('[CompletionsRoute] Non-streaming lease settlement failed:', settlementError);
        }
      } else {
        await seatEngine.releaseDistributedRequest(userId, requestId);
      }
      acquiredRequest = undefined;
    }
    if (acquiredRequest?.localStream) {
      seatEngine.releaseSeatStreamSlot(userId);
      acquiredRequest = undefined;
    }
    GalxLumiQoSPoolGovernor.getInstance().releaseStreamSlot(userId, isLumiUser);

    // Zero-Storage Streaming Training Distillation Tap (Non-Streaming)
    if (result.statusCode >= 200 && result.statusCode < 400) {
      let nonStreamContent = '';
      if (typeof result.body === 'string') {
        try {
          const parsed = JSON.parse(result.body);
          parsed.conversation_id = conversationId;
          parsed.turn_id = chatIdentity.turnId;
          parsed.session_mode = chatIdentity.mode;
          nonStreamContent = parsed.choices?.[0]?.message?.content || '';
          if (parsed.usage) {
            parsed.usage.prompt_tokens_details = {
              ...(parsed.usage.prompt_tokens_details || {}),
              cached_tokens: parsed.usage.prompt_tokens_details?.cached_tokens || 0,
              compacted_tokens: rollingContext.tokensSaved,
              compaction_mode: compactPrompts ? 'auto' : 'raw',
            };
          }
          result.body = JSON.stringify(parsed);
        } catch {}
      }
      const lastUser = normalizedMessages.filter((message) => message.role === 'user').pop();
      const userContent = lastUser
        ? (typeof lastUser.content === 'string' ? lastUser.content : JSON.stringify(lastUser.content))
        : undefined;

      GalxTrainingStreamEngine.getInstance()
        .ingestInteraction({
          source: isApiCall ? 'api_route' : 'web_chat',
          userId,
          modelId: result.modelUsed,
          messages: normalizedMessages,
          userPrompt: userContent,
          completionContent: nonStreamContent,
          allowModelTraining: (rawBody as any).allow_model_training ?? (rawBody as any).privacy?.allowModelTraining,
          isApiCall,
          headers: req.headers,
        })
        .catch((err) => {
          console.warn('[CompletionsRoute] Non-streaming training ingestion notice:', err?.message);
        });
    }

    return new Response(result.body, {
      status: result.statusCode,
      headers,
    });
  } catch (error: any) {
    if (acquiredRequest) {
      const seatEngine = GalxSeatTierEngine.getInstance();
      if (acquiredRequest.distributed) {
        try {
          await seatEngine.releaseDistributedRequest(acquiredRequest.userId, acquiredRequest.requestId);
        } catch (releaseError) {
          console.error('[CompletionsRoute] Failed to release distributed seat lease:', releaseError);
        }
      }
      if (acquiredRequest.localStream) seatEngine.releaseSeatStreamSlot(acquiredRequest.userId);
      GalxLumiQoSPoolGovernor.getInstance().releaseStreamSlot(acquiredRequest.userId, true);
    }
    if (error instanceof RelayDispatchError) {
      const publicFailure = publicRelayChatFailure(error);
      const needsEdit = ['context_budget_exceeded','output_budget_exceeded'].includes(publicFailure.error.code);
      return NextResponse.json(publicFailure, { status: needsEdit ? 400 : 503, headers: {
        'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'X-Should-Retry': 'false',
        ...(error.executionState === 'not_accepted' && !needsEdit ? { 'Retry-After': '5' } : {}),
      } });
    }
    if (error instanceof ChatRequestValidationError) {
      return NextResponse.json(
        { error: { message: error.message, type: 'invalid_request_error', code: error.code } },
        { status: error.status, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }
    let rawMessage = error.message || 'Internal Router Error';
    const jsonMatch = rawMessage.match(/\{.*"message"\s*:\s*"([^"]+)".*\}/);
    if (jsonMatch && jsonMatch[1]) {
      rawMessage = jsonMatch[1];
    }
    const message = GalxModelRouter.sanitizeUpstreamError(rawMessage);
    const isRateLimited =
      message.includes('saturated') ||
      message.includes('reached maximum simultaneous') ||
      message.toLowerCase().includes('rate limit') ||
      message.toLowerCase().includes('usage limit') ||
      message.includes('(429)') ||
      rawMessage.includes('429');
    const isAuthError =
      message.includes('401') ||
      message.includes('Unauthorized') ||
      message.toLowerCase().includes('unauthorized') ||
      message.toLowerCase().includes('authentication in header') ||
      rawMessage.includes('401');
    const isCapacityConstrained =
      message.includes('temporarily constrained') ||
      rawMessage.includes('pool_exhausted') ||
      rawMessage.includes('shards available') ||
      rawMessage.includes('credential shards') ||
      rawMessage.includes('all_shards_cooldown') ||
      rawMessage.includes('matching shard') ||
      message.includes('in cooldown');
    const isRelayUnavailable = rawMessage.includes('Inference relay unavailable');
    const isUnavailable =
      message.includes('No healthy') ||
      message.includes('overloaded') ||
      rawMessage.includes('compute_capacity_unavailable') ||
      isRelayUnavailable;
    const isBadRequest = rawMessage.includes('Unsupported model') || rawMessage.includes('Missing required');

    const status = isAuthError
      ? 401
      : (isRateLimited || isCapacityConstrained)
      ? 429
      : isUnavailable
      ? 503
      : isBadRequest
      ? 400
      : 500;

    const errorType = isAuthError
      ? 'authentication_error'
      : (isRateLimited || isCapacityConstrained)
      ? 'rate_limit_error'
      : isUnavailable
      ? 'service_unavailable_error'
      : isBadRequest
      ? 'invalid_request_error'
      : 'api_error';

    const isUsageLimit = message.toLowerCase().includes('usage limit');

    return NextResponse.json(
      {
        error: {
          message,
          type: errorType,
          code: isRelayUnavailable
            ? 'relay_unavailable'
            : isAuthError
            ? 'upstream_auth_failed'
            : isUsageLimit
            ? 'usage_limit_exceeded'
            : isCapacityConstrained
            ? 'capacity_constrained'
            : isRateLimited
            ? 'rate_limit_exceeded'
            : isUnavailable
            ? 'compute_capacity_unavailable'
            : 'router_dispatch_failed'
        }
      },
      {
        status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'Retry-After, RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, X-RateLimit-Reset, X-Galx-Request-Id, X-Galx-Router, X-Galx-Session-Affinity',
          ...(isRateLimited || isCapacityConstrained
            ? {
                'Retry-After': '2',
                'RateLimit-Limit': '60',
                'RateLimit-Remaining': '0',
                'RateLimit-Reset': '2',
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 2)
              }
            : {})
        }
      }
    );
  }
}

/**
 * Universal GET /v1/chat/completions Endpoint.
 * Allows effortless testing in browser address bar or terminal cURL query params:
 * e.g. /v1/chat/completions?prompt=Hello&model=sol
 */
async function previewGET(req: NextRequest) {
  const url = new URL(req.url);
  const prompt = url.searchParams.get('prompt') || url.searchParams.get('q') || url.searchParams.get('message') || url.searchParams.get('input') || 'Hello GALXAI';
  const model = url.searchParams.get('model') || 'gpt-5.6-sol';
  const stream = url.searchParams.get('stream') === 'true';

  const syntheticReq = new NextRequest(req.url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream
    })
  });

  return previewPOST(syntheticReq);
}

export const POST = withDeveloperAccess(previewPOST);
export const GET = withDeveloperAccess(previewGET);
