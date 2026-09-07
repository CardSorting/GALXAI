# GALXAI documentation

GALXAI is an inference platform and governance control plane. Developers own their end-user applications and agent runtimes. Start with the [product strategy](PRODUCT_SURFACE_STRATEGY.md), [architecture](ARCHITECTURE.md), and [API base URL guide](API_BASE_URL.md).

## Current relay strategy and operations

- [ADR 0122: isolation, authentication, and bounded recovery](adr/0122-isolated-authenticated-relay-and-bounded-recovery.md)
- [Deployment, setup, verification, and rollback](VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md)
- [Standalone relay API](RELAY_API_REFERENCE.md)
- [Security boundary](relay-security.md)
- [Fleet and quota operations](maintainers/RELAY_QUOTA_AND_FLEET.md)
- [Hardening and regression checks](maintainers/RELAY_HARDENING.md)
- [Troubleshooting](TROUBLESHOOTING.md)

These guides distinguish the relay from the application and Worker. The relay performs inference without executing user tools on the operator's device. It does not promise unlimited retries, exactly-once recovery, global replica coordination, or a provider quota that has not been reported.

## Collections

- [Architecture decisions](adr/README.md)
- [Maintainer guides](maintainers/README.md)
- [Investor materials](investors/README.md) — commercial theses and projections require their own dated evidence; they are not deployment guarantees.

## Reference catalog

The catalog preserves discoverability without repeating historical performance, pricing, or compliance claims. Current runtime behavior comes from the applicable source and operational guide; benchmark and review documents describe their stated scope and date.

- [API base URL](API_BASE_URL.md)
- [📖 GALXAI Universal API Reference](API_REFERENCE.md)
- [GALXAI architecture](ARCHITECTURE.md)
- [📊 GALXAI Performance Benchmarks & Stress Analysis](BENCHMARKS.md)
- [🥦 BroccoliDB Compaction Engine: Engineer Onboarding & Architecture Guide](BROCCOLIDB_COMPACTION_ONBOARDING_GUIDE.md)
- [BroccoliDB Algorithmic DeDuplication & High-Velocity Compaction Engine Specification](BROCCOLIDB_DEDUPLICATION_ENGINE_SPECIFICATION.md)
- [Cloudflare implementation and deployment boundaries](CLOUDFLARE_STRATEGY.md)
- [Deployment boundaries](DEPLOYMENT.md)
- [🌌 GALXAI Universal Developer Client SDK](DEVELOPER_CLIENT_SDK.md)
- [GALXAI Developer Gateway Key Architecture & Zero-Egress Substrate](DEVELOPER_GATEWAY_KEY_ARCHITECTURE.md)
- [🛠️ GALXAI Developer & Contributing Guide](DEVELOPER_GUIDE.md)
- [GALXAI: Private & Secure AI Workflows for Frontier GPT Models](ENTERPRISE_PRIVATE_AI_COPY.md)
- [Frequently asked questions](FAQS.md)
- [🔬 Forensic Payload Dissection: Representation Transformation before Inference](FORENSIC_PAYLOAD_DISSECTION_AND_CAUSAL_ANALYSIS.md)
- [GALXAI Governance Control Plane Review](GOVERNANCE_CONTROL_PLANE_REVIEW.md)
- [🚀 GALXAI: Go-To-Market (GTM) & Positioning Strategy](GTM_STRATEGY.md)
- [Inference pipeline verification](INFERENCE_PIPELINE_VERIFICATION.md)
- [GALXAI Landing Page Copy — High-Signal & Zero Technical Jargon](LANDING_PAGE_COPY.md)
- [Agent clients and the GALXAI relay](LUMI.md)
- [🔄 Universal Migration Guide: Seamless Transition to GALXAI](MIGRATION_GUIDE.md)
- [🧠 GALXAI Universal Model Catalog & Modality Specification](MODEL_CATALOG.md)
- [GALXAI Natural Navigation, OmniSearch & Low-Latency Substrate Guide](NATURAL_NAVIGATION_AND_OMNISEARCH.md)
- [GALXAI Enterprise OAuth 2.0 / 2.1, FAPI & Token Lifecycle Specification](OAUTH_AND_TOKEN_LIFECYCLE_SPECIFICATION.md)
- [💰 GALXAI Pricing & Multi-Tiered Discount Strategy](PRICING_AND_DISCOUNT_STRATEGY.md)
- [GALXAI Product Surface Strategy](PRODUCT_SURFACE_STRATEGY.md)
- [GALXAI: Provider-as-Auth Technical Specification](PROVIDER_AS_AUTH_SPECIFICATION.md)
- [🌐 GALXAI: Programmatic SEO (pSEO), Answer Engine (AEO) & Generative Optimization (GEO) Strategy](PSEO_AND_AEO_STRATEGY.md)
- [Application queues and relay jobs](QUEUE_SPECIFICATION.md)
- [🚀 GALXAI Quickstart: The 30-Second Guide](QUICKSTART.md)
- [Rate limits, concurrency, and provider quota](RATE_LIMITS_AND_QUOTAS.md)
- [🧠 Frontier Reasoning Models Developer Guide](REASONING_MODELS_GUIDE.md)
- [Standalone relay API](RELAY_API_REFERENCE.md)
- [Resilience and recovery boundaries](RESILIENCE_AND_DISASTER_RECOVERY.md)
- [Routing and shard selection](ROUTING_ALGORITHMS.md)
- [💻 GALXAI Multi-Ecosystem SDK & CLI Cheatsheet](SDK_CHEATSHEET.md)
- [⚡ GALXAI Universal Developer SDK: Specification & Architecture Reference](SDK_SPECIFICATION.md)
- [Security boundaries and threat model](SECURITY.md)
- [GALXAI: Security Posture & Threat Model](SECURITY_POSTURE_AND_THREAT_MODEL.md)
- [GALXAI SENIOR ENGINEERING REVIEW: Sovereign Seat Quotas, Dynamic Elastic Context, and Hybrid Rolling Memory Mesh](SENIOR_ENGINEERING_REVIEW_CHAT_AND_ROLLING_CONTEXT.md)
- [Standardized OAuth & Ingestion Architecture Specification](STANDARDIZED_OAUTH_AND_INGESTION_ARCHITECTURE.md)
- [⚡ Universal Streaming & SSE Protocols](STREAMING_AND_SSE_PROTOCOL.md)
- [⚙️ Structured Outputs, Tool Calling & Agent Runtimes](STRUCTURED_OUTPUTS_AND_TOOLS.md)
- [🛡️ GALXAI: Paranoid Supabase PostgreSQL Architecture & AI Agent Governance Specification](SUPABASE_PARANOID_ARCHITECTURE_SPEC.md)
- [🗺️ GALXAI: System Architecture Topology & Maintenance Onboarding Runbook](SYSTEM_TOPOLOGY_AND_MAINTENANCE_ONBOARDING.md)
- [Telemetry and observability](TELEMETRY_AND_OBSERVABILITY.md)
- [🚀 GALX-Flash-8B: Training Roadmap, Strategy & Execution Plan](TRAINING_ROADMAP_AND_EXECUTION_PLAN.md)
- [Troubleshooting](TROUBLESHOOTING.md)
- [GALXAI: Vercel Production Deployment Guide](VERCEL_DEPLOYMENT.md)
- [Relay deployment and recovery runbook](VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md)
- [💳 GALXAI Developer Compute Wallet & Micro-Billing Architecture](WALLET_AND_BILLING_STRATEGY.md)
- [investor_recap](investor_recap.md)
- [landingpage](landingpage.md)
- [Relay access, containment, and recovery](relay-security.md)
