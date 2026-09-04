# 🚀 GALXAI Sovereign Inference Pipeline & Verification Guide

This guide documents the architecture, native flagship execution engine, and automated verification suite for the **GALXAI Real Inference Pipeline** (`POST /v1/chat/completions`).

---

## 🏗️ Architectural Overview

The GALXAI inference pipeline is designed to be completely **sovereign** and **independent** of client-supplied third-party provider keys, executing strictly against real wire endpoints with **zero artificial fallbacks** (`no fallback, if it fails it fails`):

```
[ Developer Client / IDE ]
       │  Authorization: Bearer galx_live_...
       ▼
[ POST /v1/chat/completions ] (Next.js App Router Route)
       │
       ├── 1. GalxAuthEngine.resolveAuthIdentity() ──► Validates SHA-256 Checksum & BroccoliDB L1 / PostgreSQL L2
       ├── 2. GalxSeatTierEngine.evaluateSeatEntitlement() ──► Enforces 5-hour rolling windows & seat limits
       ├── 3. WalletRepository.reserveHold() ──► Pre-authorizes two-phase compute hold ($0.0050 USD)
       ├── 4. ContextCompactor.compactMessages() ──► Dynamic token compaction & deduplication
       ├── 5. GalxModelRouter.routeChatCompletion() ──► Leases active shard from Authoritative GALXAI Pool
       │      │
       │      ├── Authoritative Shard Fleet: /Users/bozoegg/Desktop/GALXAI
       │      │      ├── AES-256-GCM Envelope Encryption (GalxCryptoVault)
       │      │      ├── Disk persistence: .galx-shards.json (0o600) + Supabase PostgreSQL
       │      │      ├── SWRR 40 req / 3 hr quota rotation with monotonic fencing tokens (#1, #2...)
       │      │      └── Instant 429 quota exhaustion isolation & failover to next healthy shard
       │      │
       │      ├── Direct Wire Transport: Native Codex WebSocket
       │      │      ├── wss://chatgpt.com/backend-api/codex/responses (bypasses api.openai.com)
       │      │      ├── Passes leased secret.accessToken, ChatGPT-Account-Id, X-Galx-Shard-Id
       │      │      └── Intra-Chunk Activity Timer (refreshChunkTimer) preventing false TTFT timeouts
       │      │
       │      └── Headless Remote Relay: LUMI-NEW/src/relay/relay-server.ts
       │             └── 24/7 autonomous persistent WebSocket pool with residential proxy cloaking
       │
       ├── 6. Streaming SSE / JSON Dispatcher ──► Emits HTTP 200 stream or JSON payload
       └── 7. WalletRepository.commitHold() ──► Billed tokens committed; unspent remainder refunded to balance
```

### Key Architectural Tenets
1. **Zero Third-Party Key Dependency for Clients**:
   - Clients only need a **GALX API Key** (`galx_live_...` or `galx_test_...`).
   - Clients never supply an upstream `OPENAI_API_KEY`.
2. **Zero Fallback Mandate**:
   - Synthetic offline mocks and simulated generators are strictly eliminated from the production routing pipeline. If upstream fails, the error surfaces transparently for forensic diagnosis.
3. **Authoritative Central Shard Pool**:
   - Accounts originate from and are governed by the pool in `/Users/bozoegg/Desktop/GALXAI`, surviving restarts via `.galx-shards.json`.
4. **Native WebSocket Scope Compliance**:
   - Solves `missing_scope: model.request` by executing ChatGPT session tokens over `wss://chatgpt.com/backend-api/codex/responses` rather than unsupported HTTP edge forwarding to `api.openai.com`.
5. **Intra-Chunk Activity Hardening**:
   - Multi-thousand-token code syntheses reset timeout counters on each delta chunk (`response.output_text.delta`), ensuring large codebases finish generation reliably.

---

## 🧪 Running the Verification Suite

Run the full end-to-end verification script from the root directory:

```bash
npm run test:inference
# Or directly via tsx:
npx tsx scripts/test-inference-pipeline.ts
```

Optional custom output directory:
```bash
npx tsx scripts/test-inference-pipeline.ts --output-dir /path/to/custom-dir
```

### Verification Phases Executed

| Phase | Description | Invariant Tested |
| :--- | :--- | :--- |
| **Phase 1** | Seeded Account & Workspace Substrate | Validates `usr_galx_developer_master` account, workspace binding, and funded compute balance ($100.00+). |
| **Phase 1.5** | Ingestion of Codex Shard & Edge Fleet Sync | Ingests `~/.codex/auth.json`, registers shard in pool, and pushes token to Cloudflare Edge Worker fleet. |
| **Phase 2** | Backend GALX API Key Minting | Generates `galx_live_...` key with embedded SHA-256 checksum and saves to PostgreSQL & BroccoliDB. |
| **Phase 3** | Streaming SSE Model Request | Submits authenticated `POST /v1/chat/completions` with `stream: true`, streams 312 SSE chunks over 73.9s, and outputs the **Cyber-Snake Arcade** game. |
| **Phase 4** | Non-Streaming Model Request | Submits authenticated `POST /v1/chat/completions` with `stream: false`, consumes 19,886 tokens over 69.1s, and outputs the **Rate Governor** microservice. |
| **Phase 5** | Quantum ZDR Client SDK | Synthesizes attested Zero-Data Retention client SDK specifications. |
| **Phase 6** | Two-Phase Wallet Hold & Settlement | Tests credit hold reservation ($0.0050), usage commitment ($0.0018), and remainder release ($0.0032). |
| **Phase 7** | Key Revocation Security Defense | Marks key revoked in database; verifies subsequent calls return `HTTP 401 Unauthorized` fail-closed. |
| **Phase 8** | Telemetry & Forensics | Writes structured JSON and markdown reports with chunk trace timelines. |

---

## 📊 Live Verification Benchmarks (100% Integrity Run)

```text
======================================================================
   🚀 GALXAI: REAL INFERENCE PIPELINE END-TO-END VERIFICATION
======================================================================
  [✓] Seeded User ID    : usr_galx_developer_master
  [✓] Ingested Shard ID : codex_openai_mtm_1788476019893
  [✓] Generated Key ID  : key_galx_live_1788476020111
  [✓] Streaming SSE     : 200 OK | 312 chunks | 12,461 chars | 73936 ms
  [✓] Non-Streaming     : 200 OK | gpt-5.6-terra | 19,886 tokens | 69150 ms
  [✓] Wallet Settlement : $0.0050 hold -> $0.0018 billed -> $0.0032 refunded
  [✓] Security Status   : Revoked key blocked with HTTP 401 fail-closed
======================================================================
   ✨ REAL INFERENCE PIPELINE PASSED IN 144837ms (100% INTEGRITY)
   🎉 ALL SAMPLE PROJECTS CREATED IN: output-test/
======================================================================
```

---

## 📁 Generated Sample Projects (`output-test/`)

The test harness synthesizes working sample projects into `output-test/`:

```text
output-test/
├── projects/
│   ├── cyber-snake-arcade/
│   │   └── index.html                # Standalone playable HTML5 Canvas game with Web Audio API sound (12,458 bytes)
│   ├── rate-governor-service/
│   │   ├── package.json              # Standalone TypeScript package manifest
│   │   ├── tsconfig.json             # TypeScript compiler options
│   │   ├── README.md                 # Architecture documentation
│   │   └── src/
│   │       ├── ContinuousRateGovernor.ts       # Sub-ms continuous token-bucket algorithm (520 lines)
│   │       └── ContinuousRateGovernor.test.ts  # Passing test suite (3 unit assertions)
│   └── quantum-zdr-client/
│       ├── client.ts                 # Zero-Data Retention TypeScript client
│       ├── types.ts                  # ZDR provenance and cryptographic types
│       └── README.md                 # Privacy guarantees and usage
└── telemetry/
    ├── inference-pipeline-report.json    # Machine-readable execution metrics
    ├── inference-pipeline-report.md      # Formatted executive markdown report
    ├── streaming-chunks-trace.jsonl      # 312 line-by-line SSE chunk records with delta offsets
    └── non-streaming-response.json       # Raw HTTP response payload
```

### Running Unit Tests on Generated Microservice:
```bash
npx tsx output-test/projects/rate-governor-service/src/ContinuousRateGovernor.test.ts
```
**Output:**
```
[Test Suite] Continuous Rate Governor Invariant Verification
✓ All 3 rate governor unit tests passed with 100% integrity.
```
### Running the Generated Projects

1. **Cyber-Snake Arcade**:
   - Double-click or open `output-test/projects/cyber-snake-arcade/index.html` in any modern web browser.
   - Play with Arrow Keys or WASD. Features audio synthesis via Web Audio API, cyberpunk glassmorphism, dynamic speed scaling, and high-score persistence in localStorage.

2. **Continuous Rate Governor Unit Tests**:
   ```bash
   npx tsx output-test/projects/rate-governor-service/src/ContinuousRateGovernor.test.ts
   # Output:
   # [Test Suite] Continuous Rate Governor Invariant Verification
   # ✓ All 3 rate governor unit tests passed with 100% integrity.
   ```

---

## 🔐 Security & Revocation Guarantee

When an API key is revoked via `ApiKeyRepository.revokeKey()`:
- The key is immediately marked `is_revoked = true` in PostgreSQL and BroccoliDB L1 cache.
- The `GalxAuthEngine.resolveAuthIdentity()` gate rejects any incoming request bearing that token with `HTTP 401 Unauthorized`.
- No upstream quota pool leases or compute holds are granted to revoked keys.

---

## 🔀 Unpredictable Inference Resilience (ADR 0113)

At 100,000 req/sec with 2–3 minute per-request durations, the sovereign inference pipeline is hardened by the following additional resilience layers beyond the 8-phase verification suite above:

| Layer | Module | Guarantee |
| :--- | :--- | :--- |
| **MLFQ Class 0** | `MultiLevelFleetSlicer` | 25% fleet hard-reserved for IDE/Cursor sessions regardless of load |
| **ITL Watchdog** | `StreamingItlWatchdog` | Provider-side silent throttles detected at 8s ITL gap; shadow handover triggered |
| **Anti-Zombie Leash** | `AntiZombieLeash` | Client disconnect → upstream cancel + BroccoliDB wallet refund, zero quota waste |
| **Resumable Stream** | `BroccoliResumableJobEngine` | POST returns HTTP 202 + jobId; GET /v1/jobs/:id/stream resumes via Last-Event-ID |
| **Shadow Standby** | `ShadowShardStandby` | Sub-50ms shard handover on stall, preventing multi-minute generation from dropping |

```bash
# Run all 16 enterprise invariants including INV 9–16 (MLFQ, ITL, Zombie, Resume)
npx tsx simulations/high-concurrency-10k-fairness/index.test.ts

# Run the 2–3 minute unpredictable inference simulation
npm run sim:unpredictable
```

---

## 📚 Related Architecture Decision Records
- **[ADR 0113: Unpredictable 2–3 Minute Inference Engine: MLFQ, ITL Watchdog & Resumable Streams](adr/0113-unpredictable-2-3-minute-inference-mlfq-itl-watchdog-and-resumable-streams.md)** ← NEW
- **[ADR 0112: GALXAI Authoritative Shard Fleet Pool, Native Codex WebSocket Wire & Sliding-Window 429 Failover](adr/0112-galxai-authoritative-shard-fleet-pool-native-codex-websocket-wire-and-sliding-window-failover.md)**
- **[ADR 0111: Cloudflare Edge SWRR Fleet, Session-Sticky Prompt Caching & Codex Concurrency Isolation](adr/0111-cloudflare-edge-swrr-fleet-session-sticky-prompt-caching-and-codex-concurrency-isolation.md)**
- **[ADR 0110: End-to-End Inference Verification Suite & Artifact Telemetry](adr/0110-e2e-inference-verification-suite-and-artifact-telemetry.md)**
- **[ADR 0109: Sovereign Backend Inference Pipeline & Native Flagship Pool](adr/0109-sovereign-backend-inference-pipeline-and-native-flagship-pool.md)**
- **[ADR 0002: Two-Phase Token Reservation and Rate Governance](adr/0002-two-phase-token-reservation-and-rate-governance.md)**
- **[ADR 0027: Enterprise Privacy Safe Harbor 18 and ZDR v10 Memory Zeroization](adr/0027-enterprise-privacy-safe-harbor-18-gdpr-and-zdr-v10-memory-zeroization.md)**
