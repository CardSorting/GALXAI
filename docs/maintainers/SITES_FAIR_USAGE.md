# Sites paid access and fair usage

<!-- docs-scope: current-guide -->

Private maintainer runbook for [ADR 0140](../adr/0140-paid-sites-and-shared-fair-usage.md). Never expose this page, policy objects, private diagnostics or the supplied handoff/fixture in public assets. The user contract is [Sites content](../SITES_CONTENT.md).

## Integration map

| Concern | Existing entry point and implementation |
| --- | --- |
| Verified parent account | `requireAccountIdentity`; Sites accepts explicit verified session bearers, not inference keys or submitted identity |
| Paid entitlement | `paid-access.ts` reads the durable Stripe customer mapping and current paid recurring subscription coverage; no editable tier fallback |
| Chat and content dispatch | Workspace and content routes both call `included-configuration.ts` and `included-generation.ts` |
| Policy and actual accounting scope | One private `galx_sites_fair_policy` row names the shared delivery pool for all Sites callers; routing aliases never supply this ID |
| Cross-worker state | `SitesFairStore` uses existing pooled PostgreSQL; no new service, queue, daemon or reconciliation scheduler |
| Readiness source | Existing private Sites contract preflight, plus the shared local concurrency authority; existing federation/worker limits remain in force |
| Durable outcome | Existing receipt transport; saved grant/job/origin/output identifies the original request |
| Publication | Existing workspace snapshots and DNS outbox/worker; new publications additionally require paid access |
| Historical billing | Persisted workspace mode and original content receipts retain legacy settlement; never submit new work through that adapter |

The prior seat engine uses weighted messages, process-local caches and editable tier overrides, so it is not this policy's authority or proof of payment. No compatible Sites allowance window existed: the policy uses a fixed-duration window anchored to shared database time, with operator-supplied duration. General inference pricing and seat-engine windows are unchanged. All Sites from the same verified account share the counter across pool changes. Current Sites APIs do not accept API keys, so additional keys cannot create another account allowance.

## Paid plans and production configuration

There are deliberately no production limits or default eligible prices. Inspect with `npm run sites:fair -- --status`. The migration seeds `disabled`; the supplied test fixture cannot activate production through the operator tool. Configuration is private database state, not a browser bundle or editable account profile.

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

Paid access uses an existing verified customer mapping, active subscription, eligible recurring item and matching paid invoice line covering the current period. SDK retries are disabled and the read is bounded to four seconds and 100 subscriptions. A short internal proof expires at the earlier of fifteen seconds or paid coverage end; admission rechecks freshness and the policy revision. No positive cache outlives that proof. Missing customer mapping is a paid-plan denial; absent billing authority, configuration or incomplete evidence is unavailable. Up to 100 subscriptions are inspected; unexpectedly larger/incomplete results fail closed. Off-platform contracts need a deliberate verified entitlement source; do not use organization-tier text as a substitute.

Keep `GALX_SITES_CONTENT_ENABLED`, managed-hosting configuration and publication/domain flags under their existing operational control. Included browser requests require the new policy and paid eligibility rather than per-account companion enrollment. Native connection/domain administration retains its prior cohort contract. Selecting a paid plan or deploying a new app does not itself configure a hosting provider.

## Admission, flow and recovery

The store acquires the account advisory lock before the policy/pool rows. It uses database time, bounded lock/statement waits and checks the total admission deadline before commit. Snapshot refresh occurs outside transactions under a shared refresh lease; another worker either reuses its result, waits within its budget or defers. Refresh writes compare both lease ownership and revision. Account cooldowns are checked before probes, then again during admission. Pool cooldown changes invalidate older snapshots. Trusted delivery 429/503 responses set a shared cooldown, honoring bounded Retry-After guidance. Only explicit not-accepted responses from allowlisted pre-dispatch paths, before any acceptance callback, may release the grant; the request ID and code remain private evidence.

Count once on committed admission. Fingerprint conflicts return conflict; exact duplicates return original state and never another dispatch grant. Rolling attempts remain counted even after fast completion and conservative pre-dispatch cancellation, while proven non-dispatch removes the logical count and execution reservation once. New generation/repair is a new identity. No deferred work is falsely labeled queued. The browser never automatically retries generation.

Continuation uses `min(C, snapshot ceiling) - R`, account continuation bound, total/continuation/account rolling budgets, and `min(A,max(1,ceil(B/K)))` with the requesting account included in fresh demand. Demand from deferred continuation still counts, so a frequent caller cannot erase competitors by causing them to defer. Reduced capacity or share affects new admissions only. This is not starvation-free scheduling.

The dispatch CAS records the only permitted initial attempt. Durable `completed` receipts release occupancy while retaining the logical count. Durable `not_started` receipts release occupancy and decrement the count once. A still-reserved expired grant can be canceled without a provider call. Disconnects, generic failures, worker death, missing acceptance references, unknown receipts and request/grant expiry never release a dispatching reservation. These may reduce usable capacity until the original outcome is established; keep them visible to private operators and never delete records merely to make the dashboard look ready. Receipt retention expiry is not proof of non-execution.

Recovery does not require a currently active paid subscription. The workspace stores `operation_mode`, with pre-migration operations defaulting to `legacy`. A missing original record can clear a workspace after the existing 120-second safety interval, beyond the request deadline. A known deferral clears only its workspace pending state; it creates no admitted invocation. History retains the last eighty conversation entries without prohibiting further updates.

Public DTOs expose only useful product state. Account fairness returns `429` and global/unknown authority returns `503`; `Retry-After` is bounded guidance, never a reservation. Do not expose lane, counts, pool identity, refresh result, billing IDs or upstream headers. Private admission events contain hashed account ID, invocation, pool, policy/snapshot revision, decision, lane, counts and duration; no prompts or generated content. Durable records retain the evidence needed to inspect dispatch/terminal outcomes.

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

Runtime `shadow` is a closed rollout state; it does not submit work or consume live counters. This implementation does not start an online shadow traffic pipeline. Before enabling a controlled production cohort, provide approved limits and paid price IDs, measure admission and membership latency separately, check provider rejection/unknown rates, compare useful admitted flow and continuation sharing, and verify actual paid-plan behavior. The account admission set can be narrowed by approved paid price IDs during rollout. No production cohort is enabled automatically.

The local verification record is [fair-usage application verification](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/fair-usage-application-verification.json). Its production build and private-marker scan are not live-site acceptance. Record deployed revision and live rendered/browser-asset inspection separately before claiming the deployed UI is clean.

## Rollback

Run `npm run sites:fair -- --disable` first. It stops new included admission while keeping receipts, completed documents and unknown reservations intact. The paired migration rollback does the same. Leave recovery and publication readers deployed, retain the DNS worker and original wallet reconciliation paths, and keep snapshots private. Never re-enable the former charged POST to roll this change back. Resume only with a compatible controller and deliberately configured policy revision.
