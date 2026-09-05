# Product: GALXAI

<!-- impeccable:product-schema 1 -->

## Platform

web

## Overview

GALXAI is the enterprise-grade AI Consumption & Acceleration Layer. It provides developers and engineering teams with OpenAI-compatible APIs, SDK integrations, zero-proxy Server Actions, and a unified Anycast gateway for routing, load balancing, cost optimization, and failover across OpenAI Codex & GPT flagship models (`gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, and GPT-Image suites).

## Primary Users & Jobs to Be Done

1. **Founders & Product Leads**: Need to compress **time-to-first-dollar** by shipping production AI features in minutes without spending weeks building custom backend proxies or learning inference edge cases.
2. **VP of Engineering & Lead Architects**: Need to answer *"Why is our AI bill so high, and how do we make it stop?"* via real-time reverse-audit forensic attribution, automatic tier cascading, and runaway agent circuit breakers.
3. **AI Engineers & Developers**: Need OpenAI-compatible inference APIs, native SDKs, 1-line OpenAI SDK interception (`import 'galxai/patch'`), and deterministic agent directives (`npx galxai skills`).
4. **Finance & Operations Leads**: Need autonomous spend governance, net retail bill reductions (25%–40% wholesale discount + 75% prompt caching rebate), deposit match incentives, and double-entry immutable ledger accounting.

## Core Capabilities

- **Time-to-First-Dollar Primitives**: Native SDKs and Next.js 15 Server Actions that eliminate client-side key leakage without requiring custom backend API proxies.
- **Enterprise Spend Forensic & Governance (/audit)**: Reverse-audit live OpenAI traffic to identify frontier model misallocations, prefix cache collisions, and uncapped CI/CD test burns.
- **Unified Gateway Routing**: OpenAI-compatible REST & streaming endpoints with sub-15ms edge routing overhead via Cloudflare Workers.
- **Autonomous Spend Remediation & Caching**: 100% pass-through of 75% prompt caching savings, dynamic prefix cache alignment, and intelligent tier cascading (`sol` $\to$ `terra` $\to$ `luna`).
- **Shard Vault Management**: Zero-trust sovereign API credential vaulting, health monitoring, and quota pooling.
- **Developer Request Tools & Diagnostics**: API request construction, latency benchmarking, token counters, and code generation for cURL, Python, and Node.js integrations.
- **Wallet & Billing Ledger**: Prepaid credit system with double-entry immutability, automated top-ups, and net invoice spend reduction.

## Constraints & Invariants

- **Product Surface Boundary**: GALXAI hosts model discovery, API configuration, billing, telemetry, and governance—not a destination chat application or image studio. Downstream developers own their end-user creation experiences.
- **Post-Auth Activation**: Successful login defaults to `/models`, where the canonical model array is presented as cards with model-type tabs. Explicit protected-route return destinations remain intact.
- **Capability Preservation**: Removing hosted client UI must not remove `/v1/chat/completions`, `/v1/images/generations`, `/v1/models`, SDK inference, or explicit durable-session handling.

The operational product taxonomy, diagnostic-sandbox boundary, copy rules, roadmap test, and activation measures are maintained in [Product Surface Strategy](docs/PRODUCT_SURFACE_STRATEGY.md). ADR 0119 remains the architectural authority.

- **Performance**: Sub-50ms TTFB for cached/routed calls, optimized for edge runtimes.
- **Security**: Default-deny RLS in Supabase, zero plaintext API secret storage in client state, strict CSP.
- **Aesthetic**: Premium high-density dark interface tailored for technical operators without frivolous visual noise or AI-generated gimmicks.
