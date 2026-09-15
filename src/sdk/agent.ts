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
  temperature?: number;
  parallelToolExecution?: boolean;
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
      model: 'gpt-5.6-sol',
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
      ? { id: idOrState, messages: options?.messages }
      : idOrState;
    if (!state.messages) {
      throw new Error('Resuming an agent session requires its exported message history.');
    }
    return new AgentSession(this, { id: state.id, messages: state.messages }, 'continue');
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

  /**
   * Runs the autonomous agent tool loop on a given user prompt.
   */
  public async run(
    userInput: string | ChatMessage[],
    options: AgentRunOptions = {}
  ): Promise<AgentExecutionResult> {
    const messages = this.initializeMessages(userInput);
    const identity = this.resolveRunIdentity(options);

    const toolMap = this.normalizeTools();
    const formattedTools = Array.from(toolMap.values()).map(t => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }));

    const toolCallsExecuted: AgentExecutionResult['toolCallsExecuted'] = [];
    let stepNumber = 0;
    const maxSteps = this.config.maxSteps ?? 10;
    if (!Number.isSafeInteger(maxSteps) || maxSteps < 1) throw new APIError('maxSteps must be a positive integer.', 400, 'invalid_agent_config');
    const seenCalls = new Set(messages.flatMap(m => (m.tool_calls ?? []).map((c: any) => c.id)));
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;

    while (stepNumber < maxSteps) {
      options.signal?.throwIfAborted();
      stepNumber++;

      const res: ChatCompletionResponse = await this.completions.create({
        model: this.config.model || 'gpt-5.6-sol',
        messages,
        temperature: this.config.temperature,
        tools: formattedTools.length > 0 ? formattedTools : undefined,
        tool_choice: formattedTools.length > 0 ? 'auto' : undefined,
        conversation_id: identity.conversationId,
        session_mode: stepNumber === 1 ? identity.sessionMode : (identity.conversationId ? 'continue' : 'stateless'),
        turn_id: stepNumber === 1
          ? identity.turnId
          : `${identity.turnId.slice(0, 52)}:s${stepNumber}`,
        user_message_id: identity.turnId,
        assistant_message_id: `${identity.turnId.slice(0, 52)}:a`,
      }, { signal: options.signal });

      if (res.usage) {
        totalPromptTokens += res.usage.prompt_tokens || 0;
        totalCompletionTokens += res.usage.completion_tokens || 0;
      }

      const choice = res.choices[0];
      const message = choice?.message;

      if (!message) {
        throw new APIError('Empty response received from model during agent execution', 500);
      }

      // Check for tool calls
      const toolCalls = message.tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        messages.push({
          role: 'assistant',
          content: message.content || '',
          ...({ tool_calls: toolCalls } as any)
        });

        this.config.onStep?.({ stepNumber, toolCalls, output: message.content || undefined });

        const prepared = prepareToolBatch(toolCalls, toolMap, seenCalls);
        const results = [];
        if (this.config.parallelToolExecution !== false) {
          results.push(...await Promise.all(prepared.map(t => executeTool(t, options.signal))));
        } else {
          for (const t of prepared) results.push(await executeTool(t, options.signal));
        }

        for (const r of results) {
          toolCallsExecuted.push({
            toolName: r.fnName,
            toolCallId: r.tc.id,
            arguments: r.parsedArgs,
            result: r.toolResult
          });

          // Conforms to standard LLM protocol: role: 'tool', tool_call_id: id
          messages.push({
            role: 'tool' as any,
            tool_call_id: r.tc.id,
            content: typeof r.toolResult === 'string' ? r.toolResult : JSON.stringify(r.toolResult),
            name: r.fnName
          } as any);
        }

        // Continue next loop turn with tool outputs attached
        continue;
      }

      // Final answer reached
      const finalContent = message.content || '';
      messages.push({ role: 'assistant', content: finalContent });

      this.config.onStep?.({ stepNumber, output: finalContent });

      return {
        conversationId: identity.conversationId,
        turnId: identity.turnId,
        text: finalContent,
        stepsCount: stepNumber,
        toolCallsExecuted,
        finalMessage: { role: 'assistant', content: finalContent },
        messages,
        usage: {
          promptTokens: totalPromptTokens,
          completionTokens: totalCompletionTokens,
          totalTokens: totalPromptTokens + totalCompletionTokens
        }
      };
    }

    throw new APIError(`Agent exceeded maximum execution steps (${maxSteps}) without reaching a final answer`, 400, 'max_steps_exceeded');
  }

  /**
   * Runs the autonomous agent and yields real-time streaming events (tokens, tool calls, and results).
   */
  public async *stream(
    userInput: string | ChatMessage[],
    options: AgentRunOptions = {}
  ): AsyncIterable<AgentStreamEvent> {
    const messages = this.initializeMessages(userInput);
    const identity = this.resolveRunIdentity(options);

    const toolMap = this.normalizeTools();
    const formattedTools = Array.from(toolMap.values()).map(t => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }));

    const toolCallsExecuted: AgentExecutionResult['toolCallsExecuted'] = [];
    let stepNumber = 0;
    const maxSteps = this.config.maxSteps ?? 10;
    if (!Number.isSafeInteger(maxSteps) || maxSteps < 1) throw new APIError('maxSteps must be a positive integer.', 400, 'invalid_agent_config');
    const seenCalls = new Set(messages.flatMap(m => (m.tool_calls ?? []).map((c: any) => c.id)));
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;

    while (stepNumber < maxSteps) {
      options.signal?.throwIfAborted();
      stepNumber++;

      const stream = this.completions.stream({
        model: this.config.model || 'gpt-5.6-sol',
        messages,
        temperature: this.config.temperature,
        tools: formattedTools.length > 0 ? formattedTools : undefined,
        tool_choice: formattedTools.length > 0 ? 'auto' : undefined,
        conversation_id: identity.conversationId,
        session_mode: stepNumber === 1 ? identity.sessionMode : (identity.conversationId ? 'continue' : 'stateless'),
        turn_id: stepNumber === 1
          ? identity.turnId
          : `${identity.turnId.slice(0, 52)}:s${stepNumber}`,
        user_message_id: identity.turnId,
        assistant_message_id: `${identity.turnId.slice(0, 52)}:a`,
      }, { signal: options.signal });

      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) {
          yield { type: 'token', content: delta };
        }
      }

      const res = await stream.finalChatCompletion();

      if (res.usage) {
        totalPromptTokens += res.usage.prompt_tokens || 0;
        totalCompletionTokens += res.usage.completion_tokens || 0;
      }

      const choice = res.choices[0];
      const message = choice?.message;

      if (!message) {
        throw new APIError('Empty response received from model during agent streaming', 500);
      }

      const toolCalls = message.tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        messages.push({
          role: 'assistant',
          content: message.content || '',
          ...({ tool_calls: toolCalls } as any)
        });

        const prepared = prepareToolBatch(toolCalls, toolMap, seenCalls);
        this.config.onStep?.({ stepNumber, toolCalls, output: message.content || undefined });
        for (const t of prepared) yield { type: 'tool_call', toolName: t.fnName, toolCallId: t.tc.id, arguments: t.parsedArgs };
        const results = [];
        if (this.config.parallelToolExecution !== false) {
          results.push(...await Promise.all(prepared.map(t => executeTool(t, options.signal))));
        } else {
          for (const t of prepared) results.push(await executeTool(t, options.signal));
        }
        for (const r of results) {
          yield { type: 'tool_result', toolName: r.fnName, toolCallId: r.tc.id, result: r.toolResult };
          toolCallsExecuted.push({ toolName: r.fnName, toolCallId: r.tc.id, arguments: r.parsedArgs, result: r.toolResult });
          messages.push({ role: 'tool', tool_call_id: r.tc.id, name: r.fnName,
            content: typeof r.toolResult === 'string' ? r.toolResult : JSON.stringify(r.toolResult) } as any);
        }

        yield { type: 'step', stepNumber };
        continue;
      }

      const finalContent = message.content || '';
      messages.push({ role: 'assistant', content: finalContent });

      yield {
        type: 'finish',
        result: {
          conversationId: identity.conversationId,
          turnId: identity.turnId,
          text: finalContent,
          stepsCount: stepNumber,
          toolCallsExecuted,
          finalMessage: { role: 'assistant', content: finalContent },
          messages,
          usage: {
            promptTokens: totalPromptTokens,
            completionTokens: totalCompletionTokens,
            totalTokens: totalPromptTokens + totalCompletionTokens
          }
        }
      };

      return;
    }

    throw new APIError(`Agent exceeded maximum execution steps (${maxSteps}) without reaching a final answer`, 400, 'max_steps_exceeded');
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
    mode: Extract<ChatSessionMode, 'new' | 'continue'>
  ) {
    this.id = options.id;
    this.messages = [...(options.messages || [])];
    this.nextMode = mode;
  }

  public get sessionId(): string {
    return this.id;
  }

  public getHistory(): ChatMessage[] {
    return [...this.messages];
  }

  private appendInput(input: string | ChatMessage[]): ChatMessage[] {
    return typeof input === 'string'
      ? [...this.messages, { role: 'user', content: input }]
      : [...this.messages, ...input];
  }

  public async run(input: string | ChatMessage[]): Promise<AgentExecutionResult> {
    if (this.activeTurn) throw new Error(`Agent session ${this.id} already has an active turn.`);
    this.activeTurn = true;
    try {
      const result = await this.runtime.run(this.appendInput(input), {
        conversationId: this.id,
        sessionMode: this.nextMode,
      });
      this.messages = [...result.messages];
      this.nextMode = 'continue';
      return result;
    } finally {
      this.activeTurn = false;
    }
  }

  public async *stream(input: string | ChatMessage[]): AsyncIterable<AgentStreamEvent> {
    if (this.activeTurn) throw new Error(`Agent session ${this.id} already has an active turn.`);
    this.activeTurn = true;
    try {
      for await (const event of this.runtime.stream(this.appendInput(input), {
        conversationId: this.id,
        sessionMode: this.nextMode,
      })) {
        if (event.type === 'finish') {
          this.messages = [...event.result.messages];
          this.nextMode = 'continue';
        }
        yield event;
      }
    } finally {
      this.activeTurn = false;
    }
  }

  public export(): AgentSessionState {
    return { id: this.id, messages: [...this.messages] };
  }

  /** Clears context by rotating identity; old durable history cannot bleed back in. */
  public clear(): this {
    if (this.activeTurn) throw new Error(`Cannot clear agent session ${this.id} during an active turn.`);
    this.id = createChatResourceId('agent');
    this.messages = [];
    this.nextMode = 'new';
    return this;
  }
}
