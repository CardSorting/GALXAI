/**
 * GALXAI Developer SDK: Autonomous Agent Runtime & Universal Tool Calling Loop
 * Automatically executes local functions, captures outputs, and loops until final synthesis.
 * Absorbs all tool formats: pure function maps, OpenAI tool arrays, Anthropic tool arrays, LangChain tools, and Zod schemas.
 * Full compliance with standard LLM tool calling protocols (role: 'tool', tool_call_id).
 */

import type { ChatMessage, ChatCompletionResponse } from '../core/contracts/GalxContracts';
import type { CompletionsResource } from './resources/chat';
import { APIError } from './errors';
import { zodToJsonSchema } from './structured';
import { createChatResourceId, type ChatSessionMode } from '../core/chat/GalxChatRequestNormalizer';

export interface AgentToolDefinition<TParams = any, TResult = any> {
  description?: string;
  parameters?: any;
  schema?: any; // Zod schema or JSON schema
  input_schema?: any; // Anthropic format
  execute?: (params: TParams) => Promise<TResult> | TResult;
  call?: (params: TParams) => Promise<TResult> | TResult;
  run?: (params: TParams) => Promise<TResult> | TResult;
}

export type ForgivingToolInput =
  | ((params: any) => Promise<any> | any)
  | AgentToolDefinition
  | {
      type: 'function';
      function: {
        name: string;
        description?: string;
        parameters?: any;
        schema?: any;
        execute?: (params: any) => Promise<any> | any;
      };
    };

import { AgentMemoryStore } from './memory';

export interface AgentConfig {
  model?: string;
  systemPrompt?: string;
  tools?: Record<string, ForgivingToolInput> | Array<ForgivingToolInput & { name?: string }>;
  maxSteps?: number;
  /** Conservative per-turn input/output reservation, retained across continuation. Default 131072. */
  maxTotalTokens?: number;
  /** Serialized message and tool-definition bytes per model request. Default 65536. */
  maxInputBytes?: number;
  /** Per-step completion limit, forwarded to inference. Default 2048. */
  maxOutputTokens?: number;
  /** Persist owner-scoped checkpoints before side effects; a rejected write stops execution. */
  onCheckpoint?: (checkpoint: AgentCheckpoint, expectedRevision: number) => void | Promise<void>;
  temperature?: number;
  parallelToolExecution?: boolean;
  /** Maximum callbacks in flight in one batch. Default 4; sequential mode always uses 1. */
  maxConcurrentTools?: number;
  onStep?: (step: { stepNumber: number; toolCalls?: any[]; output?: string }) => void;
  /** Long-term associative memory store backed by BroccoliDB */
  memory?: AgentMemoryStore;
}

export interface AgentExecutionResult {
  /** Logical session identity when this run belongs to a durable session. */
  conversationId?: string;
  /** Identity of the user-level agent turn (model substeps derive from it). */
  turnId: string;
  text: string;
  stepsCount: number;
  toolCallsExecuted: Array<{
    toolName: string;
    toolCallId?: string;
    arguments: any;
    result: any;
  }>;
  finalMessage: ChatMessage;
  messages: ChatMessage[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AgentRunOptions {
  checkpoint?: AgentCheckpoint;
  onCheckpoint?: (checkpoint: AgentCheckpoint, expectedRevision: number) => void | Promise<void>;
  /** Stops future model steps and tool starts; an already-running callback owns its cancellation. */
  signal?: AbortSignal;
  conversationId?: string;
  sessionId?: string;
  turnId?: string;
  sessionMode?: ChatSessionMode;
}

export interface AgentSessionOptions {
  id?: string;
  messages?: ChatMessage[];
}

export interface AgentSessionState {
  id: string;
  messages: ChatMessage[];
  checkpoint?: AgentCheckpoint;
}

export interface AgentCheckpoint {
  version: 1;
  revision: number;
  turnId: string;
  conversationId?: string;
  sessionMode: ChatSessionMode;
  status: 'ready' | 'model_pending' | 'tools_pending' | 'complete';
  messages: ChatMessage[];
  steps: number;
  chargedTokens: number;
  maxSteps: number;
  maxTotalTokens: number;
  toolCallsExecuted: AgentExecutionResult['toolCallsExecuted'];
  usage: { promptTokens: number; completionTokens: number };
  /** Display-only, incomplete output. Never submitted as completed conversation history. */
  partialText?: string;
  pauseReason?: 'capacity' | 'context_limit' | 'turn_limit' | 'storage';
  /** Earliest explicit continuation after capacity feedback; never schedules a request. */
  retryAtMs?: number;
  capacityFailures?: number;
}

export class AgentContinuationError extends APIError {
  constructor(message: string, code: string, readonly checkpoint: AgentCheckpoint,
    readonly recovery: 'wait' | 'continue' | 'review' | 'reduce_context' | 'budget_exhausted') {
    super(message, 409, code);
    this.name = 'AgentContinuationError';
  }
}

export type AgentStreamEvent =
  | { type: 'token'; content: string }
  | { type: 'tool_call'; toolName: string; toolCallId: string; arguments: any }
  | { type: 'tool_result'; toolName: string; toolCallId: string; result: any }
  | { type: 'step'; stepNumber: number; output?: string }
  | { type: 'finish'; result: AgentExecutionResult };

interface NormalizedTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
    [key: string]: any;
  };
  zodSchema?: any;
  execute: (params: any) => Promise<any> | any;
}

const AUTOMATIC_TOOL_INSTRUCTIONS = 'The function tools registered for this run are authorized for automatic execution. Call them as needed and continue with their actual results until the task is complete, without asking for permission for each tool call or next step. Do not invent tool results or missing user information.';

function requireExecutor(value: unknown): NormalizedTool['execute'] {
  if (typeof value !== 'function') throw new APIError('Each agent tool must provide an execute, call, or run callback.', 400, 'invalid_agent_tool');
  return value as NormalizedTool['execute'];
}

function prepareToolBatch(calls: any[], registry: Map<string, NormalizedTool>, seen: Set<string>) {
  const ids = new Set<string>();
  if (calls.length > 32) throw new APIError('Too many tool calls in one step.', 502, 'invalid_tool_calls');
  // Validate the whole batch before any callback can have a side effect.
  for (const c of calls) {
    if (c?.type !== 'function' || typeof c.id !== 'string' || !/^[A-Za-z0-9_.:-]{1,128}$/.test(c.id)
      || typeof c.function?.name !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(c.function.name)
      || ids.has(c.id) || seen.has(c.id)) throw new APIError('Invalid or repeated tool call identity.', 502, 'invalid_tool_calls');
    ids.add(c.id);
  }
  for (const id of ids) seen.add(id);
  return calls.map(tc => {
    const fnName = tc.function.name, toolDef = registry.get(fnName);
    let parsedArgs: any = {}, argumentError: string | undefined;
    try {
      if (typeof tc.function.arguments !== 'string' || tc.function.arguments.length > 262144) throw Error();
      parsedArgs = JSON.parse(tc.function.arguments);
      if (!parsedArgs || typeof parsedArgs !== 'object' || Array.isArray(parsedArgs)) throw Error();
      if (toolDef?.zodSchema?.safeParse) {
        const parsed = toolDef.zodSchema.safeParse(parsedArgs);
        if (!parsed.success) throw Error();
        parsedArgs = parsed.data;
      }
    } catch { argumentError = 'Tool arguments did not match the required schema. Correct them before calling again.'; }
    return { tc, fnName, parsedArgs, toolDef, argumentError };
  });
}

async function executeTool(t: ReturnType<typeof prepareToolBatch>[number], signal?: AbortSignal) {
  signal?.throwIfAborted();
  let toolResult: any;
  if (t.argumentError) toolResult = { error: t.argumentError };
  else if (!t.toolDef) toolResult = { error: 'Tool is not registered for this run.' };
  else try {
    toolResult = await t.toolDef.execute(t.parsedArgs);
    // Always return a real JSON-compatible result, including callbacks returning void.
    toolResult = typeof toolResult === 'string' ? toolResult : JSON.parse(JSON.stringify(toolResult ?? null));
  } catch { toolResult = { error: 'Tool execution failed.' }; }
  return { ...t, toolResult };
}

export class AgentRuntime {
  private readonly completions: CompletionsResource;
  private readonly config: AgentConfig;
  public readonly memory: AgentMemoryStore;

  constructor(completions: CompletionsResource, config: AgentConfig = {}) {
    this.completions = completions;
    this.memory = config.memory || new AgentMemoryStore();
    this.config = {
      model: 'galx-nova',
      maxSteps: 10,
      temperature: 0.2,
      parallelToolExecution: true,
      ...config
    };
  }

  private initializeMessages(userInput: string | ChatMessage[]): ChatMessage[] {
    const messages = typeof userInput === 'string'
      ? [{ role: 'user' as const, content: userInput }]
      : [...userInput];

    if (this.config.systemPrompt && !messages.some((message) => message.role === 'system')) {
      messages.unshift({ role: 'system', content: this.config.systemPrompt });
    }
    if (this.config.tools && Object.keys(this.config.tools).length && !messages.some(m => m.role === 'system' && m.content === AUTOMATIC_TOOL_INSTRUCTIONS)) {
      messages.unshift({ role: 'system', content: AUTOMATIC_TOOL_INSTRUCTIONS });
    }
    return messages;
  }

  private resolveRunIdentity(options: AgentRunOptions): {
    conversationId?: string;
    sessionMode: ChatSessionMode;
    turnId: string;
  } {
    let conversationId = options.conversationId || options.sessionId;
    const sessionMode = options.sessionMode || (conversationId ? 'continue' : 'stateless');
    if (sessionMode === 'new' && !conversationId) conversationId = createChatResourceId('agent');
    if (sessionMode === 'continue' && !conversationId) {
      throw new Error('conversationId is required when sessionMode is continue.');
    }
    if (sessionMode === 'stateless' && conversationId) {
      throw new Error('conversationId cannot be combined with stateless agent execution.');
    }
    return {
      conversationId,
      sessionMode,
      turnId: options.turnId || createChatResourceId('turn'),
    };
  }

  /** Starts a new isolated session while reusing this runtime and HTTP client. */
  public startSession(options: AgentSessionOptions = {}): AgentSession {
    return new AgentSession(this, {
      id: options.id || createChatResourceId('agent'),
      messages: options.messages,
    }, 'new');
  }

  /** Resumes a known session from its exported history snapshot. */
  public resumeSession(state: AgentSessionState): AgentSession;
  public resumeSession(id: string, options: { messages: ChatMessage[] }): AgentSession;
  public resumeSession(
    idOrState: string | AgentSessionState,
    options?: { messages: ChatMessage[] }
  ): AgentSession {
    const state = typeof idOrState === 'string'
      ? { id: idOrState, messages: options?.messages, checkpoint: undefined }
      : idOrState;
    if (!state.messages) {
      throw new Error('Resuming an agent session requires its exported message history.');
    }
    return new AgentSession(this, { id: state.id, messages: state.messages }, 'continue', state.checkpoint);
  }

  /**
   * Normalizes any tool input (function, object, Zod schema, Anthropic input_schema) into standard executable tools.
   */
  private normalizeTools(): Map<string, NormalizedTool> {
    const registry = new Map<string, NormalizedTool>();
    const rawTools = this.config.tools;

    if (!rawTools) return registry;

    const resolveParameters = (rawParams: any, schema: any): { params: any; zodSchema?: any } => {
      const target = schema || rawParams;
      if (!target) {
        return { params: { type: 'object', properties: {}, required: [] } };
      }
      if (target._def || typeof target.safeParse === 'function') {
        return { params: zodToJsonSchema(target), zodSchema: target };
      }
      return {
        params: {
          type: 'object',
          properties: target.properties || {},
          required: target.required || []
        }
      };
    };

    // If passed as array
    if (Array.isArray(rawTools)) {
      for (const item of rawTools) {
        if (!item) continue;
        if (typeof item === 'object' && 'type' in item && item.type === 'function' && item.function) {
          const fn = item.function;
          const { params, zodSchema } = resolveParameters(fn.parameters, (fn as any).schema);
          registry.set(fn.name, {
            name: fn.name,
            description: fn.description || `Execute ${fn.name}`,
            parameters: params,
            zodSchema,
            execute: requireExecutor(fn.execute)
          });
        } else if (typeof item === 'object') {
          const name = (item as any).name || 'custom_tool';
          const description = (item as any).description || `Tool ${name}`;
          const { params, zodSchema } = resolveParameters(
            (item as any).parameters || (item as any).input_schema,
            (item as any).schema
          );
          const execute = requireExecutor((item as any).execute || (item as any).call || (item as any).run);
          registry.set(name, {
            name,
            description,
            parameters: params,
            zodSchema,
            execute
          });
        }
      }
      return registry;
    }

    // If passed as dictionary / object
    for (const [name, def] of Object.entries(rawTools)) {
      if (typeof def === 'function') {
        registry.set(name, {
          name,
          description: `Execute tool ${name}`,
          parameters: { type: 'object', properties: {}, required: [] },
          execute: def
        });
      } else if (def && typeof def === 'object') {
        if ('type' in def && def.type === 'function' && def.function) {
          const fn = def.function;
          const { params, zodSchema } = resolveParameters(fn.parameters, (fn as any).schema);
          registry.set(fn.name || name, {
            name: fn.name || name,
            description: fn.description || `Execute tool ${name}`,
            parameters: params,
            zodSchema,
            execute: requireExecutor(fn.execute)
          });
        } else {
          const toolObj = def as AgentToolDefinition;
          const execute = requireExecutor(toolObj.execute || toolObj.call || toolObj.run);
          const { params, zodSchema } = resolveParameters(
            toolObj.parameters || toolObj.input_schema,
            toolObj.schema
          );
          registry.set(name, {
            name,
            description: toolObj.description || `Execute tool ${name}`,
            parameters: params,
            zodSchema,
            execute
          });
        }
      }
    }

    return registry;
  }

  /** Runs a bounded turn. Continuation is explicit and preserves its original budget. */
  public async run(userInput: string | ChatMessage[], options: AgentRunOptions = {}): Promise<AgentExecutionResult> {
    for await (const event of this.execute(userInput, options, false)) {
      if (event.type === 'finish') return event.result;
    }
    throw new APIError('The turn stopped before completion.', 409, 'turn_incomplete');
  }

  public async *stream(userInput: string | ChatMessage[], options: AgentRunOptions = {}): AsyncIterable<AgentStreamEvent> {
    yield* this.execute(userInput, options, true);
  }

  public resume(checkpoint: AgentCheckpoint, options: Omit<AgentRunOptions, 'checkpoint'> = {}) {
    return this.run([], { ...options, checkpoint });
  }

  public resumeStream(checkpoint: AgentCheckpoint, options: Omit<AgentRunOptions, 'checkpoint'> = {}) {
    return this.stream([], { ...options, checkpoint });
  }

  private async *execute(input: string | ChatMessage[], options: AgentRunOptions, streaming: boolean): AsyncIterable<AgentStreamEvent> {
    const positive = (value: number | undefined, fallback: number) => {
      const n = value ?? fallback;
      if (!Number.isSafeInteger(n) || n < 1) throw new APIError('Agent limits must be positive integers.', 400, 'invalid_agent_config');
      return n;
    };
    const maxSteps = positive(this.config.maxSteps, 10), maxTotalTokens = positive(this.config.maxTotalTokens, 131072);
    const maxInputBytes = positive(this.config.maxInputBytes, 65536), maxOutputTokens = positive(this.config.maxOutputTokens, 2048);
    const maxConcurrentTools = Math.min(32, positive(this.config.maxConcurrentTools, 4));
    const toolMap = this.normalizeTools();
    const tools = Array.from(toolMap.values()).map(t => ({ type: 'function' as const,
      function: { name: t.name, description: t.description, parameters: t.parameters } }));
    const identity = this.resolveRunIdentity(options);
    const state: AgentCheckpoint = options.checkpoint ? structuredClone(options.checkpoint) : {
      version: 1, revision: 0, ...identity, status: 'ready', messages: this.initializeMessages(input), steps: 0,
      chargedTokens: 0, maxSteps, maxTotalTokens, toolCallsExecuted: [], usage: { promptTokens: 0, completionTokens: 0 },
    };
    if (state.version !== 1 || !['ready','model_pending','tools_pending','complete'].includes(state.status)
      || !Array.isArray(state.messages) || !Array.isArray(state.toolCallsExecuted)
      || typeof state.turnId !== 'string' || !/^[A-Za-z0-9_.:-]{1,128}$/.test(state.turnId)
      || ![state.revision,state.steps,state.chargedTokens,state.usage?.promptTokens,state.usage?.completionTokens].every(n => Number.isSafeInteger(n) && n >= 0)
      || ![state.retryAtMs ?? 0,state.capacityFailures ?? 0].every(n => Number.isSafeInteger(n) && n >= 0)
      || ![state.maxSteps,state.maxTotalTokens].every(n => Number.isSafeInteger(n) && n > 0)) {
      throw new APIError('Invalid agent checkpoint.', 400, 'invalid_checkpoint');
    }
    this.resolveRunIdentity({ conversationId: state.conversationId, sessionMode: state.sessionMode, turnId: state.turnId });
    state.maxSteps = Math.min(state.maxSteps, maxSteps);
    state.maxTotalTokens = Math.min(state.maxTotalTokens, maxTotalTokens);
    const fail = (message: string, code: string, recovery: AgentContinuationError['recovery']) =>
      new AgentContinuationError(message, code, structuredClone(state), recovery);
    const requiresReview = () => state.status !== 'ready' || state.pauseReason === 'storage';
    const budgetSpent = () => state.steps >= state.maxSteps || state.chargedTokens >= state.maxTotalTokens;
    const capacityWait = () => !budgetSpent() && state.pauseReason === 'capacity' && (state.retryAtMs ?? 0) > Date.now();
    if (requiresReview()) throw fail('Check the previous request, tool outcome, or saved progress before continuing.', 'checkpoint_not_ready', 'review');
    if (capacityWait()) {
      throw fail('Capacity is still recovering. Your progress is retained; wait before continuing.', 'continuation_wait', 'wait');
    }
    const save = async () => {
      const expectedRevision = state.revision;
      const next = { ...structuredClone(state), revision: expectedRevision + 1 };
      try {
        await this.config.onCheckpoint?.(structuredClone(next), expectedRevision);
        await options.onCheckpoint?.(structuredClone(next), expectedRevision);
      } catch {
        state.pauseReason = 'storage';
        throw new APIError('Progress could not be saved. Check the saved turn before continuing.',503,'checkpoint_unconfirmed');
      }
      // Advance only after persistence. A failed CAS cannot authorize a later write over its winner.
      state.revision = next.revision;
    };
    const seen = new Set(state.messages.flatMap(m => (m.tool_calls ?? []).map((c: any) => c.id)));
    try {
      await save();
      while (state.steps < state.maxSteps) {
        options.signal?.throwIfAborted();
        const inputBytes = new TextEncoder().encode(JSON.stringify({ messages: state.messages, tools })).byteLength;
        if (inputBytes > maxInputBytes) {
          state.pauseReason = 'context_limit'; await save();
          throw fail('This conversation is too large to continue. Save a concise summary, then continue.', 'context_budget_exceeded', 'reduce_context');
        }
        // Byte-based conservative reservation, including framing margin. Not a tokenizer or a billing balance.
        const reservation = inputBytes + 1024 + maxOutputTokens;
        if (reservation > state.maxTotalTokens - state.chargedTokens) {
          state.pauseReason = 'turn_limit'; await save();
          throw fail('This turn reached its usage limit. Review the saved progress before starting a new turn.', 'turn_budget_exceeded', 'budget_exhausted');
        }
        state.steps++; state.chargedTokens += reservation; state.status = 'model_pending'; state.partialText = '';
        delete state.pauseReason;
        await save(); // A failed persistence write must precede, and prevent, inference.
        const request = {
          model: this.config.model || 'galx-nova', messages: structuredClone(state.messages), temperature: this.config.temperature,
          max_tokens: maxOutputTokens, tools: tools.length ? tools : undefined, tool_choice: tools.length ? 'auto' as const : undefined,
          conversation_id: state.conversationId, session_mode: state.sessionMode,
          turn_id: state.steps === 1 ? state.turnId : `${state.turnId.slice(0,52)}:s${state.steps}`,
          user_message_id: state.turnId, assistant_message_id: `${state.turnId.slice(0,52)}:a`,
        };
        let res: ChatCompletionResponse;
        try {
          if (streaming) {
            const stream = this.completions.stream(request, { signal: options.signal, maxRetries: 0 });
            try {
              for await (const chunk of stream) {
                const delta = chunk.choices?.[0]?.delta?.content;
                if (delta) { state.partialText = (state.partialText + delta).slice(-16384); yield { type: 'token', content: delta }; }
              }
              res = await stream.finalChatCompletion();
            } finally { stream.abort(); await save(); }
          } else res = await this.completions.create(request, { signal: options.signal, maxRetries: 0 });
        } catch (error: any) {
          // Only explicit admission rejection or a confirmed terminal model failure permits a new step.
          // Lost responses and interrupted tools remain blocked. Failed attempts retain their reservation.
          if (error?.executionState === 'not_accepted' || error?.executionState === 'failed') {
            state.status = 'ready'; state.pauseReason = 'capacity';
            state.capacityFailures = Math.min(16, (state.capacityFailures ?? 0) + 1);
            const header = typeof error.headers?.get === 'function' ? error.headers.get('retry-after')
              : Object.entries(error.headers ?? {}).find(([key]) => key.toLowerCase() === 'retry-after')?.[1];
            const now = Date.now(), seconds = Number(header);
            const hinted = typeof header === 'string' && header.trim()
              ? Number.isFinite(seconds) && seconds >= 0 ? now + seconds * 1000 : Date.parse(header) : 0;
            const backoff = Math.min(60000, 5000 * 2 ** (state.capacityFailures - 1));
            // Positive jitter never shortens the server's requested wait. No timer dispatches work.
            state.retryAtMs = Math.ceil(Math.max(now + backoff, Number.isSafeInteger(hinted) ? hinted : 0) + Math.random() * 1000);
          }
          if (error?.executionState === 'not_accepted' && error?.code === 'context_budget_exceeded') state.pauseReason = 'context_limit';
          if (error?.executionState === 'failed' && state.conversationId) state.sessionMode = 'continue';
          await save();
          throw error;
        }
        state.sessionMode = state.conversationId ? 'continue' : 'stateless';
        delete state.retryAtMs; delete state.capacityFailures;
        if (res.usage) {
          const prompt = res.usage.prompt_tokens, completion = res.usage.completion_tokens;
          if ([prompt,completion].every(n => Number.isSafeInteger(n) && n >= 0)) {
            state.usage.promptTokens += prompt; state.usage.completionTokens += completion;
            // Never refund an unknown estimate; observed overage also consumes the remaining budget.
            state.chargedTokens += Math.max(0, prompt + completion - reservation);
          }
        }
        const message = res.choices[0]?.message;
        if (!message) throw new APIError('Empty response received from model during agent execution', 502, 'invalid_response');
        const calls = message.tool_calls;
        if (calls?.length) {
          const prepared = prepareToolBatch(calls, toolMap, seen);
          state.messages.push({ role: 'assistant', content: message.content || '', tool_calls: calls });
          state.status = 'tools_pending'; delete state.partialText;
          await save(); // Persist intent before any caller-owned side effect.
          this.config.onStep?.({ stepNumber: state.steps, toolCalls: calls, output: message.content || undefined });
          for (const t of prepared) yield { type: 'tool_call', toolName: t.fnName, toolCallId: t.tc.id, arguments: t.parsedArgs };
          let persistence = Promise.resolve();
          const completed: Awaited<ReturnType<typeof executeTool>>[] = [];
          const execute = async (t: ReturnType<typeof prepareToolBatch>[number]) => {
            const r = await executeTool(t, options.signal);
            // Serialize checkpoint writes even when callbacks complete concurrently.
            const record = () => {
              state.toolCallsExecuted.push({ toolName: r.fnName, toolCallId: r.tc.id, arguments: r.parsedArgs, result: r.toolResult });
              state.messages.push({ role: 'tool', tool_call_id: r.tc.id, name: r.fnName,
                content: typeof r.toolResult === 'string' ? r.toolResult : JSON.stringify(r.toolResult) });
              completed.push(r);
            };
            persistence = persistence.then(async () => { record(); await save(); }, error => {
              // Retain every completed callback locally without writing past a failed persistence fence.
              record(); throw error;
            });
            await persistence;
          };
          if (this.config.parallelToolExecution !== false) {
            let cursor = 0, failed = false;
            const worker = async () => {
              while (!failed && cursor < prepared.length) {
                const tool = prepared[cursor++];
                try { await execute(tool); } catch (error) { failed = true; throw error; }
              }
            };
            const results = await Promise.allSettled(Array.from({ length: Math.min(maxConcurrentTools, prepared.length) }, worker));
            const rejected = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
            if (rejected) throw rejected.reason;
          } else for (const t of prepared) await execute(t);
          state.status = 'ready'; await save();
          for (const r of completed) {
            yield { type: 'tool_result', toolName: r.fnName, toolCallId: r.tc.id, result: r.toolResult };
          }
          yield { type: 'step', stepNumber: state.steps };
          continue;
        }
        const text = message.content || '';
        state.messages.push({ role: 'assistant', content: text }); state.status = 'complete'; delete state.partialText;
        await save();
        this.config.onStep?.({ stepNumber: state.steps, output: text });
        yield { type: 'finish', result: { conversationId: state.conversationId, turnId: state.turnId, text,
          stepsCount: state.steps, toolCallsExecuted: structuredClone(state.toolCallsExecuted), finalMessage: { role: 'assistant', content: text },
          messages: structuredClone(state.messages), usage: { ...state.usage, totalTokens: state.usage.promptTokens + state.usage.completionTokens } } };
        return;
      }
      state.pauseReason = 'turn_limit'; await save();
      throw fail(`Agent exceeded maximum execution steps (${state.maxSteps}) without reaching a final answer`, 'max_steps_exceeded', 'budget_exhausted');
    } catch (error: any) {
      if (error instanceof AgentContinuationError) throw error;
      if (options.signal?.aborted) throw error;
      const recovery = requiresReview() ? 'review'
        : budgetSpent() ? 'budget_exhausted' : capacityWait() ? 'wait'
        : state.pauseReason === 'context_limit' ? 'reduce_context' : 'continue';
      throw fail(error instanceof Error ? error.message : 'This turn could not complete.', 'agent_paused', recovery);
    }
  }
}

/**
 * A logical agent session. Multiple instances safely multiplex one AgentRuntime;
 * history and mutation authority never live on the shared transport client.
 */
export class AgentSession {
  private id: string;
  private messages: ChatMessage[];
  private nextMode: Extract<ChatSessionMode, 'new' | 'continue'>;
  private activeTurn = false;

  constructor(
    private readonly runtime: AgentRuntime,
    options: Required<Pick<AgentSessionOptions, 'id'>> & Omit<AgentSessionOptions, 'id'>,
    mode: Extract<ChatSessionMode, 'new' | 'continue'>,
    private checkpoint?: AgentCheckpoint,
  ) {
    this.id = options.id;
    this.messages = structuredClone(options.messages || []);
    this.checkpoint = checkpoint ? structuredClone(checkpoint) : undefined;
    if (checkpoint && checkpoint.conversationId !== options.id) throw new APIError('Checkpoint belongs to another session.',400,'invalid_checkpoint');
    this.nextMode = mode;
  }

  public get sessionId(): string {
    return this.id;
  }

  public getHistory(): ChatMessage[] {
    return structuredClone(this.messages);
  }

  private appendInput(input: string | ChatMessage[]): ChatMessage[] {
    return typeof input === 'string'
      ? [...this.messages, { role: 'user', content: input }]
      : [...this.messages, ...input];
  }

  private retainFailure(error: unknown): never {
    if (error instanceof AgentContinuationError) {
      this.checkpoint = structuredClone(error.checkpoint);
      this.messages = structuredClone(error.checkpoint.messages);
    }
    throw error;
  }

  public async run(input: string | ChatMessage[], options: Pick<AgentRunOptions, 'signal'> = {}): Promise<AgentExecutionResult> {
    if (this.activeTurn) throw new Error(`Agent session ${this.id} already has an active turn.`);
    if (this.checkpoint && (this.checkpoint.status !== 'complete' || this.checkpoint.pauseReason === 'storage')) throw new APIError('This session has an unfinished turn. Continue or review its saved progress first.',409,'unfinished_turn');
    this.activeTurn = true;
    try {
      const result = await this.runtime.run(this.appendInput(input), {
        signal: options.signal,
        conversationId: this.id,
        sessionMode: this.nextMode,
        onCheckpoint: state => { this.checkpoint = structuredClone(state); this.messages = structuredClone(state.messages); },
      });
      this.messages = [...result.messages];
      this.nextMode = 'continue';
      return result;
    } catch (error) { this.retainFailure(error); } finally {
      this.activeTurn = false;
    }
  }

  public async *stream(input: string | ChatMessage[], options: Pick<AgentRunOptions, 'signal'> = {}): AsyncIterable<AgentStreamEvent> {
    if (this.activeTurn) throw new Error(`Agent session ${this.id} already has an active turn.`);
    if (this.checkpoint && (this.checkpoint.status !== 'complete' || this.checkpoint.pauseReason === 'storage')) throw new APIError('This session has an unfinished turn. Continue or review its saved progress first.',409,'unfinished_turn');
    this.activeTurn = true;
    try {
      for await (const event of this.runtime.stream(this.appendInput(input), {
        signal: options.signal,
        conversationId: this.id,
        sessionMode: this.nextMode,
        onCheckpoint: state => { this.checkpoint = structuredClone(state); this.messages = structuredClone(state.messages); },
      })) {
        if (event.type === 'finish') {
          this.messages = [...event.result.messages];
          this.nextMode = 'continue';
        }
        yield event;
      }
    } catch (error) { this.retainFailure(error); } finally {
      this.activeTurn = false;
    }
  }

  public export(): AgentSessionState {
    return structuredClone({ id: this.id, messages: this.messages, ...(this.checkpoint ? { checkpoint: this.checkpoint } : {}) });
  }

  /** Stable presentation contract for a caller's Continue / Review / Shorten controls. */
  public getRecovery() {
    if (this.activeTurn) return { action: 'wait' as const, label: 'Working', message: 'This turn is still running.' };
    if (this.checkpoint?.pauseReason === 'storage') return { action: 'review' as const, label: 'Check saved progress', message: 'The latest save is not confirmed. Check the saved turn before continuing.' };
    if (!this.checkpoint || this.checkpoint.status === 'complete') return { action: 'none' as const, label: 'Ready', message: 'Start a new turn when ready.' };
    if (this.checkpoint.status !== 'ready') return { action: 'review' as const, label: 'Check status', message: 'The previous outcome is not confirmed. Review it before starting more work.' };
    if (this.checkpoint.pauseReason === 'turn_limit' || this.checkpoint.steps >= this.checkpoint.maxSteps || this.checkpoint.chargedTokens >= this.checkpoint.maxTotalTokens) return { action: 'review' as const, label: 'Review progress', message: 'This turn reached its limit. Continuing will not reset its budget.' };
    if (this.checkpoint.pauseReason === 'context_limit') return { action: 'compact' as const, label: 'Shorten context', message: 'Progress is saved. Provide a concise summary to reduce the next request.' };
    if (this.checkpoint.pauseReason === 'capacity' && (this.checkpoint.retryAtMs ?? 0) > Date.now()) return {
      action: 'wait' as const, label: 'Waiting for capacity', message: 'Your progress is retained. Continue will become available after the wait; nothing restarts automatically.',
      retryAtMs: this.checkpoint.retryAtMs,
    };
    return { action: 'continue' as const, label: 'Continue', message: 'Progress is saved. Continue when capacity is available.' };
  }

  /** Continues only from confirmed progress; never repeats a completed callback. */
  public async resume(options: Pick<AgentRunOptions, 'signal'> = {}): Promise<AgentExecutionResult> {
    if (this.activeTurn) throw new Error(`Agent session ${this.id} already has an active turn.`);
    if (!this.checkpoint) throw new APIError('There is no unfinished turn to continue.',409,'checkpoint_required');
    this.activeTurn = true;
    try {
      const result = await this.runtime.resume(this.checkpoint, { ...options,
        onCheckpoint: state => { this.checkpoint = structuredClone(state); this.messages = structuredClone(state.messages); },
      });
      this.nextMode = 'continue'; return result;
    } catch (error) { this.retainFailure(error); } finally { this.activeTurn = false; }
  }

  public async *resumeStream(options: Pick<AgentRunOptions, 'signal'> = {}): AsyncIterable<AgentStreamEvent> {
    if (this.activeTurn) throw new Error(`Agent session ${this.id} already has an active turn.`);
    if (!this.checkpoint) throw new APIError('There is no unfinished turn to continue.',409,'checkpoint_required');
    this.activeTurn = true;
    try {
      for await (const event of this.runtime.resumeStream(this.checkpoint, { ...options,
        onCheckpoint: state => { this.checkpoint = structuredClone(state); this.messages = structuredClone(state.messages); },
      })) {
        if (event.type === 'finish') this.nextMode = 'continue';
        yield event;
      }
    } catch (error) { this.retainFailure(error); } finally { this.activeTurn = false; }
  }

  /** Explicit context reduction. Return the full previous snapshot for caller-owned archival. */
  public compact(summary: string, keepLastTurns = 2): AgentSessionState {
    if (this.activeTurn || this.checkpoint && (!['ready','complete'].includes(this.checkpoint.status) || this.checkpoint.pauseReason === 'storage')) {
      throw new APIError('Review the unfinished request or tool before changing context.',409,'checkpoint_not_ready');
    }
    if (!summary.trim() || new TextEncoder().encode(summary).byteLength > 8192 || !Number.isSafeInteger(keepLastTurns) || keepLastTurns < 1) {
      throw new APIError('Provide a summary of at most 8192 bytes and retain at least one recent turn.',400,'invalid_summary');
    }
    const before = this.export();
    const starts = this.messages.flatMap((m,i) => m.role === 'user' ? [i] : []);
    const start = starts[Math.max(0,starts.length-keepLastTurns)] ?? 0;
    const instructions = this.messages.filter(m => m.role === 'system' || m.role === 'developer');
    this.messages = structuredClone([...instructions,
      { role: 'user' as const, content: `Earlier conversation summary supplied by the application:\n${summary}` },
      ...this.messages.slice(start).filter(m => m.role !== 'system' && m.role !== 'developer')]);
    this.id = createChatResourceId('agent'); this.nextMode = 'new';
    if (this.checkpoint) {
      this.checkpoint = { ...this.checkpoint, conversationId: this.id, sessionMode: 'new', messages: structuredClone(this.messages) };
      if (this.checkpoint.pauseReason === 'context_limit') delete this.checkpoint.pauseReason;
    }
    return before;
  }

  /** Clears context by rotating identity; old durable history cannot bleed back in. */
  public clear(): this {
    if (this.activeTurn) throw new Error(`Cannot clear agent session ${this.id} during an active turn.`);
    this.id = createChatResourceId('agent');
    this.messages = [];
    this.checkpoint = undefined;
    this.nextMode = 'new';
    return this;
  }
}
