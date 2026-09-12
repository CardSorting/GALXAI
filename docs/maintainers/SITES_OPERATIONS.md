# Sites generation and delivery operations

<!-- docs-scope: current-guide -->

Private maintainer guide, reconciled September 11, 2026. [ADR 0134](../adr/0134-fixed-price-sites-generation-with-opaque-provider-quotas.md) owns pricing/admission, [ADR 0135](../adr/0135-durable-sites-receipts-and-local-admission.md) owns receipt recovery, and [ADR 0136](../adr/0136-customer-owned-sites-delivery.md) owns customer-local delivery. The public integration contract is [Site content generation](../SITES_CONTENT.md).

## Current status

The fixed-price implementation was committed as `8308227` and passed local verification. Its deployment and the later domain rollout are separate from enabling paid generation. The preceding [September 11 release](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/RELEASE_20260911.md) records the metered precursor. [Sites address operations](SITES_DOMAINS.md) records the subsequent application candidate, private registry and example-domain verification. Domain configuration does not enable content generation or establish a live paid acceptance test.

Use conservative product defaults without requiring complete supplier quota or pricing information. Missing supplier facts remain unknown. Operational capability, health, capacity, account authorization and durable completion still come from observed state.

## Server configuration

Site address allocation is a separate feature described in [Sites address operations](SITES_DOMAINS.md), [ADR 0137](../adr/0137-account-owned-sites-subdomains.md) and [ADR 0138](../adr/0138-automatic-sites-domain-provisioning.md). It adds a private registry and DNS configuration without changing the generation tariff or requiring supplier quota transparency.

| Setting | Current behavior |
| --- | --- |
| `GALX_SITES_CONTENT_ENABLED` | Only `1` enables new quote/generation admission; off otherwise |
| `GALX_SITES_COHORT_ACCOUNT_IDS` | JSON array of 1–50 unique verified account IDs; exact membership, no wildcard; absent/invalid denies new work |
| `GALX_SITES_RATE_CARD` | Absent selects the fixed card below; an explicit empty/null/invalid value fails closed |
| `GALX_SITES_RELAY_ADMIN_KEY` | Server-only administrator authority for fresh readiness; ordinary inference access cannot replace it |
| `GALX_SITES_DELIVERY_MODE` | `cli` by default or `native_host`; fixed mode validates the choice but does not claim upload qualification |
| `GALX_SITES_ACTIVATION_EVIDENCE` | Unused by fixed pricing; required for an explicitly configured legacy metered tariff |
| Database connection | Existing private pooled PostgreSQL configuration; no browser/local companion database access |
| Relay origin | `VM_RELAY_URL`, then `GALXAI_RELAY_URL`, then `RELAY_URL`; exact HTTPS origin or loopback HTTP |
| Relay inference key | `VM_RELAY_API_KEY`, then the first comma-separated `RELAY_API_KEYS` entry after trimming; server-only |
| `RELAY_SITES_OUTPUT_LIMIT_FORWARDING` | Supervisor/worker option for opted-in durable token ceilings, false by default; fixed requests omit that field and work with either setting |

Default fixed card, defined in [sites-generation.ts](../../src/lib/billing/sites-generation.ts):

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

All fields are required for an explicit fixed card, with no extras. The price must be a positive safe integer of at most 1,000,000,000 micro-USD; the daily allowance is an integer from 1 to 100. Token-rate fields must be zero. The token quantities are positive planning estimates in this mode, not measured allowances or supplier enforcement. The readiness protocol accepts planning output quantities through 32,768. Keep internal model selection out of public docs and responses.

Change the quote version when changing the customer tariff. Accepted operations retain their stored card. Cohort membership uses the authenticated account subject, not email, request headers or supplied owner IDs. At most one unresolved Sites hold is admitted per account. Every admitted Sites operation in the last 24 hours counts toward a fixed-mode account's daily limit, including metered-era operations, unknowns and confirmed non-dispatches. The configured cohort cap is an implementation maximum, not a recommendation to activate all 50 accounts.

## Quote, admission and settlement

The API verifies an explicit account session bearer before reading configuration. Cookie-only requests fail. A quote returns only currency, unit, quote version and maximum charge. A POST accepts exactly the brief, repair flag, operation ID and accepted quote fields; it cannot supply model, identity, usage, rates or a relay job reference.

New work first passes the enable flag, cohort, pricing-mode activation and fresh administrator readiness. The fixed path checks the version-2 `sites-local-v1` contract. The application bounds that read to six seconds and 4 KiB with a fresh challenge and no cache/redirect. The federation checks all eligible workers and its selected worker before dispatch. An incompatible worker causes generic unavailability.

The wallet transaction locks wallet then hold, checks debt/funds, one outstanding hold and daily allowance, and records a permanent reservation. Repeated accepted IDs cannot create new work. Fixed jobs request durable receipts and the local profile, with no supplier token-ceiling field. Worker bounds are 12,000 serialized-message bytes, 12,000 output bytes, at most 30 seconds including queueing, and one provider attempt. The public brief and schema have smaller limits in the [customer contract](../SITES_CONTENT.md).

A matching durable completed receipt settles the fixed charge once, even with null token usage. Reported usage is retained as observed and is not rounded into a different price. A completed invalid draft remains chargeable; a repair is another operation. An unconfirmed result retains its hold. Positive fenced non-dispatch evidence closes at zero cost. The public receipt ID identifies the settlement and does not expose transport identity.

## Rollout

1. Record candidate source, application deployment, federation source/configuration and worker image IDs separately. Capture the configured tariff, cohort and enable flag privately. Preserve rollback images, signing authority and worker receipt volumes.
2. Keep new content generation disabled while replacing incompatible components. Build and validate the worker image, then replace workers through the owned lifecycle. Updating the supervisor alone does not replace a worker image.
3. Roll out federation support for version-2 readiness and selected-worker checks. Verify the exact origin, model and planning quantity with administrator authority. Confirm ordinary inference keys cannot read the contract.
4. Deploy the application containing fixed settlement, cohort and allowance enforcement. Missing rate-card configuration intentionally selects the default; remove a legacy card only as a deliberate tariff choice. Install server credentials privately.
5. Verify quote/POST authorization, outside-cohort denial, accepted-price matching, one completed operation, owner-only recovery, pause behavior and restart recovery in the intended environment. Local fixture results are not a live billed acceptance test. Record any authorized live spend and the exact components exercised.
6. Enable the intended small account cohort with prospective customer terms. Monitor admission, completion, pending holds, receipt capacity, support effort and available supplier expense. An uncertain supplier quota is not a reason to manufacture a passing limit assertion.

Native-host delivery has separate ownership/save/publication checks in the [companion runbook](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/LIVE_ADAPTERS.md). Content activation does not certify direct CLI upload or change a Site's audience. No extra model provider is required for this workflow.

## Pause, recovery and rollback

Set the content enable flag away from `1` or remove an account from the cohort to stop new work. Existing-operation GET recovery bypasses those new-admission gates but still authenticates the owner and requires valid database/rate/relay configuration. Keep the original relay origin and credential authority available. Changing a model or tariff must not erase saved holds.

Use `/api/sites/content?operationId=...` under the original account session. The server reads the persisted transport reference and saved rate. A completed receipt permits fixed settlement without usage; `not_started` permits a zero-cost close. `pending`, `unknown`, a missing reference, unavailable storage or mismatched origin remain unresolved. Never delete a hold, guess a job or resubmit inference to produce evidence. There is no scheduled reconciliation worker in this change.

Preserve `<RELAY_STATE_SNAPSHOT_PATH>.receipts/receipts.sqlite` on the worker's retained volume and the federation signing secret. Signed durable references last 30 days. Receipt reads can reach a replacement worker on that volume; stream/cancel cannot. Unknown or usage-less completed receipts currently have no automatic store expiry and occupy the default 10,000-record capacity. Storage saturation denies new work. A missing-usage fixed settlement does not currently garbage-collect its worker receipt.

For rollback, pause admission first and keep a reader/settler compatible with existing fixed holds. Restore compatible worker/federation state and verify original receipt access. Do not use a metered-only application to settle fixed-price operations, rotate signing authority casually, or treat missing evidence as a refund. Customer-local publishing locks and archives must also survive recovery.

## Legacy metered mode

An explicit card with exactly `version`, `model`, `inputMicroUsdPerMillion`, `outputMicroUsdPerMillion`, `maxInputTokens`, `maxOutputTokens` selects the legacy mode. It calculates integer micro-USD from authoritative token usage, rounds upward once, reserves the maximum and holds missing/inconsistent/out-of-ceiling usage for reconciliation.

Legacy activation requires the fresh schema-1 evidence object for the exact origin/model/rate/ceiling, receipt version/retention/restart, selected delivery mode, publication and evidence digest. The freshness window is at most one day. It also requires version-1 readiness and forwarding of the required ceiling. See [the validator](../../src/lib/billing/sites-activation.ts) for the exact fields. The earlier supplier ceiling failures remain valid historical findings for this mode. They are not prerequisites for fixed pricing. Do not invent successful evidence or retry a rejected metered request by removing its ceiling.

## Verification

```sh
npm run test:sites
npm run test:sites:db
npx tsc --noEmit
npx tsc --noEmit -p internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/tsconfig.json
python3 scripts/verify-docs.py
```

The database harness creates and removes its own disposable PostgreSQL fixture, never inheriting production configuration. The standalone legacy billing test can still use an explicitly supplied isolated fixture; `npm run db:test` and `npm run test:sites:workspace:db` require no separately prepared database. It tests concurrency, account denial, rollback/lost commits, daily limits, usage-less completion and original-price recovery.

The [isolated application verifier](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/verify-application.py) copies allowed source with synthetic credentials, runs adversarial/public authorization checks and a production build, then scans generated public assets. It expects the recorded local Node 22 runtime path. Its output is validation-only and must not be deployed. Build `Dockerfile.relay` and run [the container smoke harness](../../scripts/test-sites-relay-container.mjs) against that candidate with external networking disabled for packaged receipt recovery.

The [September 11 fixed-mode verification](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/opaque-provider-verification.json) records 103 application, 52 database and 68 companion checks, production build, container restart and 633 local assets with no checked private-marker matches. Counts overlap. This is not a live-site audit, production enablement or proof of supplier cost.

The later documentation reconciliation reran 103 application regressions and the isolated production build, validated public examples/rate cards and documentation navigation, and scanned 633 local assets with no checked private-marker matches. Its [separate record](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/documentation-application-verification.json) preserves the earlier implementation evidence. It introduced no runtime source change or deployment.
