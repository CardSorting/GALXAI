# ADR 0036: Universal Developer Authentication Gating & Zero-Abuse Workspace Perimeter

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## September 16, 2026 navigation qualification

The original route list and native checkout decision below are historical. Current billing task addresses, public sign-in shell, independently authenticated APIs and retired-route redirects are specified by the [billing page contract](../reference/billing-pages.md). This qualification does not re-accept the original perimeter decision or claim a production deployment.

## Status
**Accepted & Implemented**

## Context
GALXAI provides wholesale compute access, sub-millisecond frontier model routing, pooled quota management, asynchronous task queues, and corporate billing ledgers.

Historically, certain parts of the developer interface (such as exploratory sandbox chat interfaces and public guest passes) permitted unauthenticated interaction. However, in production environments:
1. **Public Chat & Bot Abuse**: Anonymous browser chat interfaces create massive denial-of-wallet and quota exhaustion vulnerabilities against upstream frontier model providers.
2. **Data Privacy & Multi-Tenancy**: Private API keys, continuous token bucket replenishment rates, transaction ledgers, corporate VAT/Tax invoices, and team budget cost centers must never be visible to unauthenticated or guest traffic.
3. **Programmatic Core Strategy**: GALXAI is fundamentally an infrastructure and developer gateway platform. AI consumption must occur programmatically via the official Python/TypeScript SDKs, Cursor IDE, Windsurf, or direct OpenAI-compatible REST endpoints, rather than ephemeral browser chats.

## Decision
We enforce the **Universal Developer Authentication Perimeter (UDAP)** across the entire application:

1. **Complete Elimination of Guest Passes and Public Chat Substrates**:
   - Retired `loginAsGuest()` and guest bypass routes across the platform.
   - Replaced browser chat interfaces on `/queues` with the **Developer Programmatic Stream & Async Worker Task Inspector**, featuring code snippets for Python SDK, TypeScript SDK, and cURL dispatch.

2. **Universal Component Authentication Gate (`<AuthRequiredGate />`)**:
   - Implemented a centralized, high-converting gate component (`src/components/auth/AuthRequiredGate.tsx`) that interrogates session validity via `useAuth()`.
   - Protects 25+ private routes across 4 core domains:
     - **API Keys & Telemetry**: `/keys`, `/keys/[id]`, `/keys/new`, `/keys/activity`, `/keys/permissions`, `/keys/rate-limits`.
     - **Financial Ledger & Billing**: `/billing`, `/billing/invoices`, `/billing/invoices/[id]`, `/billing/payment-methods`, `/billing/auto-reload`, `/billing/expenses`, `/billing/budget-alerts`, `/billing/tax`, `/billing/teams`, `/billing/teams/[id]`, `/billing/reports`, `/billing/audit-logs`, `/billing/webhooks`, `/billing/promo`, `/billing/enterprise`.
     - **Quota Vault & Shards**: `/vault`, `/vault/deposit`, `/vault/shards/[id]`, `/vault/simulator`.
     - **Operational Telemetry & Task Queues**: `/telemetry`, `/queues`.
   - Gated views render the Developer Authentication Guard with dual conversion funnels:
     - **Connect Developer Account** (`/auth/connect`)
     - **Proceed to Secure Prepay Checkout** (`/checkout?amount=...`)
     - 4 trust badges (ZDR-100 Zero Data Retention, Ephemeral Session Enclaves, Sub-15ms Latency, 100% Unspent Deposit Refund).

3. **High-Converting 2-Column Shopify/Amazon-Inspired Checkout Funnel**:
   - Built dedicated `/checkout` and `/checkout/success` pages decoupled from external branding.
   - Features 1-click Express Pay (Apple Pay, Google Pay, USDC 1-Click), tiered compute match bonuses (+10% to +50%), order bumps, 14:59 rate lock timer, and live workload capacity estimator.

## Consequences

### Positive
- **Zero Public Quota Abuse**: Upstream credentials and compute pools are 100% protected behind real authenticated developer sessions.
- **Enterprise-Grade Privacy**: Financial ledgers, team budgets, API keys, and shard quotas are cryptographically and contextually isolated.
- **Consistent Developer Experience**: Standardized authentication UX across all 25+ private routes with 0 code duplication.
- **Enhanced Conversion**: Unauthenticated developers who land on private features are smoothly directed into authentication and compute activation funnels.

### Negative
- Visitors must authenticate or prepay compute before previewing private ledger or key management screens.
- Frontend test suites must provide authenticated mock auth states when testing private route interiors.
