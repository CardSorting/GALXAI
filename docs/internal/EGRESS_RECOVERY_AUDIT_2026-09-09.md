# Private engineering audit: egress and recovery

Not public documentation. Do not publish implementation diagnostics from this report.

## Scope and evidence

This pass covers the registry synchronizer, parent controller reconciliation,
browser outbox, resilient HTTP client, and connection/recovery notice. It is not
a project-wide billing cap or a certification of the whole application.

A bounded, read-only live snapshot still showed the original full-registry SQL
stopped at 52,752 calls / 2,949,228 rows. The registry held 56 rows, with an
approximately 175,207-byte JSON projection calculated inside PostgreSQL, not
downloaded to measure it. Storage contained no objects. Seven database
connections were observed, none idle in a transaction. Cumulative query counts
are not Supabase billing bytes and cannot reconcile the entire billing period.

## Implementation-integrity verdict

The revised recovery path passes the scoped integrity checks: it distinguishes
network availability, queued work, acknowledgement and completion. Missing
authority, durable storage, or cross-tab coordination does not grant permission
to replay. No database schema, RLS policy, credentials, or billing setting changed.

## Verified findings and changes

| Severity | Finding | Impact | Resolution |
|---|---|---|---|
| P1 | Each browser tab could replay the same outbox | Duplicate writes and multiplied retries | One Web Locks drain owner; separate short state transactions read authoritative storage. Enqueue does not wait for network I/O. |
| P1 | Online rejection could enqueue a new retry budget | Permanent and ambiguous failures were replayed | Only pre-dispatch, actually-offline actions may enter the outbox; durable enqueue must succeed before 202 is returned. |
| P1 | Mutation retries did not require caller-supplied identity | Automatic retries could duplicate effects | Online mutation retries require an explicitly supplied idempotency key. Server-side idempotency is still required. |
| P1 | One chunk error handler reloaded without a limit | A broken deployment could cause a reload storm | Both handlers share one durable reload allowance per five minutes, with manual recovery when exhausted. |
| P1 | Connection restoration claimed all work was synced | Users could mistake reconnection for successful writes | Separate offline, waiting, sending, attention and connection states; no completion claim. |
| P1 | Slow worker startup held up registry refresh | Authorization could become stale while unrelated work waited | Independent single-flight authority refresh; generation/expiry checks after asynchronous work; retained workers prioritized and failures backed off. |
| P2 | Long Retry-After was shortened to five minutes | Retried before the service's requested deadline | Full delay retained in durable outbox state; foreground calls return control for long cooldowns. |
| P2 | Retry payload and burst limits were loose | More amplification during faults | 256 KiB registry response cap, 512 KiB byte burst, 3 MiB/hour refill, four-request burst and 40 requests/minute refill. |
| P2 | Generic client buffered arbitrary response bodies | Memory pressure and unnecessary downloads | 2 MiB response bound; error-body cancellation; deadlines remain active through body reading; caller cancellation ends retry waiting. |

Source locations: `src/relay/registry-egress-guard.ts`,
`src/relay/federation-lifecycle.ts`, `src/lib/resilience/outbox-coordinator.ts`,
`src/lib/resilience/BroccoliOutboxEngine.ts`,
`src/lib/resilience/ResilientClient.ts`,
`src/lib/resilience/chunk-recovery.ts`, and
`src/components/common/RecoveryNotice.tsx`.

## UI audit health: 15/20 — Good, scoped review

| Dimension | Score | Evidence / limit |
|---|---|---|
| Accessibility | 3/4 | Polite atomic status, semantic details, visible keyboard focus, labelled dismiss/reload actions. Not a full screen-reader or WCAG certification. |
| Performance | 3/4 | No decorative status animation or recovery-specific network polling. Visible-tab replay and bounded queues; synchronous browser persistence remains deliberately small and bounded. |
| Responsive | 3/4 | 390 px and 1440 px browser checks, wrapping, viewport-bound notice, 44 px targets. Not an exhaustive browser/zoom matrix. |
| Theming | 3/4 | Existing palette, typography and focus tokens retained; no unrelated visual redesign. |
| Integrity | 3/4 | Counts-only recovery view, honest acknowledgement semantics, no internal diagnostics. The separate legacy footer health finding is resolved by the follow-up below; this score remains scoped to the original notice review. |

The bundled detector reported no deterministic findings in the two changed UI
components. This is not evidence of full-site accessibility. The notice is
dismissible without discarding saved actions; state changes can surface it again.

Positive patterns preserved: explicit public response allowlists, administrator
authorization before collecting operational diagnostics, credential-revocation
fencing, bounded worker I/O, and retained failed actions.

## Verification

- `npm run test:egress`: 28 passing tests, including real SQL in disposable local PostgreSQL.
- Controller, capability, HTTP and authority tests: 34 passing checks, including immediate cooldown fencing during stalled inspection.
- Image/public-response security suite: 19 passing checks.
- TypeScript, targeted ESLint, production build and deployment preflight passed.
- Simulated 43,200 ordinary polls plus hourly full-size rotations fit the stricter policy; request storms are rejected before I/O.
- Browser fixtures exercise keyboard details, offline and stale-deployment states,
  mobile/desktop fit, 44 px targets, and zero replay of exhausted actions.
- Production restart retained the existing budget counters. Administrator checks
  confirmed the stricter policy, readiness, and no synchronization failures/blocks.

The broad database integration command is intentionally not used: it writes
live test/financial data. Static database verification reported zero fatal
violations and the existing wallet-migration search-path advisory. No production
data or statistics were purged.

## Limits and follow-ups

1. Registry limits are per controller, application-accounted payloads with an
   overhead allowance. They are not an organization-wide Supabase spend cap.
   Query counts do not establish Storage, Auth, Realtime, or log-drain totals.
2. A live Supabase billing-category/time-series comparison is still needed to
   reconcile the historical 7.4 GB. Keep the spend cap enabled; do not upgrade or
   disable it merely to conceal the symptom.
3. Reload old application tabs. Older already-loaded JavaScript cannot be
   retroactively changed. Cross-tab guarantees apply to updated tabs on one origin.
4. Legacy queued actions without captured account ownership are preserved but
   paused for review. They are not silently attributed to the next signed-in user.
5. Web Locks and durable browser storage are required for automatic recovery.
   Unsupported/private environments fail closed instead of pretending an action
   has been durably queued. Client controls are not a security boundary against a
   hostile client and are not an exactly-once execution guarantee.
6. **Resolved in the follow-up below:** synthetic samples and fixed circuit
   counts were removed from `SlaHealthEngine.ts`. Browser connectivity is no
   longer presented as service-wide availability.
7. The original CI checks were committed and pushed as `352389a`. The egress
   and dependency gates passed remotely; a separate final-build failure and its
   follow-up remediation are recorded below.
8. **Resolved in the follow-up below:** the separate eager constructor load and
   general repository full-list query were replaced. Its historical counter
   increased from 505 to 526 during the earlier build/restart window (not proof
   of a one-minute production timer), then remained at 526 through the new build.

The deployed homepage and 20 same-origin JavaScript assets were checked: the
new cross-tab coordinator and dismissible recovery notice were present, and
the configured private secrets and new server-only guard markers were absent.
Migration status was also checked read-only: 91 applied, zero pending or
remote-only migrations. No migration was applied by this audit.

Next UI checks: `$impeccable harden` for any remaining recovery edge cases,
then `$impeccable polish` as a bounded final pass. The rest of the dashboard is
not included in this notice-only score.

## Reference patterns

- [Supabase egress accounting](https://supabase.com/docs/guides/platform/manage-your-usage/egress): separate application payload measurements from billed service totals.
- [AWS retry behavior](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html): bounded attempts, retry quotas, classification and jitter. GALX's values are workload-specific, not copied SDK defaults.
- [Web Locks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API): same-origin exclusive ownership for browser coordination.

## Follow-up: eager projection and fabricated health reporting

The two requested open findings are implemented, verified and deployed. The
canonical-domain deployment confirmation is recorded below.

### Registry read path

- `GalxCredentialSubstrate` does no authority I/O during construction. Explicit
  `ready()` or legacy `initialize()` starts a shared initialization. Failed
  initialization can recover after a five-second cooldown. Actual routing keeps
  its existing freshness checks and fails closed when authority cannot refresh.
  Credential refresh and vault re-encryption explicitly await fresh authority;
  cold maintenance entrypoints cannot mistake an unloaded projection for an empty
  registry. A regression test verifies both the wait and failure behavior.
- `ShardProjectionReader` replaces the general repository's `SELECT *` list
  with an explicit 41-column projection and snapshot-consistent changed/deleted
  rows. Live lease counters participate in hashing even without revision bumps.
  Counter-only SQL changes omit the unchanged encrypted envelope on the wire.
- Owner-scoped projections are separate from the unscoped projection. Empty
  owner IDs are rejected; returned owners are checked; callers receive clones.
  Cache concurrency/storage is bounded to 32 scopes and 2,048 rows per scope.
  Configured authority failures never return stale local rows. A reader refuses
  an in-process authority configuration change instead of relabelling its cache.
- REST fallback has explicit columns, bounded pages/bodies, cancellation,
  same-project requests with redirects rejected, and a confirmation manifest.
  Metadata refresh includes live counters; revision/creation identity controls
  encrypted-envelope reuse. Concurrent manifest changes fail the read closed.
  SQL outages enter a 30-second fallback cooldown instead of repeatedly spending
  the byte reservation against a known-failing transport.
- General-repository limits are process-wide across owners/repository instances:
  512 KiB per response, 1 MiB byte burst, 3 MiB/hour refill, 12-request burst and
  40 requests/minute refill. Failed/unmeasured I/O retains its reservation.
  Unlike the controller's existing durable budget, this serverless/process-local
  budget resets on process replacement and is not shared across deployed instances.
  It is not a global Supabase spend cap or a bound on all database operations.
- No schema, migration, RLS, lease mutation, credential, or billing change.

Read-only production evidence at 2026-09-09T05:39:40Z: 56 rows, 227,943 bytes
for a cold projection; 52 bytes for an unchanged check in the same read-only
snapshot (zero changed/deleted rows). No credentials or row contents were printed.
The original controller full-read counter remained 52,752; the separate
repository full-read counter remained 526. Query counters and serialized payload
measurements are not billable-byte totals and cannot erase historical usage.

### Connection reporting

- Removed fabricated healthy history, fixed circuit counts, default percentile
  latencies, fabricated timeout latency, and seeded operational incident copy.
- Empty/legacy unmarked history yields null measurements, not 99.99% uptime.
  Aggregate success ratio is explicitly a browser-check sample ratio. It is not
  a service SLA. Zero-millisecond measured samples remain zero.
- Footer reporting uses only a measurement from the current tab, not restored
  or broadcast history. It starts unknown, shows the actual check time, expires
  after two minutes, and invalidates evidence after an offline transition.
- A successful HEAD request establishes only website reachability. The footer
  labels that scope explicitly and links to service status for availability.
- Probes are single-flight, at most once per minute per tab, visible-only, with
  a four-second deadline. Footer mount/visibility/online events may check;
  there is no recurring network poll. The focused shell's hidden footer does
  not initialize or probe. A local timer only ages displayed evidence.
- Existing visual language retained; neutral unknown state, textual labels,
  wrapping, 44-pixel link target, visible keyboard focus and polite status updates.

### Follow-up verification

- Egress/recovery suite: 40 passing tests, including disposable local PostgreSQL
  and new initialization, owner isolation, counter/envelope delta, REST race,
  size-limit, fallback-cooldown, measurement, stale/offline and timeout tests.
- Controller/capability/HTTP/authority checks: 34 passing tests.
- Image/public-response security checks: 19 passing tests.
- TypeScript, targeted ESLint, production build and deployment preflight passed.
- 390 px and 1440 px browser fixtures passed unknown/measured/offline, timestamp,
  viewport fit, keyboard focus, 44-pixel target, hidden-footer zero-probe and
  cooldown checks. Six screenshots retained in the local temporary audit folder.
- Local homepage/about HTML and 21 script assets passed the scoped scan for
  new server-only guard markers, configured private secrets and removed synthetic
  health markers. HEAD `/api/version` returned 200 with no body.
- Database verification: zero fatal violations, one pre-existing wallet migration
  search-path advisory. Migration history: 91 applied, zero pending. The broad
  live-writing database test command was not used.

Other dashboard widgets and unrelated marketing claims are outside this two-finding
fix. Do not use these results to certify the whole site or reconcile the 7.4 GB
billing-period total. No production data or statistics were flushed.

Separate dependency finding at the time of the egress fix: the remote install log reported four high-severity
advisories including development dependencies. A bounded `npm audit --omit=dev
--json` check confirmed one high-severity transitive runtime advisory in `js-yaml`
([GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh), reported
affected range 4.0.0–4.3.1, fix available). No dependency versions or lockfile were
changed in that scoped fix. The `js-yaml` finding is now resolved by the separate
dependency remediation below; the earlier successful tests/build alone were not
evidence of resolution.

### Deployment confirmation — 2026-09-09 05:52 UTC

- Final deployment `dpl_2PDCK4TVhS1QCr45sKmXPCCWpxQD`
  (`galxai-ol9pw93h3-cardsortings-projects.vercel.app`) completed its production
  build and was explicitly promoted. `vercel inspect galx.ai` confirmed that
  the canonical domain resolves to this Ready deployment. It includes the
  credential-maintenance cold-start correction and supersedes the interim build.
- Live homepage/about HTML and 21 referenced same-origin script assets passed
  the scoped checks: measured-connection UI present, server-rendered unknown
  state present, removed synthetic-health markers absent, tested server-only
  guard strings and configured private secrets absent. HEAD `/api/version`
  returned 200 with zero response-body bytes.
- The final read-only sample at 05:52:40 UTC still showed 52,752 original full
  controller reads and 526 general repository full reads. The two new repository
  delta calls were the explicit read-only verification above; idle builds and
  page verification did not add constructor-driven full-registry reads.
- Total targeted tests: 93 passing (40 egress/recovery, 34 controller/authority,
  19 public/image security). Both desktop/mobile confirmation fixtures passed.
  Temporary local application servers were stopped. No production data or
  statistics were deleted, and the spend-cap settings were not changed.
- This report and operator scripts remain excluded from the production upload.

## js-yaml advisory remediation — 2026-09-09

Status: resolved, verified, and deployed to the canonical production site.

- Confirmed the high-severity empty-merge CPU exhaustion advisory
  [GHSA-2883-xcg3-v3hh](https://github.com/nodeca/js-yaml/security/advisories/GHSA-2883-xcg3-v3hh).
  The affected dependency path was `@eslint/eslintrc@3.3.6 → js-yaml@4.3.1`.
  ESLint tooling is currently listed under production dependencies; it was not
  reclassified to hide the audit finding. No application YAML loader was found.
- Updated only `js-yaml` to the maintainer's compatible
  [4.3.2 patch](https://github.com/nodeca/js-yaml/releases/tag/4.3.2).
  A version-scoped npm override pins the v4 line to the reviewed patch without
  forcing legacy v3 consumers onto a different major version. The lockfile diff
  changes only that package's version, registry URL and integrity digest.
- Added `npm run test:yaml:security`: checks all locked copies, the parser actually
  resolved by ESLint, registry integrity, bounded empty-merge rejection with
  explicit/default budgets, and normal merge compatibility. The small custom-budget
  fixture reproduced the failure before the patch and passes afterward. The large
  denial-of-service proof of concept was not run. All four tests now pass.
- Added preflight CI gates for the regression suite and
  `npm audit --omit=dev --audit-level=high`. Workflow parsing was verified with the
  patched parser. These workspace workflow changes require a source push before
  GitHub Actions can enforce them; no commit or push was performed.
- Production audit: zero vulnerabilities. Full audit: three high-severity package
  entries remain in the **development-only** `wrangler → miniflare → sharp` chain
  for [GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c).
  These are one underlying advisory with propagated dependency findings, not
  residual `js-yaml` findings. The nested development copy of `sharp` was not
  changed; the application uses patched `sharp@0.35.4`. npm's suggested Wrangler
  downgrade was not applied. This pass does not certify the development toolchain.
- Verification: four YAML regressions plus 19 public-response/authentication tests
  passed; TypeScript passed; ESLint passed with six existing warnings; production
  build generated 275 static pages; deployment preflight passed. Offline
  `npm ci --dry-run --ignore-scripts --no-audit` confirmed lockfile consistency
  without reinstalling the running workspace. Local Node is 26.8.1 versus the
  project's Node 22.x engine; the hosted build uses the configured Node 22.x.
- No database data, schema, credentials, spend-cap settings, application UI, or
  controller runtime was changed by this dependency patch.

### Dependency deployment confirmation — 2026-09-09 06:03 UTC

- Deployment `dpl_NwK6QpJiFJW3PGnitWT7qfKAgJ9j`
  (`galxai-86ao1wj5r-cardsortings-projects.vercel.app`) installed exactly one
  changed package, passed the hosted production build and reached Ready before
  promotion. `vercel inspect galx.ai` confirmed the canonical site now resolves
  to this deployment. The earlier egress/recovery changes are preserved.
- Live homepage/about responses and 21 referenced script assets passed the
  scoped public-boundary scan. Existing recovery and measured-connection guards
  remained present; tested private guard markers/configured secrets remained
  absent. HEAD `/api/version` returned 200 with no body. This is a scoped
  regression scan, not a whole-site security certification.
- The hosted install reported three remaining high-severity findings, consistent
  with the separately documented development-only advisory chain above.
  The production-only npm audit returned zero vulnerabilities after the patch.
- Audit report and test/operator scripts remain private and excluded from the
  deployment upload. No source commit or push was performed.

## Follow-up: physical-request accounting and CI isolation — 2026-09-09

### Evidence and findings

At 06:23:54 UTC, bounded read-only diagnostics confirmed that the old controller
full-read counter was still 52,752 and the old repository full-read counter was
still 526. Only two explicit repository-delta verification calls existed. The
controller delta counter was 3,161. Storage still contained zero objects; seven
database connections were present and none was idle in a transaction. This is
positive evidence that the original poll leak remains stopped, not an explanation
of the historical billing total.

- **P1 / performance:** controller REST synchronization charged one request permit
  for an entire multi-page read. An operation could issue up to 64 physical page
  requests, so the advertised request limit did not describe actual origin calls.
- **P1 / performance:** general repository REST reads reset their response cap and
  timeout on every page. A partial snapshot could repeatedly consume the burst
  budget without one cumulative snapshot ceiling or a shared failure cooldown.
- **P1 / implementation integrity:** a late success for one owner could clear a
  concurrent origin retry delay unless recovery state was fenced by an epoch.
- **P2 / accounting integrity:** an operation that returned without invoking its
  response measurement callback received an unsupported full byte refund.
- **P2 / release integrity:** GitHub Actions run `34317593035` passed the new YAML
  security, production dependency audit, egress, controller, lint and type checks,
  but failed its production build on missing import-time vault configuration.
  A fully clean reproduction also exposed the independent audit-signing key
  requirement. The CI workflow unnecessarily used the production project URL.

### Changes and guardrails

- Both registry REST paths now share a server-only page reader. Every physical
  page must acquire a request permit before fetch. Existing byte/refill/request
  policies were not loosened, and persisted controller budget state is retained.
  Historical cumulative request counts include the old operation-based accounting;
  new REST activity is counted per physical page from this rollout onward.
- The whole REST snapshot shares a ten-second deadline and one cumulative payload
  allowance (including each page's overhead). Per-page allowances can only shrink;
  stalled bodies are cancelled by the same deadline. Unknown/failed response
  measurements retain their reservation. SQL oversize rejection does not refund
  the reserved read or trigger a second transport attempt.
- Requests use explicit fields, fixed 64-row pages, exact counts, and validated
  `Content-Range` evidence. Short pages without exact evidence still require EOF
  confirmation; malformed ranges fail closed. There is still a final metadata
  confirmation before publishing cached credentials or deletions. For the
  56-record fixture, a cold controller refresh needs four requests and a warm
  unchanged check needs two. Exact counts add server-side count work; this is
  intentionally confined to the small, 2,048-row-bounded registry, not general
  large-table pagination. Counts over the supported limit are rejected.
- Successful controller REST polls are paced at least three seconds apart so
  two-manifest polling fits the 40 physical requests/minute policy. SQL cadence
  and the existing 15-second authority expiry are unchanged. Unusually small API
  page caps or oversized registries may hit the strict budget and fail closed;
  the fallback never returns a partial or unverified projection.
- Server `Retry-After` seconds/dates are retained. General-repository failure
  cooldown spans owner scopes, coalesced callers count as one failed operation,
  pending page requests recheck cooldown, and pre-failure successes cannot clear
  a newer cooldown. No stale-on-error authority or TTL extension was introduced.
- Opaque Supabase secret keys are sent as `apikey`, not mislabelled as JWT bearer
  tokens. Legacy service-role JWTs retain their Authorization header. Redirects
  are rejected; requests remain on the configured HTTPS origin and owner scope.
- CI uses reserved `.invalid` endpoints and offline preflight validation. Its
  nondeployable build wrapper supplies separate randomly generated, process-only
  vault and audit-signing keys; it rejects production authority, production dotenv
  files, and Vercel deployment contexts. Runtime secret enforcement is unchanged.
  The workflow adds the physical-request and isolated-build regression gates and
  has a 15-minute job ceiling. No production database is needed for these gates.

### Verification and remaining boundary

- Thirteen new transport/CI checks pass, plus 40 egress/recovery, 34 controller/
  authority, 19 public-response/authentication and four YAML security checks.
- TypeScript and ESLint pass (six existing lint warnings). The regular production
  build and a clean, credential-isolated CI build both pass, generating 275 static
  pages. The clean build lives in a disposable directory and is never deployed.
- Migration status: 91 applied, zero pending. Static integrity: zero fatal
  violations and the same pre-existing wallet search-path warning. No SQL/schema,
  RLS, data, billing, log-drain, or spend-cap setting changed. The broad live-writing
  database test command was deliberately not used.
- The audit skill's scoped detector reported no findings in the unchanged recovery
  notice and footer. The earlier 15/20 notice-only UI score is not rescored as a
  whole-site visual certification; this pass changes transport and CI, not UI.
- The user subsequently identified Shared Pooler Egress as the spike category;
  the focused validation is recorded below. Still needed: its daily before/after
  usage trend to reconcile 7.4 GB. No management/billing token is configured in
  this workspace. Usage already served cannot be erased. Keep billing protections
  enabled; no billing setting was changed.
- Process-local application budgets remain local, not a distributed organization
  quota, and this patch is not a blanket cap on unrelated Database/Auth/Storage/
  Realtime/Edge Function/log-drain paths. Existing serverless instance scaling
  can multiply these local allowances. Do not claim the whole billing gap closed
  without the service-level comparison or a separately designed shared budget.
- The development-only dependency advisory chain documented above is unchanged;
  it is not the cause of this registry read amplification.

Standards checked: [Supabase egress guidance](https://supabase.com/docs/guides/platform/manage-your-usage/egress),
[PostgREST exact counts and range semantics](https://docs.postgrest.org/en/stable/references/api/pagination_count.html),
and [Supabase observability](https://supabase.com/docs/guides/observability).
The changelog's new `logs` endpoint supersedes `logs.all`; this pass does not call
either endpoint or add a recurring log query. No relevant schema/API breaking
change is required for the implemented transport changes.

### Deployment confirmation — 2026-09-09 06:45 UTC

- Deployment `dpl_4utQNwoaAmmFnpsbg8dGXJ8VV4pe`
  (`galxai-ku8g5wgcs-cardsortings-projects.vercel.app`) completed its hosted
  production build, reached Ready, and was explicitly promoted. An independent
  `vercel inspect galx.ai` resolved the canonical domain to this deployment.
- The controller was gracefully restarted after two idle/freshness checks. Its
  persistent egress budget was retained, not deleted or reset. Post-restart
  administrator checks confirmed readiness, zero synchronization failures, and
  rejection of unauthenticated and ordinary-user diagnostics requests.
- Live homepage/about HTML, response headers, and 21 same-origin script assets
  passed the scoped public-boundary scan. Expected recovery/connection guards
  were present; tested private markers, configured secrets, and removed synthetic
  health markers were absent. HEAD `/api/version` returned 200 with no body.
  This does not certify every application route or every private marker.
- All 13 transport/CI regressions passed again after promotion. The complete
  targeted verification remains 110 passing checks across the suites above.
- At this deployment checkpoint, the transport/CI follow-up source changes were
  uncommitted and unpushed. The later source-recording step is documented below.
  The earlier `352389a` commit is on the remote. The isolated CI build fix is
  verified locally; it is not yet enforced by a new remote workflow run.

## Focused follow-up: user identifies Shared Pooler Egress

The user reports that the Supabase usage chart attributes the spike to **Shared
Pooler Egress**. This is user-provided billing-category evidence, not an independently
retrieved billing export. Supabase defines this category as results sent from its
shared Supavisor pooler to the database client; it is not counted a second time
as Database Egress. The configured runtime database connection was checked without
printing its hostname, project identifier, username, or password: it uses the
shared transaction pooler. Both previously corrected SQL read paths use that
connection type. The attribution therefore matches the diagnosed mechanism;
REST fallback hardening is additional protection, not the primary explanation
for this category's historical spike.

Bounded, read-only production evidence:

- At 06:43:53 UTC and 06:45:06 UTC, the original controller full-read counter
  remained **52,752 calls / 2,949,228 returned rows**. The old repository full-read
  counter remained **526 calls / 28,019 rows**, and repository-delta calls remained
  at two deliberate earlier verification reads. No full-read regression was
  observed during this interval or the preceding build window.
- At 06:44:21 UTC, the persistent controller guard reported 3,292 requests and
  4,267,112 accounted bytes; at approximately 06:45:06 UTC, it reported 3,315
  requests and 4,291,814 accounted bytes. That is **23 reads / 24,702 accounted
  bytes**, including the explicit 1,024-byte allowance per request. The remaining
  **1,150 bytes (50 bytes/read)** are application-measured unchanged-result JSON,
  not a pooler packet capture or Supabase billable-byte measurement. The SQL
  fallback cooldown, failure, and blocked counters were zero in both samples.
- The comparison full projection is currently 175,207 JSON bytes, computed
  inside PostgreSQL without downloading its records. Multiplying today's size
  by historical calls would only be a hypothetical estimate: record sizes,
  protocol overhead, and the statistics/billing windows can differ. It must not
  be presented as an exact reconciliation of the 7.4 GB.
- The broader bounded query-statistics sample still showed the old full read
  dominating historical returned rows. Seven connections were observed, none
  idle in a transaction. No `pg_dump`/`pg_restore` invocation was found in the
  checked repository scripts and GitHub workflows; external jobs and other
  hosts were not exhaustively inventoried.

Operational conclusion: the observed full-download amplification through the
shared pooler is stopped, and the replacement path is healthy in this sample.
Keep the existing connection pool; moving the same repeated queries to a direct
connection or REST would not remove the underlying response volume. Do not flush
database records, caches, or query statistics to clear historical usage: those
actions cannot reverse billed egress, and cold-cache reloads can increase reads.
No production data, statistics, or persistent budget state was flushed.

Remaining closure evidence is the **daily Shared Pooler Egress trend before and
after the rollout**, with the same project and billing dates selected. Check that
new daily usage falls; the accumulated 7.4 GB is not expected to fall retroactively.
If high new usage persists, investigate other connection-string clients and
externally scheduled exports using matching time windows. The per-process registry
guards are not a project-wide cap on every pooler client or every SQL operation.

Reference: [Supabase egress categories, accounting, and optimization guidance](https://supabase.com/docs/guides/platform/manage-your-usage/egress).

### Source recording — 2026-09-09

- Local commit `5fde44e` (`fix(egress): enforce transport budgets and isolate CI`)
  records the deployed transport safeguards, their regression tests, public-boundary
  scan extension, and isolated CI build enforcement. This documentation commit
  separately records the findings, deployment evidence, and remaining billing
  reconciliation boundary.
- Commit-time verification: all 13 transport/CI tests passed again, TypeScript
  and the repository commit hooks passed, and the 15 pending files contained no
  matches for configured private secrets or private-key blocks. This bounded scan
  is not a certification that every possible secret format has been detected.
- No push was requested or performed in this source-recording step. The new CI
  gates still require a push and a successful remote run for remote enforcement.
  No database, billing, runtime, or deployment state changed during this step.
