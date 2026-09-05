# ADR 0110: End-to-End Inference Verification Suite & Artifact Telemetry

## Status
Accepted (Phase 1.5 Edge Token Sync superseded by ADR 0115 & VM Relay Strategy)

## Context
Deploying enterprise inference gateways requires rigorous verification that cannot be satisfied by isolated unit tests alone. The entire inference pipeline spans multiple independent subsystems:
1. **Identity & Substrate**: Seeded developer accounts, workspace tenant bindings, and compute wallet balances.
2. **Cryptographic Gateway Keys**: Generation of SHA-256 checksum-verified API keys (`galx_live_...`) with dual persistence in BroccoliDB (L1 in-memory cache) and PostgreSQL (L2 durable storage).
3. **HTTP Transport & Streaming Protocols**: Next.js App Router route handling (`POST /v1/chat/completions`), Server-Sent Events (SSE) streaming protocols, and chunk boundary delivery.
4. **Financial Settlement**: Two-phase credit hold reservation (`reserveHold`), token usage commitment (`commitHold`), and unspent balance release to the double-entry billing ledger.
5. **Security Perimeter Defense**: Real-time revocation detection preventing revoked keys from acquiring pool leases (`HTTP 401 Unauthorized`).
6. **Physical Deliverable Verification**: Ensuring that inference outputs produce working, standalone software artifacts rather than truncated text.

## Decision
We implemented a standardized automated verification engine in [`scripts/test-inference-pipeline.ts`](file:///Users/bozoegg/Desktop/GALXAI/scripts/test-inference-pipeline.ts) executing strictly against real wire endpoints with direct output emission into [`output-test/`](file:///Users/bozoegg/Desktop/GALXAI/output-test/):

### 1. The Multi-Phase Lifecycle Architecture
- **Phase 1: Seeded Account & Workspace Substrate**:
  - Initializes `usr_galx_developer_master` and binds to `Developer Master Sovereign Workspace`.
  - Verifies compute wallet balance using `WalletRepository.createOrGetWallet()` and pre-funds via `verifyDepositAndApplyMatch()`.
- **Phase 1.5: Ingestion of Codex Shard & Authority Registry**:
  - Reads active OAuth credentials directly from `~/.codex/auth.json`.
  - Registers the shard in GALX credential pool (`codex_openai_mtm_...`).
  - *(Superseded: In earlier iterations, shard tokens were copied to edge KV. ADR 0115 establishes Supabase PostgreSQL as the sole credential authority, and persistent Codex WebSockets are governed exclusively by the Always-On VM Relay or direct native WebSocket).*
- **Phase 2: Backend GALX API Key Minting**:
  - Mints an authentic gateway key via `GalxCryptoVault.generateGatewayKey()` with embedded SHA-256 checksum (`prefix`, `keyHash`, `checksum`).
  - Registers the key in both BroccoliDB L1 table and PostgreSQL `galx_developer_keys`.
- **Phase 3: Real Streaming SSE Inference (Cyber-Snake Arcade)**:
  - Constructs an authenticated `NextRequest` with `Authorization: Bearer ${apiKey}` and `stream: true`.
  - Executes directly against `postChatCompletion()` over real wire connections to OpenAI Codex models (`gpt-5.6-terra`).
  - Consumes SSE chunks line-by-line via `ReadableStreamDefaultReader` (312 SSE chunks, 12,461 characters, 73.9s TTFT).
  - Generates a standalone, single-file playable HTML5 Canvas arcade game saved to `output-test/projects/cyber-snake-arcade/index.html`.
  - Records a line-by-line trace with chunk indices and millisecond offsets in `output-test/telemetry/streaming-chunks-trace.jsonl`.
- **Phase 4: Real Non-Streaming Completion (Continuous Rate Governor)**:
  - Submits an authenticated non-streaming request with `stream: false`.
  - Synthesizes 19,886 tokens over 69.1s into a full TypeScript microservice package (`package.json`, `tsconfig.json`, `ContinuousRateGovernor.ts`, `ContinuousRateGovernor.test.ts`, `README.md`) saved to `output-test/projects/rate-governor-service/`.
  - Emits the raw JSON completion response to `output-test/telemetry/non-streaming-response.json`.
- **Phase 5: Attested Zero-Data Retention (ZDR) Client SDK**:
  - Synthesizes client SDK specifications ensuring compliance with HIPAA Safe Harbor 18 and EU Data Sovereignty into `output-test/projects/quantum-zdr-client/`.
- **Phase 6: Two-Phase Wallet Hold & Ledger Settlement**:
  - Reserves an inference hold of `$0.0050 USD` via `walletRepo.reserveHold()`.
  - Commits actual consumption (`$0.0018 USD`) via `walletRepo.commitHold()` and verifies automatic refund of unspent remainder (`$0.0032 USD`) back to ledger balance.
- **Phase 7: Security Defense & Revocation Barrier**:
  - Revokes the test key via `apiKeyRepo.revokeKey()`.
  - Submits a subsequent completion request; verifies immediate fail-closed rejection with `HTTP 401 Unauthorized`.
- **Phase 8: Comprehensive Telemetry Emission**:
  - Emits structured execution metrics to `output-test/telemetry/inference-pipeline-report.json`.
  - Generates an executive summary markdown document in `output-test/telemetry/inference-pipeline-report.md`.

### 2. Empirical Verification Benchmarks (100% Integrity Run)
```
======================================================================
   ✨ REAL INFERENCE PIPELINE PASSED IN 144837ms (100% INTEGRITY)
   🎉 ALL SAMPLE PROJECTS CREATED IN: output-test/
======================================================================
```
- **Total Duration**: `144,837 ms` (2.41 minutes)
- **Streaming Chunks**: 312 SSE chunks, 12,461 characters, 73,936 ms
- **Non-Streaming Tokens**: 19,886 tokens consumed, 69,150 ms
- **Unit Test Verification**:
  ```bash
  npx tsx output-test/projects/rate-governor-service/src/ContinuousRateGovernor.test.ts
  ```
  Output: `✓ All 3 rate governor unit tests passed with 100% integrity.`

## Consequences
- **Positive**: Validates the entire GALXAI inference stack under real, unmocked conditions with zero fallbacks.
- **Positive**: Produces standalone, executable software deliverables in `output-test/projects/` that verify generative code quality.
- **Positive**: Continuous regression safety: automated tests verify financial double-entry ledgering and security key revocation concurrently with model generation.
