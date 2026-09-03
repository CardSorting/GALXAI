/**
 * GALXAI: Drop-in OpenAI SDK v4+ Compatibility Shim
 *
 * Allows existing codebases using `import OpenAI from "openai"` to replace the import with:
 * `import OpenAI from "galxai/openai"` or `import OpenAI from "@galxai/sdk/openai"`
 * with 100% API parity, zero code changes, automatic wholesale rates, sub-15ms edge routing, and alias resolution.
 */

import { GalxAI } from './client';
import type { ClientOptions, RequestOptions } from './types';
import type { ChatCompletionCreateParams, ModelInfo } from './types';
import type { ChatCompletionResponse, ChatCompletionChunk } from '../core/contracts/GalxContracts';
import { zodResponseFormat, zodToJsonSchema } from './structured';
import { safeParseJSON } from './json-repair';
import { ChatCompletionStream } from './stream';
import * as Errors from './errors';

export { zodResponseFormat, zodToJsonSchema } from './structured';
export * from './errors';

export class OpenAI extends GalxAI {
  public static readonly zodResponseFormat = zodResponseFormat;
  public static readonly APIError = Errors.APIError;
  public static readonly AuthenticationError = Errors.AuthenticationError;
  public static readonly RateLimitError = Errors.RateLimitError;
  public static readonly BadRequestError = Errors.BadRequestError;
  public static readonly NotFoundError = Errors.NotFoundError;
  public static readonly PermissionDeniedError = Errors.PermissionDeniedError;
  public static readonly InternalServerError = Errors.InternalServerError;

  public readonly beta: {
    chat: {
      completions: {
        parse: <T = any>(
          params: ChatCompletionCreateParams & { response_format?: any },
          options?: RequestOptions
        ) => Promise<ChatCompletionResponse & { parsed: T }>;
        stream: (
          params: Omit<ChatCompletionCreateParams, 'stream'>,
          options?: RequestOptions
        ) => ChatCompletionStream;
      };
    };
  };

  constructor(options?: ClientOptions | string) {
    super(options);

    const self = this;

    this.beta = {
      chat: {
        completions: {
          parse: async <T = any>(
            params: ChatCompletionCreateParams & { response_format?: any },
            options?: RequestOptions
          ) => {
            const rawFormat = params.response_format;
            let formatToSend = rawFormat;
            let zodSchema: any = null;

            if (rawFormat && rawFormat.$zodSchema) {
              zodSchema = rawFormat.$zodSchema;
            } else if (rawFormat && rawFormat.type === 'json_schema' && rawFormat.json_schema?.schema?._def) {
              zodSchema = rawFormat.json_schema.schema;
              formatToSend = zodResponseFormat(zodSchema, rawFormat.json_schema.name || 'structured_output');
            }

            const res = (await self.chat.completions.create(
              {
                ...params,
                response_format: formatToSend,
                stream: false
              },
              options
            )) as ChatCompletionResponse;

            const content = res.choices[0]?.message?.content || '{}';
            let parsed: any = safeParseJSON(content);

            if (zodSchema && typeof zodSchema.safeParse === 'function') {
              const validated = zodSchema.safeParse(parsed);
              if (validated.success) {
                parsed = validated.data;
              }
            }

            return Object.assign(res, { parsed: parsed as T });
          },

          stream: (params, options) => {
            return self.chat.completions.stream(params, options);
          }
        }
      }
    };
  }
}

export default OpenAI;
