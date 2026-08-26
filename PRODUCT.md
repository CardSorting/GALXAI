# Product: GALXAI

<!-- impeccable:product-schema 1 -->

## Platform

web

## Overview

GALXAI is an enterprise-grade AI API Gateway and sovereign model router. It provides developers and engineering teams with a unified endpoint for routing, load balancing, cost optimization, and failover across OpenAI Codex & GPT flagship models (`gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, and GPT-Image suites).

## Primary Users & Jobs to Be Done

1. **AI Engineers & Developers**: Need a single, drop-in replacement API key and endpoint to switch models dynamically, benchmark prompt latencies, test in a real-time playground, and eliminate vendor lock-in.
2. **System Architects & Infrastructure Leads**: Need sovereign key management via Shard Vaults, multi-tenant credential encryption (AES-256-GCM), automatic failover routing, and high-throughput low-latency edge deployment.
3. **Finance & Operations Leads**: Need transparent token usage metrics, spend auditing, deposit match incentives, and double-entry immutable ledger accounting.

## Core Capabilities

- **Unified Gateway Routing**: OpenAI-compatible REST & streaming endpoints with sub-15ms edge routing overhead via Cloudflare Workers.
- **Shard Vault Management**: Zero-trust multi-provider API credential vaulting and health monitoring.
- **Interactive Developer Playground**: Instant multi-model prompt testing, temperature controls, token counters, and code snippet generation (cURL, Python, Node.js).
- **Wallet & Billing Ledger**: Prepaid credit system with double-entry immutability, automated top-ups, and cost-savings estimation.

## Constraints & Invariants

- **Performance**: Sub-50ms TTFB for cached/routed calls, optimized for edge runtimes.
- **Security**: Default-deny RLS in Supabase, zero plaintext API secret storage in client state, strict CSP.
- **Aesthetic**: Premium high-density dark interface tailored for technical operators without frivolous visual noise or AI-generated gimmicks.
