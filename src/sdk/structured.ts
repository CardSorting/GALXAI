/**
 * GALXAI Developer SDK: Structured Outputs & JSON Schema Validation
 * Enforces strict type-safe JSON extraction matching OpenAI Structured Outputs / Instructor ergonomics.
 * Supports Zod schemas, JSON Schemas, flat dictionaries, and resilient automatic JSON repair.
 */

import type { ChatMessage } from '../core/contracts/GalxContracts';
import type { CompletionsResource } from './resources/chat';
import type { RequestOptions } from './types';
import { APIError, UnprocessableEntityError } from './errors';
import { safeParseJSON } from './json-repair';

export interface JSONSchemaDefinition {
  type?: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: Record<string, any>;
  required?: string[];
  items?: any;
  enum?: any[];
  additionalProperties?: boolean;
  description?: string;
  [key: string]: any;
}

export interface StructuredChatParams<T = any> {
  model?: string;
  messages: ChatMessage[];
  schema: JSONSchemaDefinition | any;
  schemaName?: string;
  temperature?: number;
  maxTokens?: number;
  validator?: (data: any) => data is T;
}

/**
 * Converts a Zod schema object into a compliant JSON Schema definition without external dependencies.
 */
export function zodToJsonSchema(zodSchema: any): JSONSchemaDefinition {
  if (!zodSchema || typeof zodSchema !== 'object') {
    return { type: 'object', properties: {} };
  }

  // If already standard JSON schema
  if (zodSchema.type && typeof zodSchema.type === 'string') {
    return zodSchema;
  }

  const def = zodSchema._def;
  if (!def) {
    return { type: 'object', properties: {} };
  }

  const typeName = def.typeName || def.name;

  switch (typeName) {
    case 'ZodString':
      return { type: 'string', description: def.description };
    case 'ZodNumber':
      return { type: 'number', description: def.description };
    case 'ZodBoolean':
      return { type: 'boolean', description: def.description };
    case 'ZodArray':
      return {
        type: 'array',
        items: zodToJsonSchema(def.type),
        description: def.description
      };
    case 'ZodEnum':
      return {
        type: 'string',
        enum: def.values,
        description: def.description
      };
    case 'ZodOptional':
    case 'ZodNullable':
      return zodToJsonSchema(def.innerType);
    case 'ZodDefault':
      return zodToJsonSchema(def.innerType);
    case 'ZodRecord':
      return { type: 'object', additionalProperties: true, description: def.description };
    case 'ZodLiteral':
      return { type: typeof def.value as any, const: def.value, description: def.description };
    case 'ZodObject': {
      const shape = typeof def.shape === 'function' ? def.shape() : def.shape || {};
      const properties: Record<string, any> = {};
      const required: string[] = [];

      for (const [key, fieldSchema] of Object.entries<any>(shape)) {
        properties[key] = zodToJsonSchema(fieldSchema);
        const innerTypeName = fieldSchema?._def?.typeName;
        if (innerTypeName !== 'ZodOptional' && innerTypeName !== 'ZodNullable') {
          required.push(key);
        }
      }

      return {
        type: 'object',
        properties,
        required,
        additionalProperties: false,
        description: def.description
      };
    }
    default:
      return { type: 'object', properties: {} };
  }
}

/**
 * Creates an OpenAI SDK compatible response_format configuration for Zod schemas.
 *
 * @example
 * ```ts
 * const format = zodResponseFormat(UserSchema, 'user_profile');
 * ```
 */
export function zodResponseFormat(schema: any, name = 'structured_output') {
  const jsonSchema = zodToJsonSchema(schema);
  return {
    type: 'json_schema' as const,
    json_schema: {
      name,
      strict: true,
      schema: {
        ...jsonSchema,
        additionalProperties: false
      }
    },
    $zodSchema: schema
  };
}

export class StructuredOutputExtractor {
  private readonly completions: CompletionsResource;

  constructor(completions: CompletionsResource) {
    this.completions = completions;
  }

  /**
   * Generates and parses a structured JSON output validated against a JSON Schema or Zod Schema.
   * Absorbs Zod schemas, flat dictionaries, example objects, and standard JSON schemas.
   */
  public async extract<T = any>(params: StructuredChatParams<T>, options?: RequestOptions): Promise<T> {
    const schemaName = params.schemaName || 'structured_response';
    const rawSchema = params.schema;

    // Check if passed a Zod schema
    const isZod = rawSchema && (rawSchema._def !== undefined || typeof rawSchema.safeParse === 'function');
    let normalizedSchema: any;

    if (isZod) {
      normalizedSchema = zodToJsonSchema(rawSchema);
    } else if (rawSchema.type) {
      normalizedSchema = rawSchema;
    } else if (rawSchema.properties) {
      normalizedSchema = { type: 'object', ...rawSchema };
    } else {
      // Convert flat field dictionary { name: 'string', age: 'number' }
      const properties: Record<string, any> = {};
      const required: string[] = [];
      for (const [key, val] of Object.entries(rawSchema)) {
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
    }, options);

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
      throw new APIError('Model did not return content in structured output mode', 500, 'empty_structured_response');
    }

    let parsed: any;
    try {
      parsed = safeParseJSON(rawContent);
    } catch (err: any) {
      throw new APIError(`Failed to parse structured JSON from model: ${err.message}. Content was: ${rawContent}`, 500, 'invalid_json_format');
    }

    // If Zod schema provided, run runtime parsing
    if (isZod && typeof rawSchema.safeParse === 'function') {
      const zodResult = rawSchema.safeParse(parsed);
      if (!zodResult.success) {
        throw new UnprocessableEntityError(
          `Extracted output failed Zod schema validation: ${zodResult.error.message}`,
          undefined,
          'Ensure the model output satisfies all field types and constraints'
        );
      }
      return zodResult.data as T;
    }

    if (params.validator && !params.validator(parsed)) {
      throw new UnprocessableEntityError('Extracted JSON failed custom validator predicate', undefined, 'Review validator criteria');
    }

    return parsed as T;
  }
}
