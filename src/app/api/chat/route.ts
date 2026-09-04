import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { galxRouter, GalxModelRouter } from '@/core/router/GalxModelRouter';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { GalxSeatTierEngine } from '@/core/subscription/GalxSeatTierEngine';
import { GalxRollingContextEngine } from '@/core/router/GalxRollingContextEngine';
import { GalxElasticContextGovernor } from '@/core/governor/GalxElasticContextGovernor';
import { GalxTrainingStreamEngine } from '@/core/training/GalxTrainingStreamEngine';
import {
  ChatRepository,
  ChatRepositoryAccessError,
} from '@/lib/supabase/repositories/ChatRepository';
import { ModelCatalog } from '@/core/router/ModelCatalog';
import type { ChatCompletionRequest } from '@/core/contracts/GalxContracts';
import {
  ChatRequestValidationError,
  normalizeChatMessages,
  normalizeChatResourceId,
  optionalFiniteNumber,
  parseChatJsonBody,
  resolveChatIdentity,
} from '@/core/chat/GalxChatRequestNormalizer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PERSISTED_MESSAGE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;

function persistedMessageId(value: unknown, prefix: string): string {
  return typeof value === 'string' && PERSISTED_MESSAGE_ID.test(value)
    ? value
    : `${prefix}_${crypto.randomUUID()}`;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, Idempotency-Key, X-Galx-Session-Id, X-Galx-Session-Mode, X-Galx-Turn-Id',
      'Access-Control-Expose-Headers': 'X-Galx-Conversation-Id, X-Galx-Session-Mode, X-Galx-Turn-Id',
    }
  });
}

/**
 * Native Ollama & Universal Chat POST /api/chat Endpoint.
 * Ingests Ollama messages format and streaming NDJSON chunks, governed by Seat Tier.
 */
export async function POST(req: NextRequest) {
  let acquiredRequest: {
    userId: string;
    requestId: string;
    distributed: boolean;
    localStream: boolean;
  } | undefined;
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);

    const seatEngine = GalxSeatTierEngine.getInstance();
    const entitlement = await seatEngine.resolveUserSeatTier(authResult);

    if (entitlement.isCapped) {
      return NextResponse.json(
        { error: 'Monthly seat compute quota reached. Please contact your organization administrator.' },
        {
          status: 429,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Retry-After': '60',
            'X-Galx-Seat-Tier': entitlement.tier,
            'X-Galx-Seat-Role': entitlement.role
          }
        }
      );
    }

    const rawBody = await parseChatJsonBody(req);
    const requestedModel = typeof rawBody.model === 'string' && rawBody.model.trim()
      ? rawBody.model.trim()
      : 'gpt-5.6-sol';
    const userId = authResult.userId || 'anonymous_developer';

    try {
      seatEngine.validateModelEntitlement(entitlement, requestedModel);
      seatEngine.evaluateSeatRollingLimits(userId, entitlement, requestedModel);
    } catch (valErr: any) {
      const is5h = valErr.message.includes('SEAT_5HOUR_LIMIT_EXCEEDED');
      const isLimit = valErr.message.includes('LIMIT_EXCEEDED');
      return NextResponse.json(
        { error: valErr.message.replace(/^SEAT_\w+:\s*/, '') },
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

    const modelSpec = ModelCatalog.resolveModel(requestedModel);
    if (!modelSpec) {
      throw new ChatRequestValidationError(`Unsupported model: ${requestedModel}`, 'unsupported_model');
    }
    if (rawBody.stream !== undefined && typeof rawBody.stream !== 'boolean') {
      throw new ChatRequestValidationError('stream must be a boolean.', 'invalid_stream');
    }
    const isStream = rawBody.stream !== false; // Ollama defaults stream to true
    const normalizedMessages = normalizeChatMessages(rawBody);
    const chatIdentity = resolveChatIdentity({ body: rawBody, headers: req.headers });
    const conversationId = chatIdentity.conversationId;
    if (!authResult.authenticated && chatIdentity.mode !== 'stateless') {
      throw new ChatRequestValidationError(
        'Authentication is required for durable chat sessions.',
        'authentication_required',
        401
      );
    }
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
          'The requested conversation does not exist or is not accessible.',
          'conversation_not_found',
          404
        );
      }
    }
    const requestedMaxTokens = optionalFiniteNumber(
      rawBody.options?.num_predict,
      'num_predict',
      { min: 1, max: 128_000, integer: true }
    );
    const temperature = optionalFiniteNumber(rawBody.options?.temperature, 'temperature', { min: 0, max: 2 }) ?? 0.7;
    const contextGovernor = GalxElasticContextGovernor.getInstance();
    const provisionalPlan = contextGovernor.resolveElasticContext({
      modelId: modelSpec.id,
      requestedMaxTokens,
      messages: normalizedMessages,
      entitlement,
    });
    const rollingPromptBudget = Math.max(
      256,
      provisionalPlan.contextWindowTokens - provisionalPlan.allocatedMaxTokens - provisionalPlan.safetyMarginTokens
    );

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

    // Apply Hierarchical Rolling Context
    const rollingContext = await GalxRollingContextEngine.getInstance().buildOptimalRollingContextAsync({
      messages: normalizedMessages as any,
      modelId: modelSpec.id,
      conversationId: conversationId || undefined,
      userId,
      workspaceId: entitlement.orgId,
      maxTokenBudget: rollingPromptBudget,
      recentBufferTurnCount: 8,
      enableCompaction: compactPrompts,
    });

    const activeMessages = rollingContext.optimizedMessages;

    // Dynamic Elastic Context Allocation
    const contextPlan = contextGovernor.resolveElasticContext({
      modelId: modelSpec.id,
      requestedMaxTokens,
      messages: activeMessages as any,
      entitlement
    });

    if (!contextPlan.fitsInContext || rollingContext.budgetExceeded) {
      throw new ChatRequestValidationError(
        `Context length exceeds the ${contextPlan.contextWindowTokens.toLocaleString()} token limit for this seat and model.`,
        'context_length_exceeded'
      );
    }

    const chatRequest: ChatCompletionRequest = {
      model: contextPlan.modelId,
      messages: activeMessages as any,
      temperature,
      max_tokens: contextPlan.allocatedMaxTokens,
      stream: isStream,
      prompt_cache_key: rollingContext.stableCacheHash
        ? `galx:${rollingContext.stableCacheHash.slice(0, 48)}`
        : undefined,
      prompt_cache_options: contextPlan.promptCacheOptimized
        ? { mode: 'implicit', ttl: '30m' }
        : undefined,
      conversation_id: conversationId,
      session_mode: chatIdentity.mode,
      turn_id: chatIdentity.turnId,
      user_message_id: normalizeChatResourceId(rawBody.user_message_id, 'user_message_id'),
      assistant_message_id: normalizeChatResourceId(rawBody.assistant_message_id, 'assistant_message_id'),
    };

    const rawIdempotencyKey = req.headers.get('idempotency-key')?.trim();
    if (rawIdempotencyKey && rawIdempotencyKey.length > 256) {
      throw new ChatRequestValidationError(
        'Idempotency-Key must contain at most 256 characters.',
        'invalid_idempotency_key'
      );
    }
    const requestIdentity = rawIdempotencyKey || `${conversationId || 'stateless'}:${chatIdentity.turnId}`;
    const requestId = `ollama_${crypto.createHash('sha256').update(`${userId}:${requestIdentity}`).digest('hex').slice(0, 48)}`;
    if (authResult.authenticated) {
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
        return NextResponse.json(
          { error: 'The request was rejected by the active seat policy.', code },
          { status: code.startsWith('request_') ? 409 : 429, headers: { 'Retry-After': '5' } }
        );
      }
      if (distributedGate) {
        acquiredRequest = { userId, requestId, distributed: true, localStream: false };
      }
    }

    if (isStream && !acquiredRequest) {
      if (!seatEngine.acquireSeatStreamSlot(userId, entitlement.concurrencyLimit)) {
        return NextResponse.json(
          { error: `Seat concurrency limit of ${entitlement.concurrencyLimit} active streams reached.` },
          { status: 429, headers: { 'Retry-After': '5' } }
        );
      }
      acquiredRequest = { userId, requestId, distributed: false, localStream: true };
    }

    const routeStartedAt = performance.now();
    const result = await galxRouter.routeChatCompletion({
      request: chatRequest,
      userId,
      requestId,
      isPriorityUser: entitlement.isPriorityUser,
      headers: req.headers
    });

    const createdAt = new Date().toISOString();

    // Streaming NDJSON
    if (isStream && result.body) {
      const encoder = new TextEncoder();
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const lease = acquiredRequest;
      acquiredRequest = undefined;

      (async () => {
        let upstreamReader: ReadableStreamDefaultReader<Uint8Array> | undefined;
        let accumulatedContent = '';
        let completed = false;
        try {
          if (typeof (result.body as any).getReader === 'function') {
            upstreamReader = (result.body as ReadableStream<Uint8Array>).getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
              const { done, value } = await upstreamReader.read();
              if (done) {
                buffer += decoder.decode();
                if (buffer.trim()) buffer += '\n';
              } else {
                buffer += decoder.decode(value, { stream: true });
              }
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data:')) continue;
                const jsonStr = trimmed.replace(/^data:\s*/, '');
                if (jsonStr === '[DONE]') continue;
                try {
                  const chunk = JSON.parse(jsonStr);
                  const deltaText = chunk.choices?.[0]?.delta?.content || '';
                  if (deltaText) {
                    accumulatedContent += deltaText;
                    const ollamaChunk = {
                      model: modelSpec.id,
                      created_at: createdAt,
                      message: {
                        role: 'assistant',
                        content: deltaText
                      },
                      done: false
                    };
                    await writer.write(encoder.encode(JSON.stringify(ollamaChunk) + '\n'));
                  }
                } catch {}
              }
              if (done) break;
            }
          } else if (typeof result.body === 'string') {
            const parsed = JSON.parse(result.body);
            const contentText = parsed.choices?.[0]?.message?.content || '';
            accumulatedContent = contentText;
            const ollamaChunk = {
              model: modelSpec.id,
              created_at: createdAt,
              message: {
                role: 'assistant',
                content: contentText
              },
              done: false
            };
            await writer.write(encoder.encode(JSON.stringify(ollamaChunk) + '\n'));
          }

          // Final completion chunk
          const finalChunk = {
            model: modelSpec.id,
            created_at: createdAt,
            message: {
              role: 'assistant',
              content: ''
            },
            done: true,
            done_reason: 'stop',
            conversation_id: conversationId,
            turn_id: chatIdentity.turnId,
            session_mode: chatIdentity.mode,
            total_duration: Math.round((performance.now() - routeStartedAt) * 1_000_000),
            load_duration: 0,
            prompt_eval_count: contextPlan.estimatedPromptTokens,
            eval_count: Math.ceil(accumulatedContent.length / 4)
          };
          await writer.write(encoder.encode(JSON.stringify(finalChunk) + '\n'));
          completed = true;

          if (lease?.distributed) {
            const lastUser = normalizedMessages.filter((message) => message.role === 'user').pop();
            const userContent = lastUser
              ? (typeof lastUser.content === 'string' ? lastUser.content : JSON.stringify(lastUser.content))
              : undefined;
            try {
              await seatEngine.settleDistributedRequest({
                userId,
                requestId,
                modelId: result.modelUsed,
                tokens: contextPlan.estimatedPromptTokens + Math.ceil(accumulatedContent.length / 4),
                conversationId,
                userMessage: conversationId && userContent !== undefined ? {
                  id: persistedMessageId(chatRequest.user_message_id, 'msg_u'),
                  role: 'user',
                  content: userContent,
                  alternative_contents: [userContent],
                  active_index: 0,
                  created_at: new Date(Date.now() - 1000).toISOString(),
                } : undefined,
                assistantMessage: conversationId ? {
                  id: persistedMessageId(chatRequest.assistant_message_id, 'msg_a'),
                  role: 'assistant',
                  content: accumulatedContent,
                  alternative_contents: [accumulatedContent],
                  active_index: 0,
                  model_id: result.modelUsed,
                  created_at: new Date().toISOString(),
                } : undefined,
              });
            } catch (settlementError) {
              console.error('[api/chat] Streaming lease settlement failed:', settlementError);
            }
          }
          await writer.close();
        } catch (streamErr) {
          if (upstreamReader) {
            try { await upstreamReader.cancel(streamErr); } catch {}
          }
          try {
            await writer.abort(streamErr);
          } catch {}
        } finally {
          if (lease?.distributed && !completed) {
            try {
              await seatEngine.releaseDistributedRequest(userId, requestId);
            } catch (releaseError) {
              console.error('[api/chat] Failed to release distributed stream lease:', releaseError);
            }
          }
          if (lease?.localStream) seatEngine.releaseSeatStreamSlot(userId);

          // Zero-Storage Streaming Training Distillation Tap
          if (completed && accumulatedContent) {
            const lastUser = normalizedMessages.filter((message) => message.role === 'user').pop();
            const userContent = lastUser
              ? (typeof lastUser.content === 'string' ? lastUser.content : JSON.stringify(lastUser.content))
              : undefined;

            GalxTrainingStreamEngine.getInstance()
              .ingestInteraction({
                source: 'web_chat',
                userId,
                modelId: modelSpec.id,
                messages: normalizedMessages,
                userPrompt: userContent,
                completionContent: accumulatedContent,
                allowModelTraining: (rawBody as any).allow_model_training,
                isApiCall: false,
                headers: req.headers,
              })
              .catch((err) => {
                console.warn('[api/chat] Training distillation notice:', err?.message);
              });
          }
        }
      })();

      const currentWindows = seatEngine.calculateRollingWindows(userId, entitlement.tier);

      return new Response(readable, {
        headers: {
          'Content-Type': 'application/x-ndjson; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
          'X-Galx-Data-Policy': conversationId
            ? 'owner-scoped-durable-conversation'
            : 'chat-model-improvement-opt-out-governed',
          'X-Galx-Conversation-Id': conversationId || '',
          'X-Galx-Session-Mode': chatIdentity.mode,
          'X-Galx-Turn-Id': chatIdentity.turnId,
          'Access-Control-Expose-Headers': 'X-Galx-Conversation-Id, X-Galx-Session-Mode, X-Galx-Turn-Id',
          'X-Galx-Model-Resolved': modelSpec.id,
          'X-Galx-Seat-Tier': entitlement.tier,
          'X-Galx-Seat-Role': entitlement.role,
          'X-Galx-Seat-5Hour-Remaining-Pct': String(currentWindows.fiveHourWindow.percentRemaining),
          'X-Galx-Seat-5Hour-Refresh-In': currentWindows.fiveHourWindow.refreshIn,
          'X-Galx-Seat-Weekly-Remaining-Pct': String(currentWindows.weeklyWindow.percentRemaining),
          'X-Galx-Seat-Weekly-Refresh-In': currentWindows.weeklyWindow.refreshIn,
          'X-Galx-Prompt-Compaction': compactPrompts ? 'enabled' : 'disabled',
          'X-Galx-Compaction-Mode': compactPrompts ? 'auto' : 'raw',
          'X-Galx-Rolling-Compacted': String(rollingContext.isCompacted),
          'X-Galx-Rolling-Compacted-Turns': String(rollingContext.intermediateTurnsCompacted),
          'X-Galx-Tokens-Saved': String(rollingContext.tokensSaved),
          'X-Galx-Prompt-Deflation-Pct': compactPrompts && rollingContext.tokensSaved > 0 
            ? `${Math.round((rollingContext.tokensSaved / Math.max(1, contextPlan.estimatedPromptTokens + rollingContext.tokensSaved)) * 100)}%` 
            : '0%',
        }
      });
    }

    // Non-Streaming Response
    const parsed = typeof result.body === 'string' ? JSON.parse(result.body) : {};
    const contentText = parsed.choices?.[0]?.message?.content || '';
    const currentWindows = seatEngine.calculateRollingWindows(userId, entitlement.tier);

    if (acquiredRequest?.distributed) {
      const lastUser = normalizedMessages.filter((message) => message.role === 'user').pop();
      const userContent = lastUser
        ? (typeof lastUser.content === 'string' ? lastUser.content : JSON.stringify(lastUser.content))
        : undefined;
      try {
        await seatEngine.settleDistributedRequest({
          userId,
          requestId,
          modelId: result.modelUsed,
          tokens: parsed.usage?.total_tokens || contextPlan.estimatedPromptTokens + Math.ceil(contentText.length / 4),
          conversationId,
          userMessage: conversationId && userContent !== undefined ? {
            id: persistedMessageId(chatRequest.user_message_id, 'msg_u'),
            role: 'user',
            content: userContent,
            alternative_contents: [userContent],
            active_index: 0,
            created_at: new Date(Date.now() - 1000).toISOString(),
          } : undefined,
          assistantMessage: conversationId ? {
            id: persistedMessageId(chatRequest.assistant_message_id, 'msg_a'),
            role: 'assistant',
            content: contentText,
            alternative_contents: [contentText],
            active_index: 0,
            model_id: result.modelUsed,
            created_at: new Date().toISOString(),
          } : undefined,
        });
      } catch (settlementError) {
        console.error('[api/chat] Non-streaming lease settlement failed:', settlementError);
      }
      acquiredRequest = undefined;
    }
    if (acquiredRequest?.localStream) {
      seatEngine.releaseSeatStreamSlot(userId);
      acquiredRequest = undefined;
    }

    // Zero-Storage Streaming Training Distillation Tap (Non-Streaming)
    if (contentText) {
      const lastUser = normalizedMessages.filter((message) => message.role === 'user').pop();
      const userContent = lastUser
        ? (typeof lastUser.content === 'string' ? lastUser.content : JSON.stringify(lastUser.content))
        : undefined;

      GalxTrainingStreamEngine.getInstance()
        .ingestInteraction({
          source: 'web_chat',
          userId,
          modelId: modelSpec.id,
          messages: normalizedMessages,
          userPrompt: userContent,
          completionContent: contentText,
          allowModelTraining: (rawBody as any).allow_model_training,
          isApiCall: false,
          headers: req.headers,
        })
        .catch((err) => {
          console.warn('[api/chat] Non-streaming training notice:', err?.message);
        });
    }

    return NextResponse.json({
      model: modelSpec.id,
      created_at: createdAt,
      message: {
        role: 'assistant',
        content: contentText
      },
      done: true,
      done_reason: 'stop',
      conversation_id: conversationId,
      turn_id: chatIdentity.turnId,
      session_mode: chatIdentity.mode,
      total_duration: Math.round((performance.now() - routeStartedAt) * 1_000_000),
      load_duration: 0,
      prompt_eval_count: parsed.usage?.prompt_tokens || contextPlan.estimatedPromptTokens,
      eval_count: parsed.usage?.completion_tokens || Math.ceil(contentText.length / 4)
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'X-Galx-Data-Policy': conversationId
          ? 'owner-scoped-durable-conversation'
          : 'chat-model-improvement-opt-out-governed',
        'X-Galx-Conversation-Id': conversationId || '',
        'X-Galx-Session-Mode': chatIdentity.mode,
        'X-Galx-Turn-Id': chatIdentity.turnId,
        'Access-Control-Expose-Headers': 'X-Galx-Conversation-Id, X-Galx-Session-Mode, X-Galx-Turn-Id',
        'X-Galx-Model-Resolved': modelSpec.id,
        'X-Galx-Seat-Tier': entitlement.tier,
        'X-Galx-Seat-Role': entitlement.role,
        'X-Galx-Seat-5Hour-Remaining-Pct': String(currentWindows.fiveHourWindow.percentRemaining),
        'X-Galx-Seat-5Hour-Refresh-In': currentWindows.fiveHourWindow.refreshIn,
        'X-Galx-Seat-Weekly-Remaining-Pct': String(currentWindows.weeklyWindow.percentRemaining),
        'X-Galx-Seat-Weekly-Refresh-In': currentWindows.weeklyWindow.refreshIn,
        'X-Galx-Prompt-Compaction': compactPrompts ? 'enabled' : 'disabled',
        'X-Galx-Compaction-Mode': compactPrompts ? 'auto' : 'raw',
        'X-Galx-Rolling-Compacted': String(rollingContext.isCompacted),
        'X-Galx-Rolling-Compacted-Turns': String(rollingContext.intermediateTurnsCompacted),
        'X-Galx-Tokens-Saved': String(rollingContext.tokensSaved),
        'X-Galx-Prompt-Deflation-Pct': compactPrompts && rollingContext.tokensSaved > 0 
          ? `${Math.round((rollingContext.tokensSaved / Math.max(1, contextPlan.estimatedPromptTokens + rollingContext.tokensSaved)) * 100)}%` 
          : '0%',
      }
    });
  } catch (err: any) {
    if (acquiredRequest) {
      const seatEngine = GalxSeatTierEngine.getInstance();
      if (acquiredRequest.distributed) {
        try {
          await seatEngine.releaseDistributedRequest(acquiredRequest.userId, acquiredRequest.requestId);
        } catch (releaseError) {
          console.error('[api/chat] Failed to release distributed seat lease:', releaseError);
        }
      }
      if (acquiredRequest.localStream) seatEngine.releaseSeatStreamSlot(acquiredRequest.userId);
    }
    if (err instanceof ChatRequestValidationError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }
    const safeError = GalxModelRouter.sanitizeUpstreamError(err.message || 'Internal error processing Ollama chat request');
    return NextResponse.json(
      { error: safeError },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
