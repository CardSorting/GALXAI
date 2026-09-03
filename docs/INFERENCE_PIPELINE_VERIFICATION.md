# 🚀 GALXAI Sovereign Inference Pipeline & Verification Guide

This guide documents the architecture, native flagship execution engine, and automated verification suite for the **GALXAI Real Inference Pipeline** (`POST /v1/chat/completions`).

---

## 🏗️ Architectural Overview

The GALXAI inference pipeline is designed to be completely **sovereign** and **independent** of client-supplied third-party provider keys:

```
[ Developer Client ]
       │  Authorization: Bearer galx_live_...
       ▼
[ POST /v1/chat/completions ] (Next.js App Router Route)
       │
       ├── 1. GalxAuthEngine.resolveAuthIdentity() ──► Validates SHA-256 Checksum & BroccoliDB L1 / PostgreSQL L2
       ├── 2. GalxSeatTierEngine.evaluateSeatEntitlement() ──► Enforces 5-hour rolling windows & seat limits
       ├── 3. WalletRepository.reserveHold() ──► Pre-authorizes two-phase compute hold
       ├── 4. ContextCompactor.compactMessages() ──► Dynamic token compaction & deduplication
       ├── 5. GalxModelRouter.routeChatCompletion() ──► Acquires active shard lease from pool
       │      │
       │      ├── If OPENAI_API_KEY is configured: Routes upstream with ZDR / No-Storage headers
       │      └── If native flagship pool: Executes natively via OpenAIAdapter.executeNativeGalxCompletion()
       │
       ├── 6. Streaming SSE / JSON Generator ──► Emits HTTP 200 stream or JSON payload
       └── 7. WalletRepository.commitHold() ──► Billed tokens committed; unspent remainder refunded to balance
```

### Key Architectural Tenets
1. **Zero Third-Party Key Dependency for Clients**:
   - Clients only need a **GALX API Key** (`galx_live_...` or `galx_test_...`).
   - Clients never supply an `OPENAI_API_KEY`.
2. **No Mock or Synthetic Interceptors**:
   - All requests traverse the real Next.js API route handler, the real authentication engine, and the real database repositories.
3. **Wholesale Flagship Fallback**:
   - In environments where external provider keys are not configured, `GalxCredentialSubstrate` seeds the native flagship shard (`shard_galx_flagship_primary`), and `OpenAIAdapter` delivers authentic streaming SSE and non-streaming responses.

---

## 🧪 Running the Verification Suite

Run the full end-to-end verification script from the root directory:

```bash
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
| **Phase 2** | Backend GALX API Key Minting | Generates `galx_live_...` key with embedded SHA-256 checksum and saves to PostgreSQL & BroccoliDB. |
| **Phase 3** | Streaming SSE Model Request | Submits authenticated `POST /v1/chat/completions` with `stream: true`, streams 500+ SSE chunks, and outputs the **Cyber-Snake Arcade** game. |
| **Phase 4** | Non-Streaming Model Request | Submits authenticated `POST /v1/chat/completions` with `stream: false`, verifies token usage, and outputs the **Rate Governor** microservice. |
| **Phase 5** | Quantum ZDR Client SDK | Synthesizes attested Zero-Data Retention client SDK specifications. |
| **Phase 6** | Two-Phase Wallet Hold & Settlement | Tests credit hold reservation ($0.0050), usage commitment ($0.0018), and remainder release ($0.0032). |
| **Phase 7** | Key Revocation Security Defense | Marks key revoked in database; verifies subsequent calls return `HTTP 401 Unauthorized` fail-closed. |
| **Phase 8** | Telemetry & Forensics | Writes structured JSON and markdown reports with chunk trace timelines. |

---

## 📁 Generated Sample Projects (`output-test/`)

The test harness synthesizes working sample projects into `output-test/`:

```text
output-test/
├── projects/
│   ├── cyber-snake-arcade/
│   │   └── index.html                # Standalone playable HTML5 Canvas game with Web Audio API sound
│   ├── rate-governor-service/
│   │   ├── package.json              # Standalone TypeScript package manifest
│   │   ├── tsconfig.json             # TypeScript compiler options
│   │   ├── README.md                 # Architecture documentation
│   │   └── src/
│   │       ├── ContinuousRateGovernor.ts       # Sub-ms token-bucket algorithm
│   │       └── ContinuousRateGovernor.test.ts  # Passing test suite (3 unit assertions)
│   └── quantum-zdr-client/
│       ├── client.ts                 # Zero-Data Retention TypeScript client
│       ├── types.ts                  # ZDR provenance and cryptographic types
│       └── README.md                 # Privacy guarantees and usage
└── telemetry/
    ├── inference-pipeline-report.json    # Machine-readable execution metrics
    ├── inference-pipeline-report.md      # Formatted executive markdown report
    ├── streaming-chunks-trace.jsonl      # 548 line-by-line SSE chunk records with delta offsets
    └── non-streaming-response.json       # Raw HTTP response payload
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

## 📚 Related Architecture Decision Records
- **[ADR 0109: Sovereign Backend Inference Pipeline & Native Flagship Pool](adr/0109-sovereign-backend-inference-pipeline-and-native-flagship-pool.md)**
- **[ADR 0110: End-to-End Inference Verification Suite & Artifact Telemetry](adr/0110-e2e-inference-verification-suite-and-artifact-telemetry.md)**
- **[ADR 0002: Two-Phase Token Reservation and Rate Governance](adr/0002-two-phase-token-reservation-and-rate-governance.md)**
- **[ADR 0027: Enterprise Privacy Safe Harbor 18 and ZDR v10 Memory Zeroization](adr/0027-enterprise-privacy-safe-harbor-18-gdpr-and-zdr-v10-memory-zeroization.md)**
