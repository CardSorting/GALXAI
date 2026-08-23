/**
 * GALXAI: Drop-in Anthropic SDK Compatibility Shim
 *
 * Allows existing codebases using `import Anthropic from "@anthropic-ai/sdk"` to replace the import with:
 * `import Anthropic from "@galxai/sdk/anthropic"`
 * with zero code changes, automatic wholesale rates, and `/v1/messages` prompt caching.
 */

import { GalxAI } from './client';
import type { ClientOptions } from './types';

export interface AnthropicClientOptions extends ClientOptions {
  authToken?: string;
  defaultHeaders?: Record<string, string>;
}

export class Anthropic extends GalxAI {
  constructor(options?: AnthropicClientOptions | string) {
    if (typeof options === 'string') {
      super({ apiKey: options, baseURL: 'https://galx.ai' });
    } else {
      super({
        apiKey: options?.apiKey || options?.authToken,
        baseURL: options?.baseURL || options?.baseUrl || 'https://galx.ai',
        ...options
      });
    }
  }
}

export default Anthropic;
