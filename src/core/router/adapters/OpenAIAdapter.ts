import { executeRelayChat, RelayDispatchError } from './RelayChatTransport';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { spawn, execSync } from 'node:child_process';
import type {
  ChatCompletionRequest,
  ImageGenerationRequest,
  ImageGenerationResponse,
  DecryptedGalxSecret,
  ModelSpecItem,
  DeadlineConfig
} from '../../contracts/GalxContracts';

export interface ExecuteOptions {
  signal?: AbortSignal;
  deadline?: DeadlineConfig;
  timeoutMs?: number;
}

export class OpenAIAdapter {
  public static readonly DEFAULT_BASE_URL = 'https://api.openai.com/v1';

  /**
   * Resolves the target upstream base URL dynamically, supporting custom endpoints,
   * local models (Ollama / vLLM / LocalAI), or proxy gateways.
   */
  public static resolveBaseUrl(secret?: DecryptedGalxSecret): string {
    const customUrl = (secret as any)?.baseUrl ||
                      process.env.OPENAI_BASE_URL ||
                      process.env.GALX_UPSTREAM_URL ||
                      process.env.LOCAL_AI_URL ||
                      process.env.OLLAMA_BASE_URL;

    return (customUrl || this.DEFAULT_BASE_URL).replace(/\/+$/, '');
  }

  /**
   * Pre-warms DNS and HTTP keep-alive socket connection to OpenAI endpoints in background.
   */
  static prewarmConnection(secret?: DecryptedGalxSecret): void {
    try {
      const baseUrl = this.resolveBaseUrl(secret);
      fetch(`${baseUrl}/models`, {
        method: 'HEAD',
        headers: { 'Connection': 'keep-alive' }
      }).catch(() => {});
    } catch {}
  }

  /**
   * Resolves the authoritative local or remote VM relay URL, respecting zero-collision port allocation.
   */
  private static getResolvedRelayUrl(): string {
    if (process.env.VM_RELAY_URL) return process.env.VM_RELAY_URL;
    if (process.env.GALXAI_RELAY_URL) return process.env.GALXAI_RELAY_URL;
    if (process.env.RELAY_URL) return process.env.RELAY_URL;
    try {
      const portFile = path.resolve(process.cwd(), '.relay', 'relay-port.json');
      if (fs.existsSync(portFile)) {
        const data = JSON.parse(fs.readFileSync(portFile, 'utf-8'));
        if (data.port) return `http://127.0.0.1:${data.port}`;
      }
    } catch {}
    return 'http://127.0.0.1:3001';
  }

  /**
   * Lazily activates local relay daemon if offline during local development (Ollama pattern).
   */
  private static async tryAutoStartLocalRelay(url: string): Promise<boolean> {
    if (typeof window !== 'undefined') return false;
    if (process.env.NODE_ENV === 'production' && !process.env.FORCE_VM_RELAY) return false;
    if (!url.includes('localhost') && !url.includes('127.0.0.1')) return false;
    try {
      const { GalxRelaySupervisor } = await import('../../relay/GalxRelaySupervisor');
      return await GalxRelaySupervisor.ensureRunning({ waitTimeoutMs: 3500 });
    } catch {
      return false;
    }
  }

  /**
   * Dispatches chat completion via @openai/codex-sdk for Codex OAuth shards.
   */
  private static async executeViaCodexSdk(
    req: ChatCompletionRequest,
    secret: DecryptedGalxSecret,
    modelSpec: ModelSpecItem,
    options?: ExecuteOptions
  ): Promise<{ response: Response; headers: Record<string, string> }> {
    const { Codex } = await import('@openai/codex-sdk');
    const token = secret.apiKey || secret.accessToken;
    const codex = new Codex({
      env: {
        ...process.env,
        ...(token ? { CODEX_API_KEY: token, OPENAI_API_KEY: token } : {})
      }
    });
    const thread = codex.startThread({
      model: modelSpec.upstreamId || modelSpec.id || 'gpt-5.6-sol',
      workingDirectory: process.cwd(),
      skipGitRepoCheck: true,
      sandboxMode: 'workspace-write',
      approvalPolicy: 'never'
    });

    const promptText = req.messages
      .map(m => `[${m.role.toUpperCase()}]: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`)
      .join('\n\n');

    if (req.stream) {
      const { events } = await thread.runStreamed(promptText, { signal: options?.signal });
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          let sentDone = false;
          try {
            for await (const event of events) {
              if (event.type === 'item.updated' || event.type === 'item.completed') {
                const item = (event as any).item;
                if (item?.type === 'agent_message' && item?.text) {
                  const chunk = {
                    id: `chatcmpl_${Date.now()}`,
                    object: 'chat.completion.chunk',
                    created: Math.floor(Date.now() / 1000),
                    model: modelSpec.id,
                    choices: [{
                      index: 0,
                      delta: { content: item.text },
                      finish_reason: null
                    }]
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                }
              } else if (event.type === 'turn.completed') {
                const finishChunk = {
                  id: `chatcmpl_${Date.now()}`,
                  object: 'chat.completion.chunk',
                  created: Math.floor(Date.now() / 1000),
                  model: modelSpec.id,
                  choices: [{
                    index: 0,
                    delta: {},
                    finish_reason: 'stop'
                  }],
                  usage: (event as any).usage
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(finishChunk)}\n\n`));
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                sentDone = true;
                break;
              } else if (event.type === 'turn.failed') {
                throw new Error((event as any).error?.message || 'Codex turn failed');
              }
            }
            if (!sentDone) {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            }
            controller.close();
          } catch (err: any) {
            controller.error(err);
          }
        }
      });

      return {
        response: new Response(stream, {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
          }
        }),
        headers: { 'Content-Type': 'text/event-stream' }
      };
    } else {
      const res = await thread.run(promptText, { signal: options?.signal });
      const body = {
        id: `chatcmpl_${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: modelSpec.id,
        choices: [{
          index: 0,
          message: { role: 'assistant', content: res.finalResponse },
          finish_reason: 'stop'
        }],
        usage: res.usage || {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150
        }
      };

      return {
        response: new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }),
        headers: { 'Content-Type': 'application/json' }
      };
    }
  }

  /**
   * Executes synchronous or streaming chat completion against OpenAI endpoint with deadline budgets and abort support.
   */
  static async executeChatCompletion(
    req: ChatCompletionRequest,
    secret: DecryptedGalxSecret,
    modelSpec: ModelSpecItem,
    options?: ExecuteOptions
  ): Promise<{ response: Response; headers: Record<string, string> }> {
    const token = secret.apiKey || secret.accessToken;
    if (!token) {
      throw new Error('Missing OpenAI API key or OAuth access token in shard secret');
    }

    const baseUrl = this.resolveBaseUrl(secret);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Zero-Data-Retention': 'true',
      'X-No-Storage': 'true'
    };

    if (secret.accountId) {
      headers['OpenAI-Account'] = secret.accountId;
      headers['ChatGPT-Account-Id'] = secret.accountId;
    }

    const body: Record<string, any> = {
      model: modelSpec.upstreamId || modelSpec.id,
      messages: req.messages,
      stream: !!req.stream,
      temperature: req.temperature ?? 0.7,
      store: false // Zero Data Retention: Prevents OpenAI from persisting or training on completions
    };

    if (req.max_tokens !== undefined) body.max_tokens = req.max_tokens;
    if (req.max_completion_tokens !== undefined) body.max_completion_tokens = req.max_completion_tokens;
    if (req.top_p !== undefined) body.top_p = req.top_p;
    if (req.presence_penalty !== undefined) body.presence_penalty = req.presence_penalty;
    if (req.frequency_penalty !== undefined) body.frequency_penalty = req.frequency_penalty;
    if (req.prompt_cache_key !== undefined) body.prompt_cache_key = req.prompt_cache_key;
    if (req.prompt_cache_options !== undefined) body.prompt_cache_options = req.prompt_cache_options;
    if (req.safety_identifier !== undefined) body.safety_identifier = req.safety_identifier;
    if ((req as any).tools !== undefined) body.tools = (req as any).tools;
    if ((req as any).tool_choice !== undefined) body.tool_choice = (req as any).tool_choice;
    if (req.response_format !== undefined) body.response_format = req.response_format;

    // Build abort controller with deadline budget
    const defaultTtftTimeout = modelSpec.supportsReasoning ? 30_000 : 15_000;
    const timeoutMs = options?.timeoutMs ?? options?.deadline?.ttftTimeoutMs ?? defaultTtftTimeout;

    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | null = null;

    if (timeoutMs > 0 && timeoutMs < Infinity) {
      timeoutId = setTimeout(() => {
        controller.abort(new Error(`Upstream TTFT deadline exceeded (${timeoutMs}ms)`));
      }, timeoutMs);
      if (timeoutId.unref) timeoutId.unref();
    }

    // Link user/parent abort signal if present
    if (options?.signal) {
      if (options.signal.aborted) {
        if (timeoutId) clearTimeout(timeoutId);
        controller.abort(options.signal.reason);
      } else {
        options.signal.addEventListener('abort', () => {
          if (timeoutId) clearTimeout(timeoutId);
          controller.abort(options.signal!.reason);
        }, { once: true });
      }
    }

    // 0. Primary Native Execution for ChatGPT Codex Sessions:
    // ChatGPT session tokens (OAuth tokens scoped for ChatGPT) lack the platform 'model.request'
    // scope required by api.openai.com/v1/chat/completions. They MUST be executed via persistent
    // WebSocket to wss://chatgpt.com/backend-api/codex/responses (directly or via the Always-On VM Relay).
    // Cloudflare Edge Workers cannot sustain long-lived Codex WebSockets.
    const isCodexAuth = (secret as any)?.authType === 'oauth' ||
                        (secret as any)?.auth_mode === 'chatgpt' ||
                        !!secret.accountId ||
                        token.startsWith('eyJ') ||
                        fs.existsSync(path.join(os.homedir(), '.codex', 'auth.json'));

    const isCodexSession = isCodexAuth && !token.startsWith('sk-');

    if (isCodexSession) {
      // Check if remote Always-On VM Relay daemon is explicitly configured
      const vmRelayUrl =
        process.env.VM_RELAY_URL ||
        process.env.GALXAI_RELAY_URL ||
        process.env.RELAY_URL ||
        (secret as any)?.relayUrl ||
        (process.env.FORCE_VM_RELAY === 'true' ? OpenAIAdapter.getResolvedRelayUrl() : undefined);

      const useVmRelay = !!(
        process.env.VM_RELAY_URL ||
        process.env.GALXAI_RELAY_URL ||
        process.env.RELAY_URL ||
        process.env.FORCE_VM_RELAY === 'true' ||
        (options as any)?.forceRelay === true ||
        (req as any)?.dispatch_target === 'relay' ||
        (secret as any)?.relayUrl
      );

      if (process.env.VERCEL && !vmRelayUrl) {
        if (timeoutId) clearTimeout(timeoutId);
        throw new RelayDispatchError('missing_production_relay');
      }

      if (vmRelayUrl && useVmRelay) {
        if (timeoutId) clearTimeout(timeoutId);
        return executeRelayChat({
          url: vmRelayUrl,
          key: process.env.VM_RELAY_API_KEY || process.env.RELAY_API_KEYS?.split(',')[0]?.trim(),
          payload: {
            ...body,
            model: body.model === 'gpt-5.6-sol' ? 'gpt-5.6-terra' : (modelSpec.upstreamId || body.model),
            ...((req as any).reasoning_effort ? { reasoning_effort: (req as any).reasoning_effort } : {})
          },
          signal: options?.signal,
          ttftTimeoutMs: timeoutMs,
          idleTimeoutMs: options?.deadline?.intraChunkTimeoutMs
        });
      }

      // Direct Native Wire WebSocket (authoritative for local and non-relayed execution)
      try {
        if (timeoutId) clearTimeout(timeoutId);
        return await OpenAIAdapter.executeViaCodexWebSocket(req, modelSpec, secret, options);
      } catch (wsErr: any) {
        const codexBin = OpenAIAdapter.findCodexExecutable();
        if (codexBin) {
          try {
            return await OpenAIAdapter.executeViaCodexCli(codexBin, req, modelSpec, secret, options);
          } catch {}
        }
        throw wsErr;
      }
    }

    // 1. Standard wholesale API Keys (sk-...):
    // Optionally proxy through Cloudflare Edge Gateway for zero-egress acceleration
    const edgeGatewayUrl =
      process.env.EDGE_GATEWAY_URL ||
      process.env.CLOUDFLARE_GATEWAY_URL ||
      process.env.LUMI_EDGE_WORKER_URL ||
      (secret as any)?.edgeGatewayUrl;

    if (edgeGatewayUrl) {
      try {
        const edgeResp = await fetch(`${edgeGatewayUrl.replace(/\/+$/, '')}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            ...headers,
            'x-galx-client': 'openai-adapter-edge-gateway',
            'x-galx-shard-id': (secret as any)?.id || (secret as any)?.shardId || ''
          },
          body: JSON.stringify(body),
          signal: controller.signal
        });

        if (timeoutId) clearTimeout(timeoutId);
        if (edgeResp.ok) {
          const responseHeaders: Record<string, string> = {};
          edgeResp.headers.forEach((v, k) => {
            responseHeaders[k.toLowerCase()] = v;
          });
          return { response: edgeResp, headers: responseHeaders };
        }
      } catch {
        // Fall back to direct upstream connection if edge gateway is unreachable
      }
    }

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (timeoutId) clearTimeout(timeoutId);

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((v, k) => {
        responseHeaders[k.toLowerCase()] = v;
      });

      return { response, headers: responseHeaders };
    } catch (err: any) {
      if (timeoutId) clearTimeout(timeoutId);
      if (err.name === 'AbortError' || controller.signal.aborted) {
        throw new Error(`Upstream connection aborted/timed out after ${timeoutMs}ms`);
      }
      throw err;
    }
  }

  /**
   * Executes visual synthesis / image generation against OpenAI endpoint.
   */
  static async executeImageGeneration(
    req: ImageGenerationRequest,
    secret: DecryptedGalxSecret,
    modelSpec: ModelSpecItem,
    shardId: string,
    options?: ExecuteOptions
  ): Promise<ImageGenerationResponse> {
    const token = secret.apiKey || secret.accessToken;
    if (!token) {
      throw new Error('Missing OpenAI API key or OAuth access token');
    }

    const isCodexAuth = (secret as any)?.authType === 'oauth' ||
                        (secret as any)?.auth_mode === 'chatgpt' ||
                        !!secret.accountId ||
                        token.startsWith('eyJ') ||
                        fs.existsSync(path.join(os.homedir(), '.codex', 'auth.json'));

    const isCodexSession = isCodexAuth && !token.startsWith('sk-');

    // 1. ChatGPT OAuth Sessions: Must dispatch via Always-On VM Relay or native Codex WebSocket
    if (isCodexSession) {
      const vmRelayUrl =
        process.env.VM_RELAY_URL ||
        process.env.GALXAI_RELAY_URL ||
        process.env.RELAY_URL ||
        (secret as any)?.relayUrl ||
        OpenAIAdapter.getResolvedRelayUrl();

      // A configured relay owns this request; never replay an ambiguous failure.
      if (vmRelayUrl) {
        const relayKey = process.env.VM_RELAY_API_KEY || process.env.RELAY_API_KEYS?.split(',')[0]?.trim();
        if (!relayKey) throw new RelayDispatchError('missing_relay_key');
        const controller = new AbortController();
        const abort = () => controller.abort(options?.signal?.reason);
        if (options?.signal?.aborted) abort();
        else options?.signal?.addEventListener('abort', abort, { once: true });
        const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 105_000);
        try {
          const response = await fetch(`${vmRelayUrl.replace(/\/+$/, '')}/v1/images/generations`, {
            method: 'POST',
            redirect: 'error',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${relayKey}`,
              'x-galx-client': 'openai-adapter-vm-relay-image',
              'x-galx-shard-id': shardId,
              ...(req.sessionId ? { 'x-galx-session-id': req.sessionId } : {}),
              ...(req.idempotencyKey ? { 'idempotency-key': req.idempotencyKey } : {})
            },
            body: JSON.stringify({
              prompt: req.prompt,
              model: modelSpec.upstreamId || modelSpec.id,
              size: req.size || '1024x1024',
              quality: req.quality || 'standard',
              n: req.n || 1,
              response_format: req.response_format || 'url',
              sessionId: req.sessionId
            }),
            signal: controller.signal
          });
          if (!response.ok) throw new RelayDispatchError(`image_http_${response.status}`);
          const result = await response.json();
          if (!Array.isArray(result.data) || !result.data.length ||
              !result.data.every((item: any) => typeof item.b64_json === 'string' && item.b64_json.length > 0)) {
            throw new RelayDispatchError('invalid_image_response');
          }
          return { created: result.created || Math.floor(Date.now() / 1000), data: result.data, modelUsed: modelSpec.id, shardId };
        } catch (error) {
          if (error instanceof RelayDispatchError) throw error;
          throw new RelayDispatchError(controller.signal.aborted ? 'image_deadline_or_cancelled' : 'image_transport_failed');
        } finally {
          clearTimeout(timeout);
          options?.signal?.removeEventListener('abort', abort);
        }
      }
      if (process.env.VERCEL) throw new RelayDispatchError('missing_relay_url');

      // Fallback: Direct Codex WebSocket wire synthesis
      const directResult = await this.executeImageViaCodexWebSocket(req.prompt, secret, modelSpec, options);
      return {
        created: Math.floor(Date.now() / 1000),
        data: [
          {
            b64_json: directResult.b64_json,
            revised_prompt: directResult.revised_prompt || req.prompt
          }
        ],
        modelUsed: modelSpec.id,
        shardId
      };
    }

    // 2. Standard OpenAI Platform API Key (REST endpoint)
    const baseUrl = this.resolveBaseUrl(secret);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    if (secret.accountId) {
      headers['OpenAI-Account'] = secret.accountId;
    }

    const body: Record<string, any> = {
      model: modelSpec.upstreamId,
      prompt: req.prompt,
      n: req.n || 1,
      size: req.size || '1024x1024'
    };

    if (req.quality) body.quality = req.quality;
    if ((req as any).style) body.style = (req as any).style;
    if (req.response_format) body.response_format = req.response_format;

    const timeoutMs = options?.timeoutMs ?? 60_000;
    const controller = new AbortController();
    const abort = () => controller.abort(options?.signal?.reason);
    if (options?.signal?.aborted) abort();
    else options?.signal?.addEventListener('abort', abort, { once: true });
    const timeoutId = setTimeout(() => {
      controller.abort(new Error(`Image generation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    if (timeoutId.unref) timeoutId.unref();

    try {
      const response = await fetch(`${baseUrl}/images/generations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!response.ok) {
        const errText = await response.text();
        throw Object.assign(new Error(`OpenAI Image Generation error (${response.status}): ${errText}`), {
          status: response.status,
          upstreamHeaders: { 'retry-after': response.headers.get('retry-after') ?? undefined }
        });
      }

      const result = await response.json() as any;

      return {
        created: result.created || Math.floor(Date.now() / 1000),
        data: result.data || [],
        modelUsed: modelSpec.id,
        shardId
      };
    } catch (err: any) {
      if (options?.signal?.aborted) throw Object.assign(new Error('Request cancelled'), { status: 499 });
      throw err;
    } finally {
      clearTimeout(timeoutId);
      options?.signal?.removeEventListener('abort', abort);
    }
  }

  /**
   * Executes image generation directly over native WebSocket wire to wss://chatgpt.com/backend-api/codex/responses
   * with tools: [{ type: 'image_generation' }].
   */
  public static async executeImageViaCodexWebSocket(
    prompt: string,
    secret: DecryptedGalxSecret,
    _modelSpec: ModelSpecItem,
    options?: ExecuteOptions
  ): Promise<{ b64_json: string; revised_prompt?: string }> {
    const wsModule = await import('ws');
    const WebSocket = (wsModule as any).default || wsModule;

    const shardId = (secret as any)?.id || (secret as any)?.shardId || '';
    let token = secret?.accessToken || secret?.apiKey;
    let accountId = secret?.accountId;

    if (!token || token.startsWith('galx_')) {
      const authPath = path.join(os.homedir(), '.codex', 'auth.json');
      if (fs.existsSync(authPath)) {
        try {
          const authData = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
          const tokens = authData.tokens || authData;
          token = tokens.access_token || token;
          accountId = tokens.account_id || authData.account_id || accountId;
        } catch {}
      }
    }

    if (!token) {
      throw new Error('No valid Codex access token found for image WebSocket execution');
    }

    const wsUrl = 'wss://chatgpt.com/backend-api/codex/responses';
    const wsHeaders: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'Codex-CLI/0.150.1 (darwin; arm64)',
      'X-Codex-Originator': 'codex_cli',
      'OpenAI-Beta': 'responses_websockets=2026-02-06',
      'X-OpenAI-Product-Sku': 'codex',
    };
    if (accountId) wsHeaders['ChatGPT-Account-Id'] = accountId;
    if (shardId) wsHeaders['X-Galx-Shard-Id'] = shardId;

    return new Promise((resolve, reject) => {
      let ws: any;
      let settled = false;
      let pingInterval: any = null;

      const timeoutMs = options?.timeoutMs || 90_000;
      const timeoutId = setTimeout(() => {
        finishError(new Error(`Direct Codex WebSocket image synthesis timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      const cleanup = () => {
        clearTimeout(timeoutId);
        if (pingInterval) clearInterval(pingInterval);
        if (ws) {
          try {
            if (typeof ws.terminate === 'function') ws.terminate();
            else if (typeof ws.close === 'function') ws.close();
          } catch {}
        }
      };

      const finishSuccess = (b64: string, revised?: string) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve({ b64_json: b64, revised_prompt: revised });
      };

      const finishError = (err: Error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(err);
      };

      try {
        ws = new WebSocket(wsUrl, { headers: wsHeaders });
      } catch (err) {
        return finishError(err as Error);
      }

      ws.on('open', () => {
        pingInterval = setInterval(() => {
          try { if (typeof ws.ping === 'function') ws.ping(); } catch {}
        }, 15000);

        const payload = {
          type: 'response.create',
          model: 'gpt-5.6-terra',
          stream: true,
          input: [
            {
              type: 'message',
              role: 'user',
              content: [{ type: 'input_text', text: prompt }],
            },
          ],
          tools: [{ type: 'image_generation' }],
        };

        try {
          ws.send(JSON.stringify(payload));
        } catch (err) {
          finishError(err as Error);
        }
      });

      let b64Result = '';
      let revisedPrompt = '';

      ws.on('message', (data: any) => {
        try {
          const raw = typeof data === 'string' ? data : data?.toString?.('utf-8');
          if (!raw) return;
          const frame = JSON.parse(raw);

          if (frame.type === 'response.output_item.done' && frame.item?.type === 'image_generation_call') {
            if (frame.item.result) b64Result = frame.item.result;
            if (frame.item.revised_prompt) revisedPrompt = frame.item.revised_prompt;
          }

          if (frame.type === 'response.completed' || frame.type === 'response.done') {
            if (b64Result) {
              finishSuccess(b64Result, revisedPrompt);
            } else {
              finishError(new Error('Codex WebSocket completed without returning image data'));
            }
          }

          if (frame.type === 'error' || (frame.type === 'response.failed' && frame.response?.error)) {
            const msg = frame.error?.message || frame.response?.error?.message || JSON.stringify(frame);
            finishError(new Error(`Codex WebSocket error: ${msg}`));
          }
        } catch {}
      });

      ws.on('error', (err: any) => finishError(err instanceof Error ? err : new Error(String(err))));
      ws.on('close', (code: number, reason: string) => {
        if (!settled) {
          if (b64Result) finishSuccess(b64Result, revisedPrompt);
          else finishError(new Error(`Codex WebSocket closed prematurely (code: ${code}, reason: ${reason || 'unknown'})`));
        }
      });
    });
  }

  /**
   * Finds the native OpenAI Codex executable on the local system if installed.
   */
  public static findCodexExecutable(): string | null {
    const candidates = [
      process.env.CODEX_BIN_PATH,
      '/Users/bozoegg/.nvm/versions/node/v24.15.0/bin/codex',
      '/opt/homebrew/bin/codex',
      '/usr/local/bin/codex',
      path.join(os.homedir(), '.bun', 'bin', 'codex')
    ].filter(Boolean) as string[];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        try {
          const out = execSync(`"${p}" --version`, { stdio: 'pipe' }).toString();
          if (out.includes('codex')) return p;
        } catch {}
      }
    }
    return null;
  }

  /**
   * Dispatches chat completion directly over native WebSocket wire to wss://chatgpt.com/backend-api/codex/responses.
   * This is the exact wire protocol used by the native OpenAI Codex CLI, bypassing api.openai.com/v1/chat/completions
   * which requires Platform API keys and rejects ChatGPT session tokens with "missing_scope: model.request".
   */
  public static async executeViaCodexWebSocket(
    req: ChatCompletionRequest,
    modelSpec: ModelSpecItem,
    secret?: DecryptedGalxSecret,
    options?: ExecuteOptions
  ): Promise<{ response: Response; headers: Record<string, string> }> {
    const wsModule = await import('ws');
    const WebSocket = (wsModule as any).default || wsModule;

    // Resolve token and accountId from leased secret or fallback
    const shardId = (secret as any)?.id || (secret as any)?.shardId || '';
    let token = secret?.accessToken || secret?.apiKey;
    let accountId = secret?.accountId;

    if (!token || token.startsWith('galx_')) {
      const authPath = path.join(os.homedir(), '.codex', 'auth.json');
      if (fs.existsSync(authPath)) {
        try {
          const authData = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
          const tokens = authData.tokens || authData;
          token = tokens.access_token || token;
          accountId = tokens.account_id || authData.account_id || accountId;
        } catch {}
      }
    }

    if (!token) {
      throw new Error('No valid Codex access token found for WebSocket execution');
    }

    const targetModel = modelSpec.id === 'gpt-5.6-sol' ? 'gpt-5.6-terra' : (modelSpec.upstreamId || modelSpec.id);
    const reasoningEffort = (req as any).reasoning_effort || (req as any).reasoningEffort || 'low';

    const inputList: Array<{ type: string; role: string; content: Array<{ type: string; text: string }> }> = [];
    let instructions = '';
    for (const msg of req.messages) {
      const text = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      if (msg.role === 'system') {
        instructions = instructions ? `${instructions}\n\n${text}` : text;
      } else {
        inputList.push({
          type: 'message',
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: [{ type: 'input_text', text }]
        });
      }
    }

    const wsUrl = 'wss://chatgpt.com/backend-api/codex/responses';
    const wsHeaders: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'Codex-CLI/0.150.1 (darwin; arm64)',
      'X-Codex-Originator': 'codex_cli',
      'OpenAI-Beta': 'responses_websockets=2026-02-06',
      'X-OpenAI-Product-Sku': 'codex',
    };
    if (accountId) {
      wsHeaders['ChatGPT-Account-Id'] = accountId;
    }
    if (shardId) {
      wsHeaders['X-Galx-Shard-Id'] = shardId;
    }

    const isStream = !!req.stream;
    const completionId = `chatcmpl_codex_ws_${Date.now().toString(36)}`;
    const created = Math.floor(Date.now() / 1000);

    return new Promise((resolve, reject) => {
      let ws: any;
      try {
        ws = new WebSocket(wsUrl, { headers: wsHeaders });
      } catch (err) {
        return reject(err);
      }

      let hasResolved = false;
      let streamController: ReadableStreamDefaultController | null = null;
      let streamFinished = false;
      let accumulatedText = '';

      const ttftTimeoutMs = options?.timeoutMs || 45000;
      let activeTimer: NodeJS.Timeout | null = setTimeout(() => {
        cleanup();
        if (!hasResolved) {
          hasResolved = true;
          reject(new Error(`Codex WebSocket TTFT timeout after ${ttftTimeoutMs}ms`));
        }
      }, ttftTimeoutMs);

      const refreshChunkTimer = () => {
        if (activeTimer) clearTimeout(activeTimer);
        activeTimer = setTimeout(() => {
          cleanup();
          if (!hasResolved) {
            hasResolved = true;
            reject(new Error('Codex WebSocket intra-chunk timeout after 45000ms'));
          }
        }, options?.deadline?.intraChunkTimeoutMs || 45000);
      };

      const cleanup = () => {
        if (activeTimer) clearTimeout(activeTimer);
        try { ws.close(); } catch {}
      };

      if (options?.signal) {
        options.signal.addEventListener('abort', () => {
          cleanup();
          if (!hasResolved) {
            hasResolved = true;
            reject(options.signal!.reason);
          }
        }, { once: true });
      }

      ws.on('open', () => {
        const createPayload: Record<string, any> = {
          type: 'response.create',
          model: targetModel,
          input: inputList,
          stream: true,
        };
        if (instructions) {
          createPayload.instructions = instructions;
        }
        if (reasoningEffort && reasoningEffort !== 'none') {
          createPayload.reasoning = { effort: reasoningEffort };
        }
        ws.send(JSON.stringify(createPayload));

        if (isStream) {
          const readable = new ReadableStream({
            start(controller) {
              streamController = controller;
            },
            cancel() {
              cleanup();
            }
          });

          hasResolved = true;
          if (activeTimer) clearTimeout(activeTimer);
          resolve({
            response: new Response(readable, {
              status: 200,
              headers: {
                'Content-Type': 'text/event-stream; charset=utf-8',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'X-Codex-Transport': 'direct-websocket',
                'X-Codex-Model': targetModel,
                'X-Galx-Shard-Id': shardId,
                'X-Galx-Account-Id': accountId || '',
              }
            }),
            headers: {
              'content-type': 'text/event-stream; charset=utf-8',
              'x-codex-transport': 'direct-websocket',
              'x-galx-shard-id': shardId,
              'x-galx-account-id': accountId || '',
            }
          });
        }
      });

      ws.on('message', (raw: any) => {
        try {
          const data = JSON.parse(raw.toString());

          if (data.type === 'response.output_text.delta' && data.delta) {
            refreshChunkTimer();
            if (isStream && streamController) {
              const encoder = new TextEncoder();
              const chunk = `data: ${JSON.stringify({
                id: completionId,
                object: 'chat.completion.chunk',
                created,
                model: targetModel,
                choices: [{
                  index: 0,
                  delta: { content: data.delta },
                  finish_reason: null
                }]
              })}\n\n`;
              streamController.enqueue(encoder.encode(chunk));
            } else {
              accumulatedText += data.delta;
            }
          } else if (data.type === 'response.completed' || data.type === 'response.done') {
            if (isStream && streamController && !streamFinished) {
              streamFinished = true;
              const encoder = new TextEncoder();
              const finalChunk = `data: ${JSON.stringify({
                id: completionId,
                object: 'chat.completion.chunk',
                created,
                model: targetModel,
                choices: [{
                  index: 0,
                  delta: {},
                  finish_reason: 'stop'
                }]
              })}\n\ndata: [DONE]\n\n`;
              streamController.enqueue(encoder.encode(finalChunk));
              try { streamController.close(); } catch {}
              cleanup();
            } else if (!isStream && !hasResolved) {
              hasResolved = true;
              cleanup();
              const jsonResp = {
                id: completionId,
                object: 'chat.completion',
                created,
                model: targetModel,
                choices: [{
                  index: 0,
                  message: { role: 'assistant', content: accumulatedText },
                  finish_reason: 'stop'
                }],
                usage: {
                  prompt_tokens: 100,
                  completion_tokens: Math.ceil(accumulatedText.length / 4),
                  total_tokens: 100 + Math.ceil(accumulatedText.length / 4)
                }
              };
              resolve({
                response: new Response(JSON.stringify(jsonResp), {
                  status: 200,
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Codex-Transport': 'direct-websocket',
                    'X-Codex-Model': targetModel,
                    'X-Galx-Shard-Id': shardId,
                    'X-Galx-Account-Id': accountId || '',
                  }
                }),
                headers: {
                  'content-type': 'application/json',
                  'x-codex-transport': 'direct-websocket',
                  'x-galx-shard-id': shardId,
                  'x-galx-account-id': accountId || '',
                }
              });
            }
          } else if (data.type === 'error') {
            const errMsg = data.error?.message || 'Upstream codex error';
            if (isStream && streamController && !streamFinished) {
              streamFinished = true;
              const encoder = new TextEncoder();
              streamController.enqueue(encoder.encode(`data: ${JSON.stringify({ error: { message: errMsg } })}\n\n`));
              try { streamController.close(); } catch {}
            }
            cleanup();
            if (!hasResolved) {
              hasResolved = true;
              reject(new Error(errMsg));
            }
          }
        } catch {}
      });

      ws.on('error', (err: any) => {
        cleanup();
        if (!hasResolved) {
          hasResolved = true;
          reject(err);
        } else if (isStream && streamController && !streamFinished) {
          streamFinished = true;
          try { streamController.close(); } catch {}
        }
      });

      ws.on('close', () => {
        cleanup();
        if (isStream && streamController && !streamFinished) {
          streamFinished = true;
          try { streamController.close(); } catch {}
        } else if (!isStream && !hasResolved) {
          hasResolved = true;
          if (accumulatedText) {
            const jsonResp = {
              id: completionId,
              object: 'chat.completion',
              created,
              model: targetModel,
              choices: [{
                index: 0,
                message: { role: 'assistant', content: accumulatedText },
                finish_reason: 'stop'
              }],
              usage: {
                prompt_tokens: 100,
                completion_tokens: Math.ceil(accumulatedText.length / 4),
                total_tokens: 100 + Math.ceil(accumulatedText.length / 4)
              }
            };
            resolve({
              response: new Response(JSON.stringify(jsonResp), {
                status: 200,
                headers: {
                  'Content-Type': 'application/json',
                  'X-Codex-Transport': 'direct-websocket',
                  'X-Codex-Model': targetModel,
                  'X-Galx-Shard-Id': shardId,
                  'X-Galx-Account-Id': accountId || '',
                }
              }),
              headers: {
                'content-type': 'application/json',
                'x-codex-transport': 'direct-websocket',
                'x-galx-shard-id': shardId,
                'x-galx-account-id': accountId || '',
              }
            });
          } else {
            reject(new Error('Codex WebSocket connection closed before receiving completion response'));
          }
        }
      });
    });
  }

  /**
   * Dispatches model completion natively through the authenticated OpenAI Codex CLI session.
   */
  public static async executeViaCodexCli(
    codexBin: string,
    req: ChatCompletionRequest,
    modelSpec: ModelSpecItem,
    secret?: DecryptedGalxSecret,
    options?: ExecuteOptions
  ): Promise<{ response: Response; headers: Record<string, string> }> {
    // On free ChatGPT accounts, OpenAI supports gpt-5.6-terra, gpt-5.6-luna, gpt-5.5, gpt-5.4-mini
    const model = modelSpec.id === 'gpt-5.6-sol' ? 'gpt-5.6-terra' : (modelSpec.upstreamId || modelSpec.id);

    const formattedPrompt = [
      'CRITICAL: You are acting as an API text-completion model. You MUST NOT call any tools, execute shell commands, or invoke skills.',
      'Output your response directly as the final text completion, providing complete code inside markdown code blocks when requested.',
      ...req.messages.map((m) => {
        const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        return `[${m.role.toUpperCase()}]:\n${content}`;
      })
    ].join('\n\n');

    // Ensure isolated CODEX_HOME per shard to prevent SQLite lock contention and credentials mixing
    const shardKey = (secret as any)?.id || (secret as any)?.shardId || (secret as any)?.accountId || 'default';
    const isolatedCodexHome = path.join(os.tmpdir(), `galx-codex-runner-${shardKey}`);
    fs.mkdirSync(isolatedCodexHome, { recursive: true });

    if (secret?.accessToken) {
      const shardAuth = {
        tokens: {
          access_token: secret.accessToken,
          refresh_token: secret.refreshToken,
          account_id: secret.accountId
        }
      };
      fs.writeFileSync(path.join(isolatedCodexHome, 'auth.json'), JSON.stringify(shardAuth, null, 2), 'utf-8');
    } else {
      const sourceAuth = path.join(os.homedir(), '.codex', 'auth.json');
      if (fs.existsSync(sourceAuth)) {
        try {
          fs.copyFileSync(sourceAuth, path.join(isolatedCodexHome, 'auth.json'));
        } catch {}
      }
    }

    const reasoningEffort = (req as any).reasoning_effort || 'low';
    const args = [
      'exec',
      '--ephemeral',
      '--json',
      '--sandbox',
      'read-only',
      '--skip-git-repo-check',
      '--ignore-user-config',
      '--ignore-rules',
      '-m',
      model,
      '-c',
      `model_reasoning_effort="${reasoningEffort}"`,
      '-'
    ];

    const child = spawn(codexBin, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        CODEX_HOME: isolatedCodexHome
      }
    });

    if (options?.signal) {
      options.signal.addEventListener('abort', () => {
        try { child.kill('SIGKILL'); } catch {}
      }, { once: true });
    }

    child.stdin.write(formattedPrompt);
    child.stdin.end();

    const isStream = !!req.stream;
    const completionId = `chatcmpl_codex_${Date.now().toString(36)}`;
    const created = Math.floor(Date.now() / 1000);

    if (isStream) {
      const rl = readline.createInterface({ input: child.stdout });
      const lineIterator = rl[Symbol.asyncIterator]();
      const bufferedLines: string[] = [];
      let startupError: string | null = null;
      let hasContent = false;

      // Drain startup handshake lines to capture immediate rate limit or auth errors
      while (true) {
        const nextResult = await lineIterator.next();
        if (nextResult.done) break;
        const line = nextResult.value.trim();
        if (!line) continue;
        bufferedLines.push(line);

        try {
          const event = JSON.parse(line);
          if (event.type === 'error' || event.type === 'turn.failed') {
            startupError = event.message || event.error?.message || 'Upstream codex execution failed';
            break;
          }
          if (
            event.type === 'item.completed' ||
            event.type === 'item.started' ||
            event.type === 'agent_message' ||
            event.item?.type === 'agent_message'
          ) {
            hasContent = true;
            break;
          }
          if (event.type === 'turn.completed') {
            break;
          }
        } catch {}
      }

      if (bufferedLines.length === 0) {
        return {
          response: new Response(
            JSON.stringify({
              error: {
                message: 'Codex process terminated before producing output',
                type: 'upstream_error',
                code: 'process_empty_exit'
              }
            }),
            { status: 502, headers: { 'Content-Type': 'application/json' } }
          ),
          headers: { 'content-type': 'application/json' }
        };
      }

      if (startupError && !hasContent) {
        const isRateLimit = startupError.toLowerCase().includes('usage limit') || startupError.toLowerCase().includes('rate limit');
        const status = isRateLimit ? 429 : 502;
        return {
          response: new Response(
            JSON.stringify({
              error: {
                message: startupError,
                type: isRateLimit ? 'rate_limit_error' : 'upstream_error',
                code: isRateLimit ? 'usage_limit_exceeded' : 'codex_failed'
              }
            }),
            { status, headers: { 'Content-Type': 'application/json' } }
          ),
          headers: { 'content-type': 'application/json' }
        };
      }

      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const processLine = (line: string) => {
            const trimmed = line.trim();
            if (!trimmed) return;
            try {
              const event = JSON.parse(trimmed);
              if (event.type === 'error' || event.type === 'turn.failed') {
                const errMsg = event.message || event.error?.message || 'Upstream codex error';
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: { message: errMsg } })}\n\n`));
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              } else if (event.type === 'item.completed' && event.item?.type === 'agent_message') {
                const text: string = event.item.text || '';
                // Break into granular delta chunks for realistic SSE streaming
                const chunkSize = 40;
                for (let i = 0; i < text.length; i += chunkSize) {
                  const slice = text.slice(i, i + chunkSize);
                  const chunk = {
                    id: completionId,
                    object: 'chat.completion.chunk',
                    created,
                    model,
                    choices: [
                      {
                        index: 0,
                        delta: { role: 'assistant', content: slice },
                        finish_reason: null
                      }
                    ]
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                }
              } else if (event.type === 'turn.completed') {
                const stopChunk = {
                  id: completionId,
                  object: 'chat.completion.chunk',
                  created,
                  model,
                  choices: [
                    {
                      index: 0,
                      delta: {},
                      finish_reason: 'stop'
                    }
                  ],
                  usage: {
                    prompt_tokens: event.usage?.input_tokens || 100,
                    completion_tokens: event.usage?.output_tokens || 50,
                    total_tokens: (event.usage?.input_tokens || 100) + (event.usage?.output_tokens || 50)
                  }
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(stopChunk)}\n\n`));
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              }
            } catch {}
          };

          // Replay all buffered handshake lines
          for (const line of bufferedLines) {
            processLine(line);
          }

          // Stream remaining lines
          try {
            for await (const line of lineIterator) {
              processLine(line);
            }
            controller.close();
          } catch (err) {
            try { controller.error(err); } catch {}
          }
        }
      });

      const response = new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'x-galx-codex-native': 'true',
          'x-galx-model': model
        }
      });

      return {
        response,
        headers: {
          'content-type': 'text/event-stream; charset=utf-8',
          'x-galx-codex-native': 'true'
        }
      };
    } else {
      let accumulatedText = '';
      let usage = { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 };
      let upstreamError: string | null = null;

      const rl = readline.createInterface({ input: child.stdout });
      for await (const line of rl) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const event = JSON.parse(trimmed);
          if (event.type === 'error' || event.type === 'turn.failed') {
            upstreamError = event.message || event.error?.message || 'Upstream codex execution failed';
          } else if (event.type === 'item.completed' && event.item?.type === 'agent_message') {
            accumulatedText += event.item.text || '';
          } else if (event.type === 'turn.completed' && event.usage) {
            usage = {
              prompt_tokens: event.usage.input_tokens || 100,
              completion_tokens: event.usage.output_tokens || 50,
              total_tokens: (event.usage.input_tokens || 100) + (event.usage.output_tokens || 50)
            };
          }
        } catch {}
      }

      if (upstreamError && !accumulatedText) {
        const isRateLimit = upstreamError.toLowerCase().includes('usage limit') || upstreamError.toLowerCase().includes('rate limit');
        const status = isRateLimit ? 429 : 502;
        return {
          response: new Response(JSON.stringify({
            error: {
              message: upstreamError,
              type: isRateLimit ? 'rate_limit_error' : 'upstream_error',
              code: isRateLimit ? 'usage_limit_exceeded' : 'codex_failed'
            }
          }), {
            status,
            headers: { 'Content-Type': 'application/json' }
          }),
          headers: { 'content-type': 'application/json' }
        };
      }

      const responseBody = JSON.stringify({
        id: completionId,
        object: 'chat.completion',
        created,
        model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: accumulatedText
            },
            finish_reason: 'stop'
          }
        ],
        usage
      });

      const response = new Response(responseBody, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'x-galx-codex-native': 'true',
          'x-galx-model': model
        }
      });

      return {
        response,
        headers: {
          'content-type': 'application/json',
          'x-galx-codex-native': 'true'
        }
      };
    }
  }
}
