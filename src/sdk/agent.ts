/**
 * GALXAI Developer SDK: Autonomous Agent Runtime & Universal Tool Calling Loop
 * Automatically executes local functions, captures outputs, and loops until final synthesis.
 * Absorbs all tool formats: pure function maps, OpenAI tool arrays, Anthropic tool arrays, and LangChain tools.
 */

import type { ChatMessage, ChatCompletionResponse } from '../core/contracts/GalxContracts';
import type { CompletionsResource } from './resources/chat';
import { APIError } from './errors';

export interface AgentToolDefinition<TParams = any, TResult = any> {
  description?: string;
  parameters?: {
    type?: 'object';
    properties?: Record<string, any>;
    required?: string[];
    [key: string]: any;
  };
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
        execute?: (params: any) => Promise<any> | any;
      };
    };

export interface AgentConfig {
  model?: string;
  systemPrompt?: string;
  tools?: Record<string, ForgivingToolInput> | Array<ForgivingToolInput & { name?: string }>;
  maxSteps?: number;
  temperature?: number;
  onStep?: (step: { stepNumber: number; toolCalls?: any[]; output?: string }) => void;
}

export interface AgentExecutionResult {
  text: string;
  stepsCount: number;
  toolCallsExecuted: Array<{
    toolName: string;
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

interface NormalizedTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
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
      ...config
    };
  }

  /**
   * Normalizes any tool input into standard executable tools.
   */
  private normalizeTools(): Map<string, NormalizedTool> {
    const registry = new Map<string, NormalizedTool>();
    const rawTools = this.config.tools;

    if (!rawTools) return registry;

    // If passed as array
    if (Array.isArray(rawTools)) {
      for (const item of rawTools) {
        if (!item) continue;
        if (typeof item === 'object' && 'type' in item && item.type === 'function' && item.function) {
          const fn = item.function;
          registry.set(fn.name, {
            name: fn.name,
            description: fn.description || `Execute ${fn.name}`,
            parameters: fn.parameters || { type: 'object', properties: {}, required: [] },
            execute: fn.execute || (async () => ({ success: true }))
          });
        } else if (typeof item === 'object') {
          const name = (item as any).name || 'custom_tool';
          const description = (item as any).description || `Tool ${name}`;
          const parameters = (item as any).parameters || (item as any).input_schema || { type: 'object', properties: {}, required: [] };
          const execute = (item as any).execute || (item as any).call || (item as any).run || (async () => ({ success: true }));
          registry.set(name, {
            name,
            description,
            parameters: {
              type: 'object',
              properties: parameters.properties || {},
              required: parameters.required || []
            },
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
          registry.set(name, {
            name: fn.name || name,
            description: fn.description || `Execute tool ${name}`,
            parameters: fn.parameters || { type: 'object', properties: {}, required: [] },
            execute: fn.execute || (async () => ({ success: true }))
          });
        } else {
          const toolObj = def as AgentToolDefinition;
          const execute = toolObj.execute || toolObj.call || toolObj.run || (async () => ({ success: true }));
          const parameters = toolObj.parameters || toolObj.input_schema || { type: 'object', properties: {}, required: [] };
          registry.set(name, {
            name,
            description: toolObj.description || `Execute tool ${name}`,
            parameters: {
              type: 'object',
              properties: parameters.properties || {},
              required: parameters.required || []
            },
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

        for (const tc of toolCalls) {
          const fnName = tc.function?.name;
          const fnArgsStr = tc.function?.arguments || '{}';
          let parsedArgs = {};
          try {
            parsedArgs = typeof fnArgsStr === 'string' ? JSON.parse(fnArgsStr) : fnArgsStr;
          } catch {
            parsedArgs = { raw: fnArgsStr };
          }

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

          toolCallsExecuted.push({
            toolName: fnName,
            arguments: parsedArgs,
            result: toolResult
          });

          messages.push({
            role: 'developer',
            content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
            name: fnName
          });
        }

        // Continue loop to process tool outputs
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
}
