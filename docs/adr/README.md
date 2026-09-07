# Architecture decision records

Current strategy is defined by [ADR 0119](0119-inference-first-product-surface-and-client-retirement.md) for the product surface and [ADR 0122](0122-isolated-authenticated-relay-and-bounded-recovery.md) for isolated relay deployment, authentication, and bounded recovery. ADR 0115 defines registry authority and the platform lease path, with an explicit standalone-relay exception. ADR 0121 documents the separate application image lifecycle.

Records preserve decision provenance; an old accepted decision is not evidence that every described module, performance result, or deployment is current. Later scoped decisions take precedence. ADRs 0111–0113 and 0120 have been rewritten to remove superseded relay instructions and state the current boundaries. Refer to [Architecture](../ARCHITECTURE.md) and the [relay deployment runbook](../VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md) for implementation and dated verification.

## Complete catalog

| Record | Title |
| --- | --- |
| [0001](0001-unified-pooled-quota-cycling-substrate.md) | ADR 0001: Unified Pooled Quota Cycling Substrate |
| [0002](0002-two-phase-token-reservation-and-rate-governance.md) | ADR 0002: 2-Phase Token Reservation & Continuous Calculus Rate Governance |
| [0003](0003-aes-256-gcm-envelope-encryption-with-aad-binding.md) | ADR 0003: AES-256-GCM Envelope Encryption with AAD Binding & Heap Scrubbing |
| [0004](0004-four-state-circuit-breaker-and-failover-topology.md) | ADR 0004: 4-State Circuit Breaker & Half-Open Canary Traffic Warming |
| [0005](0005-circular-buffer-telemetry-and-ewma-latency-scoring.md) | ADR 0005: Zero-Allocation Circular Ring Buffer Telemetry & EWMA Latency |
| [0006](0006-intelligent-multi-tiered-discount-strategy.md) | ADR 0006: Intelligent Multi-Tiered Discount & Prompt-Caching Strategy |
| [0007](0007-proof-of-deposit-and-50pct-match-paywall-gate.md) | ADR 0007: Proof-of-Deposit Security Gate & 50% Match Paywall Architecture |
| [0008](0008-tenant-affinity-shard-dispersion-and-post-allocation-leveling.md) | ADR 0008: Tenant-Affinity Shard Dispersion (TASD) & Post-Allocation Headroom Leveling |
| [0009](0009-half-open-canary-traffic-warming-and-lease-scavenger.md) | ADR 0009: 4-Phase Half-Open Canary Traffic Warming & Background Lease Scavenger |
| [0010](0010-cloudtasks-cloudrun-asynchronous-queue-substrate.md) | ADR 0010: CloudTasks & CloudRun Inspired Asynchronous Queue Substrate |
| [0011](0011-directed-acyclic-graph-workflows-and-realtime-event-streaming.md) | ADR 0011: Directed Acyclic Graph (DAG) Workflows & Real-Time Event Streaming |
| [0012](0012-universal-developer-sdk-and-ergonomics-substrate.md) | ADR 0012: Universal Developer SDK & Developer Experience (DX) Substrate |
| [0013](0013-fluent-builders-structured-outputs-and-dx-ergonomics.md) | ADR 0013: Fluent Builders, Structured Outputs & DX Ergonomics Substrate |
| [0014](0014-apex-agent-runtime-middleware-and-resilience-substrate.md) | ADR 0014: Apex Agent Runtime, Middleware & Resilience Substrate |
| [0015](0015-zero-egress-cloudflare-workers-edge-compute-mesh.md) | ADR 0015: Zero-Egress Cloudflare Workers Edge Compute Mesh |
| [0016](0016-authoritative-supabase-postgresql-substrate.md) | ADR 0016: Authoritative Supabase PostgreSQL Substrate |
| [0017](0017-high-throughput-binary-wire-and-rpc-micro-batching.md) | ADR 0017: High-Throughput Binary Wire Protocol & RPC Micro-Batching |
| [0018](0018-edge-speculative-streaming-and-keepalive-connection-pools.md) | ADR 0018: Edge Speculative Streaming & Pre-Warmed Keep-Alive Connection Pools |
| [0019](0019-autonomous-shard-health-probes-and-budget-governance.md) | ADR 0019: Autonomous Shard Health Probes & Multi-Tenant Budget Governance |
| [0020](0020-provider-as-auth-zero-friction-session-substrate.md) | ADR 0020: Provider-as-Auth Paradigm & Zero-Friction Shard Vaulting |
| [0021](0021-jwe-compact-session-encryption-and-dpop-fingerprinting.md) | ADR 0021: JWE Compact Session Encryption & DPoP Client Fingerprinting |
| [0022](0022-oauth-token-rotation-with-reuse-attack-detection-cascades.md) | ADR 0022: OAuth 2.0 Token Rotation with Reuse Attack Detection Cascades (RFC 6819) |
| [0023](0023-step-up-sudo-elevation-and-fine-grained-token-scoping.md) | ADR 0023: Step-Up SUDO Session Elevation & Fine-Grained Token Scoping |
| [0024](0024-adaptive-behavioral-risk-scoring-and-zero-downtime-kms-rewrapping.md) | ADR 0024: Adaptive Behavioral Risk Scoring & Zero-Downtime KMS Key Re-Wrapping |
| [0025](0025-broccolidb-l1-reactive-in-memory-table-and-secondary-indexing.md) | ADR 0025: BroccoliDB L1 Reactive In-Memory Table & Multi-Dimensional Secondary Indexing |
| [0026](0026-broccolidb-natural-language-query-ast-parser-and-wal-persistence.md) | ADR 0026: BroccoliDB Natural Query AST Parser & Cryptographic WAL Persistence |
| [0027](0027-enterprise-privacy-safe-harbor-18-gdpr-and-zdr-v10-memory-zeroization.md) | ADR 0027: Enterprise Privacy Substrate (Safe Harbor 18, GDPR, Global Privacy & ZDR v10.0 Memory Zeroization) |
| [0028](0028-soc2-type-ii-compliance-engine-drift-detector-and-merkle-audit-ledger.md) | ADR 0028: SOC 2 Type II Compliance Engine, Drift Detector & Merkle Audit Ledger |
| [0029](0029-sliding-window-streaming-transformer-and-cross-chunk-split-pii.md) | ADR 0029: Sliding-Window Streaming Transformer & Cross-Chunk Boundary PII Redaction |
| [0030](0030-ephemeral-session-enclave-and-zero-knowledge-attestation-tickets.md) | ADR 0030: Ephemeral Session Enclaves & Zero-Knowledge Attestation Tickets (ZKAT) |
| [0031](0031-dynamic-security-probe-and-automated-drift-healing.md) | ADR 0031: Dynamic Security Pen-Test Probe & Autonomous Drift Remediation |
| [0032](0032-ultra-flat-effortless-sdk-strategy-and-callable-tagged-templates.md) | ADR 0032: Ultra-Flat Effortless Developer SDK Strategy & Tagged Template Invocation |
| [0033](0033-universal-api-strategy-anthropic-messages-embeddings-and-health.md) | ADR 0033: Universal API Strategy: Anthropic Messages, Embeddings & Discovery |
| [0034](0034-autonomous-agent-1-click-context-and-auto-copy-substrate.md) | ADR 0034: Autonomous Agent 1-Click Context & Zero-Friction Event Pipeline |
| [0035](0035-paranoid-supabase-postgresql-and-ai-agent-governance.md) | ADR 0035: Paranoid Supabase PostgreSQL Architecture & AI Agent Long-Term Governance Substrate |
| [0036](0036-universal-developer-authentication-gating-and-zero-abuse-workspace-perimeter.md) | ADR 0036: Universal Developer Authentication Gating & Zero-Abuse Workspace Perimeter |
| [0037](0037-zero-egress-cloudflare-edge-gateway-and-r2-cdn-substrate.md) | ADR 0037: Zero-Egress Cloudflare Edge Gateway, R2 CDN & Custom Domain Substrate |
| [0038](0038-distributed-edge-kv-rate-governance-and-swr-catalog-caching.md) | ADR 0038: Distributed Edge KV Rate Governance & Stale-While-Revalidate Model Catalog Caching |
| [0039](0039-edge-native-vector-embeddings-and-durable-object-swarm-sync.md) | ADR 0039: Edge-Native Vector Embeddings & Durable Object Swarm State Synchronization |
| [0040](0040-enterprise-vercel-pre-deployment-gate-and-multi-region-topology.md) | ADR 0040: Enterprise Vercel Pre-Deployment Gate, Next.js 15 Optimization & Multi-Region Topology |
| [0041](0041-zero-collision-typescript-ambient-isolation-and-dual-runtime-mesh.md) | ADR 0041: Zero-Collision TypeScript Ambient Isolation & Dual-Engine Runtime Mesh |
| [0042](0042-universal-zero-hesitation-developer-ergonomics-and-mental-model-absorption.md) | ADR 0042: Universal Zero-Hesitation Developer Ergonomics & Mental Model Absorption Substrate |
| [0043](0043-broccolidb-hybrid-resilience-outbox-disaster-recovery-and-sla-uptime.md) | ADR 0043: BroccoliDB Hybrid Resilience Substrate, Zero-Loss Outbox & Dual-Slot Disaster Recovery (RPO = 0, RTO < 5ms) |
| [0044](0044-non-technical-natural-omnisearch-and-approachable-error-recovery.md) | ADR 0044: Non-Technical Natural OmniSearch & Approachable Self-Healing Error Recovery |
| [0045](0045-single-flight-request-coalescing-soundex-phonetic-and-sub-15ms-ttft.md) | ADR 0045: Single-Flight Request Coalescing, Soundex Phonetic Typo Absorption & Sub-15ms TTFT Streaming Substrate |
| [0046](0046-sub-microsecond-l1-storage-zero-copy-streaming-and-socket-prewarming.md) | ADR 0046: Sub-Microsecond L1 In-Memory Storage Mirroring, Zero-Copy Direct Buffer Streaming & Persistent Upstream Socket Pre-Warming |
| [0047](0047-programmatic-seo-geo-aeo-and-structured-jsonld-saturation.md) | ADR 0047: Programmatic SEO (pSEO), Generative Engine Optimization (GEO), Answer Engine Optimization (AEO) & Structured JSON-LD Saturation |
| [0048](0048-interactive-developer-studio-tools-and-edge-simulators.md) | ADR 0048: Interactive Developer Studio Tools, Client-Side Simulators & Memory-Isolated Utilities |
| [0049](0049-enterprise-governance-security-patterns-and-compliance-matrix.md) | ADR 0049: Enterprise Governance, AI Red-Teaming Patterns, Industry Verticals & Compliance Matrix |
| [0050](0050-incident-postmortems-resilience-engineering-and-sla-failover.md) | ADR 0050: AI Incident Postmortems, Resilience Engineering & Multi-Origin SLA Failover |
| [0051](0051-enterprise-oauth2-fapi-token-lifecycle-and-identity-mesh.md) | 51. Enterprise OAuth 2.0 / 2.1, FAPI Standards, Token Lifecycle & Identity Mesh |
| [0052](0052-enterprise-oauth21-rtr-fapi-backchannel-and-vacuum-mesh.md) | 52. Enterprise OAuth 2.1 Refresh Token Rotation (RTR), Token Family Theft Containment, OIDC Back-Channel Logout & Substrate Vacuum Mesh |
| [0053](0053-siloed-supabase-oauth-and-isolated-backend-sharding-mesh.md) | 0053. Siloed Supabase OAuth Platform Authentication & Isolated Backend Substrate Sharding Mesh |
| [0054](0054-apex-transport-hardening-rfc9530-rfc9421-idempotency-and-anti-replay.md) | 0054. Apex Transport Layer Hardening: RFC 9530 Digests, RFC 9421 Signatures, IETF Idempotency, and Anti-Replay Nonces |
| [0055](0055-ambient-declarative-ai-substrate-zero-route-and-auto-patcher.md) | ADR 0055: Ambient Declarative AI Substrate, Zero-Route Direct Actions & Runtime Auto-Patcher |
| [0056](0056-broccolidb-85-buffer-deduplication-and-streaming-pipeline-substrate.md) | ADR 0056: BroccoliDB 85-Buffer Algorithmic DeDuplication & High-Velocity Streaming Substrate |
| [0057](0057-broccolidb-mega-incident-cascader-and-pyramid-compaction-substrate.md) | ADR 0057: Mega-Incident Stream Cascading & Mega-Document Hierarchical Pyramid Compactor |
| [0058](0058-broccolidb-180-domain-industry-cluster-compactor-substrate.md) | ADR 0058: BroccoliDB 180-Domain Enterprise Industry Cluster Compaction Substrate |
| [0059](0059-broccolidb-safe-compaction-facade-barrel-hardening-and-api-gateway.md) | ADR 0059: BroccoliDB Safe Compaction Facade, Barrel Hardening, and Production API Gateway |
| [0060](0060-broccolidb-high-velocity-domain-expansion-and-stream-compaction.md) | ADR 0060: BroccoliDB High-Velocity Domain Expansion, Drain Log Clustering, Distributed Trace Slicing, and Telemetry Stream Compaction |
| [0061](0061-broccolidb-network-orderbook-and-sliding-window-stream-compaction.md) | ADR 0061: BroccoliDB NetFlow Security, L2 Order Book Depth, and Continuous Sliding-Window Stream Compaction |
| [0062](0062-broccolidb-industrial-iot-clickstream-genomics-and-hybrid-stream-multiplexing.md) | ADR 0062: BroccoliDB Industrial IoT Sensors, Clickstream RUM, Genomic Sequencing & Hybrid Stream Multiplexing |
| [0063](0063-broccolidb-ebpf-k8s-geospatial-and-arrow-dictionary-stream-compaction.md) | ADR 0063: BroccoliDB Kernel eBPF Runtime Security, Kubernetes Watch Deltas, Geospatial ADS-B/AIS & Apache Arrow Dictionary Stream Compaction |
| [0064](0064-broccolidb-openai-inference-boundary-measurement-and-task-suite.md) | ADR 0064: BroccoliDB OpenAI Inference Boundary Empirical Measurement & Task Suite |
| [0065](0065-broccolidb-blinded-evaluator-protocol-and-out-of-sample-validation.md) | ADR 0065: BroccoliDB Randomized Branch-Blinded A/B Evaluation Protocol & Out-of-Sample Validation |
| [0066](0066-institutional-entropy-resistance-and-epistemic-compression.md) | ADR 0066: Institutional Entropy Resistance & Epistemic Representation Compression |
| [0067](0067-representation-selection-and-adaptive-density-bypass.md) | ADR 0067: Adaptive Representation Selection & Density Bypass Substrate |
| [0068](0068-dual-rolling-window-seat-quotas-and-distributed-request-leases.md) | ADR 0068: Dual Rolling Window Seat Quotas and Distributed Request Leases |
| [0069](0069-hybrid-broccolidb-postgres-rolling-context-and-5-level-pyramid.md) | ADR 0069: Hybrid BroccoliDB-PostgreSQL Rolling Context and 5-Level Multi-Resolution Pyramid |
| [0070](0070-elastic-dynamic-context-governor-and-atomic-turn-pair-integrity.md) | ADR 0070: Elastic Dynamic Context Governor and Atomic Turn-Pair Integrity |
| [0071](0071-cross-session-universal-workspace-anchors-and-hardware-cache-topology.md) | ADR 0071: Cross-Session Universal Workspace Anchors and Hardware Cache Topology |
| [0072](0072-exact-owner-chat-persistence-and-delta-sync-mesh.md) | ADR 0072: Exact-Owner Chat Persistence and Delta Sync Mesh |
| [0073](0073-zero-dependency-post-training-cognitive-labeling-and-4-stage-substrate.md) | ADR 0073: Zero-Dependency Post-Training Cognitive Labeling & 4-Stage Substrate |
| [0074](0074-deepseek-v3-r1-mla-compression-latent-kv-dequantization-and-dualpipe.md) | ADR 0074: DeepSeek-V3/R1 Multi-Head Latent Attention (MLA), KV Dequantization & DualPipe Parallelism |
| [0075](0075-speculative-verification-trees-eagle2-medusa-and-head-entropy-pruning.md) | ADR 0075: Speculative Verification Trees, EAGLE-2, Medusa & Head Entropy Pruning |
| [0076](0076-dynamic-sequence-packing-mask-slicing-dpo-length-debiasing-and-gradient-shield.md) | ADR 0076: Dynamic Sequence Packing Mask Slicing, Online DPO Length Debiasing & Loss-Truncated Gradient Shielding |
| [0077](0077-autonomous-cloudflare-r2-sync-and-cryptographic-merkle-manifest-catalog.md) | ADR 0077: Autonomous Cloudflare R2 Sync & Cryptographic Merkle Manifest Catalog |
| [0078](0078-glm-53-flash-indexshare-sparse-attention-and-slime-async-rl.md) | ADR 0078: GLM-5.3 Flash IndexShare Sparse Attention, Slime Asynchronous RL & Hybrid Thinking Modes |
| [0079](0079-lumi-and-community-qos-multi-tier-pool-mesh.md) | ADR 0079: LUMI & Community QoS Multi-Tier Pool Mesh and IETF RateLimit Generation |
| [0080](0080-zero-roundtrip-preflight-and-vectorized-batch-sync.md) | ADR 0080: Zero-Roundtrip Preflight and Vectorized Batch Sync Engine |
| [0081](0081-monotonic-stream-deltas-and-zero-copy-pump.md) | ADR 0081: Monotonic Stream Deltas and Zero-Copy Stream Pump |
| [0082](0082-prompt-compaction-predictive-routing-and-quality-sentinels.md) | ADR 0082: Deterministic Prompt Compaction, Strict Model Fidelity & Quality Sentinels |
| [0083](0083-context-window-preservation-and-ast-skeletons.md) | ADR 0083: Context Window Preservation and Semantic AST Skeletons |
| [0084](0084-context-salience-and-zen-flow-buffer-pool.md) | ADR 0084: Context Salience Scoring and High-Throughput Zen Flow Buffer Pool |
| [0085](0085-zero-egress-keyset-sync-and-xfetch-bloom-shield.md) | ADR 0085: Zero-Egress Keyset Sync, XFetch Early Recomputation & Bloom Origin Shield |
| [0086](0086-authoritative-merkle-governor-and-circuit-breaker.md) | ADR 0086: BroccoliDB Authoritative Merkle Governor & Workspace-Wide Circuit Breaker |
| [0087](0087-dual-window-hybrid-rate-governance-and-sliding-window-log.md) | ADR 0087: Dual-Window Hybrid Rate Governance, Sliding Request Logs & Zero-Trust Resynchronization |
| [0088](0088-enterprise-six-state-circuit-breaker-single-canary-and-quadratic-warmup.md) | ADR 0088: Enterprise 6-State Circuit Breaker, Strict Single-Canary Slotting & Slow-Start Quadratic Warmup |
| [0089](0089-anti-stampede-bounded-admission-queue-and-aimd-concurrency-limiter.md) | ADR 0089: Anti-Stampede Bounded Admission Queue & AIMD Adaptive Concurrency Limiter |
| [0090](0090-zero-egress-write-behind-micro-batch-sync-buffer.md) | ADR 0090: Zero-Egress Write-Behind Micro-Batch Synchronization Buffer |
| [0091](0091-developer-gateway-key-governance-and-enterprise-rotation-ergonomics.md) | ADR 0091: Developer Gateway Key Governance & Enterprise Rotation Ergonomics |
| [0092](0092-broccolidb-l0-nanosecond-pointer-cache-and-negative-caching-defense.md) | ADR 0092: BroccoliDB L0 Nanosecond Pointer Cache & Negative Caching Defense |
| [0093](0093-postgresql-connection-pool-circuit-breaker-and-atomic-coalesced-write-behind.md) | ADR 0093: PostgreSQL Connection Pool Circuit Breaker & Atomic Coalesced Write-Behind |
| [0094](0094-workspace-wide-direct-connection-pooling-and-queue-saturation-governance.md) | ADR 0094: Workspace-Wide Direct Connection Pooling & Queue Saturation Governance |
| [0095](0095-zero-cycle-dispatcher-token-hash-memoization-and-in-place-l0-mutation.md) | ADR 0095: Zero-Cycle Dispatcher, Token Hash Memoization & In-Place L0 Mutation |
| [0096](0096-connection-pool-security-isolation-and-tenant-guardrails.md) | ADR 0096: Connection Pool Security Isolation & Tenant Guardrails |
| [0097](0097-transaction-scoped-tenant-rls-over-direct-connection-pooling.md) | ADR 0097: Transaction-Scoped Tenant RLS Over Direct Connection Pooling |
| [0098](0098-pg-socket-destroy-on-error-and-jwt-claims-json-injection.md) | ADR 0098: PostgreSQL Socket Destruction on Error & Complete JWT Claims JSON Injection |
| [0099](0099-forced-rls-and-declarative-session-context-procedures.md) | ADR 0099: Forced RLS & Declarative Session Context Procedures |
| [0100](0100-audit-immutability-and-kernel-tenant-binding-triggers.md) | ADR 0100: Audit Immutability Triggers & Kernel Tenant-Binding Enforcement |
| [0101](0101-persona-image-forced-rls-and-ownership-reassignment-defense.md) | ADR 0101: Persona & Image Forced RLS with Ownership Reassignment Armor |
| [0102](0102-chat-messages-access-validation-and-tasks-crud-rls.md) | ADR 0102: Chat Messages Access Validation & Tasks CRUD RLS Armor |
| [0103](0103-chat-memory-and-billing-forced-rls-and-ownership-armor.md) | ADR 0103: Chat Memory & Billing Forced RLS with Ownership Armor |
| [0104](0104-least-privilege-dac-grants-for-authenticated-tenant-role.md) | ADR 0104: Least-Privilege DAC Table Grants for Authenticated Tenant Role |
| [0105](0105-tenant-id-constraints-and-leakproof-rls-armor.md) | ADR 0105: Tenant ID CHECK Constraints & LEAKPROOF RLS Optimization |
| [0106](0106-wallet-balance-tamper-proofing-and-billing-ledger-immutability.md) | ADR 0106: Wallet Balance Tamper-Proofing & Financial Ledger Immutability |
| [0107](0107-api-credit-handling-and-quota-pool-armor.md) | ADR 0107: API Credit Handling & Quota Pool Armor |
| [0108](0108-workspaces-and-team-billing-spend-armor.md) | ADR 0108: Workspaces & Team Billing Spend Armor |
| [0109](0109-sovereign-backend-inference-pipeline-and-native-flagship-pool.md) | ADR 0109: Sovereign Backend Inference Pipeline & Native Flagship Pool |
| [0110](0110-e2e-inference-verification-suite-and-artifact-telemetry.md) | ADR 0110: End-to-End Inference Verification Suite & Artifact Telemetry |
| [0111](0111-cloudflare-edge-swrr-fleet-session-sticky-prompt-caching-and-codex-concurrency-isolation.md) | ADR 0111: Separate edge and Node inference transports |
| [0112](0112-galxai-authoritative-shard-fleet-pool-native-codex-websocket-wire-and-sliding-window-failover.md) | ADR 0112: Registry-backed provider routing and relay transport |
| [0113](0113-unpredictable-2-3-minute-inference-mlfq-itl-watchdog-and-resumable-streams.md) | ADR 0113: Long-running inference experiments and relay recovery scope |
| [0114](0114-uncertain-execution-authority-kernel-and-transactional-journal.md) | ADR 0114: Uncertain Execution Authority Kernel and Transactional Journal |
| [0115](0115-postgresql-authoritative-shard-registry-and-secret-free-projections.md) | ADR 0115: PostgreSQL-Authoritative Shard Registry and Secret-Free Projections |
| [0116](0116-logical-agent-session-identity-and-client-multiplexing.md) | ADR 0116: Logical Agent Session Identity and Client Multiplexing |
| [0117](0117-server-mediated-tenant-authority-and-secure-postgres-defaults.md) | ADR 0117: Server-Mediated Tenant Authority & Secure PostgreSQL Defaults |
| [0118](0118-versioned-same-origin-agent-client-deployment.md) | ADR 0118: Versioned Same-Origin Agent Client Deployment |
| [0119](0119-inference-first-product-surface-and-client-retirement.md) | ADR 0119: Inference-First Product Surface and First-Party Client Retirement |
| [0120](0120-zero-cost-host-mac-cloudflare-tunnel-relay-ingress-and-protocol-hardening.md) | ADR 0120: Host relay ingress and deployment boundary |
| [0121](0121-user-and-session-r2-partitioning-manifest-lifecycle-and-relay-image-synthesis.md) | ADR 0121: Provider image synthesis and user/session asset persistence |
| [0122](0122-isolated-authenticated-relay-and-bounded-recovery.md) | ADR 0122: Isolated authenticated relay and bounded recovery |
