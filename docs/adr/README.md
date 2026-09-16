# Architecture decision records

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

Public information authority is [ADR 0129](0129-public-image-artifacts-and-verified-identity.md). Internal relay authority is the [federation contract](../FEDERATION_STRATEGY.md): ADR 0126 establishes capability-aware ownership; 0127 the explicit image alias; 0128 documentation authority; 0130 uncertain image outcomes; 0131 operator sessions and holds; 0132 recoverable credential handoff; and 0133 explicit enrollment/test isolation. ADRs 0134–0136 govern fixed-price Sites content, durable text receipt recovery and customer-owned delivery. ADRs 0123–0125 govern database health separately.

Status and operational guidance are reconciled when decisions change; original measurements and rollout facts remain explicitly dated. A proposed or accepted design is not deployment evidence. Partial supersession is topic-specific. A successor banner cannot make obsolete body instructions current.

[ADR 0144](0144-durable-images-and-incident-documentation.md) adds durable application image receipts and the maintained incident/documentation system. Later Sites decisions 0139–0143 define the public workspace, paid-plan inclusion and conversations; historical fixed tariffs retain only their existing-operation scope.

Use the [authoring guide](../maintainers/ADR_AUTHORING_AND_LIFECYCLE_GUIDE.md) for new records and the [complete corpus catalog](../CATALOG.md) for guides, references, and research.

[ADR 0145](0145-maintained-knowledge-and-decision-lifecycle.md) adds task discovery, domain source review and a separate [decision lifecycle register](../knowledge/DECISIONS.md). Legacy records are not automatically promoted to accepted or deployed.

## Complete decision catalog

| ID | Decision | Current reading scope |
| --- | --- | --- |
| 0001 | [ADR 0001: Unified Pooled Quota Cycling Substrate](0001-unified-pooled-quota-cycling-substrate.md) | Historical/domain decision; see scope note |
| 0002 | [ADR 0002: 2-Phase Token Reservation & Continuous Calculus Rate Governance](0002-two-phase-token-reservation-and-rate-governance.md) | Historical/domain decision; see scope note |
| 0003 | [ADR 0003: AES-256-GCM Envelope Encryption with AAD Binding & Heap Scrubbing](0003-aes-256-gcm-envelope-encryption-with-aad-binding.md) | Historical/domain decision; see scope note |
| 0004 | [ADR 0004: 4-State Circuit Breaker & Half-Open Canary Traffic Warming](0004-four-state-circuit-breaker-and-failover-topology.md) | Historical/domain decision; see scope note |
| 0005 | [ADR 0005: Zero-Allocation Circular Ring Buffer Telemetry & EWMA Latency](0005-circular-buffer-telemetry-and-ewma-latency-scoring.md) | Historical/domain decision; see scope note |
| 0006 | [ADR 0006: Intelligent Multi-Tiered Discount & Prompt-Caching Strategy](0006-intelligent-multi-tiered-discount-strategy.md) | Historical/domain decision; see scope note |
| 0007 | [ADR 0007: Proof-of-Deposit Security Gate & 50% Match Paywall Architecture](0007-proof-of-deposit-and-50pct-match-paywall-gate.md) | Historical/domain decision; see scope note |
| 0008 | [ADR 0008: Tenant-Affinity Shard Dispersion (TASD) & Post-Allocation Headroom Leveling](0008-tenant-affinity-shard-dispersion-and-post-allocation-leveling.md) | Historical/domain decision; see scope note |
| 0009 | [ADR 0009: 4-Phase Half-Open Canary Traffic Warming & Background Lease Scavenger](0009-half-open-canary-traffic-warming-and-lease-scavenger.md) | Historical/domain decision; see scope note |
| 0010 | [ADR 0010: CloudTasks & CloudRun Inspired Asynchronous Queue Substrate](0010-cloudtasks-cloudrun-asynchronous-queue-substrate.md) | Historical/domain decision; see scope note |
| 0011 | [ADR 0011: Directed Acyclic Graph (DAG) Workflows & Real-Time Event Streaming](0011-directed-acyclic-graph-workflows-and-realtime-event-streaming.md) | Historical/domain decision; see scope note |
| 0012 | [ADR 0012: Universal Developer SDK & Developer Experience (DX) Substrate](0012-universal-developer-sdk-and-ergonomics-substrate.md) | Historical/domain decision; see scope note |
| 0013 | [ADR 0013: Fluent Builders, Structured Outputs & DX Ergonomics Substrate](0013-fluent-builders-structured-outputs-and-dx-ergonomics.md) | Historical/domain decision; see scope note |
| 0014 | [ADR 0014: Apex Agent Runtime, Middleware & Resilience Substrate](0014-apex-agent-runtime-middleware-and-resilience-substrate.md) | Historical/domain decision; see scope note |
| 0015 | [ADR 0015: Zero-Egress Cloudflare Workers Edge Compute Mesh](0015-zero-egress-cloudflare-workers-edge-compute-mesh.md) | Historical/domain decision; see scope note |
| 0016 | [ADR 0016: Authoritative Supabase PostgreSQL Substrate](0016-authoritative-supabase-postgresql-substrate.md) | Historical/domain decision; see scope note |
| 0017 | [ADR 0017: High-Throughput Binary Wire Protocol & RPC Micro-Batching](0017-high-throughput-binary-wire-and-rpc-micro-batching.md) | Historical/domain decision; see scope note |
| 0018 | [ADR 0018: Edge Speculative Streaming & Pre-Warmed Keep-Alive Connection Pools](0018-edge-speculative-streaming-and-keepalive-connection-pools.md) | Historical/domain decision; see scope note |
| 0019 | [ADR 0019: Autonomous Shard Health Probes & Multi-Tenant Budget Governance](0019-autonomous-shard-health-probes-and-budget-governance.md) | Historical/domain decision; see scope note |
| 0020 | [ADR 0020: Provider-as-Auth Paradigm & Zero-Friction Shard Vaulting](0020-provider-as-auth-zero-friction-session-substrate.md) | Historical/domain decision; see scope note |
| 0021 | [ADR 0021: JWE Compact Session Encryption & DPoP Client Fingerprinting](0021-jwe-compact-session-encryption-and-dpop-fingerprinting.md) | Historical/domain decision; see scope note |
| 0022 | [ADR 0022: OAuth 2.0 Token Rotation with Reuse Attack Detection Cascades (RFC 6819)](0022-oauth-token-rotation-with-reuse-attack-detection-cascades.md) | Historical/domain decision; see scope note |
| 0023 | [ADR 0023: Step-Up SUDO Session Elevation & Fine-Grained Token Scoping](0023-step-up-sudo-elevation-and-fine-grained-token-scoping.md) | Historical/domain decision; see scope note |
| 0024 | [ADR 0024: Adaptive Behavioral Risk Scoring & Zero-Downtime KMS Key Re-Wrapping](0024-adaptive-behavioral-risk-scoring-and-zero-downtime-kms-rewrapping.md) | Historical/domain decision; see scope note |
| 0025 | [ADR 0025: BroccoliDB L1 Reactive In-Memory Table & Multi-Dimensional Secondary Indexing](0025-broccolidb-l1-reactive-in-memory-table-and-secondary-indexing.md) | Historical/domain decision; see scope note |
| 0026 | [ADR 0026: BroccoliDB Natural Query AST Parser & Cryptographic WAL Persistence](0026-broccolidb-natural-language-query-ast-parser-and-wal-persistence.md) | Historical/domain decision; see scope note |
| 0027 | [ADR 0027: Enterprise Privacy Substrate (Safe Harbor 18, GDPR, Global Privacy & ZDR v10.0 Memory Zeroization)](0027-enterprise-privacy-safe-harbor-18-gdpr-and-zdr-v10-memory-zeroization.md) | Historical/domain decision; see scope note |
| 0028 | [ADR 0028: SOC 2 Type II Compliance Engine, Drift Detector & Merkle Audit Ledger](0028-soc2-type-ii-compliance-engine-drift-detector-and-merkle-audit-ledger.md) | Historical/domain decision; see scope note |
| 0029 | [ADR 0029: Sliding-Window Streaming Transformer & Cross-Chunk Boundary PII Redaction](0029-sliding-window-streaming-transformer-and-cross-chunk-split-pii.md) | Historical/domain decision; see scope note |
| 0030 | [ADR 0030: Ephemeral Session Enclaves & Zero-Knowledge Attestation Tickets (ZKAT)](0030-ephemeral-session-enclave-and-zero-knowledge-attestation-tickets.md) | Historical/domain decision; see scope note |
| 0031 | [ADR 0031: Dynamic Security Pen-Test Probe & Autonomous Drift Remediation](0031-dynamic-security-probe-and-automated-drift-healing.md) | Historical/domain decision; see scope note |
| 0032 | [ADR 0032: Ultra-Flat Effortless Developer SDK Strategy & Tagged Template Invocation](0032-ultra-flat-effortless-sdk-strategy-and-callable-tagged-templates.md) | Historical/domain decision; see scope note |
| 0033 | [ADR 0033: Universal API Strategy: Anthropic Messages, Embeddings & Discovery](0033-universal-api-strategy-anthropic-messages-embeddings-and-health.md) | Historical/domain decision; see scope note |
| 0034 | [ADR 0034: Autonomous Agent 1-Click Context & Zero-Friction Event Pipeline](0034-autonomous-agent-1-click-context-and-auto-copy-substrate.md) | Historical/domain decision; see scope note |
| 0035 | [ADR 0035: Paranoid Supabase PostgreSQL Architecture & AI Agent Long-Term Governance Substrate](0035-paranoid-supabase-postgresql-and-ai-agent-governance.md) | Historical/domain decision; see scope note |
| 0036 | [ADR 0036: Universal Developer Authentication Gating & Zero-Abuse Workspace Perimeter](0036-universal-developer-authentication-gating-and-zero-abuse-workspace-perimeter.md) | Historical/domain decision; see scope note |
| 0037 | [ADR 0037: Zero-Egress Cloudflare Edge Gateway, R2 CDN & Custom Domain Substrate](0037-zero-egress-cloudflare-edge-gateway-and-r2-cdn-substrate.md) | Historical/domain decision; see scope note |
| 0038 | [ADR 0038: Distributed Edge KV Rate Governance & Stale-While-Revalidate Model Catalog Caching](0038-distributed-edge-kv-rate-governance-and-swr-catalog-caching.md) | Historical/domain decision; see scope note |
| 0039 | [ADR 0039: Edge-Native Vector Embeddings & Durable Object Swarm State Synchronization](0039-edge-native-vector-embeddings-and-durable-object-swarm-sync.md) | Historical/domain decision; see scope note |
| 0040 | [ADR 0040: Enterprise Vercel Pre-Deployment Gate, Next.js 15 Optimization & Multi-Region Topology](0040-enterprise-vercel-pre-deployment-gate-and-multi-region-topology.md) | Historical/domain decision; see scope note |
| 0041 | [ADR 0041: Zero-Collision TypeScript Ambient Isolation & Dual-Engine Runtime Mesh](0041-zero-collision-typescript-ambient-isolation-and-dual-runtime-mesh.md) | Historical/domain decision; see scope note |
| 0042 | [ADR 0042: Universal Zero-Hesitation Developer Ergonomics & Mental Model Absorption Substrate](0042-universal-zero-hesitation-developer-ergonomics-and-mental-model-absorption.md) | Historical/domain decision; see scope note |
| 0043 | [ADR 0043: BroccoliDB Hybrid Resilience Substrate, Zero-Loss Outbox & Dual-Slot Disaster Recovery (RPO = 0, RTO < 5ms)](0043-broccolidb-hybrid-resilience-outbox-disaster-recovery-and-sla-uptime.md) | Historical/domain decision; see scope note |
| 0044 | [ADR 0044: Non-Technical Natural OmniSearch & Approachable Self-Healing Error Recovery](0044-non-technical-natural-omnisearch-and-approachable-error-recovery.md) | Historical/domain decision; see scope note |
| 0045 | [ADR 0045: Single-Flight Request Coalescing, Soundex Phonetic Typo Absorption & Sub-15ms TTFT Streaming Substrate](0045-single-flight-request-coalescing-soundex-phonetic-and-sub-15ms-ttft.md) | Historical/domain decision; see scope note |
| 0046 | [ADR 0046: Sub-Microsecond L1 In-Memory Storage Mirroring, Zero-Copy Direct Buffer Streaming & Persistent Upstream Socket Pre-Warming](0046-sub-microsecond-l1-storage-zero-copy-streaming-and-socket-prewarming.md) | Historical/domain decision; see scope note |
| 0047 | [ADR 0047: Programmatic SEO (pSEO), Generative Engine Optimization (GEO), Answer Engine Optimization (AEO) & Structured JSON-LD Saturation](0047-programmatic-seo-geo-aeo-and-structured-jsonld-saturation.md) | Historical/domain decision; see scope note |
| 0048 | [ADR 0048: Interactive Developer Studio Tools, Client-Side Simulators & Memory-Isolated Utilities](0048-interactive-developer-studio-tools-and-edge-simulators.md) | Historical/domain decision; see scope note |
| 0049 | [ADR 0049: Enterprise Governance, AI Red-Teaming Patterns, Industry Verticals & Compliance Matrix](0049-enterprise-governance-security-patterns-and-compliance-matrix.md) | Historical/domain decision; see scope note |
| 0050 | [ADR 0050: AI Incident Postmortems, Resilience Engineering & Multi-Origin SLA Failover](0050-incident-postmortems-resilience-engineering-and-sla-failover.md) | Historical/domain decision; see scope note |
| 0051 | [51. Enterprise OAuth 2.0 / 2.1, FAPI Standards, Token Lifecycle & Identity Mesh](0051-enterprise-oauth2-fapi-token-lifecycle-and-identity-mesh.md) | Historical/domain decision; see scope note |
| 0052 | [52. Enterprise OAuth 2.1 Refresh Token Rotation (RTR), Token Family Theft Containment, OIDC Back-Channel Logout & Substrate Vacuum Mesh](0052-enterprise-oauth21-rtr-fapi-backchannel-and-vacuum-mesh.md) | Historical/domain decision; see scope note |
| 0053 | [0053. Siloed Supabase OAuth Platform Authentication & Isolated Backend Substrate Sharding Mesh](0053-siloed-supabase-oauth-and-isolated-backend-sharding-mesh.md) | Historical/domain decision; see scope note |
| 0054 | [0054. Apex Transport Layer Hardening: RFC 9530 Digests, RFC 9421 Signatures, IETF Idempotency, and Anti-Replay Nonces](0054-apex-transport-hardening-rfc9530-rfc9421-idempotency-and-anti-replay.md) | Historical/domain decision; see scope note |
| 0055 | [ADR 0055: Ambient Declarative AI Substrate, Zero-Route Direct Actions & Runtime Auto-Patcher](0055-ambient-declarative-ai-substrate-zero-route-and-auto-patcher.md) | Historical/domain decision; see scope note |
| 0056 | [ADR 0056: BroccoliDB 85-Buffer Algorithmic DeDuplication & High-Velocity Streaming Substrate](0056-broccolidb-85-buffer-deduplication-and-streaming-pipeline-substrate.md) | Historical/domain decision; see scope note |
| 0057 | [ADR 0057: Mega-Incident Stream Cascading & Mega-Document Hierarchical Pyramid Compactor](0057-broccolidb-mega-incident-cascader-and-pyramid-compaction-substrate.md) | Historical/domain decision; see scope note |
| 0058 | [ADR 0058: BroccoliDB 180-Domain Enterprise Industry Cluster Compaction Substrate](0058-broccolidb-180-domain-industry-cluster-compactor-substrate.md) | Historical/domain decision; see scope note |
| 0059 | [ADR 0059: BroccoliDB Safe Compaction Facade, Barrel Hardening, and Production API Gateway](0059-broccolidb-safe-compaction-facade-barrel-hardening-and-api-gateway.md) | Historical/domain decision; see scope note |
| 0060 | [ADR 0060: BroccoliDB High-Velocity Domain Expansion, Drain Log Clustering, Distributed Trace Slicing, and Telemetry Stream Compaction](0060-broccolidb-high-velocity-domain-expansion-and-stream-compaction.md) | Historical/domain decision; see scope note |
| 0061 | [ADR 0061: BroccoliDB NetFlow Security, L2 Order Book Depth, and Continuous Sliding-Window Stream Compaction](0061-broccolidb-network-orderbook-and-sliding-window-stream-compaction.md) | Historical/domain decision; see scope note |
| 0062 | [ADR 0062: BroccoliDB Industrial IoT Sensors, Clickstream RUM, Genomic Sequencing & Hybrid Stream Multiplexing](0062-broccolidb-industrial-iot-clickstream-genomics-and-hybrid-stream-multiplexing.md) | Historical/domain decision; see scope note |
| 0063 | [ADR 0063: BroccoliDB Kernel eBPF Runtime Security, Kubernetes Watch Deltas, Geospatial ADS-B/AIS & Apache Arrow Dictionary Stream Compaction](0063-broccolidb-ebpf-k8s-geospatial-and-arrow-dictionary-stream-compaction.md) | Historical/domain decision; see scope note |
| 0064 | [ADR 0064: BroccoliDB OpenAI Inference Boundary Empirical Measurement & Task Suite](0064-broccolidb-openai-inference-boundary-measurement-and-task-suite.md) | Historical/domain decision; see scope note |
| 0065 | [ADR 0065: BroccoliDB Randomized Branch-Blinded A/B Evaluation Protocol & Out-of-Sample Validation](0065-broccolidb-blinded-evaluator-protocol-and-out-of-sample-validation.md) | Historical/domain decision; see scope note |
| 0066 | [ADR 0066: Institutional Entropy Resistance & Epistemic Representation Compression](0066-institutional-entropy-resistance-and-epistemic-compression.md) | Historical/domain decision; see scope note |
| 0067 | [ADR 0067: Adaptive Representation Selection & Density Bypass Substrate](0067-representation-selection-and-adaptive-density-bypass.md) | Historical/domain decision; see scope note |
| 0068 | [ADR 0068: Dual Rolling Window Seat Quotas and Distributed Request Leases](0068-dual-rolling-window-seat-quotas-and-distributed-request-leases.md) | Historical/domain decision; see scope note |
| 0069 | [ADR 0069: Hybrid BroccoliDB-PostgreSQL Rolling Context and 5-Level Multi-Resolution Pyramid](0069-hybrid-broccolidb-postgres-rolling-context-and-5-level-pyramid.md) | Historical/domain decision; see scope note |
| 0070 | [ADR 0070: Elastic Dynamic Context Governor and Atomic Turn-Pair Integrity](0070-elastic-dynamic-context-governor-and-atomic-turn-pair-integrity.md) | Historical/domain decision; see scope note |
| 0071 | [ADR 0071: Cross-Session Universal Workspace Anchors and Hardware Cache Topology](0071-cross-session-universal-workspace-anchors-and-hardware-cache-topology.md) | Historical/domain decision; see scope note |
| 0072 | [ADR 0072: Exact-Owner Chat Persistence and Delta Sync Mesh](0072-exact-owner-chat-persistence-and-delta-sync-mesh.md) | Historical/domain decision; see scope note |
| 0073 | [ADR 0073: Zero-Dependency Post-Training Cognitive Labeling & 4-Stage Substrate](0073-zero-dependency-post-training-cognitive-labeling-and-4-stage-substrate.md) | Historical/domain decision; see scope note |
| 0074 | [ADR 0074: DeepSeek-V3/R1 Multi-Head Latent Attention (MLA), KV Dequantization & DualPipe Parallelism](0074-deepseek-v3-r1-mla-compression-latent-kv-dequantization-and-dualpipe.md) | Historical/domain decision; see scope note |
| 0075 | [ADR 0075: Speculative Verification Trees, EAGLE-2, Medusa & Head Entropy Pruning](0075-speculative-verification-trees-eagle2-medusa-and-head-entropy-pruning.md) | Historical/domain decision; see scope note |
| 0076 | [ADR 0076: Dynamic Sequence Packing Mask Slicing, Online DPO Length Debiasing & Loss-Truncated Gradient Shielding](0076-dynamic-sequence-packing-mask-slicing-dpo-length-debiasing-and-gradient-shield.md) | Historical/domain decision; see scope note |
| 0077 | [ADR 0077: Autonomous Cloudflare R2 Sync & Cryptographic Merkle Manifest Catalog](0077-autonomous-cloudflare-r2-sync-and-cryptographic-merkle-manifest-catalog.md) | Historical/domain decision; see scope note |
| 0078 | [ADR 0078: GLM-5.3 Flash IndexShare Sparse Attention, Slime Asynchronous RL & Hybrid Thinking Modes](0078-glm-53-flash-indexshare-sparse-attention-and-slime-async-rl.md) | Historical/domain decision; see scope note |
| 0079 | [ADR 0079: LUMI & Community QoS Multi-Tier Pool Mesh and IETF RateLimit Generation](0079-lumi-and-community-qos-multi-tier-pool-mesh.md) | Historical/domain decision; see scope note |
| 0080 | [ADR 0080: Zero-Roundtrip Preflight and Vectorized Batch Sync Engine](0080-zero-roundtrip-preflight-and-vectorized-batch-sync.md) | Historical/domain decision; see scope note |
| 0081 | [ADR 0081: Monotonic Stream Deltas and Zero-Copy Stream Pump](0081-monotonic-stream-deltas-and-zero-copy-pump.md) | Historical/domain decision; see scope note |
| 0082 | [ADR 0082: Deterministic Prompt Compaction, Strict Model Fidelity & Quality Sentinels](0082-prompt-compaction-predictive-routing-and-quality-sentinels.md) | Historical/domain decision; see scope note |
| 0083 | [ADR 0083: Context Window Preservation and Semantic AST Skeletons](0083-context-window-preservation-and-ast-skeletons.md) | Historical/domain decision; see scope note |
| 0084 | [ADR 0084: Context Salience Scoring and High-Throughput Zen Flow Buffer Pool](0084-context-salience-and-zen-flow-buffer-pool.md) | Historical/domain decision; see scope note |
| 0085 | [ADR 0085: Zero-Egress Keyset Sync, XFetch Early Recomputation & Bloom Origin Shield](0085-zero-egress-keyset-sync-and-xfetch-bloom-shield.md) | Historical/domain decision; see scope note |
| 0086 | [ADR 0086: BroccoliDB Authoritative Merkle Governor & Workspace-Wide Circuit Breaker](0086-authoritative-merkle-governor-and-circuit-breaker.md) | Historical/domain decision; see scope note |
| 0087 | [ADR 0087: Dual-Window Hybrid Rate Governance, Sliding Request Logs & Zero-Trust Resynchronization](0087-dual-window-hybrid-rate-governance-and-sliding-window-log.md) | Historical/domain decision; see scope note |
| 0088 | [ADR 0088: Enterprise 6-State Circuit Breaker, Strict Single-Canary Slotting & Slow-Start Quadratic Warmup](0088-enterprise-six-state-circuit-breaker-single-canary-and-quadratic-warmup.md) | Historical/domain decision; see scope note |
| 0089 | [ADR 0089: Anti-Stampede Bounded Admission Queue & AIMD Adaptive Concurrency Limiter](0089-anti-stampede-bounded-admission-queue-and-aimd-concurrency-limiter.md) | Historical/domain decision; see scope note |
| 0090 | [ADR 0090: Zero-Egress Write-Behind Micro-Batch Synchronization Buffer](0090-zero-egress-write-behind-micro-batch-sync-buffer.md) | Historical/domain decision; see scope note |
| 0091 | [ADR 0091: Developer Gateway Key Governance & Enterprise Rotation Ergonomics](0091-developer-gateway-key-governance-and-enterprise-rotation-ergonomics.md) | Historical/domain decision; see scope note |
| 0092 | [ADR 0092: BroccoliDB L0 Nanosecond Pointer Cache & Negative Caching Defense](0092-broccolidb-l0-nanosecond-pointer-cache-and-negative-caching-defense.md) | Historical/domain decision; see scope note |
| 0093 | [ADR 0093: PostgreSQL Connection Pool Circuit Breaker & Atomic Coalesced Write-Behind](0093-postgresql-connection-pool-circuit-breaker-and-atomic-coalesced-write-behind.md) | Historical/domain decision; see scope note |
| 0094 | [ADR 0094: Workspace-Wide Direct Connection Pooling & Queue Saturation Governance](0094-workspace-wide-direct-connection-pooling-and-queue-saturation-governance.md) | Historical/domain decision; see scope note |
| 0095 | [ADR 0095: Zero-Cycle Dispatcher, Token Hash Memoization & In-Place L0 Mutation](0095-zero-cycle-dispatcher-token-hash-memoization-and-in-place-l0-mutation.md) | Historical/domain decision; see scope note |
| 0096 | [ADR 0096: Connection Pool Security Isolation & Tenant Guardrails](0096-connection-pool-security-isolation-and-tenant-guardrails.md) | Historical/domain decision; see scope note |
| 0097 | [ADR 0097: Transaction-Scoped Tenant RLS Over Direct Connection Pooling](0097-transaction-scoped-tenant-rls-over-direct-connection-pooling.md) | Historical/domain decision; see scope note |
| 0098 | [ADR 0098: PostgreSQL Socket Destruction on Error & Complete JWT Claims JSON Injection](0098-pg-socket-destroy-on-error-and-jwt-claims-json-injection.md) | Historical/domain decision; see scope note |
| 0099 | [ADR 0099: Forced RLS & Declarative Session Context Procedures](0099-forced-rls-and-declarative-session-context-procedures.md) | Historical/domain decision; see scope note |
| 0100 | [ADR 0100: Audit Immutability Triggers & Kernel Tenant-Binding Enforcement](0100-audit-immutability-and-kernel-tenant-binding-triggers.md) | Historical/domain decision; see scope note |
| 0101 | [ADR 0101: Persona & Image Forced RLS with Ownership Reassignment Armor](0101-persona-image-forced-rls-and-ownership-reassignment-defense.md) | Historical/domain decision; see scope note |
| 0102 | [ADR 0102: Chat Messages Access Validation & Tasks CRUD RLS Armor](0102-chat-messages-access-validation-and-tasks-crud-rls.md) | Historical/domain decision; see scope note |
| 0103 | [ADR 0103: Chat Memory & Billing Forced RLS with Ownership Armor](0103-chat-memory-and-billing-forced-rls-and-ownership-armor.md) | Historical/domain decision; see scope note |
| 0104 | [ADR 0104: Least-Privilege DAC Table Grants for Authenticated Tenant Role](0104-least-privilege-dac-grants-for-authenticated-tenant-role.md) | Historical/domain decision; see scope note |
| 0105 | [ADR 0105: Tenant ID CHECK Constraints & LEAKPROOF RLS Optimization](0105-tenant-id-constraints-and-leakproof-rls-armor.md) | Historical/domain decision; see scope note |
| 0106 | [ADR 0106: Wallet Balance Tamper-Proofing & Financial Ledger Immutability](0106-wallet-balance-tamper-proofing-and-billing-ledger-immutability.md) | Historical/domain decision; see scope note |
| 0107 | [ADR 0107: API Credit Handling & Quota Pool Armor](0107-api-credit-handling-and-quota-pool-armor.md) | Historical/domain decision; see scope note |
| 0108 | [ADR 0108: Workspaces & Team Billing Spend Armor](0108-workspaces-and-team-billing-spend-armor.md) | Historical/domain decision; see scope note |
| 0109 | [ADR 0109: Sovereign Backend Inference Pipeline & Native Flagship Pool](0109-sovereign-backend-inference-pipeline-and-native-flagship-pool.md) | Historical/domain decision; see scope note |
| 0110 | [ADR 0110: End-to-End Inference Verification Suite & Artifact Telemetry](0110-e2e-inference-verification-suite-and-artifact-telemetry.md) | Historical/domain decision; see scope note |
| 0111 | [ADR 0111: Separate edge and Node inference transports](0111-cloudflare-edge-swrr-fleet-session-sticky-prompt-caching-and-codex-concurrency-isolation.md) | Historical/domain decision; see scope note |
| 0112 | [ADR 0112: Registry-backed provider routing and relay transport](0112-galxai-authoritative-shard-fleet-pool-native-codex-websocket-wire-and-sliding-window-failover.md) | Historical/domain decision; see scope note |
| 0113 | [ADR 0113: Long-running inference experiments and relay recovery scope](0113-unpredictable-2-3-minute-inference-mlfq-itl-watchdog-and-resumable-streams.md) | Historical/domain decision; see scope note |
| 0114 | [ADR 0114: Uncertain Execution Authority Kernel and Transactional Journal](0114-uncertain-execution-authority-kernel-and-transactional-journal.md) | Historical/domain decision; see scope note |
| 0115 | [ADR 0115: PostgreSQL-Authoritative Shard Registry and Secret-Free Projections](0115-postgresql-authoritative-shard-registry-and-secret-free-projections.md) | Historical/domain decision; see scope note |
| 0116 | [ADR 0116: Logical Agent Session Identity and Client Multiplexing](0116-logical-agent-session-identity-and-client-multiplexing.md) | Historical/domain decision; see scope note |
| 0117 | [ADR 0117: Server-Mediated Tenant Authority & Secure PostgreSQL Defaults](0117-server-mediated-tenant-authority-and-secure-postgres-defaults.md) | Historical/domain decision; see scope note |
| 0118 | [ADR 0118: Versioned Same-Origin Agent Client Deployment](0118-versioned-same-origin-agent-client-deployment.md) | Historical/domain decision; see scope note |
| 0119 | [ADR 0119: Inference-First Product Surface and First-Party Client Retirement](0119-inference-first-product-surface-and-client-retirement.md) | Historical/domain decision; see scope note |
| 0120 | [ADR 0120: Host relay ingress and deployment boundary](0120-zero-cost-host-mac-cloudflare-tunnel-relay-ingress-and-protocol-hardening.md) | Historical/domain decision; see scope note |
| 0121 | [ADR 0121: Provider image synthesis and user/session asset persistence](0121-user-and-session-r2-partitioning-manifest-lifecycle-and-relay-image-synthesis.md) | Historical/domain decision; see scope note |
| 0122 | [ADR 0122: Isolated authenticated relay and bounded recovery](0122-isolated-authenticated-relay-and-bounded-recovery.md) | Historical/domain decision; see scope note |
| 0123 | [Image requests recover after an expired account cooldown](0123-image-request-cooldown-recovery.md) | Database health authority and dated evidence |
| 0124 | [Cooldowns require attributable evidence and current lease authority](0124-cooldown-evidence-and-stale-result-protection.md) | Database health authority and dated evidence |
| 0125 | [Keep observations separate from health authority and bound recovery work](0125-observation-authority-and-bounded-database-recovery.md) | Database health authority and dated evidence |
| 0126 | [ADR 0126: Capability-aware 1:1 shard relay federation](0126-capability-aware-shard-relay-federation.md) | Lifecycle foundation; extended by 0127, 0131 and 0133 |
| 0127 | [ADR 0127: Explicit Codex image-tool alias and production federation cutover](0127-codex-image-tool-alias-production-cutover.md) | Image alias and dated production evidence |
| 0128 | [ADR 0128: Documentation authority and federation contract](0128-documentation-authority-and-federation-contract.md) | Documentation authority |
| 0129 | [ADR 0129: Public image artifacts and verified identity](0129-public-image-artifacts-and-verified-identity.md) | Public boundary; component deployment evidence required |
| 0130 | [Image receipts and uncertain outcomes](0130-image-receipts-and-uncertain-outcomes.md) | Single-dispatch images; dated component rollout in record |
| 0131 | [ADR 0131: Private operator desktops and maintenance holds](0131-private-operator-desktops-and-maintenance.md) | Private sessions, independent desktops and durable repair holds |
| 0132 | [ADR 0132: Recoverable desktop credential handoff](0132-recoverable-desktop-credential-handoff.md) | Validated existing-account refresh with recoverable intent |
| 0133 | [ADR 0133: Explicit validated enrollment and isolated integration fixtures](0133-explicit-validated-enrollment-and-test-isolation.md) | Retired bulk import, create-only enrollment and isolated fixtures |
| 0134 | [ADR 0134: Fixed-price Sites generation with opaque provider quotas](0134-fixed-price-sites-generation-with-opaque-provider-quotas.md) | Historical tariff; new admission superseded by 0140 |
| 0135 | [ADR 0135: Durable Sites receipts and local admission](0135-durable-sites-receipts-and-local-admission.md) | Durable text receipts, local limits and bounded recovery |
| 0136 | [ADR 0136: Customer-owned Sites delivery](0136-customer-owned-sites-delivery.md) | Bounded companion; native-host delivery and separate publication evidence |
| 0137 | [ADR 0137: Account-owned Sites subdomains](0137-account-owned-sites-subdomains.md) | Stable app/username addresses, native attachment and private DNS recovery |
| 0138 | [ADR 0138: Automatic Sites domain provisioning](0138-automatic-sites-domain-provisioning.md) | Customer discovery, durable DNS outbox and scheduled reconciliation |
| 0139 | [ADR 0139: Browser Sites workspace and managed publishing](0139-browser-sites-workspace-and-managed-publishing.md) | Private authoring, explicit public snapshots and automated managed addresses |
| 0140 | [ADR 0140: Paid Sites and shared fair usage](0140-paid-sites-and-shared-fair-usage.md) | Paid-plan inclusion, shared admission and original-operation recovery |
| 0141 | [ADR 0141: Sites Pro self-service launch](0141-sites-pro-self-service-launch.md) | Verified Pro checkout, cancellation and explicit initial limits |
| 0142 | [ADR 0142: Continuous Sites conversations](0142-continuous-sites-conversations.md) | Durable turns, rolling context, Build/Discuss and recoverable draft versions |
| 0143 | [ADR 0143: Hybrid Sites memory and full-page review](0143-hybrid-sites-memory-and-review.md) | Authoritative hybrid recall, complete turns, resilient drafts and content comparison |
| 0144 | [Durable image requests and maintained incident operations](0144-durable-images-and-incident-documentation.md) | Durable application receipts, incident learning and source-bound documentation review |
| 0145 | [ADR 0145: Maintain knowledge with source changes](0145-maintained-knowledge-and-decision-lifecycle.md) | Private knowledge workflow; delivery tracked separately |
| 0146 | [ADR 0146: Bounded image library browsing and preview delivery](0146-bounded-image-libraries.md) | Proposed; local implementation and isolated verification, no deployment |
| 0147 | [ADR 0147: Verified account and session authority](0147-verified-account-and-session-authority.md) | Proposed; local account, connection and session security corrections; release acceptance separate |
| 0148 | [ADR 0148: Explicit complimentary Pro access](0148-complimentary-pro-access.md) | Authorized account grants with current server checks; payment and staff permissions remain independent |
| 0149 | [ADR 0149: One-time free generation allowance](0149-one-time-free-generation.md) | Proposed; local quota enforcement and retained-state recovery, production release separate |
| 0150 | [ADR 0150: Bounded free admission and paid capacity protection](0150-free-generation-admission-gate.md) | Proposed; expiring aggregate gate and composer stop states, local delivery only |
| 0151 | [ADR 0151: Standalone Codex image tool transport](0151-codex-standalone-image-tool.md) | Proposed; local transport correction, live access unresolved |
| 0152 | [ADR 0152: Manual desktop-only shard authority](0152-manual-desktop-only-shard-authority.md) | Owner-approved policy; explicit desktop enrollment, schema enforcement and manual session repair |
| 0153 | [ADR 0153: Central account authority with isolated relay execution](0153-central-account-authority-isolated-relays.md) | Proposed implementation; sole account management in GALXAI, two execution pools; local services installed, serving qualification separate |
| 0154 | [Stable relay connections and irreversible legacy credential retirement](0154-relay-connection-lifecycle-and-legacy-retirement.md) | Proposed; atomic Connect, same-account reconnect and owner-scoped cleanup; delivery evidence separate |

- [0155: Shared quota containment and bounded agent continuation](0155-shared-quota-containment-and-bounded-continuation.md)
- [0156: Verified automatic relay activation](0156-verified-automatic-relay-activation.md)
- [0157: Compatible relay requests and honest output budgets](0157-compatible-relay-output-budgets.md)
