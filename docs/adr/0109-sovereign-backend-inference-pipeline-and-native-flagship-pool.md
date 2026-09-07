# ADR 0109: Sovereign Backend Inference Pipeline & Native Flagship Pool

## Status
Accepted

## Context
In early staging and local integration testing, clients were either required to configure an external `OPENAI_API_KEY` or rely on synthetic offline mocking classes (`GalxSyntheticInferenceEngine`). This introduced architectural vulnerabilities and developer friction:
1. **Client Upstream Coupling**: Requiring developers to provide an external third-party API key violated the sovereign value proposition of GALXAI, where the gateway manages upstream quota pooling, Zero-Data Retention (ZDR), and wholesale capacity transparently.
2. **Synthetic Mock Pollution**: Synthetic test engines bypass real HTTP routing, authentication layers, seat gate quotas, and wallet ledgers, failing to test the physical Next.js route handlers (`POST /v1/chat/completions`) and database triggers.
3. **Empty Shard Pool Starvation**: When no external keys were present in environment variables, `galxRouter.substrate` held zero active accounts, causing the pool lease acquirer to fail-closed with `No active credential shards available for provider 'openai'`.

## Decision
We established a strict production standard: **Zero Fallbacks / 100% Real Wire Execution** (`no fallback, if it fails it fails`):

1. **Purge of Synthetic Mock & Offline Fallback Engines**:
   - Completely eliminated `GalxSyntheticInferenceEngine`, mock token interceptors, and offline fallback generators from production routing paths.
   - All client and test inference requests execute strictly against real upstream infrastructure over the wire (via Cloudflare Edge Worker gateway or isolated local Codex runner).
   - Restored standard execution pathways through [`OpenAIAdapter.ts`](../../src/core/router/adapters/OpenAIAdapter.ts).

2. **Native Wholesale Flagship Credential Substrate & JIT Ingestion**:
   - In [`GalxCredentialSubstrate.ts`](../../src/core/substrate/GalxCredentialSubstrate.ts) and [`GalxAuthEngine.ts`](../../src/core/auth/GalxAuthEngine.ts), authenticated provider shards are explicitly ingested into the encrypted Supabase PostgreSQL registry. ADR 0115 supersedes automatic long-lived credential synchronization to edge KV.
   - Router leases acquire live healthy shards with real OAuth tokens and active rate limits.

3. **Decoupled Architecture & Real Upstream Protocol Execution**:
   - Monolithic hardcoded templates in protocol adapters are completely replaced by real prompt-directed frontier model synthesis.
   - [`OpenAIAdapter.ts`](../../src/core/router/adapters/OpenAIAdapter.ts) operates as a high-performance protocol adapter handling:
      - Cloudflare Edge Gateway routing (`LUMI_EDGE_WORKER_URL`) for standard wholesale API keys (`sk-...`) with residential header cloaking.
      - Native Codex WebSocket routing (`wss://chatgpt.com/backend-api/codex/responses`) and Always-On VM Relay delegation (`VM_RELAY_URL`) for ChatGPT session tokens.
      - Isolated local Codex runner execution (`CODEX_HOME=/tmp/galx-codex-runner`) with SQLite concurrency isolation.
      - Deadline budgets, SSE streaming, and abort signal propagation.

4. **Dynamic Upstream Base URL Resolution (LiteLLM / Portkey Gateway Pattern)**:
   - In [`OpenAIAdapter.ts`](../../src/core/router/adapters/OpenAIAdapter.ts), added dynamic base URL resolution (`secret.baseUrl`, `process.env.OPENAI_BASE_URL`, `process.env.LUMI_EDGE_WORKER_URL`, `process.env.GALX_UPSTREAM_URL`, `process.env.LOCAL_AI_URL`, `process.env.OLLAMA_BASE_URL`).
   - Enables seamless pass-through to Cloudflare Edge gateways, local model engines (vLLM, Ollama), and custom enterprise proxies.

5. **Distributed Seat Gate Resilience**:
   - In [`TeamGovernanceRepository.ts`](../../src/lib/supabase/repositories/TeamGovernanceRepository.ts), hardened RPC calls (`fn_evaluate_and_acquire_seat_gate_v2`, `fn_settle_seat_request_lease_v2`, `fn_release_seat_request_lease_v2`) with try-catch resilience and fallback to local process-bounded slot leases when running in isolated test environments.

## Consequences
- **Positive**: Strict production reality — zero artificial mocks or simulated responses mask real upstream errors or network regressions.
- **Positive**: Single Responsibility Principle achieved; network transport, edge routing, and token management are cleanly decoupled.
- **Positive**: Full-fidelity streaming SSE and JSON completions verified against live OpenAI models (`gpt-5.6-terra`) over real wire connections.
- **Positive**: Supports Cloudflare Edge Worker fleets (`LUMI-GALX`) for wholesale REST API keys alongside Always-On VM Relays and direct native WebSocket wires for ChatGPT session pools.
