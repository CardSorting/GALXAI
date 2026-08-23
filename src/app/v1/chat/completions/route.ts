import { NextRequest, NextResponse } from 'next/server';
import { galxRouter } from '@/core/router/GalxModelRouter';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { GalxTaskQueueEngine } from '@/core/queue/GalxTaskQueueEngine';
import type { ChatCompletionRequest } from '@/core/contracts/GalxContracts';

export const runtime = 'nodejs';

// Handle CORS Pre-flight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Galx-Shard-Preference, X-Galx-Async, X-Galx-Queue, X-Galx-Webhook-Url, X-Galx-Priority, X-Galx-Delay-Ms, Idempotency-Key, Prefer',
      'Access-Control-Max-Age': '86400'
    }
  });
}

/**
 * Universal OpenAI-Compatible POST /v1/chat/completions Endpoint.
 * Supports synchronous streaming/JSON and asynchronous CloudTasks queue execution.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate Request with Hardened Auth Engine (Developer Keys & Signed Session Tokens)
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);

    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: { message: authResult.error || 'Authentication required. Please provide a valid Authorization header with Bearer token or API key.', type: 'invalid_request_error', code: 'invalid_api_key' } },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    const isPriorityUser = authResult.isPriorityUser;


    // 2. Parse & Hyper-Forgiving Normalization of Request Body
    let rawBody: any = {};
    try {
      const text = await req.text();
      if (!text || text.trim() === '') {
        rawBody = { messages: [{ role: 'user', content: 'Hello' }] };
      } else {
        try {
          rawBody = JSON.parse(text);
        } catch {
          // If JSON parse fails, absorb the raw text directly as user message
          rawBody = { messages: [{ role: 'user', content: text.trim() }] };
        }
      }
    } catch {
      rawBody = { messages: [{ role: 'user', content: 'Hello' }] };
    }

    // A. Forgiving Messages Ingestion (handles prompt, input, text, string messages, Anthropic system)
    const normalizedMessages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: any; name?: string; tool_calls?: any[] }> = [];

    // Top-level Anthropic system prompt
    if (rawBody.system) {
      const systemStr = typeof rawBody.system === 'string'
        ? rawBody.system
        : Array.isArray(rawBody.system)
        ? rawBody.system.map((s: any) => s.text || '').join('\n')
        : String(rawBody.system);
      if (systemStr.trim()) {
        normalizedMessages.push({ role: 'system', content: systemStr });
      }
    }

    if (rawBody.messages) {
      if (Array.isArray(rawBody.messages)) {
        for (const msg of rawBody.messages) {
          if (typeof msg === 'string') {
            normalizedMessages.push({ role: 'user', content: msg });
          } else if (msg && typeof msg === 'object') {
            normalizedMessages.push({
              role: msg.role || 'user',
              content: msg.content !== undefined ? msg.content : (msg.text || ''),
              name: msg.name,
              tool_calls: msg.tool_calls || msg.toolCalls
            });
          }
        }
      } else if (typeof rawBody.messages === 'string') {
        normalizedMessages.push({ role: 'user', content: rawBody.messages });
      } else if (typeof rawBody.messages === 'object') {
        normalizedMessages.push({
          role: rawBody.messages.role || 'user',
          content: rawBody.messages.content || rawBody.messages.text || ''
        });
      }
    } else if (rawBody.prompt) {
      const promptStr = Array.isArray(rawBody.prompt) ? rawBody.prompt.join('\n') : String(rawBody.prompt);
      normalizedMessages.push({ role: 'user', content: promptStr });
    } else if (rawBody.input) {
      const inputStr = Array.isArray(rawBody.input) ? rawBody.input.join('\n') : String(rawBody.input);
      normalizedMessages.push({ role: 'user', content: inputStr });
    } else if (rawBody.text) {
      normalizedMessages.push({ role: 'user', content: String(rawBody.text) });
    } else if (rawBody.content) {
      normalizedMessages.push({ role: 'user', content: String(rawBody.content) });
    }

    if (normalizedMessages.length === 0) {
      normalizedMessages.push({ role: 'user', content: 'Hello' });
    }

    // B. Parameter Forgiveness & Alias Resolution
    const maxTokens = rawBody.max_tokens ?? rawBody.max_completion_tokens ?? rawBody.maxTokens ?? rawBody.max_length ?? 2048;
    const temperature = rawBody.temperature !== undefined ? parseFloat(String(rawBody.temperature)) : 0.7;
    const topP = rawBody.top_p !== undefined ? parseFloat(String(rawBody.top_p)) : (rawBody.topP !== undefined ? parseFloat(String(rawBody.topP)) : undefined);
    const isStream = rawBody.stream === true || rawBody.stream === 'true' || rawBody.stream === 1 || rawBody.stream === '1';

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

    const body: ChatCompletionRequest = {
      model: rawBody.model || 'gpt-5.6-sol',
      messages: normalizedMessages as any,
      temperature: isNaN(temperature) ? 0.7 : temperature,
      max_tokens: Number(maxTokens) || 2048,
      top_p: topP !== undefined && !isNaN(topP) ? topP : undefined,
      stream: isStream,
      stop: typeof rawBody.stop === 'string' ? [rawBody.stop] : rawBody.stop,
      response_format: responseFormat,
      tools,
      tool_choice: rawBody.tool_choice || rawBody.toolChoice || (rawBody.function_call ? { type: 'function', function: { name: rawBody.function_call } } : undefined),
      user: rawBody.user,
      privacy: rawBody.privacy
    };

    // 3. Asynchronous Queue Processing (CloudTasks / CloudRun pattern)
    const isAsync = req.headers.get('x-galx-async') === 'true' || req.headers.get('prefer') === 'respond-async';
    if (isAsync) {
      const targetQueue = req.headers.get('x-galx-queue') || 'llm-batch';
      const webhookUrl = req.headers.get('x-galx-webhook-url') || undefined;
      const idempotencyKey = req.headers.get('idempotency-key') || undefined;
      const priorityHeader = req.headers.get('x-galx-priority');
      const priority = priorityHeader ? parseInt(priorityHeader, 10) : 50;
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
            'X-Galx-Queue-Id': task.queueId
          }
        }
      );
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 4. Synchronous Route through GALXAI Credential Pool with HIPAA, ZDR & GDPR Safeguards
    const result = await galxRouter.routeChatCompletion({
      request: body,
      userId,
      requestId,
      isPriorityUser,
      headers: req.headers
    });

    // 5. Return formatted response with CORS headers & verified Privacy/ZDR Attestation
    const headers = new Headers(result.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('X-Galx-Request-Id', requestId);
    headers.set('X-Galx-Shard-Id', result.shardId);
    headers.set('X-Galx-Model', result.modelUsed);
    headers.set('X-Galx-Provider', result.provider);

    return new Response(result.body, {
      status: result.statusCode,
      headers
    });
  } catch (error: any) {
    const message = error.message || 'Internal Router Error';
    const isRateLimited = message.includes('reached maximum simultaneous concurrent gateway allocation');
    const isUnavailable = message.includes('No healthy') || message.includes('in cooldown') || message.includes('saturated');
    const isBadRequest = message.includes('Unsupported model') || message.includes('Missing required');

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
          code: isRateLimited ? 'rate_limit_exceeded' : isUnavailable ? 'all_shards_cooldown' : 'router_dispatch_failed'
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
