/**
 * GALXAI: Drop-in OpenAI SDK Compatibility Shim
 *
 * Allows existing codebases using `import OpenAI from "openai"` to replace the import with:
 * `import OpenAI from "@galxai/sdk/openai"`
 * with zero code changes, automatic wholesale rates, sub-15ms edge routing, and alias resolution.
 */

import { GalxAI } from './client';
import type { ClientOptions } from './types';

export class OpenAI extends GalxAI {
  constructor(options?: ClientOptions | string) {
    super(options);
  }
}

export default OpenAI;
