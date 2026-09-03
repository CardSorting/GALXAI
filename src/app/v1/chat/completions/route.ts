import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { galxRouter, GalxModelRouter } from '@/core/router/GalxModelRouter';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { GalxSeatTierEngine } from '@/core/subscription/GalxSeatTierEngine';
import { GalxCommunityPoolGovernor } from '@/core/governor/GalxCommunityPoolGovernor';
import { GalxLumiQoSPoolGovernor } from '@/core/governor/GalxLumiQoSPoolGovernor';
import { GalxElasticContextGovernor } from '@/core/governor/GalxElasticContextGovernor';
import { GalxRollingContextEngine } from '@/core/router/GalxRollingContextEngine';
import { GalxTaskQueueEngine } from '@/core/queue/GalxTaskQueueEngine';
import { ChatRepository } from '@/lib/supabase/repositories/ChatRepository';
import { GalxTrainingStreamEngine } from '@/core/training/GalxTrainingStreamEngine';
import { vectorizedSyncEngine } from '@/core/sync/GalxVectorizedSyncEngine';
import type { ChatCompletionRequest } from '@/core/contracts/GalxContracts';
import {
  ChatRequestValidationError,
  normalizeChatMessages,
  normalizeConversationId,
  optionalFiniteNumber,
  parseChatJsonBody,
} from '@/core/chat/GalxChatRequestNormalizer';

export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';
export const maxDuration = 60;

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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Galx-Async, X-Galx-Queue, X-Galx-Webhook-Url, X-Galx-Priority, X-Galx-Delay-Ms, Idempotency-Key, Prefer',
      'Access-Control-Max-Age': '86400'
    }
  });
}

/**
 * Universal OpenAI-Compatible POST /v1/chat/completions Endpoint.
 * Governed seamlessly by sovereign Seat Subscription Tiers with zero frontend key leakage.
 */
export async function POST(req: NextRequest) {
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
      return NextResponse.json(
        {
          error: {
            message: authResult.error || 'Authentication required. Provide a valid bearer token or API key.',
            type: 'invalid_request_error',
            code: 'invalid_api_key',
          },
        },
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
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

    const conversationId = normalizeConversationId(
      rawBody.conversation_id || rawBody.conversationId || req.headers.get('x-galx-session-id')
    );

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
      privacy: rawBody.privacy
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
    const requestId = idempotencyKey
      ? `req_${crypto.createHash('sha256').update(`${userId}:${idempotencyKey}`).digest('hex').slice(0, 48)}`
      : `req_${crypto.randomUUID()}`;

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
        idempotencyKey,
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
            'X-Galx-Seat-Tier': entitlement.tier
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
    const isWebChatClient = req.headers.get('x-galx-client') === 'web-chat';
    const isApiCall = authResult.authType === 'developer_key' || !isWebChatClient;

    const headers = new Headers(result.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('X-Galx-Request-Id', requestId);
    headers.set('X-Galx-Data-Policy', isApiCall ? 'api-private-zero-retention' : 'chat-model-improvement-opt-out-governed');
    const currentWindows = seatEngine.calculateRollingWindows(userId, entitlement.tier);
    headers.set('X-Galx-Model', result.modelUsed);
    headers.set('X-Galx-Router', 'apex-v2');
    headers.set('X-Galx-Seat-Tier', entitlement.tier);
    headers.set('X-Galx-Seat-Role', entitlement.role);
    headers.set('X-Galx-Seat-5Hour-Remaining-Pct', String(currentWindows.fiveHourWindow.percentRemaining));
    headers.set('X-Galx-Seat-5Hour-Refresh-In', currentWindows.fiveHourWindow.refreshIn);
    headers.set('X-Galx-Seat-5Hour-Reset', String(Math.floor(currentWindows.fiveHourWindow.resetAtMs / 1000)));
    headers.set('X-Galx-Seat-Weekly-Remaining-Pct', String(currentWindows.weeklyWindow.percentRemaining));
    headers.set('X-Galx-Seat-Weekly-Refresh-In', currentWindows.weeklyWindow.refreshIn);
    headers.set('X-Galx-Seat-Weekly-Reset', String(Math.floor(currentWindows.weeklyWindow.resetAtMs / 1000)));
    headers.set('X-Galx-Cache-Rebate-Pct', String(entitlement.promptCacheRebatePct));
    headers.set('X-Galx-Prompt-Compaction', compactPrompts ? 'enabled' : 'disabled');
    headers.set('X-Galx-Compaction-Mode', compactPrompts ? 'auto' : 'raw');
    headers.set('X-Galx-Rolling-Compacted', String(rollingContext.isCompacted));
    headers.set('X-Galx-Rolling-Compacted-Turns', String(rollingContext.intermediateTurnsCompacted));
    headers.set('X-Galx-Context-Tokens', String(contextPlan.estimatedPromptTokens));
    headers.set('X-Galx-Tokens-Saved', String(rollingContext.tokensSaved));
    headers.set('X-Galx-Prompt-Deflation-Pct', compactPrompts && rollingContext.tokensSaved > 0 
      ? `${Math.round((rollingContext.tokensSaved / Math.max(1, contextPlan.estimatedPromptTokens + rollingContext.tokensSaved)) * 100)}%` 
      : '0%');

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
                  id: persistedMessageId(rawBody.user_message_id, 'msg_u'),
                  role: 'user',
                  content: userContent,
                  alternative_contents: [userContent],
                  active_index: 0,
                  created_at: new Date(Date.now() - 1000).toISOString(),
                } : undefined,
                assistantMessage: conversationId ? {
                  id: persistedMessageId(rawBody.assistant_message_id, 'msg_a'),
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
                      id: persistedMessageId(rawBody.user_message_id, 'msg_u'),
                      content: userContent,
                      role: 'user',
                    }
                  : undefined,
                assistantMessage: {
                  id: persistedMessageId(rawBody.assistant_message_id, 'msg_a'),
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
              await finalizeStream(true);
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
              id: persistedMessageId(rawBody.user_message_id, 'msg_u'),
              role: 'user',
              content: userContent,
              alternative_contents: [userContent],
              active_index: 0,
              created_at: new Date(Date.now() - 1000).toISOString(),
            } : undefined,
            assistantMessage: conversationId ? {
              id: persistedMessageId(rawBody.assistant_message_id, 'msg_a'),
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
          nonStreamContent = parsed.choices?.[0]?.message?.content || '';
          if (parsed.usage) {
            parsed.usage.prompt_tokens_details = {
              ...(parsed.usage.prompt_tokens_details || {}),
              cached_tokens: parsed.usage.prompt_tokens_details?.cached_tokens || 0,
              compacted_tokens: rollingContext.tokensSaved,
              compaction_mode: compactPrompts ? 'auto' : 'raw',
            };
            result.body = JSON.stringify(parsed);
          }
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
    if (error instanceof ChatRequestValidationError) {
      return NextResponse.json(
        { error: { message: error.message, type: 'invalid_request_error', code: error.code } },
        { status: error.status, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }
    const rawMessage = error.message || 'Internal Router Error';
    const message = GalxModelRouter.sanitizeUpstreamError(rawMessage);
    const isRateLimited = message.includes('saturated') || message.includes('reached maximum simultaneous') || message.toLowerCase().includes('rate limit');
    const isUnavailable = message.includes('No healthy') || message.includes('in cooldown') || message.includes('overloaded') || message.includes('temporarily constrained');
    const isBadRequest = rawMessage.includes('Unsupported model') || rawMessage.includes('Missing required');

    const status = isRateLimited ? 429 : isUnavailable ? 503 : isBadRequest ? 400 : 500;
    const errorType = isRateLimited
      ? 'rate_limit_error'
      : isUnavailable
      ? 'service_unavailable_error'
      : isBadRequest
      ? 'invalid_request_error'
      : 'api_error';

    return NextResponse.json(
      {
        error: {
          message,
          type: errorType,
          code: isRateLimited ? 'rate_limit_exceeded' : isUnavailable ? 'compute_capacity_unavailable' : 'router_dispatch_failed'
        }
      },
      {
        status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          ...(isRateLimited ? { 'Retry-After': '1' } : {})
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
export async function GET(req: NextRequest) {
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

  return POST(syntheticReq);
}
