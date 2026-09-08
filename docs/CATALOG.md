# Complete documentation catalog

<!-- docs-scope: current-guide -->
> **Reading scope:** Navigation and authority for the complete Markdown corpus. Start with the [current contract](FEDERATION_STRATEGY.md).

Each document is classified below. Current guides define relay operations; domain references retain their own component scope and have not been newly certified by this refactor. Decision records retain original evidence with precedence notes. Research and commercial drafts are not deployment or performance guarantees. Operational records require their own environment/date checks.

The documentation validator checks complete coverage, scope markers, local file links, and ADR identity. It does not execute example commands or certify every historical claim. Update this catalog whenever a document is added or renamed.

## Current guides

| Document | Path |
| --- | --- |
| [API base URL](API_BASE_URL.md) | `API_BASE_URL.md` |
| [GALX architecture](ARCHITECTURE.md) | `ARCHITECTURE.md` |
| [Complete documentation catalog](CATALOG.md) | `CATALOG.md` |
| [Cloudflare implementation and deployment boundaries](CLOUDFLARE_STRATEGY.md) | `CLOUDFLARE_STRATEGY.md` |
| [Deployment boundaries](DEPLOYMENT.md) | `DEPLOYMENT.md` |
| [Federation contract](FEDERATION_STRATEGY.md) | `FEDERATION_STRATEGY.md` |
| [Inference verification](INFERENCE_PIPELINE_VERIFICATION.md) | `INFERENCE_PIPELINE_VERIFICATION.md` |
| [Migrating to capability-aware GALX](MIGRATION_GUIDE.md) | `MIGRATION_GUIDE.md` |
| [Model catalog and live availability](MODEL_CATALOG.md) | `MODEL_CATALOG.md` |
| [Application queues and relay jobs](QUEUE_SPECIFICATION.md) | `QUEUE_SPECIFICATION.md` |
| [Quickstart](QUICKSTART.md) | `QUICKSTART.md` |
| [Rate limits, concurrency, and quota](RATE_LIMITS_AND_QUOTAS.md) | `RATE_LIMITS_AND_QUOTAS.md` |
| [GALX documentation](README.md) | `README.md` |
| [Federation relay API](RELAY_API_REFERENCE.md) | `RELAY_API_REFERENCE.md` |
| [Capability-aware relay vNext](RELAY_VNEXT_RUNBOOK.md) | `RELAY_VNEXT_RUNBOOK.md` |
| [Resilience and recovery](RESILIENCE_AND_DISASTER_RECOVERY.md) | `RESILIENCE_AND_DISASTER_RECOVERY.md` |
| [Capability-first routing](ROUTING_ALGORITHMS.md) | `ROUTING_ALGORITHMS.md` |
| [Security boundaries](SECURITY.md) | `SECURITY.md` |
| [System topology and maintainer onboarding](SYSTEM_TOPOLOGY_AND_MAINTENANCE_ONBOARDING.md) | `SYSTEM_TOPOLOGY_AND_MAINTENANCE_ONBOARDING.md` |
| [Telemetry and observability](TELEMETRY_AND_OBSERVABILITY.md) | `TELEMETRY_AND_OBSERVABILITY.md` |
| [Troubleshooting](TROUBLESHOOTING.md) | `TROUBLESHOOTING.md` |
| [Relay deployment: vNext migration and legacy reference](VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md) | `VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md` |
| [Architecture decision records](adr/README.md) | `adr/README.md` |
| [ADR authoring and lifecycle](maintainers/ADR_AUTHORING_AND_LIFECYCLE_GUIDE.md) | `maintainers/ADR_AUTHORING_AND_LIFECYCLE_GUIDE.md` |
| [Parent and subagent execution guide](maintainers/AI_AGENT_PAIR_PROGRAMMING_AND_GOVERNANCE.md) | `maintainers/AI_AGENT_PAIR_PROGRAMMING_AND_GOVERNANCE.md` |
| [Maintainer guides](maintainers/README.md) | `maintainers/README.md` |
| [Federation hardening checks](maintainers/RELAY_HARDENING.md) | `maintainers/RELAY_HARDENING.md` |
| [Federation fleet and quota](maintainers/RELAY_QUOTA_AND_FLEET.md) | `maintainers/RELAY_QUOTA_AND_FLEET.md` |
| [Federation request telemetry](maintainers/RELAY_TELEMETRY.md) | `maintainers/RELAY_TELEMETRY.md` |
| [Capability and recovery UX](maintainers/RELAY_TELEMETRY_UX.md) | `maintainers/RELAY_TELEMETRY_UX.md` |
| [Upstream outage response](maintainers/UPSTREAM_PROVIDER_OUTAGE_AND_DEGRADATION.md) | `maintainers/UPSTREAM_PROVIDER_OUTAGE_AND_DEGRADATION.md` |
| [Provisioning and preflight](playbooks/01-provisioning-and-preflight.md) | `playbooks/01-provisioning-and-preflight.md` |
| [Deployment and release](playbooks/02-deployment-and-release.md) | `playbooks/02-deployment-and-release.md` |
| [Traffic and model-specific scaling](playbooks/03-live-traffic-and-fleet-scaling.md) | `playbooks/03-live-traffic-and-fleet-scaling.md` |
| [Incident response](playbooks/04-incident-response-and-sev-triage.md) | `playbooks/04-incident-response-and-sev-triage.md` |
| [Security and key rotation](playbooks/05-security-key-rotation-and-compliance.md) | `playbooks/05-security-key-rotation-and-compliance.md` |
| [Recovery and postmortems](playbooks/06-disaster-recovery-and-postmortems.md) | `playbooks/06-disaster-recovery-and-postmortems.md` |
| [Developer ergonomics and execution authority](playbooks/07-zero-hesitation-developer-ergonomics-and-api-governance.md) | `playbooks/07-zero-hesitation-developer-ergonomics-and-api-governance.md` |
| [Developer observation protocol](playbooks/08-unframed-developer-observation-protocol.md) | `playbooks/08-unframed-developer-observation-protocol.md` |
| [Operational playbooks](playbooks/README.md) | `playbooks/README.md` |
| [Relay access and containment](relay-security.md) | `relay-security.md` |

## Domain references

| Document | Path |
| --- | --- |
| [📖 GALXAI Universal API Reference](API_REFERENCE.md) | `API_REFERENCE.md` |
| [🥦 BroccoliDB Compaction Engine: Engineer Onboarding & Architecture Guide](BROCCOLIDB_COMPACTION_ONBOARDING_GUIDE.md) | `BROCCOLIDB_COMPACTION_ONBOARDING_GUIDE.md` |
| [BroccoliDB Algorithmic DeDuplication & High-Velocity Compaction Engine Specification](BROCCOLIDB_DEDUPLICATION_ENGINE_SPECIFICATION.md) | `BROCCOLIDB_DEDUPLICATION_ENGINE_SPECIFICATION.md` |
| [🌌 GALXAI Universal Developer Client SDK](DEVELOPER_CLIENT_SDK.md) | `DEVELOPER_CLIENT_SDK.md` |
| [GALXAI Developer Gateway Key Architecture & Zero-Egress Substrate](DEVELOPER_GATEWAY_KEY_ARCHITECTURE.md) | `DEVELOPER_GATEWAY_KEY_ARCHITECTURE.md` |
| [🛠️ GALXAI Developer & Contributing Guide](DEVELOPER_GUIDE.md) | `DEVELOPER_GUIDE.md` |
| [Frequently asked questions](FAQS.md) | `FAQS.md` |
| [Agent clients and the GALXAI relay](LUMI.md) | `LUMI.md` |
| [GALXAI Natural Navigation, OmniSearch & Low-Latency Substrate Guide](NATURAL_NAVIGATION_AND_OMNISEARCH.md) | `NATURAL_NAVIGATION_AND_OMNISEARCH.md` |
| [GALXAI Enterprise OAuth 2.0 / 2.1, FAPI & Token Lifecycle Specification](OAUTH_AND_TOKEN_LIFECYCLE_SPECIFICATION.md) | `OAUTH_AND_TOKEN_LIFECYCLE_SPECIFICATION.md` |
| [GALXAI Product Surface Strategy](PRODUCT_SURFACE_STRATEGY.md) | `PRODUCT_SURFACE_STRATEGY.md` |
| [GALXAI: Provider-as-Auth Technical Specification](PROVIDER_AS_AUTH_SPECIFICATION.md) | `PROVIDER_AS_AUTH_SPECIFICATION.md` |
| [🧠 Frontier Reasoning Models Developer Guide](REASONING_MODELS_GUIDE.md) | `REASONING_MODELS_GUIDE.md` |
| [💻 GALXAI Multi-Ecosystem SDK & CLI Cheatsheet](SDK_CHEATSHEET.md) | `SDK_CHEATSHEET.md` |
| [⚡ GALXAI Universal Developer SDK: Specification & Architecture Reference](SDK_SPECIFICATION.md) | `SDK_SPECIFICATION.md` |
| [GALXAI: Security Posture & Threat Model](SECURITY_POSTURE_AND_THREAT_MODEL.md) | `SECURITY_POSTURE_AND_THREAT_MODEL.md` |
| [Standardized OAuth & Ingestion Architecture Specification](STANDARDIZED_OAUTH_AND_INGESTION_ARCHITECTURE.md) | `STANDARDIZED_OAUTH_AND_INGESTION_ARCHITECTURE.md` |
| [⚡ Universal Streaming & SSE Protocols](STREAMING_AND_SSE_PROTOCOL.md) | `STREAMING_AND_SSE_PROTOCOL.md` |
| [⚙️ Structured Outputs, Tool Calling & Agent Runtimes](STRUCTURED_OUTPUTS_AND_TOOLS.md) | `STRUCTURED_OUTPUTS_AND_TOOLS.md` |
| [🛡️ GALXAI: Paranoid Supabase PostgreSQL Architecture & AI Agent Governance Specification](SUPABASE_PARANOID_ARCHITECTURE_SPEC.md) | `SUPABASE_PARANOID_ARCHITECTURE_SPEC.md` |
| [Application deployment and relay connectivity](VERCEL_DEPLOYMENT.md) | `VERCEL_DEPLOYMENT.md` |
| [💳 GALXAI Developer Compute Wallet & Micro-Billing Architecture](WALLET_AND_BILLING_STRATEGY.md) | `WALLET_AND_BILLING_STRATEGY.md` |
| [🤖 Maintainer Specification: CI Pipeline, Automation & Invariant Gates](maintainers/CI_PIPELINE_AND_AUTOMATION_SPEC.md) | `maintainers/CI_PIPELINE_AND_AUTOMATION_SPEC.md` |
| [Cloudflare maintainer runbook](maintainers/CLOUDFLARE_EDGE_MESH_MAINTAINER_RUNBOOK.md) | `maintainers/CLOUDFLARE_EDGE_MESH_MAINTAINER_RUNBOOK.md` |
| [🧪 Maintainer Guide: Compactor Fuzzing, Edge Cases & QA Matrix](maintainers/COMPACTOR_FUZZING_AND_QA_MATRIX.md) | `maintainers/COMPACTOR_FUZZING_AND_QA_MATRIX.md` |
| [🗓️ Maintainer Day 1 to Day 30 Onboarding Roadmap](maintainers/DAY_1_TO_30_ONBOARDING_ROADMAP.md) | `maintainers/DAY_1_TO_30_ONBOARDING_ROADMAP.md` |
| [🔧 Maintainer Debugging & Diagnostic Runbooks](maintainers/DEBUGGING_AND_DIAGNOSTIC_RUNBOOKS.md) | `maintainers/DEBUGGING_AND_DIAGNOSTIC_RUNBOOKS.md` |
| [🛠️ Maintainer Guide: Flaky Tests, CI Traps & Deterministic Triage](maintainers/FLAKY_TESTS_AND_CI_TRIAGE.md) | `maintainers/FLAKY_TESTS_AND_CI_TRIAGE.md` |
| [🪝 Maintainer Guide: Git Workflows, Hooks & Conventional Commits](maintainers/GIT_WORKFLOWS_AND_HOOKS.md) | `maintainers/GIT_WORKFLOWS_AND_HOOKS.md` |
| [⚡ GALXAI Maintainer CLI Cheatsheet & Command Reference](maintainers/MAINTAINER_CLI_CHEATSHEET.md) | `maintainers/MAINTAINER_CLI_CHEATSHEET.md` |
| [📖 Maintainer Glossary & Architectural Lexicon](maintainers/MAINTAINER_GLOSSARY_AND_LEXICON.md) | `maintainers/MAINTAINER_GLOSSARY_AND_LEXICON.md` |
| [🎓 Maintainer Onboarding Knowledge Check & Self-Assessment](maintainers/MAINTAINER_ONBOARDING_ASSESSMENT.md) | `maintainers/MAINTAINER_ONBOARDING_ASSESSMENT.md` |
| [Maintainer Runbook: Shard Authority and Key Rotation](maintainers/MULTI_TENANT_SHARD_AND_KEY_ROTATION.md) | `maintainers/MULTI_TENANT_SHARD_AND_KEY_ROTATION.md` |
| [🗄️ Maintainer Runbook: PostgreSQL Migrations & AOP-DB Protocol](maintainers/POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md) | `maintainers/POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md` |
| [🚀 Maintainer Guide: Release Engineering, Versioning & Canary Rollout](maintainers/RELEASE_ENGINEERING_AND_VERSIONING.md) | `maintainers/RELEASE_ENGINEERING_AND_VERSIONING.md` |
| [🚨 Maintainer Playbook: Security Incidents, Key Compromise & CVE Governance](maintainers/SECURITY_INCIDENT_AND_CVE_PLAYBOOK.md) | `maintainers/SECURITY_INCIDENT_AND_CVE_PLAYBOOK.md` |
| [🏛️ Subsystem Internals & Dependency DAG](maintainers/SUBSYSTEM_INTERNALS_AND_DEPENDENCY_GRAPH.md) | `maintainers/SUBSYSTEM_INTERNALS_AND_DEPENDENCY_GRAPH.md` |
| [🏛️ Subsystem Ownership & Maintainer Matrix](maintainers/SUBSYSTEM_MAINTAINER_MATRIX.md) | `maintainers/SUBSYSTEM_MAINTAINER_MATRIX.md` |
| [📈 Maintainer Guide: Telemetry, Observability & Prometheus Metrics](maintainers/TELEMETRY_AND_METRICS_OBSERVABILITY.md) | `maintainers/TELEMETRY_AND_METRICS_OBSERVABILITY.md` |
| [🛠️ Playbook 09: Continuous Learning & Model Post-Training Runbook](playbooks/09-continuous-learning-and-training-runbook.md) | `playbooks/09-continuous-learning-and-training-runbook.md` |

## Decision records

| Document | Path |
| --- | --- |
| [ADR 0001: Unified Pooled Quota Cycling Substrate](adr/0001-unified-pooled-quota-cycling-substrate.md) | `adr/0001-unified-pooled-quota-cycling-substrate.md` |
| [ADR 0002: 2-Phase Token Reservation & Continuous Calculus Rate Governance](adr/0002-two-phase-token-reservation-and-rate-governance.md) | `adr/0002-two-phase-token-reservation-and-rate-governance.md` |
| [ADR 0003: AES-256-GCM Envelope Encryption with AAD Binding & Heap Scrubbing](adr/0003-aes-256-gcm-envelope-encryption-with-aad-binding.md) | `adr/0003-aes-256-gcm-envelope-encryption-with-aad-binding.md` |
| [ADR 0004: 4-State Circuit Breaker & Half-Open Canary Traffic Warming](adr/0004-four-state-circuit-breaker-and-failover-topology.md) | `adr/0004-four-state-circuit-breaker-and-failover-topology.md` |
| [ADR 0005: Zero-Allocation Circular Ring Buffer Telemetry & EWMA Latency](adr/0005-circular-buffer-telemetry-and-ewma-latency-scoring.md) | `adr/0005-circular-buffer-telemetry-and-ewma-latency-scoring.md` |
| [ADR 0006: Intelligent Multi-Tiered Discount & Prompt-Caching Strategy](adr/0006-intelligent-multi-tiered-discount-strategy.md) | `adr/0006-intelligent-multi-tiered-discount-strategy.md` |
| [ADR 0007: Proof-of-Deposit Security Gate & 50% Match Paywall Architecture](adr/0007-proof-of-deposit-and-50pct-match-paywall-gate.md) | `adr/0007-proof-of-deposit-and-50pct-match-paywall-gate.md` |
| [ADR 0008: Tenant-Affinity Shard Dispersion (TASD) & Post-Allocation Headroom Leveling](adr/0008-tenant-affinity-shard-dispersion-and-post-allocation-leveling.md) | `adr/0008-tenant-affinity-shard-dispersion-and-post-allocation-leveling.md` |
| [ADR 0009: 4-Phase Half-Open Canary Traffic Warming & Background Lease Scavenger](adr/0009-half-open-canary-traffic-warming-and-lease-scavenger.md) | `adr/0009-half-open-canary-traffic-warming-and-lease-scavenger.md` |
| [ADR 0010: CloudTasks & CloudRun Inspired Asynchronous Queue Substrate](adr/0010-cloudtasks-cloudrun-asynchronous-queue-substrate.md) | `adr/0010-cloudtasks-cloudrun-asynchronous-queue-substrate.md` |
| [ADR 0011: Directed Acyclic Graph (DAG) Workflows & Real-Time Event Streaming](adr/0011-directed-acyclic-graph-workflows-and-realtime-event-streaming.md) | `adr/0011-directed-acyclic-graph-workflows-and-realtime-event-streaming.md` |
| [ADR 0012: Universal Developer SDK & Developer Experience (DX) Substrate](adr/0012-universal-developer-sdk-and-ergonomics-substrate.md) | `adr/0012-universal-developer-sdk-and-ergonomics-substrate.md` |
| [ADR 0013: Fluent Builders, Structured Outputs & DX Ergonomics Substrate](adr/0013-fluent-builders-structured-outputs-and-dx-ergonomics.md) | `adr/0013-fluent-builders-structured-outputs-and-dx-ergonomics.md` |
| [ADR 0014: Apex Agent Runtime, Middleware & Resilience Substrate](adr/0014-apex-agent-runtime-middleware-and-resilience-substrate.md) | `adr/0014-apex-agent-runtime-middleware-and-resilience-substrate.md` |
| [ADR 0015: Zero-Egress Cloudflare Workers Edge Compute Mesh](adr/0015-zero-egress-cloudflare-workers-edge-compute-mesh.md) | `adr/0015-zero-egress-cloudflare-workers-edge-compute-mesh.md` |
| [ADR 0016: Authoritative Supabase PostgreSQL Substrate](adr/0016-authoritative-supabase-postgresql-substrate.md) | `adr/0016-authoritative-supabase-postgresql-substrate.md` |
| [ADR 0017: High-Throughput Binary Wire Protocol & RPC Micro-Batching](adr/0017-high-throughput-binary-wire-and-rpc-micro-batching.md) | `adr/0017-high-throughput-binary-wire-and-rpc-micro-batching.md` |
| [ADR 0018: Edge Speculative Streaming & Pre-Warmed Keep-Alive Connection Pools](adr/0018-edge-speculative-streaming-and-keepalive-connection-pools.md) | `adr/0018-edge-speculative-streaming-and-keepalive-connection-pools.md` |
| [ADR 0019: Autonomous Shard Health Probes & Multi-Tenant Budget Governance](adr/0019-autonomous-shard-health-probes-and-budget-governance.md) | `adr/0019-autonomous-shard-health-probes-and-budget-governance.md` |
| [ADR 0020: Provider-as-Auth Paradigm & Zero-Friction Shard Vaulting](adr/0020-provider-as-auth-zero-friction-session-substrate.md) | `adr/0020-provider-as-auth-zero-friction-session-substrate.md` |
| [ADR 0021: JWE Compact Session Encryption & DPoP Client Fingerprinting](adr/0021-jwe-compact-session-encryption-and-dpop-fingerprinting.md) | `adr/0021-jwe-compact-session-encryption-and-dpop-fingerprinting.md` |
| [ADR 0022: OAuth 2.0 Token Rotation with Reuse Attack Detection Cascades (RFC 6819)](adr/0022-oauth-token-rotation-with-reuse-attack-detection-cascades.md) | `adr/0022-oauth-token-rotation-with-reuse-attack-detection-cascades.md` |
| [ADR 0023: Step-Up SUDO Session Elevation & Fine-Grained Token Scoping](adr/0023-step-up-sudo-elevation-and-fine-grained-token-scoping.md) | `adr/0023-step-up-sudo-elevation-and-fine-grained-token-scoping.md` |
| [ADR 0024: Adaptive Behavioral Risk Scoring & Zero-Downtime KMS Key Re-Wrapping](adr/0024-adaptive-behavioral-risk-scoring-and-zero-downtime-kms-rewrapping.md) | `adr/0024-adaptive-behavioral-risk-scoring-and-zero-downtime-kms-rewrapping.md` |
| [ADR 0025: BroccoliDB L1 Reactive In-Memory Table & Multi-Dimensional Secondary Indexing](adr/0025-broccolidb-l1-reactive-in-memory-table-and-secondary-indexing.md) | `adr/0025-broccolidb-l1-reactive-in-memory-table-and-secondary-indexing.md` |
| [ADR 0026: BroccoliDB Natural Query AST Parser & Cryptographic WAL Persistence](adr/0026-broccolidb-natural-language-query-ast-parser-and-wal-persistence.md) | `adr/0026-broccolidb-natural-language-query-ast-parser-and-wal-persistence.md` |
| [ADR 0027: Enterprise Privacy Substrate (Safe Harbor 18, GDPR, Global Privacy & ZDR v10.0 Memory Zeroization)](adr/0027-enterprise-privacy-safe-harbor-18-gdpr-and-zdr-v10-memory-zeroization.md) | `adr/0027-enterprise-privacy-safe-harbor-18-gdpr-and-zdr-v10-memory-zeroization.md` |
| [ADR 0028: SOC 2 Type II Compliance Engine, Drift Detector & Merkle Audit Ledger](adr/0028-soc2-type-ii-compliance-engine-drift-detector-and-merkle-audit-ledger.md) | `adr/0028-soc2-type-ii-compliance-engine-drift-detector-and-merkle-audit-ledger.md` |
| [ADR 0029: Sliding-Window Streaming Transformer & Cross-Chunk Boundary PII Redaction](adr/0029-sliding-window-streaming-transformer-and-cross-chunk-split-pii.md) | `adr/0029-sliding-window-streaming-transformer-and-cross-chunk-split-pii.md` |
| [ADR 0030: Ephemeral Session Enclaves & Zero-Knowledge Attestation Tickets (ZKAT)](adr/0030-ephemeral-session-enclave-and-zero-knowledge-attestation-tickets.md) | `adr/0030-ephemeral-session-enclave-and-zero-knowledge-attestation-tickets.md` |
| [ADR 0031: Dynamic Security Pen-Test Probe & Autonomous Drift Remediation](adr/0031-dynamic-security-probe-and-automated-drift-healing.md) | `adr/0031-dynamic-security-probe-and-automated-drift-healing.md` |
| [ADR 0032: Ultra-Flat Effortless Developer SDK Strategy & Tagged Template Invocation](adr/0032-ultra-flat-effortless-sdk-strategy-and-callable-tagged-templates.md) | `adr/0032-ultra-flat-effortless-sdk-strategy-and-callable-tagged-templates.md` |
| [ADR 0033: Universal API Strategy: Anthropic Messages, Embeddings & Discovery](adr/0033-universal-api-strategy-anthropic-messages-embeddings-and-health.md) | `adr/0033-universal-api-strategy-anthropic-messages-embeddings-and-health.md` |
| [ADR 0034: Autonomous Agent 1-Click Context & Zero-Friction Event Pipeline](adr/0034-autonomous-agent-1-click-context-and-auto-copy-substrate.md) | `adr/0034-autonomous-agent-1-click-context-and-auto-copy-substrate.md` |
| [ADR 0035: Paranoid Supabase PostgreSQL Architecture & AI Agent Long-Term Governance Substrate](adr/0035-paranoid-supabase-postgresql-and-ai-agent-governance.md) | `adr/0035-paranoid-supabase-postgresql-and-ai-agent-governance.md` |
| [ADR 0036: Universal Developer Authentication Gating & Zero-Abuse Workspace Perimeter](adr/0036-universal-developer-authentication-gating-and-zero-abuse-workspace-perimeter.md) | `adr/0036-universal-developer-authentication-gating-and-zero-abuse-workspace-perimeter.md` |
| [ADR 0037: Zero-Egress Cloudflare Edge Gateway, R2 CDN & Custom Domain Substrate](adr/0037-zero-egress-cloudflare-edge-gateway-and-r2-cdn-substrate.md) | `adr/0037-zero-egress-cloudflare-edge-gateway-and-r2-cdn-substrate.md` |
| [ADR 0038: Distributed Edge KV Rate Governance & Stale-While-Revalidate Model Catalog Caching](adr/0038-distributed-edge-kv-rate-governance-and-swr-catalog-caching.md) | `adr/0038-distributed-edge-kv-rate-governance-and-swr-catalog-caching.md` |
| [ADR 0039: Edge-Native Vector Embeddings & Durable Object Swarm State Synchronization](adr/0039-edge-native-vector-embeddings-and-durable-object-swarm-sync.md) | `adr/0039-edge-native-vector-embeddings-and-durable-object-swarm-sync.md` |
| [ADR 0040: Enterprise Vercel Pre-Deployment Gate, Next.js 15 Optimization & Multi-Region Topology](adr/0040-enterprise-vercel-pre-deployment-gate-and-multi-region-topology.md) | `adr/0040-enterprise-vercel-pre-deployment-gate-and-multi-region-topology.md` |
| [ADR 0041: Zero-Collision TypeScript Ambient Isolation & Dual-Engine Runtime Mesh](adr/0041-zero-collision-typescript-ambient-isolation-and-dual-runtime-mesh.md) | `adr/0041-zero-collision-typescript-ambient-isolation-and-dual-runtime-mesh.md` |
| [ADR 0042: Universal Zero-Hesitation Developer Ergonomics & Mental Model Absorption Substrate](adr/0042-universal-zero-hesitation-developer-ergonomics-and-mental-model-absorption.md) | `adr/0042-universal-zero-hesitation-developer-ergonomics-and-mental-model-absorption.md` |
| [ADR 0043: BroccoliDB Hybrid Resilience Substrate, Zero-Loss Outbox & Dual-Slot Disaster Recovery (RPO = 0, RTO < 5ms)](adr/0043-broccolidb-hybrid-resilience-outbox-disaster-recovery-and-sla-uptime.md) | `adr/0043-broccolidb-hybrid-resilience-outbox-disaster-recovery-and-sla-uptime.md` |
| [ADR 0044: Non-Technical Natural OmniSearch & Approachable Self-Healing Error Recovery](adr/0044-non-technical-natural-omnisearch-and-approachable-error-recovery.md) | `adr/0044-non-technical-natural-omnisearch-and-approachable-error-recovery.md` |
| [ADR 0045: Single-Flight Request Coalescing, Soundex Phonetic Typo Absorption & Sub-15ms TTFT Streaming Substrate](adr/0045-single-flight-request-coalescing-soundex-phonetic-and-sub-15ms-ttft.md) | `adr/0045-single-flight-request-coalescing-soundex-phonetic-and-sub-15ms-ttft.md` |
| [ADR 0046: Sub-Microsecond L1 In-Memory Storage Mirroring, Zero-Copy Direct Buffer Streaming & Persistent Upstream Socket Pre-Warming](adr/0046-sub-microsecond-l1-storage-zero-copy-streaming-and-socket-prewarming.md) | `adr/0046-sub-microsecond-l1-storage-zero-copy-streaming-and-socket-prewarming.md` |
| [ADR 0047: Programmatic SEO (pSEO), Generative Engine Optimization (GEO), Answer Engine Optimization (AEO) & Structured JSON-LD Saturation](adr/0047-programmatic-seo-geo-aeo-and-structured-jsonld-saturation.md) | `adr/0047-programmatic-seo-geo-aeo-and-structured-jsonld-saturation.md` |
| [ADR 0048: Interactive Developer Studio Tools, Client-Side Simulators & Memory-Isolated Utilities](adr/0048-interactive-developer-studio-tools-and-edge-simulators.md) | `adr/0048-interactive-developer-studio-tools-and-edge-simulators.md` |
| [ADR 0049: Enterprise Governance, AI Red-Teaming Patterns, Industry Verticals & Compliance Matrix](adr/0049-enterprise-governance-security-patterns-and-compliance-matrix.md) | `adr/0049-enterprise-governance-security-patterns-and-compliance-matrix.md` |
| [ADR 0050: AI Incident Postmortems, Resilience Engineering & Multi-Origin SLA Failover](adr/0050-incident-postmortems-resilience-engineering-and-sla-failover.md) | `adr/0050-incident-postmortems-resilience-engineering-and-sla-failover.md` |
| [51. Enterprise OAuth 2.0 / 2.1, FAPI Standards, Token Lifecycle & Identity Mesh](adr/0051-enterprise-oauth2-fapi-token-lifecycle-and-identity-mesh.md) | `adr/0051-enterprise-oauth2-fapi-token-lifecycle-and-identity-mesh.md` |
| [52. Enterprise OAuth 2.1 Refresh Token Rotation (RTR), Token Family Theft Containment, OIDC Back-Channel Logout & Substrate Vacuum Mesh](adr/0052-enterprise-oauth21-rtr-fapi-backchannel-and-vacuum-mesh.md) | `adr/0052-enterprise-oauth21-rtr-fapi-backchannel-and-vacuum-mesh.md` |
| [0053. Siloed Supabase OAuth Platform Authentication & Isolated Backend Substrate Sharding Mesh](adr/0053-siloed-supabase-oauth-and-isolated-backend-sharding-mesh.md) | `adr/0053-siloed-supabase-oauth-and-isolated-backend-sharding-mesh.md` |
| [0054. Apex Transport Layer Hardening: RFC 9530 Digests, RFC 9421 Signatures, IETF Idempotency, and Anti-Replay Nonces](adr/0054-apex-transport-hardening-rfc9530-rfc9421-idempotency-and-anti-replay.md) | `adr/0054-apex-transport-hardening-rfc9530-rfc9421-idempotency-and-anti-replay.md` |
| [ADR 0055: Ambient Declarative AI Substrate, Zero-Route Direct Actions & Runtime Auto-Patcher](adr/0055-ambient-declarative-ai-substrate-zero-route-and-auto-patcher.md) | `adr/0055-ambient-declarative-ai-substrate-zero-route-and-auto-patcher.md` |
| [ADR 0056: BroccoliDB 85-Buffer Algorithmic DeDuplication & High-Velocity Streaming Substrate](adr/0056-broccolidb-85-buffer-deduplication-and-streaming-pipeline-substrate.md) | `adr/0056-broccolidb-85-buffer-deduplication-and-streaming-pipeline-substrate.md` |
| [ADR 0057: Mega-Incident Stream Cascading & Mega-Document Hierarchical Pyramid Compactor](adr/0057-broccolidb-mega-incident-cascader-and-pyramid-compaction-substrate.md) | `adr/0057-broccolidb-mega-incident-cascader-and-pyramid-compaction-substrate.md` |
| [ADR 0058: BroccoliDB 180-Domain Enterprise Industry Cluster Compaction Substrate](adr/0058-broccolidb-180-domain-industry-cluster-compactor-substrate.md) | `adr/0058-broccolidb-180-domain-industry-cluster-compactor-substrate.md` |
| [ADR 0059: BroccoliDB Safe Compaction Facade, Barrel Hardening, and Production API Gateway](adr/0059-broccolidb-safe-compaction-facade-barrel-hardening-and-api-gateway.md) | `adr/0059-broccolidb-safe-compaction-facade-barrel-hardening-and-api-gateway.md` |
| [ADR 0060: BroccoliDB High-Velocity Domain Expansion, Drain Log Clustering, Distributed Trace Slicing, and Telemetry Stream Compaction](adr/0060-broccolidb-high-velocity-domain-expansion-and-stream-compaction.md) | `adr/0060-broccolidb-high-velocity-domain-expansion-and-stream-compaction.md` |
| [ADR 0061: BroccoliDB NetFlow Security, L2 Order Book Depth, and Continuous Sliding-Window Stream Compaction](adr/0061-broccolidb-network-orderbook-and-sliding-window-stream-compaction.md) | `adr/0061-broccolidb-network-orderbook-and-sliding-window-stream-compaction.md` |
| [ADR 0062: BroccoliDB Industrial IoT Sensors, Clickstream RUM, Genomic Sequencing & Hybrid Stream Multiplexing](adr/0062-broccolidb-industrial-iot-clickstream-genomics-and-hybrid-stream-multiplexing.md) | `adr/0062-broccolidb-industrial-iot-clickstream-genomics-and-hybrid-stream-multiplexing.md` |
| [ADR 0063: BroccoliDB Kernel eBPF Runtime Security, Kubernetes Watch Deltas, Geospatial ADS-B/AIS & Apache Arrow Dictionary Stream Compaction](adr/0063-broccolidb-ebpf-k8s-geospatial-and-arrow-dictionary-stream-compaction.md) | `adr/0063-broccolidb-ebpf-k8s-geospatial-and-arrow-dictionary-stream-compaction.md` |
| [ADR 0064: BroccoliDB OpenAI Inference Boundary Empirical Measurement & Task Suite](adr/0064-broccolidb-openai-inference-boundary-measurement-and-task-suite.md) | `adr/0064-broccolidb-openai-inference-boundary-measurement-and-task-suite.md` |
| [ADR 0065: BroccoliDB Randomized Branch-Blinded A/B Evaluation Protocol & Out-of-Sample Validation](adr/0065-broccolidb-blinded-evaluator-protocol-and-out-of-sample-validation.md) | `adr/0065-broccolidb-blinded-evaluator-protocol-and-out-of-sample-validation.md` |
| [ADR 0066: Institutional Entropy Resistance & Epistemic Representation Compression](adr/0066-institutional-entropy-resistance-and-epistemic-compression.md) | `adr/0066-institutional-entropy-resistance-and-epistemic-compression.md` |
| [ADR 0067: Adaptive Representation Selection & Density Bypass Substrate](adr/0067-representation-selection-and-adaptive-density-bypass.md) | `adr/0067-representation-selection-and-adaptive-density-bypass.md` |
| [ADR 0068: Dual Rolling Window Seat Quotas and Distributed Request Leases](adr/0068-dual-rolling-window-seat-quotas-and-distributed-request-leases.md) | `adr/0068-dual-rolling-window-seat-quotas-and-distributed-request-leases.md` |
| [ADR 0069: Hybrid BroccoliDB-PostgreSQL Rolling Context and 5-Level Multi-Resolution Pyramid](adr/0069-hybrid-broccolidb-postgres-rolling-context-and-5-level-pyramid.md) | `adr/0069-hybrid-broccolidb-postgres-rolling-context-and-5-level-pyramid.md` |
| [ADR 0070: Elastic Dynamic Context Governor and Atomic Turn-Pair Integrity](adr/0070-elastic-dynamic-context-governor-and-atomic-turn-pair-integrity.md) | `adr/0070-elastic-dynamic-context-governor-and-atomic-turn-pair-integrity.md` |
| [ADR 0071: Cross-Session Universal Workspace Anchors and Hardware Cache Topology](adr/0071-cross-session-universal-workspace-anchors-and-hardware-cache-topology.md) | `adr/0071-cross-session-universal-workspace-anchors-and-hardware-cache-topology.md` |
| [ADR 0072: Exact-Owner Chat Persistence and Delta Sync Mesh](adr/0072-exact-owner-chat-persistence-and-delta-sync-mesh.md) | `adr/0072-exact-owner-chat-persistence-and-delta-sync-mesh.md` |
| [ADR 0073: Zero-Dependency Post-Training Cognitive Labeling & 4-Stage Substrate](adr/0073-zero-dependency-post-training-cognitive-labeling-and-4-stage-substrate.md) | `adr/0073-zero-dependency-post-training-cognitive-labeling-and-4-stage-substrate.md` |
| [ADR 0074: DeepSeek-V3/R1 Multi-Head Latent Attention (MLA), KV Dequantization & DualPipe Parallelism](adr/0074-deepseek-v3-r1-mla-compression-latent-kv-dequantization-and-dualpipe.md) | `adr/0074-deepseek-v3-r1-mla-compression-latent-kv-dequantization-and-dualpipe.md` |
| [ADR 0075: Speculative Verification Trees, EAGLE-2, Medusa & Head Entropy Pruning](adr/0075-speculative-verification-trees-eagle2-medusa-and-head-entropy-pruning.md) | `adr/0075-speculative-verification-trees-eagle2-medusa-and-head-entropy-pruning.md` |
| [ADR 0076: Dynamic Sequence Packing Mask Slicing, Online DPO Length Debiasing & Loss-Truncated Gradient Shielding](adr/0076-dynamic-sequence-packing-mask-slicing-dpo-length-debiasing-and-gradient-shield.md) | `adr/0076-dynamic-sequence-packing-mask-slicing-dpo-length-debiasing-and-gradient-shield.md` |
| [ADR 0077: Autonomous Cloudflare R2 Sync & Cryptographic Merkle Manifest Catalog](adr/0077-autonomous-cloudflare-r2-sync-and-cryptographic-merkle-manifest-catalog.md) | `adr/0077-autonomous-cloudflare-r2-sync-and-cryptographic-merkle-manifest-catalog.md` |
| [ADR 0078: GLM-5.3 Flash IndexShare Sparse Attention, Slime Asynchronous RL & Hybrid Thinking Modes](adr/0078-glm-53-flash-indexshare-sparse-attention-and-slime-async-rl.md) | `adr/0078-glm-53-flash-indexshare-sparse-attention-and-slime-async-rl.md` |
| [ADR 0079: LUMI & Community QoS Multi-Tier Pool Mesh and IETF RateLimit Generation](adr/0079-lumi-and-community-qos-multi-tier-pool-mesh.md) | `adr/0079-lumi-and-community-qos-multi-tier-pool-mesh.md` |
| [ADR 0080: Zero-Roundtrip Preflight and Vectorized Batch Sync Engine](adr/0080-zero-roundtrip-preflight-and-vectorized-batch-sync.md) | `adr/0080-zero-roundtrip-preflight-and-vectorized-batch-sync.md` |
| [ADR 0081: Monotonic Stream Deltas and Zero-Copy Stream Pump](adr/0081-monotonic-stream-deltas-and-zero-copy-pump.md) | `adr/0081-monotonic-stream-deltas-and-zero-copy-pump.md` |
| [ADR 0082: Deterministic Prompt Compaction, Strict Model Fidelity & Quality Sentinels](adr/0082-prompt-compaction-predictive-routing-and-quality-sentinels.md) | `adr/0082-prompt-compaction-predictive-routing-and-quality-sentinels.md` |
| [ADR 0083: Context Window Preservation and Semantic AST Skeletons](adr/0083-context-window-preservation-and-ast-skeletons.md) | `adr/0083-context-window-preservation-and-ast-skeletons.md` |
| [ADR 0084: Context Salience Scoring and High-Throughput Zen Flow Buffer Pool](adr/0084-context-salience-and-zen-flow-buffer-pool.md) | `adr/0084-context-salience-and-zen-flow-buffer-pool.md` |
| [ADR 0085: Zero-Egress Keyset Sync, XFetch Early Recomputation & Bloom Origin Shield](adr/0085-zero-egress-keyset-sync-and-xfetch-bloom-shield.md) | `adr/0085-zero-egress-keyset-sync-and-xfetch-bloom-shield.md` |
| [ADR 0086: BroccoliDB Authoritative Merkle Governor & Workspace-Wide Circuit Breaker](adr/0086-authoritative-merkle-governor-and-circuit-breaker.md) | `adr/0086-authoritative-merkle-governor-and-circuit-breaker.md` |
| [ADR 0087: Dual-Window Hybrid Rate Governance, Sliding Request Logs & Zero-Trust Resynchronization](adr/0087-dual-window-hybrid-rate-governance-and-sliding-window-log.md) | `adr/0087-dual-window-hybrid-rate-governance-and-sliding-window-log.md` |
| [ADR 0088: Enterprise 6-State Circuit Breaker, Strict Single-Canary Slotting & Slow-Start Quadratic Warmup](adr/0088-enterprise-six-state-circuit-breaker-single-canary-and-quadratic-warmup.md) | `adr/0088-enterprise-six-state-circuit-breaker-single-canary-and-quadratic-warmup.md` |
| [ADR 0089: Anti-Stampede Bounded Admission Queue & AIMD Adaptive Concurrency Limiter](adr/0089-anti-stampede-bounded-admission-queue-and-aimd-concurrency-limiter.md) | `adr/0089-anti-stampede-bounded-admission-queue-and-aimd-concurrency-limiter.md` |
| [ADR 0090: Zero-Egress Write-Behind Micro-Batch Synchronization Buffer](adr/0090-zero-egress-write-behind-micro-batch-sync-buffer.md) | `adr/0090-zero-egress-write-behind-micro-batch-sync-buffer.md` |
| [ADR 0091: Developer Gateway Key Governance & Enterprise Rotation Ergonomics](adr/0091-developer-gateway-key-governance-and-enterprise-rotation-ergonomics.md) | `adr/0091-developer-gateway-key-governance-and-enterprise-rotation-ergonomics.md` |
| [ADR 0092: BroccoliDB L0 Nanosecond Pointer Cache & Negative Caching Defense](adr/0092-broccolidb-l0-nanosecond-pointer-cache-and-negative-caching-defense.md) | `adr/0092-broccolidb-l0-nanosecond-pointer-cache-and-negative-caching-defense.md` |
| [ADR 0093: PostgreSQL Connection Pool Circuit Breaker & Atomic Coalesced Write-Behind](adr/0093-postgresql-connection-pool-circuit-breaker-and-atomic-coalesced-write-behind.md) | `adr/0093-postgresql-connection-pool-circuit-breaker-and-atomic-coalesced-write-behind.md` |
| [ADR 0094: Workspace-Wide Direct Connection Pooling & Queue Saturation Governance](adr/0094-workspace-wide-direct-connection-pooling-and-queue-saturation-governance.md) | `adr/0094-workspace-wide-direct-connection-pooling-and-queue-saturation-governance.md` |
| [ADR 0095: Zero-Cycle Dispatcher, Token Hash Memoization & In-Place L0 Mutation](adr/0095-zero-cycle-dispatcher-token-hash-memoization-and-in-place-l0-mutation.md) | `adr/0095-zero-cycle-dispatcher-token-hash-memoization-and-in-place-l0-mutation.md` |
| [ADR 0096: Connection Pool Security Isolation & Tenant Guardrails](adr/0096-connection-pool-security-isolation-and-tenant-guardrails.md) | `adr/0096-connection-pool-security-isolation-and-tenant-guardrails.md` |
| [ADR 0097: Transaction-Scoped Tenant RLS Over Direct Connection Pooling](adr/0097-transaction-scoped-tenant-rls-over-direct-connection-pooling.md) | `adr/0097-transaction-scoped-tenant-rls-over-direct-connection-pooling.md` |
| [ADR 0098: PostgreSQL Socket Destruction on Error & Complete JWT Claims JSON Injection](adr/0098-pg-socket-destroy-on-error-and-jwt-claims-json-injection.md) | `adr/0098-pg-socket-destroy-on-error-and-jwt-claims-json-injection.md` |
| [ADR 0099: Forced RLS & Declarative Session Context Procedures](adr/0099-forced-rls-and-declarative-session-context-procedures.md) | `adr/0099-forced-rls-and-declarative-session-context-procedures.md` |
| [ADR 0100: Audit Immutability Triggers & Kernel Tenant-Binding Enforcement](adr/0100-audit-immutability-and-kernel-tenant-binding-triggers.md) | `adr/0100-audit-immutability-and-kernel-tenant-binding-triggers.md` |
| [ADR 0101: Persona & Image Forced RLS with Ownership Reassignment Armor](adr/0101-persona-image-forced-rls-and-ownership-reassignment-defense.md) | `adr/0101-persona-image-forced-rls-and-ownership-reassignment-defense.md` |
| [ADR 0102: Chat Messages Access Validation & Tasks CRUD RLS Armor](adr/0102-chat-messages-access-validation-and-tasks-crud-rls.md) | `adr/0102-chat-messages-access-validation-and-tasks-crud-rls.md` |
| [ADR 0103: Chat Memory & Billing Forced RLS with Ownership Armor](adr/0103-chat-memory-and-billing-forced-rls-and-ownership-armor.md) | `adr/0103-chat-memory-and-billing-forced-rls-and-ownership-armor.md` |
| [ADR 0104: Least-Privilege DAC Table Grants for Authenticated Tenant Role](adr/0104-least-privilege-dac-grants-for-authenticated-tenant-role.md) | `adr/0104-least-privilege-dac-grants-for-authenticated-tenant-role.md` |
| [ADR 0105: Tenant ID CHECK Constraints & LEAKPROOF RLS Optimization](adr/0105-tenant-id-constraints-and-leakproof-rls-armor.md) | `adr/0105-tenant-id-constraints-and-leakproof-rls-armor.md` |
| [ADR 0106: Wallet Balance Tamper-Proofing & Financial Ledger Immutability](adr/0106-wallet-balance-tamper-proofing-and-billing-ledger-immutability.md) | `adr/0106-wallet-balance-tamper-proofing-and-billing-ledger-immutability.md` |
| [ADR 0107: API Credit Handling & Quota Pool Armor](adr/0107-api-credit-handling-and-quota-pool-armor.md) | `adr/0107-api-credit-handling-and-quota-pool-armor.md` |
| [ADR 0108: Workspaces & Team Billing Spend Armor](adr/0108-workspaces-and-team-billing-spend-armor.md) | `adr/0108-workspaces-and-team-billing-spend-armor.md` |
| [ADR 0109: Sovereign Backend Inference Pipeline & Native Flagship Pool](adr/0109-sovereign-backend-inference-pipeline-and-native-flagship-pool.md) | `adr/0109-sovereign-backend-inference-pipeline-and-native-flagship-pool.md` |
| [ADR 0110: End-to-End Inference Verification Suite & Artifact Telemetry](adr/0110-e2e-inference-verification-suite-and-artifact-telemetry.md) | `adr/0110-e2e-inference-verification-suite-and-artifact-telemetry.md` |
| [ADR 0111: Separate edge and Node inference transports](adr/0111-cloudflare-edge-swrr-fleet-session-sticky-prompt-caching-and-codex-concurrency-isolation.md) | `adr/0111-cloudflare-edge-swrr-fleet-session-sticky-prompt-caching-and-codex-concurrency-isolation.md` |
| [ADR 0112: Registry-backed provider routing and relay transport](adr/0112-galxai-authoritative-shard-fleet-pool-native-codex-websocket-wire-and-sliding-window-failover.md) | `adr/0112-galxai-authoritative-shard-fleet-pool-native-codex-websocket-wire-and-sliding-window-failover.md` |
| [ADR 0113: Long-running inference experiments and relay recovery scope](adr/0113-unpredictable-2-3-minute-inference-mlfq-itl-watchdog-and-resumable-streams.md) | `adr/0113-unpredictable-2-3-minute-inference-mlfq-itl-watchdog-and-resumable-streams.md` |
| [ADR 0114: Uncertain Execution Authority Kernel and Transactional Journal](adr/0114-uncertain-execution-authority-kernel-and-transactional-journal.md) | `adr/0114-uncertain-execution-authority-kernel-and-transactional-journal.md` |
| [ADR 0115: PostgreSQL-Authoritative Shard Registry and Secret-Free Projections](adr/0115-postgresql-authoritative-shard-registry-and-secret-free-projections.md) | `adr/0115-postgresql-authoritative-shard-registry-and-secret-free-projections.md` |
| [ADR 0116: Logical Agent Session Identity and Client Multiplexing](adr/0116-logical-agent-session-identity-and-client-multiplexing.md) | `adr/0116-logical-agent-session-identity-and-client-multiplexing.md` |
| [ADR 0117: Server-Mediated Tenant Authority & Secure PostgreSQL Defaults](adr/0117-server-mediated-tenant-authority-and-secure-postgres-defaults.md) | `adr/0117-server-mediated-tenant-authority-and-secure-postgres-defaults.md` |
| [ADR 0118: Versioned Same-Origin Agent Client Deployment](adr/0118-versioned-same-origin-agent-client-deployment.md) | `adr/0118-versioned-same-origin-agent-client-deployment.md` |
| [ADR 0119: Inference-First Product Surface and First-Party Client Retirement](adr/0119-inference-first-product-surface-and-client-retirement.md) | `adr/0119-inference-first-product-surface-and-client-retirement.md` |
| [ADR 0120: Host relay ingress and deployment boundary](adr/0120-zero-cost-host-mac-cloudflare-tunnel-relay-ingress-and-protocol-hardening.md) | `adr/0120-zero-cost-host-mac-cloudflare-tunnel-relay-ingress-and-protocol-hardening.md` |
| [ADR 0121: Provider image synthesis and user/session asset persistence](adr/0121-user-and-session-r2-partitioning-manifest-lifecycle-and-relay-image-synthesis.md) | `adr/0121-user-and-session-r2-partitioning-manifest-lifecycle-and-relay-image-synthesis.md` |
| [ADR 0122: Isolated authenticated relay and bounded recovery](adr/0122-isolated-authenticated-relay-and-bounded-recovery.md) | `adr/0122-isolated-authenticated-relay-and-bounded-recovery.md` |
| [Image requests recover after an expired account cooldown](adr/0123-image-request-cooldown-recovery.md) | `adr/0123-image-request-cooldown-recovery.md` |
| [Cooldowns require attributable evidence and current lease authority](adr/0124-cooldown-evidence-and-stale-result-protection.md) | `adr/0124-cooldown-evidence-and-stale-result-protection.md` |
| [Keep observations separate from health authority and bound recovery work](adr/0125-observation-authority-and-bounded-database-recovery.md) | `adr/0125-observation-authority-and-bounded-database-recovery.md` |
| [ADR 0126: Capability-aware 1:1 shard relay federation](adr/0126-capability-aware-shard-relay-federation.md) | `adr/0126-capability-aware-shard-relay-federation.md` |
| [ADR 0127: Explicit Codex image-tool alias and production federation cutover](adr/0127-codex-image-tool-alias-production-cutover.md) | `adr/0127-codex-image-tool-alias-production-cutover.md` |
| [ADR 0128: Documentation authority and federation contract](adr/0128-documentation-authority-and-federation-contract.md) | `adr/0128-documentation-authority-and-federation-contract.md` |

## Operational records

| Document | Path |
| --- | --- |
| [Billing recovery release](operations/billing-release.md) | `operations/billing-release.md` |
| [Production relay recovery — September 7, 2026](operations/relay-production-repair.md) | `operations/relay-production-repair.md` |
| [Wallet lifecycle repair — September 7, 2026](operations/wallet-lifecycle.md) | `operations/wallet-lifecycle.md` |

## Research and evaluation

| Document | Path |
| --- | --- |
| [📊 GALXAI Performance Benchmarks & Stress Analysis](BENCHMARKS.md) | `BENCHMARKS.md` |
| [🔬 Forensic Payload Dissection: Representation Transformation before Inference](FORENSIC_PAYLOAD_DISSECTION_AND_CAUSAL_ANALYSIS.md) | `FORENSIC_PAYLOAD_DISSECTION_AND_CAUSAL_ANALYSIS.md` |
| [GALXAI Governance Control Plane Review](GOVERNANCE_CONTROL_PLANE_REVIEW.md) | `GOVERNANCE_CONTROL_PLANE_REVIEW.md` |
| [GALXAI SENIOR ENGINEERING REVIEW: Sovereign Seat Quotas, Dynamic Elastic Context, and Hybrid Rolling Memory Mesh](SENIOR_ENGINEERING_REVIEW_CHAT_AND_ROLLING_CONTEXT.md) | `SENIOR_ENGINEERING_REVIEW_CHAT_AND_ROLLING_CONTEXT.md` |
| [🚀 GALX-Flash-8B: Training Roadmap, Strategy & Execution Plan](TRAINING_ROADMAP_AND_EXECUTION_PLAN.md) | `TRAINING_ROADMAP_AND_EXECUTION_PLAN.md` |
| [🥦 The Philosophy of BroccoliDB](broccolidb/01_PHILOSOPHY_THE_AGGRESSIVE_VEGETABLE.md) | `broccolidb/01_PHILOSOPHY_THE_AGGRESSIVE_VEGETABLE.md` |
| [🥦 Task-Conditioned Representation Selection Under Epistemic and Information-Theoretic Constraints](broccolidb/02_WHITEPAPER_REPRESENTATION_SELECTION.md) | `broccolidb/02_WHITEPAPER_REPRESENTATION_SELECTION.md` |
| [🥦 BroccoliDB Stakeholder Brief & Maintainer Onboarding](broccolidb/03_STAKEHOLDER_AND_ONBOARDING_BRIEF.md) | `broccolidb/03_STAKEHOLDER_AND_ONBOARDING_BRIEF.md` |
| [🥦 A Formal Theory of Task-Conditioned Representation Selection, Invariant Preservation, and Bounded Action Degradation](broccolidb/04_FORMAL_MATHEMATICAL_PROOF.md) | `broccolidb/04_FORMAL_MATHEMATICAL_PROOF.md` |
| [🥦 Formal TLA+ & State-Machine Specification of the BroccoliDB Substrate](broccolidb/05_FORMAL_TLA_STATE_MACHINE_SPECIFICATION.md) | `broccolidb/05_FORMAL_TLA_STATE_MACHINE_SPECIFICATION.md` |
| [🥦 BroccoliDB Architectural Audit & Empirical Evaluation Report](broccolidb/06_ARCHITECTURAL_AUDIT_AND_EMPIRICAL_EVALUATION.md) | `broccolidb/06_ARCHITECTURAL_AUDIT_AND_EMPIRICAL_EVALUATION.md` |
| [🥦 Lean 4 Formal Verification Blueprint for BroccoliDB](broccolidb/07_LEAN4_FORMAL_VERIFICATION_BLUEPRINT.md) | `broccolidb/07_LEAN4_FORMAL_VERIFICATION_BLUEPRINT.md` |
| [🥦 Compiler IR Lowering & Program Slicing Architecture](broccolidb/08_COMPILER_IR_LOWERING_AND_PROGRAM_SLICING.md) | `broccolidb/08_COMPILER_IR_LOWERING_AND_PROGRAM_SLICING.md` |
| [RFC-BROCCOLIDB-0001: Task-Conditioned Representation Selection Protocol (TCRSP/1.0)](broccolidb/09_RFC_BROCCOLIDB_0001_TASK_CONDITIONED_REPRESENTATION_SELECTION_PROTOCOL.md) | `broccolidb/09_RFC_BROCCOLIDB_0001_TASK_CONDITIONED_REPRESENTATION_SELECTION_PROTOCOL.md` |
| [🥦 BroccoliDB Document 10: Frontier Post-Training Cognitive Labeling & 4-Stage Substrate](broccolidb/10_FRONTIER_POST_TRAINING_COGNITIVE_LABELING_SUBSTRATE.md) | `broccolidb/10_FRONTIER_POST_TRAINING_COGNITIVE_LABELING_SUBSTRATE.md` |
| [🥦 BroccoliDB Core Documentation & Research Suite](broccolidb/README.md) | `broccolidb/README.md` |
| [📊 Maintainer Guide: Performance Benchmarking & Service Level Objectives (SLOs)](maintainers/PERFORMANCE_BENCHMARKING_AND_SLOS.md) | `maintainers/PERFORMANCE_BENCHMARKING_AND_SLOS.md` |
| [🛸 GALXAI Apex Synthetic Curation & Training Strategy Substrate](training/00_APEX_SYNTHETIC_CURATION_AND_STRATEGY_OVERVIEW.md) | `training/00_APEX_SYNTHETIC_CURATION_AND_STRATEGY_OVERVIEW.md` |
| [🎯 Document 01: Strategy & Target Goal](training/01_STRATEGY_AND_TARGET_GOAL.md) | `training/01_STRATEGY_AND_TARGET_GOAL.md` |
| [📅 Document 02: Timeframe & Sprint Milestones](training/02_TIMEFRAME_AND_SPRINT_MILESTONES.md) | `training/02_TIMEFRAME_AND_SPRINT_MILESTONES.md` |
| [📊 Document 03: Dataset & Curriculum Specification](training/03_DATASET_AND_CURRICULUM_SPECIFICATION.md) | `training/03_DATASET_AND_CURRICULUM_SPECIFICATION.md` |
| [🖥️ Document 04: Hardware & Infrastructure Setup](training/04_HARDWARE_AND_INFRASTRUCTURE_SETUP.md) | `training/04_HARDWARE_AND_INFRASTRUCTURE_SETUP.md` |
| [🧪 Document 05: Training Recipes & Hyperparameters](training/05_TRAINING_RECIPES_AND_HYPERPARAMETERS.md) | `training/05_TRAINING_RECIPES_AND_HYPERPARAMETERS.md` |
| [🛠️ Document 06: Operational Execution Runbook](training/06_OPERATIONAL_EXECUTION_RUNBOOK.md) | `training/06_OPERATIONAL_EXECUTION_RUNBOOK.md` |
| [🏆 Document 07: Evaluation & Deployment Gate](training/07_EVALUATION_AND_DEPLOYMENT_GATE.md) | `training/07_EVALUATION_AND_DEPLOYMENT_GATE.md` |
| [🚀 GALXAI Foundation Model Training Suite: Master Directory](training/README.md) | `training/README.md` |

## Commercial and product drafts

| Document | Path |
| --- | --- |
| [GALXAI: Private & Secure AI Workflows for Frontier GPT Models](ENTERPRISE_PRIVATE_AI_COPY.md) | `ENTERPRISE_PRIVATE_AI_COPY.md` |
| [🚀 GALXAI: Go-To-Market (GTM) & Positioning Strategy](GTM_STRATEGY.md) | `GTM_STRATEGY.md` |
| [GALXAI Landing Page Copy — High-Signal & Zero Technical Jargon](LANDING_PAGE_COPY.md) | `LANDING_PAGE_COPY.md` |
| [💰 GALXAI Pricing & Multi-Tiered Discount Strategy](PRICING_AND_DISCOUNT_STRATEGY.md) | `PRICING_AND_DISCOUNT_STRATEGY.md` |
| [🌐 GALXAI: Programmatic SEO (pSEO), Answer Engine (AEO) & Generative Optimization (GEO) Strategy](PSEO_AND_AEO_STRATEGY.md) | `PSEO_AND_AEO_STRATEGY.md` |
| [🏆 Playbook: AI Coding Agent Community Bounties & DevRel Growth](events-and-devrel/01-ai-coding-agent-bounties.md) | `events-and-devrel/01-ai-coding-agent-bounties.md` |
| [🎯 Playbook: Onboarding the First 10 High-Spend AI Startups](first-10-customers/01-high-spend-startup-onboarding.md) | `first-10-customers/01-high-spend-startup-onboarding.md` |
| [🤝 Enterprise Proof-of-Concept & Wholesale Volume Discount Schedule](first-10-customers/04-enterprise-poc-and-volume-discounts.md) | `first-10-customers/04-enterprise-poc-and-volume-discounts.md` |
| [investor_recap](investor_recap.md) | `investor_recap.md` |
| [⏱️ The 10-Minute Executive Pitch Playbook](investors/00_10_MINUTE_INVESTOR_MEETING_PLAYBOOK.md) | `investors/00_10_MINUTE_INVESTOR_MEETING_PLAYBOOK.md` |
| [📄 GALXAI: Executive Fact Sheet](investors/00_ONE_PAGER_EXECUTIVE_TEASER.md) | `investors/00_ONE_PAGER_EXECUTIVE_TEASER.md` |
| [📑 GALXAI Executive Memorandum & Product Brief](investors/01_EXECUTIVE_SUMMARY_AND_MEMO.md) | `investors/01_EXECUTIVE_SUMMARY_AND_MEMO.md` |
| [📊 GALXAI Pitch Deck: 8-Slide Crisis & Traction Specification](investors/02_PITCH_DECK_SLIDE_BY_SLIDE.md) | `investors/02_PITCH_DECK_SLIDE_BY_SLIDE.md` |
| [📈 GALXAI Market Sizing: TAM, SAM & SOM Analysis](investors/03_MARKET_SIZING_TAM_SAM_SOM.md) | `investors/03_MARKET_SIZING_TAM_SAM_SOM.md` |
| [💰 GALXAI Unit Economics: CAC, LTV, Margins & Payback Analysis](investors/04_UNIT_ECONOMICS_CAC_LTV_PAYBACK.md) | `investors/04_UNIT_ECONOMICS_CAC_LTV_PAYBACK.md` |
| [🛡️ GALXAI Competitive Landscape & Strategic Defensibility](investors/05_COMPETITIVE_LANDSCAPE_AND_MOATS.md) | `investors/05_COMPETITIVE_LANDSCAPE_AND_MOATS.md` |
| [📊 GALXAI 5-Year Financial Projections & Operating Model](investors/06_FINANCIAL_PROJECTIONS_AND_MODEL.md) | `investors/06_FINANCIAL_PROJECTIONS_AND_MODEL.md` |
| [Technical diligence: implementation and evidence](investors/07_TECHNICAL_DILIGENCE_AND_PATENTS.md) | `investors/07_TECHNICAL_DILIGENCE_AND_PATENTS.md` |
| [🎯 GALXAI Commercial Thesis & Customer Discovery Playbook](investors/08_COMMERCIAL_THESIS_AND_DISCOVERY_PLAYBOOK.md) | `investors/08_COMMERCIAL_THESIS_AND_DISCOVERY_PLAYBOOK.md` |
| [09. Enterprise Spend Governance & Control Plane](investors/09_ENTERPRISE_SPEND_GOVERNANCE_AND_CONTROL_PLANE.md) | `investors/09_ENTERPRISE_SPEND_GOVERNANCE_AND_CONTROL_PLANE.md` |
| [10. Enterprise 30-Day Zero-Risk Pilot Agreement & Commercial Terms](investors/10_ENTERPRISE_PILOT_PROPOSAL_AND_AGREEMENT.md) | `investors/10_ENTERPRISE_PILOT_PROPOSAL_AND_AGREEMENT.md` |
| [🏛️ GALXAI Institutional & Strategic Diligence Room](investors/README.md) | `investors/README.md` |
| [landingpage](landingpage.md) | `landingpage.md` |
| [🌟 PRODUCT VISION & THE NORTH STAR](manifesto/PRODUCT_VISION_AND_NORTH_STAR.md) | `manifesto/PRODUCT_VISION_AND_NORTH_STAR.md` |
| [🛡️ GALXAI Manifesto & Product Vision](manifesto/README.md) | `manifesto/README.md` |
| [🛡️ THE FOUNDER MANIFESTO](manifesto/THE_FOUNDER_MANIFESTO.md) | `manifesto/THE_FOUNDER_MANIFESTO.md` |
| [🔍 Playbook: GitHub Repository Audit & Non-Spam Migration Outreach](prospecting/01-github-repository-audit-playbook.md) | `prospecting/01-github-repository-audit-playbook.md` |
| [📡 High-Velocity Multi-Channel Lead Scraping Engine](prospecting/02-multi-channel-lead-scraping-engine.md) | `prospecting/02-multi-channel-lead-scraping-engine.md` |
| [✉️ High-Converting Outbound Sales Cadences (45%+ Open, 20%+ Reply)](prospecting/03-high-converting-cold-outreach-cadences.md) | `prospecting/03-high-converting-cold-outreach-cadences.md` |
