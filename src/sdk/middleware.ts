/**
 * GALXAI Developer SDK: Middleware Pipeline & Plugin Substrate
 * Interceptors for request/response tracing, live cost budgeting, semantic LRU caching,
 * and client-side zero-code Privacy Shield (HIPAA / GDPR / ZDR).
 */

import { GalxPIIRedactor } from '../core/privacy/GalxPIIRedactor';
import type { PrivacyProfileType } from '../core/contracts/GalxContracts';

export interface MiddlewareRequestContext {
  path: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  timestampMs: number;
}

export interface MiddlewareResponseContext {
  path: string;
  method: string;
  statusCode: number;
  durationMs: number;
  data?: any;
  headers?: Headers | Record<string, string>;
  requestBody?: any;
}

export interface MiddlewareErrorContext {
  path: string;
  method: string;
  error: Error;
  durationMs: number;
}

export interface GalxPlugin {
  name?: string;
  onRequest?: (ctx: MiddlewareRequestContext) => Promise<void | { shortCircuitResponse?: any }> | void | { shortCircuitResponse?: any };
  onResponse?: (ctx: MiddlewareResponseContext) => Promise<void> | void;
  onError?: (ctx: MiddlewareErrorContext) => Promise<void> | void;
}

export class MiddlewarePipeline {
  private readonly plugins: GalxPlugin[] = [];

  public use(plugin: GalxPlugin): this {
    this.plugins.push(plugin);
    return this;
  }

  public async executeOnRequest(ctx: MiddlewareRequestContext): Promise<{ shortCircuitResponse?: any } | undefined> {
    for (const plugin of this.plugins) {
      if (plugin.onRequest) {
        const res = await plugin.onRequest(ctx);
        if (res && res.shortCircuitResponse !== undefined) {
          return res;
        }
      }
    }
    return undefined;
  }

  public async executeOnResponse(ctx: MiddlewareResponseContext): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.onResponse) {
        await plugin.onResponse(ctx);
      }
    }
  }

  public async executeOnError(ctx: MiddlewareErrorContext): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.onError) {
        await plugin.onError(ctx);
      }
    }
  }
}

/**
 * Built-in Plugin: Real-Time Token & Dollar Budget Tracker
 */
export function createCostTrackerPlugin(options: {
  maxBudgetUsd?: number;
  onBudgetExceeded?: (totalUsd: number) => void;
  onUsageUpdate?: (stats: { totalRequests: number; totalTokens: number; totalCostUsd: number }) => void;
} = {}): GalxPlugin {
  let totalRequests = 0;
  let totalTokens = 0;
  let totalCostUsd = 0;

  return {
    name: 'CostTrackerPlugin',
    onResponse: (ctx) => {
      totalRequests++;
      const usage = ctx.data?.usage;
      if (usage) {
        const promptTokens = usage.prompt_tokens || 0;
        const completionTokens = usage.completion_tokens || 0;
        const reqTokens = promptTokens + completionTokens;
        totalTokens += reqTokens;

        // Blended wholesale pricing ($0.0025/1k input, $0.01/1k output)
        const cost = (promptTokens * 0.0025 + completionTokens * 0.01) / 1000;
        totalCostUsd += cost;

        options.onUsageUpdate?.({
          totalRequests,
          totalTokens,
          totalCostUsd: Number(totalCostUsd.toFixed(6))
        });

        if (options.maxBudgetUsd && totalCostUsd >= options.maxBudgetUsd) {
          options.onBudgetExceeded?.(totalCostUsd);
        }
      }
    }
  };
}

/**
 * Built-in Plugin: In-Memory Client-Side LRU Response Caching
 */
export function createLRUCachePlugin(options: {
  maxEntries?: number;
  ttlMs?: number;
} = {}): GalxPlugin {
  const maxEntries = options.maxEntries ?? 200;
  const ttlMs = options.ttlMs ?? 60000; // 1 minute default
  const cache = new Map<string, { data: any; expiresAt: number }>();

  const getCacheKey = (method: string, path: string, body: any) => {
    if (method !== 'POST' && method !== 'GET') return null;
    return `${method}:${path}:${JSON.stringify(body || {})}`;
  };

  return {
    name: 'LRUCachePlugin',
    onRequest: (ctx) => {
      const key = getCacheKey(ctx.method, ctx.path, ctx.body);
      if (!key) return;

      const cached = cache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        return { shortCircuitResponse: cached.data };
      }
      if (cached && cached.expiresAt <= Date.now()) {
        cache.delete(key);
      }
    },
    onResponse: (ctx) => {
      if (ctx.statusCode !== 200) return;
      const key = getCacheKey(ctx.method, ctx.path, ctx.requestBody);
      if (!key) return;

      if (cache.size >= maxEntries) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey) cache.delete(oldestKey);
      }
      cache.set(key, {
        data: ctx.data,
        expiresAt: Date.now() + ttlMs
      });
    }
  };
}

/**
 * Built-in Plugin: Client-Side Zero-Code Privacy Shield (Apex Tier)
 * Transparently de-identifies prompt messages locally before dispatching upstream,
 * and seamlessly rehydrates synthetic tokens in responses for authorized developers.
 */
export function createPrivacyShieldPlugin(options: {
  profile?: PrivacyProfileType;
  autoRedact?: boolean;
  autoRehydrate?: boolean;
  deidentifyPhi?: boolean;
  piiMasking?: boolean;
  onRedaction?: (summary: { originalLength: number; sanitizedLength: number; entitiesCount: number }) => void;
} = {}): GalxPlugin {
  const profile = options.profile || 'hipaa_strict';
  const autoRedact = options.autoRedact ?? true;
  const autoRehydrate = options.autoRehydrate ?? true;
  const redactor = GalxPIIRedactor.getInstance();
  const tokenMapRegistry = new Map<string, Record<string, string>>();

  return {
    name: 'PrivacyShieldPlugin',
    onRequest: (ctx) => {
      ctx.headers['X-Galx-Privacy-Profile'] = profile;
      ctx.headers['Sec-GPC'] = '1';
      ctx.headers['X-Galx-ZDR-Required'] = 'true';

      if (autoRedact && ctx.body?.messages && Array.isArray(ctx.body.messages)) {
        const conv = redactor.redactConversationMessages(ctx.body.messages, {
          hipaa: options.deidentifyPhi ?? true,
          gdpr: options.piiMasking ?? true,
          financial: true,
          international: true,
          reversible: autoRehydrate
        });

        if (conv.tokenMap && Object.keys(conv.tokenMap).length > 0) {
          const reqKey = `${ctx.path}:${ctx.timestampMs}`;
          tokenMapRegistry.set(reqKey, conv.tokenMap);
        }

        options.onRedaction?.({
          originalLength: JSON.stringify(ctx.body.messages).length,
          sanitizedLength: JSON.stringify(conv.sanitizedMessages).length,
          entitiesCount: conv.entitiesDetected.length
        });

        ctx.body.messages = conv.sanitizedMessages;
      }
    },
    onResponse: (ctx) => {
      if (!autoRehydrate || !ctx.data) return;
      let mapToUse: Record<string, string> | undefined;
      for (const [key, map] of tokenMapRegistry.entries()) {
        if (key.startsWith(ctx.path)) {
          mapToUse = map;
          tokenMapRegistry.delete(key);
          break;
        }
      }

      if (mapToUse && ctx.data.choices && Array.isArray(ctx.data.choices)) {
        for (const choice of ctx.data.choices) {
          if (choice.message?.content && typeof choice.message.content === 'string') {
            choice.message.content = redactor.rehydrateText(choice.message.content, mapToUse);
          }
        }
        redactor.zeroizeTokenMap(mapToUse);
      }
    }
  };
}

/**
 * Built-in Plugin: Automatic Model Fallback / Degradation Grace
 */
export function createFallbackModelPlugin(options: {
  fallbackModel?: string;
  onFallbackTriggered?: (originalModel: string, fallbackModel: string, error: Error) => void;
} = {}): GalxPlugin {
  const fallback = options.fallbackModel || 'gpt-5.6-luna';

  return {
    name: 'FallbackModelPlugin',
    onRequest: (ctx) => {
      // Injects fallback header into gateway
      ctx.headers['X-Galx-Fallback-Model'] = fallback;
    },
    onError: (ctx) => {
      if (ctx.error && (ctx.error as any).statusCode >= 500) {
        options.onFallbackTriggered?.('primary', fallback, ctx.error);
      }
    }
  };
}

/**
 * Built-in Plugin: Zero-Friction Tracing & Logging Interceptor
 */
export function createLoggingPlugin(options: {
  verbose?: boolean;
  logger?: (msg: string, meta?: any) => void;
} = {}): GalxPlugin {
  const log = options.logger || ((msg, meta) => console.log(`[GALXAI Plugin] ${msg}`, meta || ''));

  return {
    name: 'LoggingPlugin',
    onRequest: (ctx) => {
      if (options.verbose) {
        log(`--> ${ctx.method} ${ctx.path}`, { timestamp: ctx.timestampMs });
      }
    },
    onResponse: (ctx) => {
      log(`<-- ${ctx.statusCode} ${ctx.path} (${ctx.durationMs}ms)`);
    },
    onError: (ctx) => {
      log(`<!- ERROR ${ctx.path}: ${ctx.error.message} (${ctx.durationMs}ms)`);
    }
  };
}
