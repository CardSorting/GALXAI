# Local limits and fixed pricing — September 11, 2026

This private implementation record supersedes the supplier-cost prerequisites in
RELEASE_20260911.md for the new fixed-price mode. Historical measurements and
deployment records remain unchanged. The user authorized conservative assumptions
without complete relay-provider quota or pricing details.

The current decision authority is [ADR 0134](../../../../../docs/adr/0134-fixed-price-sites-generation-with-opaque-provider-quotas.md), with [ADR 0135](../../../../../docs/adr/0135-durable-sites-receipts-and-local-admission.md) for recovery and [ADR 0136](../../../../../docs/adr/0136-customer-owned-sites-delivery.md) for delivery. Use [Sites operations](../../../../../docs/maintainers/SITES_OPERATIONS.md) for the complete configuration, rollout and rollback runbook. This record describes a locally verified implementation, not a fixed-mode deployment.

The new default is a customer tariff of **50,000 micro-USD ($0.05) per completed
generation**, with **20 admitted operations per account in a rolling 24 hours**.
These are provisional product choices, not measured supplier costs or entitlements.
The internal model default follows the previously working small-text selection.
The 4,096 input / 2,048 output token figures are planning estimates in this mode;
they are not sent as an unsupported supplier ceiling or represented as enforced.
No per-token supplier prices or missing usage counts are invented.

The relay enforces at most 12,000 output bytes, 30 seconds including queue time,
one supplier attempt, and durable completion receipts. An oversized or interrupted
response is uncertain, never an automatic retry. The account wallet lock serializes
the daily allowance across application processes; every admitted operation counts,
including a confirmed non-dispatch. A completed operation can be replayed after
the allowance is exhausted. Existing recovery also remains available after pause
or cohort removal.

A fixed charge requires a matching durable completed receipt. Missing token usage
does not prevent settlement; missing completion evidence does. Unknown usage is
stored as null in the ledger, with the explicit `fixed_completion` basis. Later
recovery uses the tariff saved with the hold, so new prices cannot reprice old work.
Charges never exceed the accepted quote. The previous metered tariff behavior
and its qualification requirements remain available for explicitly configured
legacy rate cards.

## Configuration

The application uses this default card only when `GALX_SITES_RATE_CARD` is absent:

```json
{
  "version": "sites-fixed-005-v1",
  "model": "gpt-5.6-luna",
  "billingMode": "fixed",
  "fixedChargeMicroUsd": 50000,
  "maxDailyGenerations": 20,
  "inputMicroUsdPerMillion": 0,
  "outputMicroUsdPerMillion": 0,
  "maxInputTokens": 4096,
  "maxOutputTokens": 2048
}
```

An explicit card must include exactly the relevant fields. Empty, null, malformed,
mixed-pricing and incomplete cards fail closed. Change `version` when changing
customer pricing. The daily limit can be configured from 1 to 100.

New work still uses `GALX_SITES_CONTENT_ENABLED=1`, a JSON array of at most 50
verified account IDs in `GALX_SITES_COHORT_ACCOUNT_IDS`, and the existing server-only
relay inference and administrator credentials. Fixed mode does not require
`GALX_SITES_ACTIVATION_EVIDENCE`. The delivery mode setting does not establish
upload or publication support; those operations retain their own recovery rules.

The fresh administrator contract uses `sites-local-v1` and version 2. It verifies
local bounds and receipt readiness. The federation checks all eligible workers
and checks its selected worker again before dispatch. Old or mixed unsupported
workers reject admission rather than silently dropping the profile. Both enabled
and disabled output-token forwarding work, because fixed generation omits the
unsupported field entirely. Deploy the worker and federation changes before
enabling new application admissions.

## Verification and database impact

No schema, RLS, production wallet, deployment configuration or published Site is
changed by this implementation pass. Settlement and admission use the existing
wallet, hold and transaction tables, with wallet-then-hold lock order. The impact
is limited to new fixed-price operations; pending historical operations preserve
their saved contracts. Pausing new generation leaves reconciliation available.

Run `npm run test:sites` and `npm run test:sites:db`. The latter is hard-wired to
disposable localhost PostgreSQL, never environment-sourced production credentials.
The isolated application verifier also runs adversarial public-response and
authorization checks, a production build, and a scan of local rendered/browser
assets. See application-verification.json for its latest result. These checks
establish application behavior, not supplier economics or live deployment state.

The completed verification run passed 103 application regressions, 52 disposable
PostgreSQL/HTTP checks, 68 companion checks, both TypeScript projects, the production
application build, and the rebuilt relay-container restart smoke test with external
networking disabled. The browser/rendered scan examined 633 local assets against
25 private markers with no matches. Counts overlap. Machine-readable results and
log hashes are in [opaque-provider-verification.json](opaque-provider-verification.json).
