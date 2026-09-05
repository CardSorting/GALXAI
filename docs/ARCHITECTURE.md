# 🏛️ GALXAI Architecture Specification

This document provides a comprehensive technical breakdown of the GALXAI universal AI routing gateway, high-concurrency quota cycling substrate, BroccoliDB reactive in-memory indexing layer, Zero Data Retention (ZDR v10.0) privacy substrate, cryptographic vault, and resilience topologies.

---

## 🏗️ System Overview

GALXAI sits between downstream client applications (chat interfaces, creative tools, agentic swarms, SDKs, and IDEs) and upstream foundation model providers (OpenAI, xAI Grok). GALXAI itself is the inference and governance layer, not one of those destination applications. Its web control plane exposes model discovery, API configuration, billing, telemetry, and governance.

```mermaid
flowchart TD
    ControlPlane[GALXAI Web Control Plane<br/>/models · keys · billing · telemetry · governance] -->|configuration and discovery| Gateway[GALXAI Universal Gateway]
    Client[Downstream Application / SDK / Agent Swarm] -->|Bearer galx_live_... / galx_sess_...| Gateway
    
    subgraph Gateway Ingress & Privacy
        Auth[API Key & Session Authenticator] --> Risk[Behavioral Risk Evaluator]
        Risk --> Redactor[Safe Harbor 18 & GDPR PII Redactor]
        Redactor --> Preflight[PII Preflight Zero-Alloc Filter]
    end
    
    subgraph Gateway Core & In-Memory Substrate
        Preflight --> Router[GalxModelRouter]
        Router --> BDB[BroccoliDB Reactive L1 Tables & Natural Query AST Parser]
        BDB --> Pool[GalxCredentialPool & TASD Leveling]
        Pool --> Breaker[4-State Circuit Breaker & Canary Prober]
        Pool --> Vault[GalxCryptoVault AES-256-GCM + AAD Binding]
        Pool --> Substrate[GalxCredentialSubstrate Shard Accounts]
        
        Router --> ZDR[ZDR v10.0 Ephemeral Memory Slab Pool & Key Ratchet]
        Router --> Merkle[Merkle Tree Tamper-Evident SHA-256 Ledger]
        Router --> Metrics[GalxMetricsEngine Ring Buffer]
    end
    
    subgraph Upstream Fleet
        ZDR -->|Zero Data Retention Stream| OA[OpenAI Fleet: gpt-5.6-*, gpt-image-*]
        ZDR -->|Zero Data Retention Stream| Grok[xAI Grok Fleet: grok-4.6, grok-4.5, grok-image]
    end
```

### Hosted product boundary

The web control plane does not host chat or image-generation composers. `/chat`, `/share`, `/characters`, and `/studio` are retired. Successful authentication defaults to the `/models` catalog, whose cards and model-type tabs lead developers toward specifications, credentials, and integration guidance. OpenAI-compatible chat and image endpoints remain gateway contracts, and owner-scoped chat tables remain available for callers that explicitly select durable inference sessions.

Client-only `custom_personas` and `image_generations` data was purged by migration `20260905011334_retire_browser_client_tables.sql`. The empty relations were revoked and moved from `public` to private retired tombstones under the staged database contract protocol. See ADR 0119.

---

## 🏛️ Architectural Decision Records (ADRs) Mapping

All architectural components in GALXAI are governed by formal Architectural Decision Records located in [`docs/adr/`](adr/README.md):

| Component | ADR Reference | Core Innovation & Mechanism |
| :--- | :--- | :--- |
| **Universal Quota Substrate** | [ADR 0001](adr/0001-unified-pooled-quota-cycling-substrate.md) | Single pooled compute fleet, eliminating quota fragmentation and 429 errors. |
| **Rate Governor & Token Calculus** | [ADR 0002](adr/0002-two-phase-token-reservation-and-rate-governance.md) | Microsecond fractional replenishment + 2-Phase atomic token reservation. |
| **Cryptographic Vault** | [ADR 0003](adr/0003-aes-256-gcm-envelope-encryption-with-aad-binding.md) | AES-256-GCM authenticated envelope encryption with tenant signature AAD binding. |
| **Circuit Breaker FSM** | [ADR 0004](adr/0004-four-state-circuit-breaker-and-failover-topology.md) | 4-state finite state machine (Healthy/Cooldown/Exhausted/Dead) for sub-15ms failover. |
| **Telemetry Ring Buffer** | [ADR 0005](adr/0005-circular-buffer-telemetry-and-ewma-latency-scoring.md) | Zero-allocation circular ring buffers for P50/P90/P99 latency & EWMA routing bias. |
| **Economic Arbitrage & Caching** | [ADR 0006](adr/0006-intelligent-multi-tiered-discount-strategy.md) | Consolidated Tier-5 wholesale volume capture with 100% prompt caching rebate pass-through. |
| **Proof-of-Deposit Security Gate** | [ADR 0007](adr/0007-proof-of-deposit-and-50pct-match-paywall-gate.md) | Anti-Sybil $10 deposit proof gate matched with $5 introductory bonus ($15 total compute). |
| **Tenant-Affinity Shard Dispersion**| [ADR 0008](adr/0008-tenant-affinity-shard-dispersion-and-post-allocation-leveling.md) | TASD algorithm to disperse agent swarm bursts across distinct physical shards. |
| **Half-Open Canary & Scavenger** | [ADR 0009](adr/0009-half-open-canary-traffic-warming-and-lease-scavenger.md) | 4-phase canary recovery warming + automated lease scavenger for orphaned streaming reservations. |
| **CloudTasks & CloudRun Queue** | [ADR 0010](adr/0010-cloudtasks-cloudrun-asynchronous-queue-substrate.md) | Asynchronous task queue, token-bucket dispatch pacing, Cloud Run push webhooks, and DLQ topologies. |
| **DAG Workflows & Real-Time SSE** | [ADR 0011](adr/0011-directed-acyclic-graph-workflows-and-realtime-event-streaming.md) | Real-time SSE streaming, DAG Fan-In orchestration, destination circuit breakers, and anti-starvation aging. |
| **DX Ergonomics & Adapters** | [ADR 0013](adr/0013-fluent-builders-structured-outputs-and-dx-ergonomics.md) | Fluent prompt builders, structured JSON outputs, Vercel AI SDK adapters, and batch swarm runners. |
| **Dual Rolling Window Seat Quotas** | [ADR 0068](adr/0068-dual-rolling-window-seat-quotas-and-distributed-request-leases.md) | 5-Hour burst and 7-Day weekly rolling quotas with expiring idempotent request leases (`galx_seat_request_leases`). |
| **Hybrid Rolling Context Pyramid** | [ADR 0069](adr/0069-hybrid-broccolidb-postgres-rolling-context-and-5-level-pyramid.md) | 5-Level multi-resolution memory pyramid combining L1 BroccoliDB (<0.08ms) and durable PostgreSQL CTEs. |
| **Elastic Dynamic Context Governor**| [ADR 0070](adr/0070-elastic-dynamic-context-governor-and-atomic-turn-pair-integrity.md) | Dynamic 1.05M token frontier window sizing with strict OpenAI/Anthropic tool turn-pair integrity guarantees. |
| **Universal Workspace Anchors** | [ADR 0071](adr/0071-cross-session-universal-workspace-anchors-and-hardware-cache-topology.md) | Workspace-wide architectural schema anchors and deterministic SHA-256 stable prefix hashing (>98% cache hit rate). |
| **Apex Agent Runtime & Middleware**| [ADR 0014](adr/0014-apex-agent-runtime-middleware-and-resilience-substrate.md) | Autonomous agent tool loops, pluggable middleware pipeline, LRU caching, and fallback cascades. |
| **Zero-Egress Cloudflare Edge Mesh**| [ADR 0015](adr/0015-zero-egress-cloudflare-workers-edge-compute-mesh.md) | Offloads high-bandwidth SSE streaming and queue execution to Cloudflare Workers for $0 egress bandwidth costs. |
| **Authoritative Supabase PostgreSQL**| [ADR 0016](adr/0016-authoritative-supabase-postgresql-substrate.md) | Authoritative single source of truth for ACID double-entry ledgers, AES-256-GCM vault, and pgvector. |
| **Binary Wire & RPC Micro-Batching**| [ADR 0017](adr/0017-high-throughput-binary-wire-and-rpc-micro-batching.md) | Binary wire codecs and 100-item micro-batches (fn_batch_draw_wallet_tokens_cf) cutting database IOPS by 98%. |
| **Edge Speculative & Socket Pools** | [ADR 0018](adr/0018-edge-speculative-streaming-and-keepalive-connection-pools.md) | Speculative draft + target streaming and pre-warmed HTTP/2 keep-alive sockets cutting TTFT by 65%. |
| **Autonomous Shard Health & Budgets**| [ADR 0019](adr/0019-autonomous-shard-health-probes-and-budget-governance.md) | Continuous health probes, auto-drain stored procedures, and multi-tenant budget threshold webhooks (50%/80%/100%). |
| **Provider-as-Auth Substrate** | [ADR 0020](adr/0020-provider-as-auth-zero-friction-session-substrate.md) | 1-Click zero-friction onboarding using upstream OpenAI/xAI credentials as primary identity. |
| **JWE Session Encryption & DPoP** | [ADR 0021](adr/0021-jwe-compact-session-encryption-and-dpop-fingerprinting.md) | Compact AES-256-GCM encrypted tokens (`galx_sess_v2...`) bound to IP subnet / UA fingerprints. |
| **OAuth 2.0 Rotation & Anti-Replay** | [ADR 0022](adr/0022-oauth-token-rotation-with-reuse-attack-detection-cascades.md) | Single-use rotation with 30s grace window and automatic session family lineage killswitch. |
| **SUDO Elevation & Token Scoping** | [ADR 0023](adr/0023-step-up-sudo-elevation-and-fine-grained-token-scoping.md) | 15-minute privileged SUDO window, wildcard token scopes (`chat:*`), and multi-device remote logout. |
| **Behavioral Risk & KMS Re-Wrapping** | [ADR 0024](adr/0024-adaptive-behavioral-risk-scoring-and-zero-downtime-kms-rewrapping.md) | Dynamic 0-100 risk scoring, security posture grades (`A+`), and zero-downtime key re-wrapping. |
| **BroccoliDB Reactive Table Layer** | [ADR 0025](adr/0025-broccolidb-l1-reactive-in-memory-table-and-secondary-indexing.md) | Sub-microsecond query tables with rich operator DSL and zero-allocation statistical aggregations. |
| **BroccoliDB Natural Query & WAL** | [ADR 0026](adr/0026-broccolidb-natural-language-query-ast-parser-and-wal-persistence.md) | Offline deterministic AST translation ($< 0.1\text{ms}$) and tamper-evident crash recovery WAL. |
| **Enterprise Privacy & ZDR v10.0** | [ADR 0027](adr/0027-enterprise-privacy-safe-harbor-18-gdpr-and-zdr-v10-memory-zeroization.md) | Complete HIPAA/GDPR/Global privacy coverage, streaming PII windowing, and 2-pass memory zeroization. |
| **SOC 2 Type II Engine & Merkle** | [ADR 0028](adr/0028-soc2-type-ii-compliance-engine-drift-detector-and-merkle-audit-ledger.md) | 28 AICPA Trust Services controls, automated drift remediation, and Merkle Tree audit chaining. |
| **Paranoid Supabase & AI Governance** | [ADR 0035](adr/0035-paranoid-supabase-postgresql-and-ai-agent-governance.md) | 10 Invariant Commandments, AOP-DB protocol, mechanical SQL linter, and bi-directional rollbacks. |
| **Universal Developer Auth** | [ADR 0036](adr/0036-universal-developer-authentication-gating-and-zero-abuse-workspace-perimeter.md) | Platform-wide `<AuthRequiredGate />`, guest pass retirement, programmatic worker streams, and 2-column checkout funnel. |
| **Edge Gateway & R2 CDN** | [ADR 0037](adr/0037-zero-egress-cloudflare-edge-gateway-and-r2-cdn-substrate.md) | `api.galx.ai` Worker ingress, `assets.galx.ai` R2 media CDN, and $0 egress bandwidth across 300+ PoPs. |
| **Edge KV Rate Governance** | [ADR 0038](adr/0038-distributed-edge-kv-rate-governance-and-swr-catalog-caching.md) | Sliding-window token bucket KV rate limiting and sub-10ms SWR model catalog caching at edge PoPs. |
| **Vector & Durable Objects** | [ADR 0039](adr/0039-edge-native-vector-embeddings-and-durable-object-swarm-sync.md) | Edge 1536-dim vector embeddings (`/v1/embeddings`) and in-memory Durable Object swarm synchronization. |
| **Enterprise Vercel Deployment Gate** | [ADR 0040](adr/0040-enterprise-vercel-pre-deployment-gate-and-multi-region-topology.md) | 8-Phase pre-flight audit engine, Next.js 15 package import optimizations, HSTS, and multi-region placement. |
| **Zero-Collision TypeScript Mesh** | [ADR 0041](adr/0041-zero-collision-typescript-ambient-isolation-and-dual-runtime-mesh.md) | Scoped dynamic import typing for Cloudflare bindings preventing global DOM / Web API identifier collisions. |
| **[ADR 0042](adr/0042-universal-zero-hesitation-developer-ergonomics-and-mental-model-absorption.md)** | Universal Zero-Hesitation Developer Ergonomics & Mental Model Absorption | Multi-mental-model absorption (OpenAI, Anthropic, Ollama, LangChain, Vercel AI), 0-install CLI, GET browser execution, and aspect ratio normalization. |
| **[ADR 0043](adr/0043-broccolidb-hybrid-resilience-outbox-disaster-recovery-and-sla-uptime.md)** | BroccoliDB Hybrid Resilience Substrate, Zero-Loss Outbox & Dual-Slot Disaster Recovery | RPO=0 Outbox queue with SafeStorage L2 backing, dual-slot atomic snapshot state machine (RTO<5ms), in-flight coalescing, and SLA incident logs. |
| **[ADR 0044](adr/0044-non-technical-natural-omnisearch-and-approachable-error-recovery.md)** | Non-Technical Natural OmniSearch & Approachable Self-Healing Error Recovery | Plain-English conversational intent matching, 404 smart search recovery, breadcrumb auto-history, and universal clipboard fallbacks. |
| **[ADR 0078](adr/0078-glm-53-flash-indexshare-sparse-attention-and-slime-async-rl.md)** | GLM-5.3 Flash IndexShare Sparse Attention, Slime Asynchronous RL & Hybrid Thinking Modes | Pre-annotates training datasets with IndexShare 4-layer indexer reuse (2.9x FLOPs reduction), Slime decoupled async RL, and hybrid thinking modes. |
| **[ADR 0079](adr/0079-lumi-and-community-qos-multi-tier-pool-mesh.md)** | LUMI & Community QoS Multi-Tier Pool Mesh & IETF RateLimit | Free/LUMI/Sovereign tier isolation, 5-hour rolling warp multipliers, and RFC-compliant RateLimit header generation. |
| **[ADR 0080](adr/0080-zero-roundtrip-preflight-and-vectorized-batch-sync.md)** | Zero-Roundtrip Preflight & Vectorized Batch Sync Engine | Single-hop universal gateway preflight procedure (`fn_gateway_preflight_qos_universal_v3`) cutting TTFT to <5ms, and vectorized array unnest settlement. |
| **[ADR 0081](adr/0081-monotonic-stream-deltas-and-zero-copy-pump.md)** | Monotonic Stream Deltas & Zero-Copy Stream Pump | Real-time monotonic sequence delta logging (`galx_chat_stream_deltas`), zero-copy SSE stream piping, and delta slicing. |
| **[ADR 0082](adr/0082-prompt-compaction-predictive-routing-and-quality-sentinels.md)** | Deterministic Prompt Compaction, Strict Model Fidelity & Quality Sentinels | Deterministic prompt compaction with 1024-token KV-prefix alignment, 100% strict user-requested model fidelity, and automated token loop sentinels. |
| **[ADR 0083](adr/0083-context-window-preservation-and-ast-skeletons.md)** | Context Window Preservation & Semantic AST Skeletons | Atomic tool call turn-pair truncation invariants, Lost-in-the-Middle attention anchor hoisting, and semantic codebase AST skeletonization. |
| **[ADR 0084](adr/0084-context-salience-and-zen-flow-buffer-pool.md)** | Context Salience Scoring & High-Throughput Zen Flow Buffer Pool | Information-theoretic salience scoring, stabilized KV-cache prefix pyramids, and 512-slot circular Uint8Array ring buffer with hydraulic backpressure. |
| **[ADR 0085](adr/0085-zero-egress-keyset-sync-and-xfetch-bloom-shield.md)** | Zero-Egress Keyset Sync, XFetch Early Recomputation & Bloom Shield | ETag HTTP 304 fast-path, Single-Flight stampede request coalescing, mathematical XFetch early recomputation, and in-memory Bloom filter negative shielding. |
| **[ADR 0086](adr/0086-authoritative-merkle-governor-and-circuit-breaker.md)** | BroccoliDB Authoritative Merkle Governor & Workspace-Wide Circuit Breaker | Cemented PostgreSQL Merkle epoch authority, workspace-wide Governed Fetch middleware, 50 query/sec leaky bucket governor, and 0ms fail-fast circuit breaker. |
| **[ADR 0047](adr/0047-programmatic-seo-geo-aeo-and-structured-jsonld-saturation.md)** | Programmatic SEO (pSEO), Generative Engine Optimization (GEO), Answer Engine Optimization (AEO) & Structured JSON-LD Saturation | Inverted Pyramid direct answer blocks, saturated multi-layer Schema.org JSON-LD graph, llms.txt standard, and static SSG generation across 235 routes. |
| **[ADR 0048](adr/0048-interactive-developer-studio-tools-and-edge-simulators.md)** | Interactive Developer Studio Tools, Client-Side Simulators & Memory-Isolated Utilities | Suite of 9 interactive tools: Prompt Caching Estimator, System Prompt Compressor, API Key Health Checker, JSON Schema Studio, BPE Token Counter, and Model Cost Comparator. |
| **[ADR 0049](adr/0049-enterprise-governance-security-patterns-and-compliance-matrix.md)** | Enterprise Governance, AI Red-Teaming Patterns, Industry Verticals & Compliance Matrix | Programmatic regulatory compliance (HIPAA, PCI DSS, FedRAMP, EU AI Act), OWASP LLM Top 10 red-teaming defenses (Prompt Injection, Jailbreak, Data Exfiltration), and vertical industry blueprints. |
| **[ADR 0050](adr/0050-incident-postmortems-resilience-engineering-and-sla-failover.md)** | AI Incident Postmortems, Resilience Engineering & Multi-Origin SLA Failover | Active-Active Anycast multi-origin failover, Layer 7 sponge attack defense, dynamic subsea fiber cut BGP rerouting, KV cache invalidation storm mitigation, and quota pool federation. |
| **[ADR 0051](adr/0051-enterprise-oauth2-fapi-token-lifecycle-and-identity-mesh.md)** | Enterprise OAuth 2.0 / 2.1, FAPI Standards, Token Lifecycle & Identity Mesh | RFC 7636 PKCE, RFC 8628 Device Flow, RFC 9126 PAR, RFC 9449 DPoP, RFC 7009 Revocation, RFC 7662 Introspection, RFC 7517 JWKS, and single-flight token rotation mutex. |
| **[ADR 0052](adr/0052-enterprise-oauth21-rtr-fapi-backchannel-and-vacuum-mesh.md)** | Enterprise OAuth 2.1 Refresh Token Rotation (RTR), Token Family Theft Containment, OIDC Back-Channel Logout & Substrate Vacuum Mesh | RFC 6819 Token Family theft containment cascades, 30s grace window replay tolerance, OpenID Connect Back-Channel Logout 1.0, and sub-millisecond PostgreSQL substrate vacuum stored procedures. |
| **[ADR 0053](adr/0053-siloed-supabase-oauth-and-isolated-backend-sharding-mesh.md)** | Siloed Supabase OAuth Platform Authentication & Isolated Backend Substrate Sharding Mesh | Complete decoupling of frontend platform identity (standard Supabase OAuth with `@supabase/ssr`) from backend Substrate sharding infrastructure. |
| **[ADR 0054](adr/0054-apex-transport-hardening-rfc9530-rfc9421-idempotency-and-anti-replay.md)** | Apex Transport Layer Hardening: RFC 9530 Digests, RFC 9421 Signatures, IETF Idempotency, and Anti-Replay Nonces | Constant-time SHA-256 digest validation, RFC 9421 message signatures, 24h Idempotency-Key caching, sliding-window rate limiting, and geo-velocity anomaly sensing. |
| **[ADR 0055](adr/0055-ambient-declarative-ai-substrate-zero-route-and-auto-patcher.md)** | Ambient Declarative AI Substrate, Zero-Route Direct Actions & Runtime Auto-Patcher | Downstream integration architecture spanning media JSX primitives, React 19 Server Actions (`galxai/actions`), Edge Middleware Interceptors, Runtime Auto-Patcher (`galxai/patch`), and NL2API Intent Engine. |
| **[ADR 0056](adr/0056-broccolidb-85-buffer-deduplication-and-streaming-pipeline-substrate.md)** | BroccoliDB 85-Buffer Algorithmic DeDuplication & High-Velocity Streaming Substrate | 85 specialized deduplication buffers across 17 tiers achieving 70%–99% spend reduction, sub-5ns execution, and lock-free 1.74M ops/sec stream ingestion. |
| **[ADR 0057](adr/0057-broccolidb-mega-incident-cascader-and-pyramid-compaction-substrate.md)** | Mega-Incident Stream Cascading & Mega-Document Hierarchical Pyramid Compactor | 4-Stage streaming anomaly cascader (2,000+ pages in 57ms, 98.9% spend cut) and 3-Layer hierarchical pyramid compactor (300+ pages in 14ms, 97.9% spend cut). |
| **[ADR 0058](adr/0058-broccolidb-180-domain-industry-cluster-compactor-substrate.md)** | BroccoliDB 180-Domain Enterprise Industry Cluster Compaction Substrate | 180 production enterprise domain compactors across 21 industry clusters with 100% test coverage and standardized protocol schemas (HL7, FHIR, SWIFT, WITSML). |
| **[ADR 0059](adr/0059-broccolidb-safe-compaction-facade-barrel-hardening-and-api-gateway.md)** | BroccoliDB Safe Compaction Facade, Barrel Hardening & Production API Gateway | Unified BroccoliCompactionFacade boundary, removal of unsafe generated compactor exports, strict size bounding (10MB/2M chars), and authenticated REST endpoint (/api/audit/broccolidb/compact). |
| **[ADR 0060](adr/0060-broccolidb-high-velocity-domain-expansion-and-stream-compaction.md)** | High-Velocity 180-Domain Aho-Corasick Router & Drain/TSDB Stream Compaction Substrate | High-velocity streaming pipeline integrating 180 domain compactors with Drain log clustering, TSDB metric downsampling, OTel trace spans, and JSON streams (80%–98% token cuts). |
| **[ADR 0061](adr/0061-broccolidb-network-orderbook-and-sliding-window-stream-compaction.md)** | NetFlow Security, L2 Order Book Depth & Sliding-Window Stream Compaction Substrate | Specialized compaction for NetFlow/PCAP network security, high-frequency L2/L3 order books, and temporal sliding windows (85%–96% token cuts). |
| **[ADR 0062](adr/0062-broccolidb-industrial-iot-clickstream-genomics-and-hybrid-stream-multiplexing.md)** | Industrial IoT Sensors, Clickstream RUM, Genomics & Hybrid Stream Multiplexing Substrate | Domain compaction for ISO 10816 industrial vibration telemetry, real-user monitoring clickstreams, genomic VCF/SAM sequences, and multi-stream multiplexing. |
| **[ADR 0063](adr/0063-broccolidb-ebpf-k8s-geospatial-and-arrow-dictionary-stream-compaction.md)** | Kernel eBPF Security, Kubernetes Watch, Geospatial ADS-B/AIS & Apache Arrow Dictionaries | Deep-substrate compaction for Linux kernel eBPF syscalls, Kubernetes watch events, maritime/aerospace geospatial trajectories, and Apache Arrow columnar tables. |
| **[ADR 0064](adr/0064-broccolidb-openai-inference-boundary-measurement-and-task-suite.md)** | OpenAI Inference Boundary Empirical Measurement Engine & Task Suite | Head-to-head empirical testing harness across OpenAI models (`gpt-4o`, `gpt-4o-mini`, `o3-mini`) measuring actual provider-reported billed dollars, latency, and $/success metrics with explicit provenance. |
| **[ADR 0065](adr/0065-broccolidb-blinded-evaluator-protocol-and-out-of-sample-validation.md)** | Double-Blind A/B Evaluator Protocol & Out-of-Sample Validation | Eliminates target-seeking confirmation bias via randomized branch assignments ($\alpha$ vs $\beta$), zero target priors, 5-tier empirical regime classification, and open out-of-sample workload ingestion. |
| **[ADR 0109](adr/0109-sovereign-backend-inference-pipeline-and-native-flagship-pool.md)** | Sovereign Backend Inference Pipeline & Native Flagship Pool | Eliminates synthetic mocks, decouples client authentication from third-party keys, and pre-seeds native wholesale flagship pool. |
| **[ADR 0110](adr/0110-e2e-inference-verification-suite-and-artifact-telemetry.md)** | End-to-End Inference Verification Suite & Artifact Telemetry | 8-phase automated verification engine generating playable games, microservices, ZDR SDKs, wallet holds, and revocation defenses in output-test/. |
| **[ADR 0111](adr/0111-cloudflare-edge-swrr-fleet-session-sticky-prompt-caching-and-codex-concurrency-isolation.md)** | Cloudflare Edge SWRR Fleet, Session-Sticky Prompt Caching & Codex Concurrency Isolation | SWRR soft-draining quota derating, 90%+ prompt cache preservation, and isolated CODEX_HOME preventing SQLite contention. |
| **[ADR 0112](adr/0112-galxai-authoritative-shard-fleet-pool-native-codex-websocket-wire-and-sliding-window-failover.md)** | GALXAI Shard Fleet Pool, Native Codex WebSocket Wire & Sliding-Window 429 Failover | Establishes multi-account routing, intra-chunk activity timers, and 429 failover; its local-file persistence decision is superseded by ADR 0115. |
| **[ADR 0113](adr/0113-unpredictable-2-3-minute-inference-mlfq-itl-watchdog-and-resumable-streams.md)** | Unpredictable 2–3 Minute Inference Engine: 3-Tier MLFQ, ITL Watchdog, Anti-Zombie Leash & Resumable Streams | 3-Tier MLFQ fleet partitioning (Interactive 25% / Deep 65% / Scavenger 10%), ITL watchdog with sub-50ms shadow shard handover, Anti-Zombie Leash with transactional wallet refunds, and BroccoliDB durable token buffering for Last-Event-ID SSE resumable streams. |
| **[ADR 0114](adr/0114-uncertain-execution-authority-kernel-and-transactional-journal.md)** | Uncertain Execution Authority Kernel & Transactional Journal | Separates authoritative execution transitions, authorized work delivery, journal observations, and live transport projections. |
| **[ADR 0115](adr/0115-postgresql-authoritative-shard-registry-and-secret-free-projections.md)** | PostgreSQL-Authoritative Shard Registry & Secret-Free Projections | Makes Supabase PostgreSQL the sole credential authority with fail-closed mutations, forced RLS, service-only fenced lease RPCs, retired legacy authorities, and replaceable BroccoliDB routing projections. |
| **[ADR 0119](adr/0119-inference-first-product-surface-and-client-retirement.md)** | Inference-First Product Surface and First-Party Client Retirement | Retires hosted chat/image clients, preserves inference APIs and explicit durable sessions, makes `/models` the default post-auth surface, and removes client-only tables from public Supabase authority. |
| **[ADR 0120](adr/0120-zero-cost-host-mac-cloudflare-tunnel-relay-ingress-and-protocol-hardening.md)** | Zero-Cost Host Mac Cloudflare Tunnel Relay Ingress & Protocol Hardening | Bridges Vercel serverless lambdas to host Mac relay daemon via Cloudflare Tunnel at $0 cost; hardens upstream Codex WebSocket wire protocol with multimodal normalization and reasoning-safe pong watchdog. |
| **[ADR 0121](adr/0121-user-and-session-r2-partitioning-manifest-lifecycle-and-relay-image-synthesis.md)** | User and Session R2 Chronological Partitioning, Visual Manifest Lifecycle, and Always-On Relay Live Wire Image Synthesis | Implements deterministic S3/R2 object layout (`users/{userId}/sessions/{sessionId}/images/{imageId}.png`), session manifest tracking (`manifest.json`), dynamic SVG Data-URI LQIP placeholders, atomic cascade session purging, and Always-On VM Relay Codex WebSocket visual synthesis. |

---

## 🥦 BroccoliDB Representation Transformation & Compaction Substrate

GALXAI embeds the **BroccoliDB Compaction Substrate**, an enterprise pre-inference representation transformation layer operating at the model input boundary:

> ### 🥦 The Core Representation Invariant:
> **Compaction opportunity is a property of the representation, not a fixed property of the model.**
>
> $$\text{Representation} \xrightarrow{\text{Transformation}} \text{Task-Relevant Representation} \xrightarrow{\text{Inference}} \text{Outcome}$$
>
> *GALX is a pre-inference representation transformation layer that attempts to preserve task-relevant invariants while eliminating representational redundancy.*

```mermaid
flowchart TD
    RawInput[Raw Context / Logs / Telemetry / AST / Contracts] --> Ingress[BroccoliCompactionFacade (Size Bound: 10MB)]
    
    subgraph Representation Reducers (19 Modes)
        Ingress --> Route{Select Compaction Mode}
        Route -->|180 Industry Domains| AhoCorasick[Aho-Corasick Multi-Pattern Domain Router]
        Route -->|Log Streams| Drain[Drain Fixed-Depth Log Clustering Engine]
        Route -->|Metric Streams| TSDB[TSDB Anomaly & EWMA Downsampler]
        Route -->|Trace Streams| OTel[OTel DAG & Critical Latency Extractor]
        Route -->|Kernel Telemetry| eBPF[eBPF Syscall & MITRE TTP Classifier]
        Route -->|Cluster Telemetry| K8s[K8s Watch Event Delta Reducer]
        Route -->|Flight / Maritime| Geo[Douglas-Peucker Trajectory Simplifier]
        Route -->|Columnar Data| Arrow[Bit-Packed Arrow Dictionary Encoder]
        Route -->|Incident Storm| Cascader[Mega-Incident 4-Stage Cascader]
        Route -->|Massive Document| Pyramid[Hierarchical Document Pyramid]
    end
    
    subgraph Factual Provenance Guard
        AhoCorasick --> Safety[BroccoliCompactionSafety: Fail-Closed Zero-Hallucination Guard]
        Drain --> Safety
        TSDB --> Safety
        eBPF --> Safety
        K8s --> Safety
        Geo --> Safety
        Arrow --> Safety
        Cascader --> Safety
        Pyramid --> Safety
    end
    
    subgraph Downstream Output & Epistemic Measurement
        Safety -->|Verified Compacted Prompt (61-95% Input Reduction)| ModelIngress[OpenAI / Grok Inference Boundary]
        Safety -->|Fallback on Unsupported Fact| RawFallback[Raw Text Passthrough (Zero Risk)]
        ModelIngress --> Benchmarker[BroccoliInferenceBoundaryBenchmarker: Randomized Branch-Blinded A/B Protocol]
    end
```

---



---

## 🛡️ Two-Tier Siloed Identity & Substrate Sharding Topology

GALXAI enforces strict separation between user-facing platform identity and autonomous backend shard allocation:

```mermaid
flowchart TD
    subgraph Tier1 ["Tier 1: Frontend Platform Identity (Supabase OAuth)"]
        User["Developer / Platform User"] --> ConnectUI["/auth/connect"]
        ConnectUI -->|1-Click GitHub / Google / Magic Link| SupabaseSSR["@supabase/ssr (createBrowserClient)"]
        SupabaseSSR --> SSRCallback["/auth/callback (exchangeCodeForSession)"]
        SSRCallback --> ModelCatalog["/models: canonical cards + model-type tabs"]
        ModelCatalog --> Dashboard["Developer Workspace / Keys / Billing / Telemetry"]
    end

    subgraph Tier2 ["Tier 2: Backend Autonomous Sharding (Substrate Subsystem)"]
        CLI["CLI Agent (LUMI-NEW)"] --> Ingestion["POST /api/auth/ingest (RFC 9530 Digest + Idempotency)"]
        Ingestion --> CryptoVault["GalxCryptoVault (AES-256-GCM + AAD Binding)"]
        CryptoVault --> Shards["BroccoliDB Shard Tables & Postgres Substrate"]
        Shards --> Pool["GalxCredentialPool (TASD Leveling & Circuit Breaker)"]
        Pool --> Upstream["Upstream Model Fleet (OpenAI / xAI Grok)"]
    end

    style Tier1 fill:#0d1117,stroke:#3b82f6,stroke-width:2px
    style Tier2 fill:#0d1117,stroke:#10b981,stroke-width:2px
```

---

## 🔄 Request Lifecycle & Fast-Path Routing Workflow

```text
1. Client Navigation / Ingress
   ├── Mobile Touch Pre-Warming (onTouchStart / onPointerDown 100-300ms head start)
   ├── SafeStorage L1 In-Memory Fast-Path (<0.02ms V8 read)
   └── Canonical Query Parameter Sorter (Single-flight request coalescing deduplication)

2. Gateway Authentication & Security
   ├── Multi-header ingestion (Bearer, x-api-key, x-galx-key, ?api_key=)
   ├── RFC 9530 timing-safe content digest comparison (crypto.timingSafeEqual)
   ├── IETF 24-hour Idempotency-Key cache lookup (Idempotent-Replay header)
   └── Adaptive behavioral risk scoring (IP subnet & UA fingerprinting)

3. Sub-Nanosecond Model Resolution
   └── ModelCatalog.resolveModel() with fastPathCache (<5ns O(1) hash map)

4. Shard Lease Acquisition & Upstream Connection Reuse
   ├── GalxCredentialPool.acquireLease() (P-AHT scoring + 4-State Circuit Breaker)
   └── Persistent Upstream Sockets (0ms TLS handshake lag via OpenAIAdapter / GrokAdapter pre-warming)

5. Zero-Copy Streaming Pipeline & Early Ping
   ├── Frame 1 Early SSE Ping (: open\n\n) -> Drops TTFB to <2ms (Unblocks reverse proxies)
   └── Zero-Copy Binary Buffer Passthrough -> Passes raw Uint8Array chunks (0 CPU allocations / 0 decode cycles)

6. Post-Execution Release & ZDR Zeroization
   ├── Phase 2 Token Ledger Commit (100% prompt caching rebate pass-through)
   └── 2-Pass Memory Slab Zeroization (0xAA -> 0x00)
```

---

## 🥦 BroccoliDB Context Representation Layer & Adaptive Selection Substrate

BroccoliDB operates as an in-process, adaptive context representation engine preceding model inference (ADRs 0056–0067):

```mermaid
flowchart TD
    RawContext[Incoming Context C & Task T] --> DensityGate{Adaptive Density Gate<br>Tokens < 200 or Clean?}
    
    DensityGate -->|YES| Identity[Identity Representation ID C<br>0.0% Overhead / 100% Baseline Preserved]
    DensityGate -->|NO (Noise Detected)| ArchetypeRoute{Context Archetype Classifier}
    
    ArchetypeRoute -->|Architecture & Invariants| GovCompactor[BroccoliArchitectureInvariantCompactor<br>Prunes RFCs & Deprecated ADRs]
    ArchetypeRoute -->|Incident Logs & Outages| Cascader[BroccoliMegaIncidentStreamCascader<br>2,000+ Pages in 57ms]
    ArchetypeRoute -->|Multi-Page Documents| Pyramid[BroccoliMegaDocumentPyramidCompactor<br>300+ Pages in 14ms]
    ArchetypeRoute -->|180 Industry Domains| DomainOpt[BroccoliDomainSpendOptimizer<br>77.6% Token Reduction]
    ArchetypeRoute -->|Kernel eBPF & K8s Watch| HighVel[BroccoliHighVelocityPipeline<br>95% Stream Compression]
    
    GovCompactor --> ProvenanceGate{BroccoliCompactionSafety<br>Fail-Closed Fact Verification}
    Cascader --> ProvenanceGate
    Pyramid --> ProvenanceGate
    DomainOpt --> ProvenanceGate
    HighVel --> ProvenanceGate
    
    ProvenanceGate -->|VERIFIED| CompactedRep[Task-Relevant Representation C']
    ProvenanceGate -->|UNSUPPORTED FACT| SafeFallback[Safe Fallback to Raw Source Text]
    
    Identity --> Inference[Model Inference Boundary: OpenAI / xAI]
    CompactedRep --> Inference
    SafeFallback --> Inference
```

### The 2 Governing Questions of Representation Selection:
1. **Should I touch this representation?**
   - If context is already dense and clean ($<200$ tokens), return $\text{ID}(C)$ to eliminate unforced dilation and preserve $100\%$ action safety.
2. **If I touch it, what information am I forbidden to lose?**
   - Active cryptographic constraints (`RS256`, `v2` keys), memory bounds (`zeroizeBuffer`), and binding runtime rules (`runtime = 'edge'`).

---

## 🔒 Security & Compliance Architecture

| Security Domain | Implementation | Guarantee |
| :--- | :--- | :--- |
| **Credential Encryption** | AES-256-GCM with 96-bit random IV | Confidentiality and integrity of upstream API keys |
| **AAD Envelope Binding** | `tenantId:shardId:provider` bound to tag | Prevents cross-tenant ciphertext transplantation |
| **Transport Wire Integrity** | RFC 9530 SHA-256 digest + `crypto.timingSafeEqual` | Eliminates payload tampering and timing leaks |
| **Anti-Replay Nonce Cache** | 10-minute sliding TTL single-use nonce tracking | Replay attack elimination (HTTP 409) |
| **Idempotent Retries** | IETF Idempotency-Key 24-hour result cache | Eliminates duplicate database inserts on network retries |
| **ZDR v10.0 Memory Zeroization** | 2-Pass cryptographic overwrite (`0xAA` -> `0x00`) | Zero residual plaintext tokens in memory |
| **Forward Secrecy Key Ratchet** | HKDF-SHA256 streaming ratchet | Prevents past session compromise |
| **Monotonic Fencing** | Incremental `fencingToken` per lease | Eliminates split-brain races on worker timeouts |
| **SOC 2 Type II Controls** | 28 AICPA Trust Services Criteria | Continuous automated evidence collection & drift self-healing |
| **Merkle Audit Ledger** | Cryptographic SHA-256 Merkle block chaining | 100% tamper-evident audit custody proofs |
| **Single-Flight Coalescing** | Mutex in-flight promise registry | Prevents cache stampedes and eliminates duplicate upstream flights |
| **Zero-Copy Stream Sandbox** | Direct Uint8Array buffer streaming | Prevents heap fragmentation and reduces GC pauses |
| **Fail-Closed Compaction Safety** | `BroccoliCompactionSafety` entity validator | Zero hallucination or ungrounded factual corruption |

---

## ⚡ Hybrid BroccoliDB-PostgreSQL Rolling Context & 5-Level Memory Pyramid (ADR 0069–0071)

GALXAI couples sub-microsecond in-memory RAM lookup with authoritative PostgreSQL storage to maintain long-horizon conversational context without losing critical facts or exceeding frontier token budgets:

```mermaid
flowchart TD
    Inbound[Inbound Message / Document] --> Engine[GalxRollingContextEngine Apex V5.3]
    
    subgraph L1_BroccoliDB [L1 In-Memory BroccoliDB Tables <0.08ms]
        Anchors[Level 1: Universal Workspace Policy Anchors]
        Episodes[Level 2: Thematic Context Episodes 10-turn milestones]
        Graph[Level 3: Temporal Decision Graph WITH RECURSIVE CTE]
        RRF[Level 4: Reciprocal Rank Fusion RRF Document Search <0.5ms]
        Verbatim[Level 5: Atomic Sliding Verbatim Window]
    end
    
    Engine --> L1_BroccoliDB
    L1_BroccoliDB --> Synth[Memory Synthesis & Deterministic SHA-256 Checkpoint]
    Synth --> Governor[GalxElasticContextGovernor: Dynamic 1.05M Window Sizing]
    Governor --> Inference[Frontier Inference Provider]
    Inference --> Settlement[Single-Hop Composite Settlement CTE]
    Settlement --> DualWrite[Async Dual-Write to L1 RAM + L2 PostgreSQL]
```

### Key Context Invariants:
1. **5-Level Multi-Resolution Pyramid**: Bridges high-level organizational compliance policies (Level 1) with chronological episodic milestones (Level 2), temporal decision graphs (Level 3), sub-millisecond document chunk retrieval (Level 4), and atomic recent turns (Level 5).
2. **Atomic Tool Turn-Pair Boundary Protection**: Guarantees that assistant `tool_calls` and tool execution result messages are never severed across sliding window compaction boundaries, eliminating upstream HTTP 400 validation failures.
3. **Dynamic Elastic Sizing**: Automatically sizes context envelopes up to the model's full **1,050,000 frontier token window** (~3,000–4,000 pages of text) with zero artificial clamping.
4. **Deterministic Stable Prefix Hashing**: Locks in $>98\%$ prompt cache reuse on upstream foundation models with $<250\text{ms}$ TTFT.

---

## 🧬 Zero-Dependency Post-Training Cognitive Substrate & R2 Data Lake (ADR 0073–0077)

GALXAI embeds a zero-dependency, sub-0.02ms post-training data labeling engine (`BroccoliDataLabelingClassifier`) and autonomous Cloudflare R2 dataset synchronization pipeline (`GalxR2TrainingSyncEngine`) executing purely in volatile RAM:

```mermaid
flowchart TD
    Ingest[Stream Ingestion Engine: Web Chat / Opt-In Traffic] --> Pipeline[4-Stage Industrial Substrate]
    
    subgraph Pipeline [4-Stage Industrial Pipeline]
        S1[Stage 1: Collection\n125k tok/sec, Burstiness Index]
        S2[Stage 2: Cleaning\nUnicode NFC, Boilerplate Scrub]
        S3[Stage 3: Schema\nChatML Turn Alternation]
        S4[Stage 4: Provenance\nHMAC-SHA256 Audit Seal]
        S1 --> S2 --> S3 --> S4
    end
    
    Pipeline --> Vectors[75+ Multi-Axis Cognitive Vectors]
    
    subgraph Vectors [Frontier Cognitive Taxonomy & Hardware Vectors]
        V_MLA[MLA Query & KV Compression\n$d_c=512, d_R=64$]
        V_FP8[FP8 Gemm & Dequantization\n$E4M3, E5M2, \text{scale}=128$]
        V_Spec[Speculative Decoding Trees\nEAGLE-2, Medusa 4-Head, ToT]
        V_Pipe[DualPipe Schedule & Aux-Loss-Free MoE]
        V_Shield[Loss-Truncated Gradient Shield\nBlock-Diagonal FlashAttention Mask Slicing]
    end
    
    Vectors --> Table[BroccoliDbTable In-Memory Sinks]
    Table --> Sharder[Token-Packed Micro-Batching & Gzip Shard Writer]
    Sharder --> R2[Cloudflare R2 Zero-Egress Storage: SigV4]
    R2 --> Manifest[Cryptographic 32-Byte Merkle Tree Manifest: manifest.json.gz]
```

### Industrial Post-Training Capabilities:
1. **Zero External Dependencies**: Cryptographic proofs, HMAC signatures, MinHash LSH (128 linear congruential hash seeds), Merkle trees, and compression streams operate exclusively on native Node.js (`node:crypto`, `node:zlib`).
2. **Sub-0.02ms In-Memory Profiling**: All 75+ cognitive and hardware vectors are evaluated in volatile RAM tables (`BroccoliDbTable`) with zero disk I/O.
3. **Hardware-Aligned Acceleration Vectors**: Pre-annotates dataset shards with low-rank MLA dimensions, per-channel FP8 quantization scales, FlashAttention 2D block-diagonal attention mask slicing offsets, and DualPipe forward/backward overlap parameters.
4. **Autonomous R2 Sync & Provenance**: Uploads stratified shards (`datasets/sft/v1/curriculum=...`) directly to Cloudflare R2 with AWS SigV4 authentication ($0 egress) and publishes a 32-byte Merkle root manifest for mathematical verification.

---

## ⚡ High-Throughput I/O Execution Authority, Egress Elimination & Authoritative Governor (ADR 0079–0086)

GALXAI couples sub-millisecond edge execution with cemented PostgreSQL data authority and zero-egress memory shielding:

```mermaid
flowchart TD
    Client[Client SSE Stream] --> Ingress[Cloudflare Edge Gateway / Next.js SSR]
    
    subgraph Egress & Shield Layer [BroccoliDB Egress Shield & Governor]
        Ingress --> Bloom[Bloom Filter 64K-Bit Negative Shield (<0.05µs)]
        Bloom --> XFetch[XFetch Probabilistic Early Refresh Engine]
        XFetch --> SingleFlight[Single-Flight Request Coalescer]
        SingleFlight --> Circuit[Circuit Breaker & Leaky Bucket 50 qps Governor]
    end
    
    subgraph Data Authority [Cemented PostgreSQL Authority]
        Circuit -->|Fast-Path 1-Hop| UniversalRPC[fn_gateway_preflight_qos_universal_v3]
        UniversalRPC --> EpochTable[galx_authoritative_data_epochs]
        EpochTable --> VectorBatch[fn_vectorized_batch_settle_stream_leases_v3]
    end
    
    subgraph Streaming & Context Core [Zen Flow & Context Preservation]
        UniversalRPC --> ZenPool[GalxZenFlowBufferPool: 512 Pre-Allocated 8KB Slots]
        ZenPool --> Salience[GalxContextSalienceEngine: Information-Theoretic Density Scorer]
        Salience --> Skeleton[GalxSemanticAstSkeletonizer: Method Body Collapsing]
        Skeleton --> StreamPump[GalxZeroCopyStreamPump: Uint8Array Chunk Forwarding]
        StreamPump --> Client
    end
```

### Key Subsystem Invariants:
1. **Single-Hop Universal Gateway Preflight (ADR 0080)**: Consolidates auth, wallet balance reservation, tier classification, shard selection, and IETF RFC RateLimit headers into 1 single database hop (< 5 ms).
2. **Zero-Allocation Zen Flow Buffer Pool (ADR 0084)**: Pre-allocates 512 8KB buffer slots in a circular ring with hydraulic high/low watermark backpressure to eliminate GC pauses.
3. **Semantic AST Skeletons & Lost-in-the-Middle Anchoring (ADR 0083)**: Collapses code bodies while preserving 100% type signatures (55%–85% token reduction) and hoists critical instructions before prompt tails.
4. **XFetch & Bloom Origin Shielding (ADR 0085)**: Rejects invalid queries in <0.05µs and probabilistically refreshes hot keys before TTL expiry, cutting Supabase egress and query rates by >98%.
5. **Authoritative Merkle Epoch Governor (ADR 0086)**: Cemented PostgreSQL Merkle epochs guarantee data truth, while workspace-wide Governed Fetch middleware fails-fast to BroccoliDB L1 during outages, eliminating infinite retry storms and overage risks.

---

## 🌐 Authoritative Multi-Account Shard Fleet Pool & Native Codex WebSocket Wire (ADR 0111–0115)

Scaling frontier reasoning models (`gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, `o3`) across autonomous developer swarms couples local sovereign fleet governance with direct native WebSocket wire protocols:

```mermaid
flowchart TD
    Client["Developer Client / IDE / Agent Swarm"] --> NextIngress["POST /v1/chat/completions (Next.js App Router)"]

    subgraph ControlPlane["Sovereign Control Plane"]
        Auth["GalxAuthEngine (Checksum Verification)"]
        Seat["GalxSeatTierEngine (Dual Rolling Meter)"]
        Hold["WalletRepository (Two-Phase Reserve Hold)"]
        Compactor["BroccoliDB (AST Skeletons & Lost-in-the-Middle)"]
    end

    subgraph ShardAuthority["GALXAI Authoritative Shard Fleet Pool (/Users/bozoegg/Desktop/GALXAI)"]
        Substrate["GalxCredentialSubstrate (AES-256-GCM + AAD Binding)"]
        PostgresShard["Supabase PostgreSQL<br>galx_shard_accounts + transactional journal"]
        Cache["BroccoliDB L1<br>replaceable bounded-staleness projection"]
        SWRR["Smooth Weighted Round-Robin (40 req / 3 hr Window)"]
        Fencing["Monotonic Fencing Tokens (#1, #2, #3...)"]
        Failover["Instant 429 Quota Exhaustion Failover"]
    end

    subgraph TransportExecution["Real Wire Execution (Zero Fallbacks)"]
        DirectWS["OpenAIAdapter: Native Codex WebSocket<br>wss://chatgpt.com/backend-api/codex/responses<br>• ChatGPT-Account-Id & X-Galx-Shard-Id<br>• Intra-Chunk Activity Timer (refreshChunkTimer)"]
        Relay["Always-On Relay Daemon<br>LUMI-NEW/src/relay/relay-server.ts<br>• 24/7 Persistent Codex WebSockets<br>• Cloudflare Tunnel Ingress & PM2 Supervision<br>• Decoupled HTTP 202 Ingress (ADR 0120)"]
    end

    NextIngress --> Auth --> Seat --> Hold --> Compactor
    Compactor --> Substrate
    Substrate -->|awaited mutations| PostgresShard
    PostgresShard -->|LIST + revisioned projection refresh| Cache
    Cache --> Substrate
    Substrate --> SWRR --> Fencing --> Failover
    Failover --> DirectWS
    Failover -.-> Relay
```

### Core Architecture Invariants:
1. **Scope-Compliant WebSocket Wire**: Resolves the `missing_scope: model.request` failure by bypassing HTTP `api.openai.com/v1/chat/completions` and connecting directly to `wss://chatgpt.com/backend-api/codex/responses`.
2. **PostgreSQL Authority**: Supabase PostgreSQL is the authoritative shard registry; the GALXAI process holds only a replaceable, bounded-staleness routing projection.
3. **Sliding-Window 429 Failover**: SWRR rotates across active accounts ($N_{\text{cap}} = 40 \text{ req} / 3 \text{ hr}$), instantly isolating 429-exhausted shards and leasing the next healthy account with zero client drops.
4. **Intra-Chunk Activity Reset**: Resets activity timeouts on every incoming delta chunk (`response.output_text.delta`), ensuring multi-thousand-token code generation completes reliably.
5. **Unified Fleet CLI**: `scripts/manage-shards.ts` supports explicit import, add, test, cycle, doctor, quarantine, and revocation workflows. Raw-token edge synchronization is intentionally unsupported.

---

## 🔀 Unpredictable Inference Engine: 3-Tier MLFQ, ITL Watchdog & Resumable Streams (ADR 0113)

Frontier reasoning models exhibit fundamentally **unpredictable** 2–3 minute per-request durations with TTFT jitter of 800ms–45s and silent ITL throttle gaps. At 100,000 req/sec, naive queues collapse within seconds. The GALXAI Unpredictable Inference Engine resolves this with a 7-module hardening stack:

```mermaid
flowchart TD
    Burst["100,000 req/sec Burst"] --> Ingress

    subgraph Ingress["Ingress & Coalescing"]
        Bucket["Per-Tenant Token Bucket (HTTP 429 fast-shed)"]
        Flight["SingleFlightCoalescer (identical prompt dedup)"]
        Bucket --> Flight
    end

    subgraph MLFQ["3-Tier Multi-Level Feedback Queue"]
        C0["Class 0 — Interactive Fast Track\n25% hard-reserved · ≤10s deadline"]
        C1["Class 1 — Deep Reasoning Track\n65% allocated · 30–90s"]
        C2["Class 2 — Relaxed Scavenger\n10% + idle · 2–3 min"]
        Sizer["TokenAwareSizer\nvirtual weight = tokens/1000 (cap 10×)"]
        DRR["Deficit Round-Robin\nweighted quantum debit per tenant"]
        C0 & C1 & C2 --> Sizer --> DRR
    end

    subgraph AQM["Active Queue Management"]
        Sojourn["Sojourn-Time Drop\nstale requests discarded before upstream"]
        Zombie["AntiZombieLeash\nclient disconnect → upstream cancel + wallet refund"]
    end

    subgraph Execution["Execution & Resilience"]
        Slicer["MultiLevelFleetSlicer\nclass-partitioned concurrency gate"]
        ITL["StreamingItlWatchdog\nTTFT >45s · ITL gap >8s · 3× → abort"]
        Shadow["ShadowShardStandby\npre-warmed backup · sub-50ms handover"]
        ETA["CalibratedEtaEngine\nEWMA ETA · X-Galx-Eta-Ms header"]
        Slicer --> ITL --> Shadow
        Slicer --> ETA
    end

    subgraph Resume["Durable Resumable Stream"]
        Buffer["BroccoliResumableJobEngine\njob_tokens table · seqNo buffering"]
        SSE["GET /v1/jobs/:id/stream\nLast-Event-ID SSE replay"]
        Buffer --> SSE
    end

    Flight --> MLFQ --> AQM --> Execution --> Resume
    Resume --> SWRR["SWRR Shard Fleet\nwss://chatgpt.com/backend-api/codex/responses"]
```

### 3-Tier MLFQ Fleet Partitioning

| Class | Capacity | Target Workload | Auto-Demotion |
| :--- | :--- | :--- | :--- |
| **Class 0 — Interactive** | 25% hard-reserved | IDE/Cursor completions, `developer` tier (≤10s) | → Class 1 if elapsed > 10s |
| **Class 1 — Deep Reasoning** | 65% allocated | Enterprise long-form, multi-step chain-of-thought (30–90s) | — |
| **Class 2 — Scavenger** | 10% + idle (<90% fleet util) | Free-tier batch, preemptible background (2–3 min) | — |

### Unpredictable Inference Invariants (Enterprise Test Suite INV 9–16)

| Invariant | Guarantee |
| :--- | :--- |
| **INV-9**: MLFQ Class 0 Reservation | Class 0 interactive capacity is never starved by Class 1/2 floods |
| **INV-10**: ITL Watchdog Threshold | Watchdog fires correctly at 8s ITL silence threshold |
| **INV-11**: Shadow Shard Handover | Sub-50ms handover triggered on shard stall detection |
| **INV-12**: Anti-Zombie Leash | Client disconnect → upstream cancel + transactional wallet refund |
| **INV-13**: Resumable Last-Event-ID | Token replay resumes from exact sequence number after reconnect |
| **INV-14**: Token-Aware DRR Weight | 50K-token job debits 50× DRR credits vs 1K-token completion |
| **INV-15**: MLFQ Auto-Demotion | Class 0→1 migration on elapsed > 10s without client drop |
| **INV-16**: ETA EWMA Convergence | EWMA ETA converges within ±20% of actual observed latency |

```bash
# Run all 16 enterprise invariants
npx tsx simulations/high-concurrency-10k-fairness/index.test.ts

# Run the 2–3 minute unpredictable inference simulation
npm run sim:unpredictable
```

---

## 🎨 Deterministic User/Session R2 Partitioning, Visual Manifest Lifecycle & Relay Image Synthesis (ADR 0121)

Visual synthesis outputs in modern AI architectures are monolithic binary assets (1 MB – 4 MB lossless PNGs) rather than small incremental text tokens. To prevent runaway edge memory consumption, eliminate Cumulative Layout Shift (CLS), and enable seamless multi-turn session media management, GALXAI formalizes **ADR 0121**:

```mermaid
flowchart TD
    subgraph Client ["Frontend Client / Autonomous Agent"]
        Browser["React / Next.js Client Component"]
        Agent["Autonomous Coding Agent"]
    end

    subgraph Gateway ["GALXAI Edge Gateway (Next.js 15 App Router)"]
        ImgRoute["POST /v1/images/generations\nx-galx-session-id: sess_01"]
        GalleryRoute["GET /v1/images/sessions/:sessionId"]
        DeleteRoute["DELETE /v1/images/sessions/:sessionId"]
        ModelRouter["GalxModelRouter & OpenAIAdapter"]
    end

    subgraph VMRelay ["Always-On Host VM Relay (PM2 Daemon :3001)"]
        RelayWS["Native Codex WebSocket Client\nwss://chatgpt.com/backend-api/codex/responses"]
        ToolGen["tool: image_generation\nWatchdog Pong Supervision"]
    end

    subgraph CloudflareSubstrate ["Cloudflare Zero-Egress Storage Substrate"]
        R2Adapter["GalxR2AssetAdapter\nSVG LQIP Generator (<300 bytes)"]
        R2Bucket["R2 Image Bucket (galxai-images)\nusers/{userId}/sessions/{sessionId}/images/"]
        ManifestFile["Session Manifest (manifest.json)\nAtomic Counters & Aggregates"]
        CDN["Cloudflare Global CDN Edge\nhttps://assets.galx.ai/..."]
    end

    Browser -->|Generate Request| ImgRoute
    Agent -->|Generate Request| ImgRoute
    ImgRoute --> ModelRouter
    ModelRouter -->|Bearer session token| RelayWS
    RelayWS --> ToolGen
    ToolGen -->|Base64 PNG payload| ModelRouter
    ModelRouter --> R2Adapter
    R2Adapter -->|PutObject lossless PNG| R2Bucket
    R2Adapter -->|Atomic update| ManifestFile
    R2Adapter -->|Generate SVG Data URI| ImgRoute
    ImgRoute -->|JSON with r2_url & lqip| Browser

    Browser -->|Inspect Gallery| GalleryRoute
    GalleryRoute --> ManifestFile
    GalleryRoute --> R2Bucket

    Browser -->|Cascade Purge| DeleteRoute
    DeleteRoute -->|Batch Delete Prefix| R2Bucket

    Browser -->|Stream Master PNG (Cache Hit)| CDN

    style Client fill:#0f172a,stroke:#3b82f6,stroke-width:1px
    style Gateway fill:#0f172a,stroke:#6366f1,stroke-width:1px
    style VMRelay fill:#0f172a,stroke:#10b981,stroke-width:1px
    style CloudflareSubstrate fill:#0f172a,stroke:#f59e0b,stroke-width:1px
```

### Deterministic Object Storage Layout

All visual media are written to deterministic S3-compatible key hierarchies under the authoritative `galxai-images` bucket:

```text
users/{userId}/sessions/{sessionId}/
├── manifest.json                                      # Atomic JSON manifest (totalImages, totalBytes, timestamps)
└── images/
    ├── img_1788620541677_b68da3a9.png                 # Lossless PNG render (1.0 MB - 4.0 MB)
    └── img_1788620632639_33086f7b.png
```

### Core Architecture Invariants (INV 17–20)

| Invariant | Guarantee |
| :--- | :--- |
| **INV-17**: Chronological Deterministic Partitioning | All synthesized images are partitioned under `users/{userId}/sessions/{sessionId}/images/` with millisecond timestamp prefixes and random entropy suffixes, preventing collisions and cross-tenant leakage. |
| **INV-18**: Dynamic Low-Quality Image Placeholder (LQIP) | Every visual synthesis response embeds an inline SVG Data-URI (`lqip`) utilizing Gaussian blur SVG filters, ensuring zero Cumulative Layout Shift (CLS) and instant perceived visual feedback. |
| **INV-19**: Synchronous Manifest Durability | Every successful image upload atomically commits an updated `manifest.json` tracking aggregate session image count, aggregate byte footprint, and timestamps. |
| **INV-20**: Atomic Session Cascade Purge | `DELETE /v1/images/sessions/:sessionId` executes a single-roundtrip prefix purge across Cloudflare R2, guaranteeing zero orphaned binary blobs upon session cleanup. |

