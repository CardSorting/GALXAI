# Free generation quota operations

<!-- docs-scope: current-guide -->

Private maintainer guide for [ADR 0149](../adr/0149-one-time-free-generation.md). Public copy describes capabilities and remaining counts only. Dollar bookkeeping, identity hashes, grant provenance and execution evidence never belong in client bundles or responses.

## Contract and authority

Verified active email accounts receive one workspace, three total Site turns and five total images, once. Both Build and Discuss consume one turn; image batches consume their requested quantity, up to four per request. Pro accounts bypass this welcome quota through existing current paid-subscription or explicit complimentary-grant authority. Pro does not bypass ordinary image limits, Sites fair admission or ownership. An authority outage does not establish free eligibility.

The browser workspace opts into free eligibility; the standalone `/api/sites/content` contract remains Pro-only. Only the free workspace may generate or publish on the allowance. Existing Pro workspaces remain readable after a downgrade but are not automatically converted into free Sites. Archive, restore, unpublish, reinstall, another browser or another API key cannot reset the allocation. Public image entry points share the same authenticated account allowance for synchronous and asynchronous requests. Developer-preview approval and administration stay separate.

`private.galx_free_generation_grants` holds a unique original normalized-email SHA-256 hash, account ID, allocated Site ID and restricted internal bookkeeping value. `private.galx_free_generation_usage` records operation kind, identity, quantity and release. Neither grants cash value nor updates wallet credit or payment history. Forced RLS and explicit revocations deny anon, authenticated and service_role database roles; the existing privileged server connection is the writer. Never add a public RPC to reset or spend these rows.

The claim survives account deletion and prevents a replacement account with the original email from enrolling again. This is not person-level abuse prevention, email-alias equivalence or retention of every later email change. Keep only the original hash and minimal usage; do not copy account profiles into evidence.

## Transactions, retries and release

Grant enrollment locks the normalized identity and then the account grant. Short database transactions use three-second lock and five-second statement limits. No Stripe, generation or storage calls occur under quota locks. A free workspace allocation commits with its creation; deductions commit with a Site turn or newly inserted image receipt. A rejected batch rolls back the whole image receipt and deduction. Separate pooled workers see the same counters.

Image receipt insertion uses `ON CONFLICT DO NOTHING` followed by an owner/key read. Identical retries reuse the saved state without deducting again, including cancelled requests and requests created while Pro. Changed payloads conflict. One claim owns generation; never lease a generating request for redispatch. Both sync and async free responses retain the binary-by-default and explicit JSON allowlist contracts, including artifact re-encoding.

Queued cancellation and proven image capacity rejection release quota atomically with terminal state. Reading/consuming a grant also expires its image requests still queued after five minutes and releases their deductions through a state comparison; such requests can no longer be claimed. Generating requests with expired deadlines remain deducted because dispatch may have happened. Generic generation/storage errors, invalid outputs and timeouts do not justify a release.

For Sites, pre-admission deferrals or durable `not_started` results release the usage in the same transaction that finishes the matching workspace turn. Recovery does this even if the account has changed plan. An unrelated or already-finished operation cannot release another turn. Missing receipt recovery retains the deduction: missing evidence alone is not proof of non-dispatch. The free Site allocation itself is lifetime and is never released when a turn fails.

## Public state and client behavior

`GET /api/billing/generation-quota` accepts only a verified account session and no query parameters. Responses are `private, no-store`: either `{plan:"pro",quota:null}` or `{plan:"free",quota:{sites,images,siteTurns}}`. Explicit projection and integer bounds omit additional internal fields. Authentication errors are generic 401; unavailable or invalid quota data is generic 503. No supplied account ID is authority.

The persistent header shows remaining Sites, Images and Site turns for free accounts and hides the counter for confirmed Pro. Initial loading and unavailable states contain no invented counts. An account switch immediately fences old values and aborts old requests. Refresh runs on route entry, focus, visibility, generation-change events and a visible sixty-second interval, with one request in flight and a fifteen-second deadline. This adds an authenticated read; it is not a server quota push subscription or a cross-tab polling leader. After an overlapping change, the next refresh may be needed to display the latest count. The counter never authorizes generation.

Image and Sites quota denials use 402 with stable `free_quota_exhausted`; an extra Site or unallocated free publication uses `free_site_limit`. UI guidance preserves drafts and points to Pro. Reads, downloads and recovery remain available after exhaustion. Counts are product allowance values, distinct from private fairness/operational counters.

## Rollout and rollback

Run `npm run db:status` and inspect the exact pending list. Apply `20260914030425_free_generation_quota.sql` before deploying dependent image cancellation/failure handlers and free-admission code. The migration adds two small private tables, uniqueness/FK indexes and privilege rules; it rewrites no existing user table. Per-account locks serialize concurrent claims, so hot accounts can receive a bounded unavailable response under contention. Inspect the exact target under [database operations](POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md).

Rollback the application to the preceding Pro-only Sites release to stop new free admissions. Preserve the new tables, original image receipts, Sites and all usage. The paired rollback only reasserts denied Data API privileges; it does not by itself disable an application still offering free admission. Do not drop or truncate records, manufacture a wallet debit, or replay uncertain work. Existing Sites fair-policy disablement remains a broader emergency containment action.

## Verification and limits

Run `npm run test:free-quota`, `npm run test:free-quota:db`, image security/receipt suites, Sites workspace/fair/plan suites, `npm run db:verify`, `npm run db:test`, TypeScript, lint and an isolated production build. Database fixtures apply migrations in disposable PostgreSQL with external service access blocked. Adversarial cases cover racing allocations, batches, retries, rollback, account recreation, role denials, invalid quota DTOs and authority failures.

Serve the synthetic build with `scripts/verify-auth-entry-server.cjs` and run `scripts/verify-free-generation-ui.mjs`; scan rendered responses and referenced assets with `scripts/verify-image-public-http.ts`. Local fixtures do not establish real payment, generation, publication, delivered emails, production activation or live-site cleanliness. [Dated evidence](../knowledge/audits/2026-09-14-free-generation.json) separates observed checks from those limits.
