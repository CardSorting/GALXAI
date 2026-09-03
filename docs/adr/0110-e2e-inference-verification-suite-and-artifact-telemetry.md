# ADR 0110: End-to-End Inference Verification Suite & Artifact Telemetry

## Status
Accepted

## Context
Deploying enterprise inference gateways requires rigorous verification that cannot be satisfied by isolated unit tests alone. The entire inference pipeline spans multiple independent subsystems:
1. **Identity & Substrate**: Seeded developer accounts, workspace tenant bindings, and compute wallet balances.
2. **Cryptographic Gateway Keys**: Generation of SHA-256 checksum-verified API keys (`galx_live_...`) with dual persistence in BroccoliDB (L1 in-memory cache) and PostgreSQL (L2 durable storage).
3. **HTTP Transport & Streaming Protocols**: Next.js App Router route handling (`POST /v1/chat/completions`), Server-Sent Events (SSE) streaming protocols, and chunk boundary delivery.
4. **Financial Settlement**: Two-phase credit hold reservation (`reserveHold`), token usage commitment (`commitHold`), and unspent balance release to the double-entry billing ledger.
5. **Security Perimeter Defense**: Real-time revocation detection preventing revoked keys from acquiring pool leases (`HTTP 401 Unauthorized`).
6. **Physical Deliverable Verification**: Ensuring that inference outputs produce working, standalone software artifacts rather than truncated text.

## Decision
We implemented a standardized 8-phase automated verification engine in [`scripts/test-inference-pipeline.ts`](file:///Users/bozoegg/Desktop/GALXAI/scripts/test-inference-pipeline.ts) with direct output emission into [`output-test/`](file:///Users/bozoegg/Desktop/GALXAI/output-test/):

### 1. The 8-Phase Lifecycle Architecture
- **Phase 1: Seeded Account & Workspace Substrate**:
  - Initializes `usr_galx_developer_master` and binds to `Developer Master Sovereign Workspace`.
  - Verifies compute wallet balance using `WalletRepository.createOrGetWallet()` and pre-funds via `verifyDepositAndApplyMatch()`.
- **Phase 2: Backend GALX API Key Minting**:
  - Mints an authentic gateway key via `GalxCryptoVault.generateGatewayKey()` with embedded SHA-256 checksum (`prefix`, `keyHash`, `checksum`).
  - Registers the key in both BroccoliDB L1 table and PostgreSQL `galx_developer_keys`.
- **Phase 3: Real Streaming SSE Inference (Cyber-Snake Arcade)**:
  - Constructs an authenticated `NextRequest` with `Authorization: Bearer ${apiKey}` and `stream: true`.
  - Executes directly against `postChatCompletion()`.
  - Measures TTFT and consumes SSE chunks line-by-line via `ReadableStreamDefaultReader`.
  - Generates a standalone, single-file playable HTML5 Canvas arcade game saved to `output-test/projects/cyber-snake-arcade/index.html`.
  - Records a line-by-line trace with chunk indices and millisecond offsets in `output-test/telemetry/streaming-chunks-trace.jsonl`.
- **Phase 4: Real Non-Streaming Completion (Continuous Rate Governor)**:
  - Submits an authenticated non-streaming request with `stream: false`.
  - Generates a full TypeScript microservice package (`package.json`, `tsconfig.json`, `ContinuousRateGovernor.ts`, `ContinuousRateGovernor.test.ts`, `README.md`) saved to `output-test/projects/rate-governor-service/`.
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

## Consequences
- **Positive**: Provides a single, deterministic CLI command (`npx tsx scripts/test-inference-pipeline.ts`) that verifies the entire GALXAI inference stack in under 2 seconds.
- **Positive**: Eliminates mock hallucinations by testing against the actual Next.js route dispatcher and production repositories.
- **Positive**: Produces standalone, executable sample projects in `output-test/` that can be run directly (e.g. opening `cyber-snake-arcade/index.html` in a browser or running `ContinuousRateGovernor.test.ts` via tsx).
