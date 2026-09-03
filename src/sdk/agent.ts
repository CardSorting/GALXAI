/**
 * GALXAI Developer SDK: Autonomous Agent Runtime & Universal Tool Calling Loop
 * Automatically executes local functions, captures outputs, and loops until final synthesis.
 * Absorbs all tool formats: pure function maps, OpenAI tool arrays, Anthropic tool arrays, LangChain tools, and Zod schemas.
 * Full compliance with standard LLM tool calling protocols (role: 'tool', tool_call_id).
 */

import type { ChatMessage, ChatCompletionResponse } from '../core/contracts/GalxContracts';
import type { CompletionsResource } from './resources/chat';
import { APIError } from './errors';
import { safeParseJSON } from './json-repair';
import { zodToJsonSchema } from './structured';

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

export interface AgentConfig {
  model?: string;
  systemPrompt?: string;
  tools?: Record<string, ForgivingToolInput> | Array<ForgivingToolInput & { name?: string }>;
  maxSteps?: number;
  temperature?: number;
  parallelToolExecution?: boolean;
  onStep?: (step: { stepNumber: number; toolCalls?: any[]; output?: string }) => void;
}

export interface AgentExecutionResult {
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

export class AgentRuntime {
  private readonly completions: CompletionsResource;
  private readonly config: AgentConfig;

  constructor(completions: CompletionsResource, config: AgentConfig = {}) {
    this.completions = completions;
    this.config = {
      model: 'gpt-5.6-sol',
      maxSteps: 10,
      temperature: 0.2,
      parallelToolExecution: true,
      ...config
    };
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
            execute: fn.execute || (async () => ({ success: true }))
          });
        } else if (typeof item === 'object') {
          const name = (item as any).name || 'custom_tool';
          const description = (item as any).description || `Tool ${name}`;
          const { params, zodSchema } = resolveParameters(
            (item as any).parameters || (item as any).input_schema,
            (item as any).schema
          );
          const execute = (item as any).execute || (item as any).call || (item as any).run || (async () => ({ success: true }));
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
          registry.set(name, {
            name: fn.name || name,
            description: fn.description || `Execute tool ${name}`,
            parameters: params,
            zodSchema,
            execute: fn.execute || (async () => ({ success: true }))
          });
        } else {
          const toolObj = def as AgentToolDefinition;
          const execute = toolObj.execute || toolObj.call || toolObj.run || (async () => ({ success: true }));
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
  public async run(userInput: string | ChatMessage[]): Promise<AgentExecutionResult> {
    const messages: ChatMessage[] = [];

    if (this.config.systemPrompt) {
      messages.push({ role: 'system', content: this.config.systemPrompt });
    }

    if (typeof userInput === 'string') {
      messages.push({ role: 'user', content: userInput });
    } else {
      messages.push(...userInput);
    }

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
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;

    while (stepNumber < maxSteps) {
      stepNumber++;

      const res: ChatCompletionResponse = await this.completions.create({
        model: this.config.model || 'gpt-5.6-sol',
        messages,
        temperature: this.config.temperature,
        tools: formattedTools.length > 0 ? formattedTools : undefined,
        tool_choice: formattedTools.length > 0 ? 'auto' : undefined
      });

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

        // Execute tools (concurrently or sequentially based on parallelToolExecution config)
        const executeOneTool = async (tc: any) => {
          const fnName = tc.function?.name;
          const fnArgsStr = tc.function?.arguments || '{}';
          let parsedArgs: any = {};
          try {
            parsedArgs = typeof fnArgsStr === 'string' ? safeParseJSON(fnArgsStr) : fnArgsStr;
          } catch {
            parsedArgs = { raw: fnArgsStr };
          }

          const toolDef = toolMap.get(fnName);
          let toolResult: any;

          if (toolDef) {
            try {
              if (toolDef.zodSchema && typeof toolDef.zodSchema.safeParse === 'function') {
                const parsed = toolDef.zodSchema.safeParse(parsedArgs);
                if (parsed.success) {
                  parsedArgs = parsed.data;
                }
              }
              toolResult = await toolDef.execute(parsedArgs);
            } catch (err: any) {
              toolResult = { error: err.message || 'Tool execution failed' };
            }
          } else {
            toolResult = { error: `Tool '${fnName}' not found in agent registry` };
          }

          return {
            tc,
            fnName,
            parsedArgs,
            toolResult
          };
        };

        const results = this.config.parallelToolExecution !== false
          ? await Promise.all(toolCalls.map(executeOneTool))
          : [];

        if (this.config.parallelToolExecution === false) {
          for (const tc of toolCalls) {
            results.push(await executeOneTool(tc));
          }
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
  public async *stream(userInput: string | ChatMessage[]): AsyncIterable<AgentStreamEvent> {
    const messages: ChatMessage[] = [];

    if (this.config.systemPrompt) {
      messages.push({ role: 'system', content: this.config.systemPrompt });
    }

    if (typeof userInput === 'string') {
      messages.push({ role: 'user', content: userInput });
    } else {
      messages.push(...userInput);
    }

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
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;

    while (stepNumber < maxSteps) {
      stepNumber++;

      const stream = this.completions.stream({
        model: this.config.model || 'gpt-5.6-sol',
        messages,
        temperature: this.config.temperature,
        tools: formattedTools.length > 0 ? formattedTools : undefined,
        tool_choice: formattedTools.length > 0 ? 'auto' : undefined
      });

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

        for (const tc of toolCalls) {
          const fnName = tc.function?.name;
          const fnArgsStr = tc.function?.arguments || '{}';
          const parsedArgs = safeParseJSON(fnArgsStr);

          yield {
            type: 'tool_call',
            toolName: fnName,
            toolCallId: tc.id,
            arguments: parsedArgs
          };

          const toolDef = toolMap.get(fnName);
          let toolResult: any;

          if (toolDef) {
            try {
              toolResult = await toolDef.execute(parsedArgs);
            } catch (err: any) {
              toolResult = { error: err.message || 'Tool execution failed' };
            }
          } else {
            toolResult = { error: `Tool '${fnName}' not found in agent registry` };
          }

          yield {
            type: 'tool_result',
            toolName: fnName,
            toolCallId: tc.id,
            result: toolResult
          };

          toolCallsExecuted.push({
            toolName: fnName,
            toolCallId: tc.id,
            arguments: parsedArgs,
            result: toolResult
          });

          messages.push({
            role: 'tool' as any,
            tool_call_id: tc.id,
            content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
            name: fnName
          } as any);
        }

        yield { type: 'step', stepNumber };
        continue;
      }

      const finalContent = message.content || '';
      messages.push({ role: 'assistant', content: finalContent });

      yield {
        type: 'finish',
        result: {
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
