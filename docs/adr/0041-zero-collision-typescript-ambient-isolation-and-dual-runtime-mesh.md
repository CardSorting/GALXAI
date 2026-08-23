# ADR 0041: Zero-Collision TypeScript Ambient Isolation & Dual-Engine Runtime Mesh

## Status
**Accepted & Implemented**

## Context
GALXAI operates as a dual-engine architecture:
1. **Next.js 15 App Router Frontend & Serverless Gateway**: Executes in standard Node.js / Serverless runtimes requiring TypeScript `DOM` and `@types/node` global definitions (`Request`, `Response`, `WebSocket`, `EventTarget`, `DOMException`).
2. **Cloudflare Workers Edge Gateway Mesh**: Executes in Cloudflare V8 isolates utilizing custom bindings (`KVNamespace`, `R2Bucket`, `DurableObjectNamespace`, `Hyperdrive`).

Running uncurated `wrangler types` dumped over 15,000 lines into `worker-configuration.d.ts` that globally redeclared standard Web API interfaces. This caused severe global identifier collisions with TypeScript's standard `DOM` library across the Next.js workspace, breaking TypeScript compiler checks (`npx tsc --noEmit`) and IDE language servers.

## Decision

1. **Scoped Dynamic Import Typing**:
   - Replaced bloated uncurated global ambient declarations in `worker-configuration.d.ts` with clean, scoped type references using TypeScript's dynamic import type syntax:
     ```typescript
     type CloudflareKVNamespace = import('@cloudflare/workers-types').KVNamespace;
     type CloudflareR2Bucket = import('@cloudflare/workers-types').R2Bucket;
     type CloudflareDurableObjectNamespace = import('@cloudflare/workers-types').DurableObjectNamespace;

     interface Env {
       ENVIRONMENT: "staging" | "production";
       SUPABASE_URL: string;
       PUBLIC_ASSETS_URL: string;
       NEXT_PUBLIC_SUPABASE_URL: string;
       NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
       NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
       SUPABASE_SERVICE_ROLE_KEY?: string;
       GALX_VAULT_MASTER_SECRET?: string;
       OPENAI_API_KEY?: string;
       XAI_API_KEY?: string;
       HYPERDRIVE?: {
         connectionString: string;
       };
       RATE_LIMIT_KV?: CloudflareKVNamespace;
       EDGE_CACHE?: CloudflareKVNamespace;
       ASSET_BUCKET?: CloudflareR2Bucket;
       SWARM_COORDINATOR?: CloudflareDurableObjectNamespace;
     }

     type __BaseEnv_Env = Env;
     ```

2. **Dual-Runtime Boundary Enforcement**:
   - Next.js App Router code (`src/app/`, `src/lib/`, `src/components/`) adheres strictly to standard Web / Node.js types.
   - Cloudflare Worker code (`src/workers/cloudflare/`) accesses Cloudflare bindings strictly through the typed `Env` / `CloudflareEnv` interface without requiring global ambient namespace pollution.

## Consequences

### Positive
- **Zero TypeScript Compilation Errors**: `npx tsc --noEmit` completes cleanly with 0 errors across the entire codebase.
- **IDE Language Server Stability**: VSCode / Antigravity IDE language servers resolve all types without conflicting symbol errors.
- **Strict Cloudflare Binding Typing**: Cloudflare bindings (`KVNamespace`, `R2Bucket`, `DurableObjectNamespace`) remain strongly typed without polluting the Node.js / DOM global scope.

### Neutral / Trade-offs
- Future Cloudflare binding additions to `wrangler.toml` must be reflected in `worker-configuration.d.ts` without running raw unrestricted `wrangler types` overwrites.
