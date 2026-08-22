/**
 * GALXAI Developer SDK: Autonomous Agent Runtime & Tool Calling Loop
 * Automatically executes local functions, captures outputs, and loops until final synthesis.
 */

import type { ChatMessage, ChatCompletionResponse } from '../core/contracts/GalxContracts';
import type { CompletionsResource } from './resources/chat';
import { APIError } from './errors';

export interface AgentToolDefinition<TParams = any, TResult = any> {
  description: string;
  parameters: {
    type?: 'object';
    properties?: Record<string, any>;
    required?: string[];
    [key: string]: any;
  };
  execute: (params: TParams) => Promise<TResult> | TResult;
}

export interface AgentConfig {
  model?: string;
  systemPrompt?: string;
  tools?: Record<string, AgentToolDefinition>;
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

    const toolsConfig = this.config.tools || {};
    const formattedTools = Object.entries(toolsConfig).map(([name, def]) => ({
      type: 'function' as const,
      function: {
        name,
        description: def.description,
        parameters: {
          type: 'object',
          properties: def.parameters.properties || {},
          required: def.parameters.required || []
        }
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
        // Append assistant message with tool calls
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
            parsedArgs = JSON.parse(fnArgsStr);
          } catch {}

          const toolDef = toolsConfig[fnName];
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

          // Append tool result message
          messages.push({
            role: 'developer', // or tool in OpenAI specs
            content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
            name: fnName
          });
        }

        // Loop continues to let model process tool outputs
        continue;
      }

      // No more tool calls; final answer reached
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
