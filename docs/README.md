# 📚 GALXAI Documentation & Architecture Sitemap

Welcome to the comprehensive technical documentation and operational guides for **GALXAI**, the universal AI compute clearinghouse and zero-hesitation developer execution substrate.

---

## 🏛️ Institutional Investor & Venture Diligence Data Room

- **[Investor Data Room & Investment Memo Index](investors/README.md)**: Institutional diligence room for venture partners, angels, and financial auditors.
  - **[01. Executive Summary & Investment Memo](investors/01_EXECUTIVE_SUMMARY_AND_MEMO.md)**: 1-pager covering company thesis, traction, financial highlights, and round terms.
  - **[02. Pitch Deck Slide-by-Slide Specification](investors/02_PITCH_DECK_SLIDE_BY_SLIDE.md)**: 12-slide institutional pitch deck narrative.
  - **[03. Market Sizing: TAM, SAM & SOM Analysis](investors/03_MARKET_SIZING_TAM_SAM_SOM.md)**: Econometric top-down ($1.3T TAM) and bottom-up ($1.31B SOM) sizing.
  - **[04. Unit Economics: CAC, LTV, Margins & Payback](investors/04_UNIT_ECONOMICS_CAC_LTV_PAYBACK.md)**: Blended CAC ($185), LTV ($5,350), Gross Margins (42% $\to$ 68%), and 138% NDR.
  - **[05. Competitive Landscape & Strategic Moats](investors/05_COMPETITIVE_LANDSCAPE_AND_MOATS.md)**: 2x2 positioning matrix, feature teardown, and 4 defensible moats.
  - **[06. 5-Year Financial Projections & Operating Model](investors/06_FINANCIAL_PROJECTIONS_AND_MODEL.md)**: 5-year P&L forecast ($1.2M $\to$ $85M ARR) and headcount ramp.
  - **[07. Technical Due Diligence & Architecture Proof](investors/07_TECHNICAL_DILIGENCE_AND_PATENTS.md)**: Architecture audit FAQs for Partner CTOs, sub-15ms wire proof, and ZDR privacy.

---

## 🎯 Developer Guides & Integrations

- **[Universal Developer Client SDK Guide](DEVELOPER_CLIENT_SDK.md)**: Exhaustive manual for the edge-native TypeScript SDK, touchless 1-line APIs, visual synthesis, streaming diagnostics, BroccoliDB substrate, and offline replay testing.
- **[Quickstart Integration Guide](QUICKSTART.md)**: 30-second drop-in guides for Python, TypeScript, Cursor, Windsurf, Claude Code CLI, and cURL.
- **[Universal API Reference](API_REFERENCE.md)**: Complete REST API specifications for `/v1/chat/completions`, `/v1/messages`, `/v1/embeddings`, `/api/auth/ingest`, and `/api/ingest`.
- **[Standardized OAuth & Ingestion Architecture](STANDARDIZED_OAUTH_AND_INGESTION_ARCHITECTURE.md)**: Detailed specification of two-tier identity isolation, Supabase SSR callback, and RFC 9530 transport security.
- **[Flagship Model Catalog & Wholesale Rates](MODEL_CATALOG.md)**: Specifications, context windows, and wholesale pricing for GPT-5.6 Sol, Terra, Luna, and xAI Grok 4.6.
- **[Pricing, Rebates & Economic Arbitrage](PRICING_AND_DISCOUNT_STRATEGY.md)**: Detailed breakdown of the 4-pillar discount architecture (25%–40% wholesale discount, 75% prompt caching rebate).
- **[Multi-Ecosystem SDK Cheatsheet](SDK_CHEATSHEET.md)**: Drop-in code snippets for OpenAI, Anthropic, Vercel AI SDK, LangChain, and LlamaIndex.
- **[Universal Migration Guide](MIGRATION_GUIDE.md)**: Step-by-step zero-code-change migration instructions from raw OpenAI, Anthropic, or OpenRouter setups.
- **[BroccoliDB Compaction Onboarding Guide](BROCCOLIDB_COMPACTION_ONBOARDING_GUIDE.md)**: Master engineer onboarding guide covering the 19-mode safe facade, 180 domain industry clusters, fail-closed safety gate, and the Epistemic Machinery for inference boundary benchmarking.
- **[BroccoliDB Deduplication & Compaction Engine Specification](BROCCOLIDB_DEDUPLICATION_ENGINE_SPECIFICATION.md)**: 85-buffer algorithmic deduplication, sub-microsecond vector batching, Drain log clustering, eBPF syscalls, and TSDB metric telemetry.
- **[BroccoliDB Research, Philosophy & Formal Theory Suite](broccolidb/README.md)**:
  - **[01. Philosophy of BroccoliDB](broccolidb/01_PHILOSOPHY_THE_AGGRESSIVE_VEGETABLE.md)**: The representation layer, compute-prepper fallacy, botanical isomorphism, and the aggressive vegetable.
  - **[02. Technical Whitepaper](broccolidb/02_WHITEPAPER_REPRESENTATION_SELECTION.md)**: Task-conditioned representation selection under epistemic and information-theoretic constraints.
  - **[03. Stakeholder & Maintainer Brief](broccolidb/03_STAKEHOLDER_AND_ONBOARDING_BRIEF.md)**: Commercial pitch vs. diligence room, 30-second elevator explanation, and 3 golden invariants.
  - **[04. Formal Mathematical Proof](broccolidb/04_FORMAL_MATHEMATICAL_PROOF.md)**: Academically rigorous proofs for Risk Monotonicity, Identity Optimality, Bounded Action Degradation, Institutional Entropy Resistance, and Category-Theoretic Functors.
  - **[05. Formal TLA+ & State-Machine Specification](broccolidb/05_FORMAL_TLA_STATE_MACHINE_SPECIFICATION.md)**: TLA+ specification module, temporal logic invariants ($\Box \text{InvariantSafety}$), and WAL crash recovery engine.
  - **[06. Architectural Audit & Empirical Evaluation Report](broccolidb/06_ARCHITECTURAL_AUDIT_AND_EMPIRICAL_EVALUATION.md)**: Exhaustive 420-file code audit, ISO/IEC 25010 assessment, chaos fault injection matrix, and frontier LLM benchmarks.
  - **[07. Lean 4 Formal Verification Blueprint](broccolidb/07_LEAN4_FORMAL_VERIFICATION_BLUEPRINT.md)**: Machine-checked inductive types, Galois connection soundness, identity bypass proofs, and tactic automation.
  - **[08. Compiler IR Lowering & Program Slicing](broccolidb/08_COMPILER_IR_LOWERING_AND_PROGRAM_SLICING.md)**: LLVM SSA intermediate representations, dominator trees, Weiser's backward slicing, and invariant hoisting.
  - **[09. RFC-BROCCOLIDB-0001 Protocol Specification](broccolidb/09_RFC_BROCCOLIDB_0001_TASK_CONDITIONED_REPRESENTATION_SELECTION_PROTOCOL.md)**: Formal RFC 2119 / IETF-style protocol standard (TCRSP/1.0), wire formats, headers, and ZDR v10.0.
  - **[10. Frontier Post-Training Cognitive Labeling Substrate](broccolidb/10_FRONTIER_POST_TRAINING_COGNITIVE_LABELING_SUBSTRATE.md)**: Zero-dependency 4-stage post-training pipeline (Collection, Cleaning, Schema, Provenance), 75+ multi-axis cognitive vectors (MLA, FP8, EAGLE-2, Medusa, DualPipe, DPO Debiasing), and autonomous R2 Merkle sync.
- **[Frequently Asked Questions (FAQs)](FAQS.md)**: Clear answers covering zero-hesitation ergonomics, prompt caching, billing, security, and uptime SLAs.

---

## 🏛️ System Architecture & Substrates

- **[System Architecture Specification](ARCHITECTURE.md)**: System topology, two-tier siloed identity, in-memory reactive BroccoliDB layer, ZDR v10.0 privacy, and circuit breaker FSM.
- **[Performance Benchmarks & Empirical Inference Boundary](BENCHMARKS.md)**: Head-to-head empirical OpenAI benchmarks (`gpt-4o`, `gpt-4o-mini`, `o3-mini`), 180-domain cluster results, and Cloudflare Edge mesh latency metrics.
- **[Forensic Payload Dissection & Causal Analysis](FORENSIC_PAYLOAD_DISSECTION_AND_CAUSAL_ANALYSIS.md)**: "Opening the Sausage": Byte-by-byte before/after payload transformations, information entropy, and causal mechanisms behind input compaction.
- **[Security Posture & Cryptographic Vault](SECURITY.md)**: AES-256-GCM envelope vault, HKDF key derivation, RFC 9530 constant-time digests, and anti-replay nonces.
- **[Enterprise OAuth 2.0 / 2.1 & Token Lifecycle](OAUTH_AND_TOKEN_LIFECYCLE_SPECIFICATION.md)**: RFC 6819 Refresh Token Rotation (RTR), Token Family Theft Containment, DPoP, and OIDC Back-Channel Logout.
- **[Provider-as-Auth Technical Specification](PROVIDER_AS_AUTH_SPECIFICATION.md)**: Backend credential vaulting, Substrate tenant sharding, and upstream provider identity roots.
- **[Natural Navigation & OmniSearch](NATURAL_NAVIGATION_AND_OMNISEARCH.md)**: BroccoliOmniSearch natural language routing, phonetic tolerance, and self-healing breadcrumbs.
- **[Cloudflare Strategy & Edge Gateway](CLOUDFLARE_STRATEGY.md)**: Zero-egress Cloudflare Workers edge mesh, R2 CDN media acceleration, and custom domains.
- **[Go-To-Market (GTM) Strategy](GTM_STRATEGY.md)**: Developer JTBD framework, market whitespace, and growth loops.
- **[Mathematical Routing Algorithms](ROUTING_ALGORITHMS.md)**: Mathematical derivations of Predictive Adaptive Headroom (P-AHT), Smooth Weighted Round-Robin (SWRR), and TASD swarm dispersion.
- **[Streaming & SSE Protocol Specification](STREAMING_AND_SSE_PROTOCOL.md)**: Sub-15ms TTFT streaming protocols, Keep-Alive ping intervals, and zero-copy buffers.
- **[Asynchronous Queues & CloudTasks](QUEUE_SPECIFICATION.md)**: Background queue architecture, token-bucket pacing, and DLQ topologies.
- **[Senior Engineering Review: Chat & Rolling Context](SENIOR_ENGINEERING_REVIEW_CHAT_AND_ROLLING_CONTEXT.md)**: Deep architectural review of Hybrid BroccoliDB (L1) + PostgreSQL (L2) rolling memory, dynamic 1.05M context governor, dual rolling seat quotas, and V44-V53 migrations.
- **[GALXAI Foundation Model Training Suite (`docs/training/`)](training/README.md)**: Authoritative 7-document post-training suite for **`GALX-Flash-8B`** targeting GLM-5.3 Flash & GPT-4o-mini performance parity:
  - **[01. Strategy & Target Goal](training/01_STRATEGY_AND_TARGET_GOAL.md)**: GLM-5.3 Flash parity thesis, Qwen3-8B-Base backbone, IndexShare sparse attention ($2.9\times$ FLOPs reduction), and $0 egress R2 flywheel.
  - **[02. Timeframe & Sprint Milestones](training/02_TIMEFRAME_AND_SPRINT_MILESTONES.md)**: 16-Day 7-Phase chronological execution schedule with quantitative Go/No-Go gates.
  - **[03. Dataset & Curriculum Specification](training/03_DATASET_AND_CURRICULUM_SPECIFICATION.md)**: 4-Tier curriculum mix ($\ge 200\text{K}$ samples, $\ge 150\text{M}$ tokens), CoT distillation, PII scrubbing, and SHA-256 Merkle proofs.
  - **[04. Hardware & Infrastructure Setup](training/04_HARDWARE_AND_INFRASTRUCTURE_SETUP.md)**: 8x H100 SXM5 GPU cluster provisioning (Lambda / RunPod), Slime Docker code verifiers, and R2 SigV4 streaming.
  - **[05. Training Recipes & Hyperparameters](training/05_TRAINING_RECIPES_AND_HYPERPARAMETERS.md)**: Axolotl SFT, Slime Asynchronous RL, and Length-Debiased DPO configuration recipes.
  - **[06. Operational Execution Runbook](training/06_OPERATIONAL_EXECUTION_RUNBOOK.md)**: Operator checklist, pre-flight probes, shard compaction, live loss tracking, and emergency rollback playbooks.
  - **[07. Evaluation & Deployment Gate](training/07_EVALUATION_AND_DEPLOYMENT_GATE.md)**: HumanEval, GSM8K, MATH-500 benchmarks, INT4 AWQ/GGUF quantization, and vLLM 5% canary release.
- **[Architecture Decision Records (ADRs)](adr/README.md)**: 112 formal architectural specifications from ADR 0001 to ADR 0112, governing security, transport hardening, 180-domain compaction, dual rolling window seat quotas, 5-level rolling context pyramids, zero-dependency post-training cognitive labeling, GLM-5.3 Flash IndexShare sparse attention, autonomous R2 Merkle tree sync, and the authoritative multi-account shard pool with native Codex WebSocket wire (ADR 0111–0112).
- **[LUMI: Stellar Pass & Multi-Account Fleet Substrate](LUMI.md)**: Comprehensive guide for the $10/mo flat-rate pass, authoritative central shard pool, native Codex WebSocket wire, 40 req / 3 hr sliding-window quotas, and 24/7 autonomous relay containers.
- **[Real Inference Pipeline & Automated Verification Guide](INFERENCE_PIPELINE_VERIFICATION.md)**: Exhaustive manual for the sovereign zero-fallback inference pipeline (`POST /v1/chat/completions`), 8-phase verification harness, generated sample codebases, wallet settlement holds, and key revocation defenses.
- **[Operational SRE Playbooks](playbooks/README.md)**: 9 lifecycle runbooks for deployment, incident remediation, secret rotation, unframed developer observation trials, and continuous learning / model post-training.
- **[Maintainer Knowledge Base & Internal Manual](maintainers/README.md)**: Onboarding Day 1–30 roadmap, subsystem dependency DAG, and debugging runbooks.
- **[Production Infrastructure & Deployment Guide](DEPLOYMENT.md)**: Multi-target deployment topology across Vercel, Cloudflare Edge, Docker, and Kubernetes.


- **[Vercel Production Deployment & Hardening Guide](VERCEL_DEPLOYMENT.md)**: Complete guide for Next.js 15 deployment on Vercel, 8-phase pre-flight verification, environment sync, and 12-point automated live smoke testing.
- **[Programmatic SEO (pSEO), AEO & GEO Strategy](PSEO_AND_AEO_STRATEGY.md)**: Comprehensive architectural strategy covering 13 interactive developer tools, 14 programmatic content hubs, Schema.org `@graph` ontology, and machine-readable `llms.txt` standards.
- **[Interactive Developer Tools Suite](../src/app/tools)**: Suite of 13 interactive browser tools including Enterprise LLM ROI & Token Budget Calculator, AI Token Streaming & Speed Benchmark Simulator, 1M Context Window Visualizer, Prompt Caching Estimator, BPE Token Counter, and Model Cost Comparator.
- **[AEO Engineering Glossary Hub](../src/app/glossary)**: 14 dedicated programmatic glossary term portals (`/glossary/[slug]`) with Schema.org `DefinedTermSet` and Wikidata entity mapping.
- **[Incident Postmortems Hub](../src/app/postmortems)**: Verifiable real-world incident postmortems, root cause analyses, and multi-origin failover architectures.

---

## 🧪 Verification & Audit

Run the automated test suites to verify platform resilience, security, and developer ergonomics:

```bash
# 1. BroccoliDB Empirical Inference Boundary Benchmark (OpenAI Models)
npm run bench:inference-boundary

# 2. Compaction Facade & HTTP REST API Gateway Suite (19 modes)
npm run test:broccolidb:api

# 3. BroccoliDB Production Hardening & Zero-Hallucination Regressions
npm run test:broccolidb:hardening

# 4. Master 180-Domain Compactor Cluster (100% Verified)
node --import tsx scripts/test-broccolidb-150-domain-suite.ts

# 5. Universal Router, Privacy, SOC2, BroccoliDB & Ingestion Transport Suite (217 tests)
npm run test:router

# 6. Universal Zero-Hesitation Ergonomics & Mental Model Suite (98 tests)
npx tsx scripts/verify-zero-hesitation-ergonomics.ts
```
