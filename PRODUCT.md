# Product: GALXAI

<!-- impeccable:product-schema 1 -->

## Platform

web

## Overview

GALXAI is the enterprise-grade AI Consumption & Acceleration Layer. It provides developers and engineering teams with drop-in UI primitives, zero-proxy Server Actions, and a unified Anycast gateway for routing, load balancing, cost optimization, and failover across OpenAI Codex & GPT flagship models (`gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, and GPT-Image suites).

## Primary Users & Jobs to Be Done

1. **Founders & Product Leads**: Need to compress **time-to-first-dollar** by shipping production AI features in minutes without spending weeks building custom backend proxies or learning inference edge cases.
2. **VP of Engineering & Lead Architects**: Need to answer *"Why is our AI bill so high, and how do we make it stop?"* via real-time reverse-audit forensic attribution, automatic tier cascading, and runaway agent circuit breakers.
3. **AI Engineers & Developers**: Need native, zero-proxy React components (`<GalxImage />`, `<GalxChat />`), 1-line OpenAI SDK interception (`import 'galxai/patch'`), and deterministic agent directives (`npx galxai skills`).
4. **Finance & Operations Leads**: Need autonomous spend governance, net retail bill reductions (25%–40% wholesale discount + 75% prompt caching rebate), deposit match incentives, and double-entry immutable ledger accounting.

## Core Capabilities

- **Time-to-First-Dollar Primitives**: Zero-boilerplate React UI components and Next.js 15 Server Actions that eliminate client-side key leakage without requiring custom backend API proxies.
- **Enterprise Spend Forensic & Governance (/audit)**: Reverse-audit live OpenAI traffic to identify frontier model misallocations, prefix cache collisions, and uncapped CI/CD test burns.
- **Unified Gateway Routing**: OpenAI-compatible REST & streaming endpoints with sub-15ms edge routing overhead via Cloudflare Workers.
- **Autonomous Spend Remediation & Caching**: 100% pass-through of 75% prompt caching savings, dynamic prefix cache alignment, and intelligent tier cascading (`sol` $\to$ `terra` $\to$ `luna`).
- **Shard Vault Management**: Zero-trust sovereign API credential vaulting, health monitoring, and quota pooling.
- **Interactive Developer Playground & Diagnostics**: Instant GPT prompt testing, latency benchmarking, token counters, and code snippet generation (cURL, Python, Node.js).
- **Wallet & Billing Ledger**: Prepaid credit system with double-entry immutability, automated top-ups, and net invoice spend reduction.

## Constraints & Invariants

- **Performance**: Sub-50ms TTFB for cached/routed calls, optimized for edge runtimes.
- **Security**: Default-deny RLS in Supabase, zero plaintext API secret storage in client state, strict CSP.
- **Aesthetic**: Premium high-density dark interface tailored for technical operators without frivolous visual noise or AI-generated gimmicks.
