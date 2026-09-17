# Sites paid access and fair usage (Retired)

<!-- docs-scope: current-guide -->

> [!NOTE]
> **Status: Retired / Sunset (September 2026)**
> Sites generation and fair usage admission policies have been retired. GALX Pro has been repositioned around GALX Images (priority GPU inference queues, high-resolution generation across 5 aspect ratios, 1-click prompt remixing, and community stream access).

Private maintainer runbook for [ADR 0140](../adr/0140-paid-sites-and-shared-fair-usage.md). Never expose this page, policy objects, private diagnostics or the supplied handoff/fixture in public assets. The historical user contract was [Sites content](../SITES_CONTENT.md).

## Integration map

| Concern | Existing entry point and implementation |
| --- | --- |
| Verified parent account | `requireAccountIdentity`; Sites accepts explicit verified session bearers, not inference keys or submitted identity |
| Pro eligibility | `paid-access.ts` reads a current explicit complimentary grant or verified paid recurring subscription coverage; no editable tier or staff-role fallback |
| Chat and content dispatch | Workspace and content routes both call `included-configuration.ts` and `included-generation.ts` |
| Policy and actual accounting scope | One private `galx_sites_fair_policy` row names the shared delivery pool for all Sites callers; routing aliases never supply this ID |
| Cross-worker state | `SitesFairStore` uses existing pooled PostgreSQL; no new service, queue, daemon or reconciliation scheduler |
| Readiness source | Private Sites contract preflight, plus shared local concurrency; explicit isolated mode uses only Premium and its separate capability key, while existing rollout/access gates remain in force |
| Durable outcome | Existing receipt transport; saved grant/job/origin/output identifies the original request |
| Publication | Existing workspace snapshots and DNS outbox/worker; new publications require Pro eligibility or the allocated free workspace |
| Historical billing | Persisted workspace mode and original content receipts retain legacy settlement; never submit new work through that adapter |

The prior seat engine uses weighted messages, process-local caches and editable tier overrides, so it is not this policy's authority or proof of payment. No compatible Sites allowance window existed: the policy uses a fixed-duration window anchored to shared database time, with operator-supplied duration. General inference pricing and seat-engine windows are unchanged. All Sites from the same verified account share the counter across pool changes. Current Sites APIs do not accept API keys, so additional keys cannot create another account allowance.

## Paid plans and production configuration

The controller has no implicit numeric defaults. The owner delegated an initial Pro rollout in [ADR 0141](../adr/0141-sites-pro-self-service-launch.md); its explicit limits and eligible price are in the private launch policy. Inspect with `npm run sites:fair -- --status`. The migration seeds `disabled`; the supplied test fixture cannot activate production through the operator tool. Configuration is private database state, not a browser bundle or editable account profile.

`npm run sites:fair -- --configure /absolute/path/to/private-policy.json` accepts exactly `mode`, `pool_id`, `paid_price_ids` and `limits`. Set `mode` to `enforce`; name the common delivery scope and list verified Stripe recurring price IDs. Use operator-approved values for every limit below. The tool increments the policy revision, invalidates old snapshots and preserves outstanding work and rolling attempt history. Window duration is immutable after initial configuration; changing it requires a separately reviewed allowance migration. Do not split one shared quota into multiple policy IDs or raise limits based on unmeasured upstream capacity.

| Limit | Meaning and validation |
| --- | --- |
| `baseline_message_threshold` | Positive messages per account/window before continuation checks; never an absolute ceiling |
| `allowance_window_seconds` | Positive fixed duration using database time |
| `pool_max_outstanding` | Locally governed total reserved, dispatching and unknown requests |
| `baseline_protected_slots` | Reserved baseline room, from zero through less than pool outstanding limit |
| `account_max_outstanding` | Positive account-wide outstanding bound no greater than pool bound |
| `account_max_continuation_outstanding` | Positive continuation bound no greater than account bound |
| `flow_window_seconds` | Rolling interval for attempts, independent of allowance windows |
| `pool_max_attempts_per_flow_window` | Positive pool attempts in the rolling interval |
| `continuation_max_attempts_per_flow_window` | Positive continuation pool budget no greater than total pool budget |
| `account_max_attempts_per_flow_window` | Positive account-wide budget no greater than pool budget |
| `active_continuation_demand_ttl_seconds` | Positive demand TTL; the active set is additionally capped at 10,000 accounts per pool |
| `snapshot_ttl_seconds` | Positive freshness, at most 60 seconds |
| `refresh_timeout_milliseconds` | Positive timeout no greater than admission deadline |
| `admission_deadline_milliseconds` | Positive total refresh/admission budget, at most 5,000 ms |
| `dispatch_grant_expiry_milliseconds` | Positive reserved grant lifetime, at most 5,000 ms |
| `provider_max_attempts_per_logical_invocation` | Exactly one for this integration; changing transport retry semantics requires attempt-level reacquisition before raising it |
| `request_deadline_seconds` | Positive transport wall deadline, at most 60 seconds |

The controller never derives limits from supplier token balances. Its snapshot basis is `shared-local-admission`: it governs only locally reserved Sites capacity, with a read-only compatibility/readiness check. Existing shared relay admission protects physical execution across other traffic. It cannot guarantee a still-unknown supplier quota, cost, subscription-wide balance or model identity.

For accounts without an explicit complimentary grant, paid access uses an existing verified customer mapping, active subscription, eligible recurring item and matching paid invoice line covering the current period. A second current read verifies settled invoice payments and rejects refunds or disputes. SDK retries are disabled; each provider read is bounded to four seconds and 100 records. The proof includes the server-verified Pro/free tier; a missing tier fails closed. A short internal proof expires at the earlier of fifteen seconds or paid coverage end; admission rechecks freshness and the policy revision. No positive cache outlives that proof. Missing customer mapping is a paid-plan denial; absent billing authority, configuration or incomplete evidence is unavailable. Up to 100 subscriptions are inspected; unexpectedly larger/incomplete results fail closed. Complimentary account grants use the separately authorized procedure below; do not use organization-tier text as a substitute.

Keep `GALX_SITES_CONTENT_ENABLED`, managed-hosting configuration and publication/domain flags under their existing operational control. Included browser requests require the policy and either Pro eligibility or the one-time free workspace allowance rather than per-account companion enrollment. [Quota operations](FREE_GENERATION_QUOTA.md) owns its separate three-turn lifetime limit; standalone content requests remain Pro-only. Native connection/domain administration retains its prior cohort contract. The DNS worker also claims managed rows with a matching account-owned published snapshot, independent of the native account list. Pro eligibility or allocated free-Site ownership is checked at publication; already accepted snapshots continue to reconcile after plan expiry. Selecting a paid plan or deploying a new app does not itself configure a hosting provider.

## Complimentary Pro account grants

[ADR 0148](../adr/0148-complimentary-pro-access.md) authorizes explicit complimentary Pro provisioning when requested by the account operator. Staff membership alone grants nothing. The current boolean `galx_pro` in `auth.users.raw_app_meta_data` is read directly for the authenticated account, with confirmed email, non-anonymous/non-deleted identity and no active ban. JWT claims and `raw_user_meta_data` are ignored. There is no positive process cache. Database failure fails closed; the ordinary fifteen-second admission proof limit also applies to complimentary grants.

From a trusted server environment, use:

```sh
node --env-file-if-exists=.env.local --import tsx scripts/manage-pro-access.ts status <account-id>
node --env-file-if-exists=.env.local --import tsx scripts/manage-pro-access.ts grant <account-id>
node --env-file-if-exists=.env.local --import tsx scripts/manage-pro-access.ts revoke <account-id>
```

The operator command makes a single account-keyed update through the configured privileged database connection, merges only the Pro flag, and reads it back. Record the authorized action and minimal private evidence; never expose credentials or full account records. This requires no schema migration and changes no staff membership, preview approval, wallet balance, subscription or payment. It does not send email. Revocation affects the next membership check; previously issued admission proof can last at most fifteen seconds. Already admitted work and saved Sites retain normal recovery.

Deploy the compatible application before claiming live acceptance. Check the signed-in Billing and Sites setup responses report included access. An unrelated account must not acquire Pro; it may independently qualify for the limited free workspace allowance. Billing says Pro access is active without asserting a payment. Public response allowlists reveal no grant mechanism or administrative metadata. Revoke the flag to undo this grant; rolling back the application restores paid-only checks and retains saved work and all payment history.

## Admission, flow and recovery

The store acquires the account advisory lock before the policy/pool rows. It uses database time, bounded lock/statement waits and checks the total admission deadline before commit. Snapshot refresh occurs outside transactions under a shared refresh lease; another worker either reuses its result, waits within its budget or defers. Refresh writes compare both lease ownership and revision. Account cooldowns are checked before probes, then again during admission. Pool cooldown changes invalidate older snapshots. Trusted delivery 429/503 responses set a shared cooldown, honoring bounded Retry-After guidance. Only explicit not-accepted responses from allowlisted pre-dispatch paths, before any acceptance callback, may release the grant; the request ID and code remain private evidence.

Free callers first reserve the separate expiring aggregate budget and retain its operation identity. They may use only the first quarter of healthy shared concurrency and rolling attempts; paid activity counts toward that threshold. Tiny pools stay paid-only. Free callers never register paid continuation demand. Persisted tier and the prior reservation are checked at admission, and start rechecks an operator pause. See [quota operations](FREE_GENERATION_QUOTA.md).

Count once on committed admission. Fingerprint conflicts return conflict; exact duplicates return original state and never another dispatch grant. Rolling attempts remain counted even after fast completion and conservative pre-dispatch cancellation, while proven non-dispatch removes the logical count and execution reservation once. New generation/repair is a new identity. No deferred work is falsely labeled queued. The browser never automatically retries generation.

Continuation uses `min(C, snapshot ceiling) - R`, account continuation bound, total/continuation/account rolling budgets, and `min(A,max(1,ceil(B/K)))` with the requesting account included in fresh demand. Demand from deferred continuation still counts, so a frequent caller cannot erase competitors by causing them to defer. Reduced capacity or share affects new admissions only. This is not starvation-free scheduling.

The dispatch CAS records the only permitted initial attempt. Durable `completed` receipts release occupancy while retaining the logical count. Durable `not_started` receipts release occupancy and decrement the count once. A still-reserved expired grant can be canceled without a provider call. Disconnects, generic failures, worker death, missing acceptance references, unknown receipts and request/grant expiry never release a dispatching reservation. These may reduce usable capacity until the original outcome is established; keep them visible to private operators and never delete records merely to make the dashboard look ready. Receipt retention expiry is not proof of non-execution.

Recovery does not require a currently active paid subscription. The workspace stores `operation_mode`, with pre-migration operations defaulting to `legacy`. A missing original record can clear a workspace after the existing 120-second safety interval, beyond the request deadline. A known deferral clears only its workspace pending state; it creates no admitted invocation. Durable conversation tables retain full history with a bounded compatibility cache and paged reads. Pro continuation is governed by fairness; free accounts additionally have three total turns. Durable not-started recovery can atomically release a free turn, while unknown execution remains deducted.

Public DTOs expose only useful product state. Account fairness returns `429` and global/unknown authority returns `503`; `Retry-After` is bounded guidance, never a reservation. Do not expose lane, operational fair-use counts, pool identity, refresh result, billing IDs or upstream headers. The separately allowlisted free quota DTO contains customer allowance counts and allowlisted availability labels only. Private admission events contain hashed account ID, invocation, pool, policy/snapshot revision, decision, lane, counts and duration; no prompts or generated content. Durable records retain the evidence needed to inspect dispatch/terminal outcomes.

## Verification and rollout

Run these from the repository:

```sh
npm run test:sites:fair
npm run test:sites:fair:db
npm run test:sites:workspace
npm run test:sites:workspace:db
npm run db:verify
npm run db:test
npx tsc --noEmit
python3 scripts/verify-docs.py
python3 internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/verify-application.py fair-usage-application-verification.json
```

The shared database fixture runs T01–T26 with fake time and fake readiness, including two real processes racing for one slot, duplicate admission, digest conflicts, coalesced refresh, revision fencing, demand changes, rolling flow, cancellation, unknown execution, lost COMMIT acknowledgement and pool changes. It never loads dotenv or contacts payment/generation services. Application tests cover verified paid coverage, hostile request fields, DTO allowlists, ownership and price removal. Build and asset checks use isolated synthetic configuration, not Production credentials. The fixture's numbers and local timings must never be presented as production capacity.

First qualify policy decisions in this isolated accounting environment. New native-companion state directories use zero local monetary reservation and account limit. Existing directories keep their persisted historical settings for recovery; do not silently rewrite a stored policy. The companion’s legacy `quote` command now checks access and prints only inclusion.

Runtime `shadow` is a closed rollout state; it does not submit work or consume live counters. This implementation does not start an online shadow traffic pipeline. Before enabling a controlled production cohort, provide approved limits and paid price IDs, measure admission and membership latency separately, check provider rejection/unknown rates, compare useful admitted flow and continuation sharing, and verify actual paid-plan behavior. Approved paid price IDs narrow paid admission only; they do not disable complimentary or free workspace admission. To stop all new Sites admission, disable the shared policy; to withdraw only free generation, pause its separate private policy as described in quota operations. Migration and deployment leave it paused until an operator issues a bounded, expiring budget. No production cohort is enabled automatically.

The local verification record is [fair-usage application verification](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/fair-usage-application-verification.json). Its production build and private-marker scan are not live-site acceptance. Record deployed revision and live rendered/browser-asset inspection separately before claiming the deployed UI is clean.

The earlier [production release verification](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/fair-usage-release-verification.json) records the deployed implementation (`9986ab2`) and live desktop/mobile acceptance. The live Sites page and twenty-seven referenced browser assets passed the forty-seven-marker scan; eight anonymous/forged-authority HTTP checks rejected access. At that earlier release, the migration was applied with policy disabled and no production limits or eligible prices. That record covers interface and access-control acceptance, not the subsequent Pro activation below.

## Pro launch policy

Production is enabled as of 2026-09-12 UTC: application commit `8d82351` is deployed at `galx.ai`, private policy revision **2** is `enforce`, and the live GALX Pro recurring price is eligible. The two plan tables are migrated. [Launch acceptance](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/pro-launch-release-verification.json) records the exact deployment, catalog, policy, application/DB checks and live acceptance. The prior missing-plan/missing-limits pause is resolved. Billing explicitly distinguishes an available Pro offer from active paid access. Transaction and invoice responses use public field allowlists; operational ledger descriptions remain private, with generic account activity wording in the dashboard and CSV export.

[ADR 0141](../adr/0141-sites-pro-self-service-launch.md) authorizes the explicit initial policy in [pro-launch-policy.json](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/pro-launch-policy.json). It is an operator-selected product policy, not the synthetic fixture and not an inferred supplier allocation. The prior twenty-message operating allowance supplies the baseline magnitude, with a fixed UTC-day window; continuation remains possible beyond twenty messages. Two eligible delivery workers and zero pending work were observed during the read-only preflight, but those observations are not a throughput guarantee.

| Control | Initial choice | Rationale |
| --- | --- | --- |
| Baseline/window | 20 messages / 86,400 seconds | Familiar daily baseline, not an absolute ceiling |
| Pool / protected baseline / account outstanding | 2 / 1 / 1 | Small launch concurrency; protect one baseline opportunity |
| Account continuation outstanding | 1 | One update per account at a time |
| Rolling interval / pool / continuation / account attempts | 60 seconds / 6 / 3 / 2 | Bound fast-completion bursts and one-account pressure |
| Active continuation demand | 120 seconds | Retain recently deferred competitors |
| Snapshot / refresh / admission / reserved grant | 5 seconds / 2,000 ms / 4,000 ms / 3,000 ms | Fresh local evidence with bounded shared admission |
| Attempts / request deadline | 1 / 45 seconds | Preserve single dispatch and existing receipt recovery |

Provision with `npm run sites:provision -- --prepare /absolute/private/policy.json`, then apply the reviewed output with `npm run sites:fair -- --configure /absolute/private/policy.json`. Provisioning checks the existing private readiness contract and live webhook, creates only the Pro catalog and a dedicated cancellation portal, and never creates a customer subscription or a charge. It does not automatically change the database policy. The current source authorizes this launch; later limit or commercial changes need their own documented decision.

Pro is $200/month for one verified account and includes Sites creation and publication. Other products in the shared Stripe account, free Solo, prepaid wallet deposits, editable organization tiers and unprovisioned Team/Enterprise offers do not qualify. Team/Enterprise remain assisted offers; this release does not silently change their credits or seat promises. `GET /api/billing/plan` returns only public terms, verified access, checkout availability, payment-profile presence and an allowlisted subscription display summary. The summary comes from a bounded current Stripe read, contains no provider identifiers, and does not grant access. It distinguishes active, scheduled-ending, payment-required, paused, processing, ended, absent and unavailable states with validated period/end dates. Incomplete, foreign or ambiguous results disable new checkout; existing billing management remains reachable. Complimentary access never fabricates a subscription date. Its POST accepts a checkout request ID or a portal action, never caller-selected prices, customers, quantities, URLs or subscription authority.

Billing now has dedicated [Plan, Credits, Transactions, Invoices and Payment settings pages](../reference/billing-pages.md) under a persistent account layout. Pricing and upgrade actions open `/billing/plan`; `/billing` summarizes access and credit separately. Old checkout return URLs and section bookmarks continue into the relevant canonical page. New Checkout attempts persist the canonical Plan return path after the additive `20260916003207_billing_canonical_returns.sql` migration; older rows retain NULL and their original return URLs. Issued provider parameters remain stable for durable retries. Apply that migration before the compatible writer, and retain the column and dual-contract reader during presentation rollback. These navigation changes do not alter paid-access or ledger authority.

`private.galx_plan_checkouts` permits one open attempt per account. A short database transaction claims its durable lease; all Stripe calls run outside transactions. Customer mapping publication coordinates with the existing top-up lock and keeps the winning customer. Identical provider parameters and idempotency keys survive lost acknowledgements. Another browser resumes the current checkout. An old uncertain attempt without a session reference remains closed for operator review rather than risking a second subscription. Checkout completion is not itself proof of paid access.

The existing signed webhook records checkout completion, invoices and `customer.subscription.*` events atomically with its event receipt. Terminal cancellation cannot be overwritten by older events. The subscription table is an operational projection; current Stripe evidence remains the paid-subscription authority. Subscription refunds/disputes are classified through invoice payments and never alter prepaid wallet credit. Both plan management and payment settings select the same unique active dedicated portal. Runtime and readiness checks require invoice history, payment-method changes and period-end cancellation, with plan/quantity changes disabled. A missing, ambiguous or broader configuration fails closed instead of falling back to the account default. Required webhook coverage explicitly includes subscription creation, updates and deletion alongside invoice and checkout events. Portal access survives a Sites policy pause. Publishing does not consume a message or create a new Stripe charge.

No active tax registrations were found. Provisioning leaves automatic tax disabled and does not create registrations or change existing tax settings. Review registrations and subscription tax collection before a later tax rollout; enabling an option alone is not registration.

Verification adds `npm run test:sites:plans:db`: durable retries, concurrency, webhook ordering, ownership, refund isolation, private-role denial, rollback and managed DNS discovery. [Stripe sandbox evidence](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/pro-stripe-sandbox-verification.json) verifies actual paid-invoice access, period-end cancellation and refund rejection without a production database or real payments. Production checkout opened with the exact $20/month offer and was expired unpaid; no real subscription or payment was created. The signed production webhook recorded the unpaid checkout expiration. The live free account correctly retained a paid-plan gate. Desktop/mobile Billing, Pricing and Sites were inspected; 34 rendered pages/assets passed 53 private-marker checks and 12 anonymous/forged requests were rejected. The UI reviewer scored its one current-state clarity correction resolved (`ship` at that fix-list scope). Actual paid production generation was not exercised. Production acceptance and policy revision are recorded in the linked launch evidence.

During the initial rollout, inspect private admission latency/deferrals, provider 429/503 responses, unknown outstanding work, paid-proof failures and DNS retries. Investigate any unknown dispatch before increasing concurrency. Change throughput only after actual paid traffic establishes useful completion and continuation behavior; no automated capacity increase or claimed starvation guarantee is introduced. To inspect state, use the private policy/operator tools and administrator logs, never add diagnostics to customer DTOs.

## Rollback

Run `npm run sites:fair -- --disable` first. It stops new included admission while keeping receipts, completed documents and unknown reservations intact. The paired migration rollback does the same. Leave recovery and publication readers deployed, retain the DNS worker and original wallet reconciliation paths, and keep snapshots private. Never re-enable the former charged POST to roll this change back. Resume only with a compatible controller and deliberately configured policy revision.
