# ADR 0134: Fixed-price Sites generation with opaque provider quotas

<!-- docs-scope: decision-record -->

Date: 2026-09-11. Component: Sites content API and wallet billing.
Status: accepted, implemented and locally verified in the uncommitted working tree based on `4587642`; this mode has not been deployed or activated by the implementation pass.
Audience: private maintainers. Public contracts follow [ADR 0129](0129-public-image-artifacts-and-verified-identity.md).

## Problem

The initial Sites tariff required trustworthy input/output token counts and proof of a supplier-enforced output ceiling. A live supplier rejected the forwarded ceiling field. A separate small completion verified usage and receipt recovery, but could not prove a ceiling. Treating complete supplier quota and cost visibility as a prerequisite prevented delivery of a bounded content workflow.

The operating decision is to proceed with explicit, conservative assumptions. Unknown supplier quota and cost remain unknown. The customer price is a product decision and does not purport to reimburse a precisely measured supplier bill.

New Sites pricing and admission are superseded by [ADR 0140](0140-paid-sites-and-shared-fair-usage.md). The original text below preserves the decision at the time; existing operation recovery remains applicable.

## Decision

Use a versioned flat price for each durably confirmed completed generation. The provisional default is **50,000 micro-USD ($0.05)**, with **20 admitted Sites operations per verified account in a rolling 24 hours**. Both are server-configurable. The cohort is explicitly allowlisted and limited to 50 account IDs; the feature remains off unless enabled. These implementation limits do not establish supplier entitlements, profitability, general availability or an unlimited subscription.

The account accepts the current quote version and maximum before admission. A transaction locks the wallet, checks debt, available funds, outstanding Sites holds and the rolling allowance, then debits the reservation and records the operation. Every admitted operation counts toward the allowance, including an uncertain or subsequently confirmed unused operation. Replays do not consume another slot. The allowance check is serialized by the wallet lock across application processes.

Charge the reserved fixed amount only after the trusted adapter reads a matching durable completed receipt. Missing or excessive token counts cannot change that price. Preserve available usage as observed; store missing usage as null and record the private `fixed_completion` settlement basis. Never estimate token usage from text or stream chunks. A completed but invalid content response is chargeable; a repair is a separate quoted operation.

Uncertain completion retains its reservation. Positive non-dispatch evidence closes the operation once at zero cost and returns the reservation. Settlement, unused-funds return, lifetime spend and the immutable receipt commit atomically. Recovery uses the rate saved with the original hold; a later tariff cannot reprice accepted work. [ADR 0135](0135-durable-sites-receipts-and-local-admission.md) defines the evidence and transport contract.

The fixed path uses local byte/time/attempt limits and omits the unsupported supplier token-ceiling field. It needs neither a claimed exact supplier quota nor a fabricated activation evidence object. Existing capability, health, capacity, authentication and fresh administrator readiness checks still apply. Configuration and exact defaults live in the [Sites operations guide](../maintainers/SITES_OPERATIONS.md).

## Scope and alternatives

The previous six-field metered card remains an explicit option with its original usage, ceiling and qualification requirements. This decision supersedes those prerequisites only for fixed-price Sites content. It does not change general inference pricing, signup credits, subscriptions, image billing, or existing accepted obligations under [ADR 0117](0117-server-mediated-tenant-authority-and-secure-postgres-defaults.md).

Waiting for full supplier transparency was rejected as a requirement for this narrow product. Invented usage would corrupt accounting. Treating absent telemetry as free work would subsidize unknown execution. A flat customer tariff plus bounded local admission permits useful delivery while keeping those facts distinct. Customer-owned publication follows [ADR 0136](0136-customer-owned-sites-delivery.md).

## Consequences and limits

GALX bears the variance between its fixed selling price and actual supplier expense. Local limits do not prove that disconnecting stops remote computation or billing. The default account limit permits at most $1 of newly reserved fixed-price work in any rolling day; this is a customer-reservation bound, not a supplier-cost bound. Increasing price or allowance requires a deliberate configuration change. Growth decisions should use observed completion, failure, reconciliation, support and supplier expense where available.

An unknown operation blocks additional Sites work for that account until reconciled. There is no automatic timeout refund, background reconciliation worker, cross-account borrowing or fallback supplier in this path. Pause new admissions to control exposure while retaining authenticated recovery.

## Evidence and rollout

The September 11 implementation passed 103 application regressions, 52 disposable PostgreSQL/HTTP checks and 68 companion checks, both TypeScript projects, a production application build and a network-disabled relay-container restart test. The local scan inspected 633 rendered/browser assets against 25 private markers with no matches. Counts overlap. See the [verification record](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/opaque-provider-verification.json).

The earlier [September 11 release](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/RELEASE_20260911.md) deployed a metered precursor with paid generation disabled. It does not prove rollout of this decision. Deploy compatible workers, federation and application with retained state; verify readiness and account isolation before enabling the configured cohort. A safe rollback first pauses new admissions and preserves code/state capable of recovering fixed-price holds. Never roll pending fixed-price work back into a metered-only settlement implementation.

Source: [billing](../../src/lib/billing/sites-generation.ts), [activation/cohort](../../src/lib/billing/sites-activation.ts), [public route](../../src/lib/billing/sites-content-route.ts).
