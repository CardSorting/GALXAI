/**
 * GALXAI Developer SDK: Structured Outputs & JSON Schema Validation
 * Enforces strict type-safe JSON extraction matching OpenAI Structured Outputs / Instructor ergonomics.
 */

import type { ChatMessage } from '../core/contracts/GalxContracts';
import type { CompletionsResource } from './resources/chat';
import { APIError } from './errors';

export interface JSONSchemaDefinition {
  type: 'object';
  properties: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
  [key: string]: any;
}

export interface StructuredChatParams<T = any> {
  model: string;
  messages: ChatMessage[];
  schema: JSONSchemaDefinition;
  schemaName?: string;
  temperature?: number;
  maxTokens?: number;
  validator?: (data: any) => data is T;
}

export class StructuredOutputExtractor {
  private readonly completions: CompletionsResource;

  constructor(completions: CompletionsResource) {
    this.completions = completions;
  }

  /**
   * Generates and parses a structured JSON output validated against a JSON Schema.
   * Absorbs flat dictionaries, example objects, and standard JSON schemas.
   */
  public async extract<T = any>(params: StructuredChatParams<T>): Promise<T> {
    const schemaName = params.schemaName || 'structured_response';

    // Normalize schema if provided as flat dictionary or loose definition
    let normalizedSchema: any = params.schema;
    if (!normalizedSchema.type) {
      if (normalizedSchema.properties) {
        normalizedSchema = { type: 'object', ...normalizedSchema };
      } else {
        // Convert flat field dictionary { name: 'string', age: 'number' } or { name: { type: 'string' } }
        const properties: Record<string, any> = {};
        const required: string[] = [];
        for (const [key, val] of Object.entries(normalizedSchema)) {
          required.push(key);
          if (typeof val === 'string') {
            properties[key] = { type: val === 'number' || val === 'int' ? 'number' : val === 'boolean' || val === 'bool' ? 'boolean' : 'string' };
          } else if (val && typeof val === 'object' && 'type' in val) {
            properties[key] = val;
          } else if (typeof val === 'number') {
            properties[key] = { type: 'number' };
          } else if (typeof val === 'boolean') {
            properties[key] = { type: 'boolean' };
          } else {
            properties[key] = { type: 'string' };
          }
        }
        normalizedSchema = {
          type: 'object',
          properties,
          required,
          additionalProperties: false
        };
      }
    }

    const response = await this.completions.create({
      model: params.model || 'gpt-5.6-sol',
      messages: params.messages,
      temperature: params.temperature ?? 0,
      max_tokens: params.maxTokens,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: schemaName,
          strict: true,
          schema: {
            ...normalizedSchema,
            additionalProperties: normalizedSchema.additionalProperties ?? false
          }
        }
      }
    });

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
      throw new APIError('Model did not return content in structured output mode', 500, 'empty_structured_response');
    }

    let parsed: any;
    try {
      const cleanContent = rawContent
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      parsed = JSON.parse(cleanContent);
    } catch (err: any) {
      throw new APIError(`Failed to parse structured JSON from model: ${err.message}. Content was: ${rawContent}`, 500, 'invalid_json_format');
    }

    if (params.validator && !params.validator(parsed)) {
      throw new APIError('Extracted JSON failed client-side schema validation predicate', 422, 'validation_failed', { parsed });
    }

    return parsed as T;
  }
}
