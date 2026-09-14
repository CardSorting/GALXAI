# Sites workspace operations

<!-- docs-scope: current-guide -->

Private maintainer runbook. [ADR 0139](../adr/0139-browser-sites-workspace-and-managed-publishing.md) defines the browser-first path. [Public workflow](../SITES_WORKSPACE.md) contains the user-facing contract. This document must never be shipped as application content.

## End-to-end flow

1. Opening `/sites` or any `/sites/...` workspace requires a verified account session before authoring content is rendered. Anonymous and invalid sessions redirect to sign-in; successful sign-in returns to the requested workspace and preserves supported starter choices. Middleware and each server page enforce the check independently. Auth verification outages fail closed with a generic unavailable response. The signed-in account sees the labeled example and can access its own drafts without a hosting connection.
2. One `GET ?view=bootstrap` reads allowlisted setup and library summaries; an optional `id` adds the selected Site. It authenticates once and still enforces ownership on each repository read. The separate setup/library/detail reads remain compatible. Creation, generation and publication check current paid/complimentary Pro or the one-time free workspace allowance server-side. Free accounts receive one workspace with three total turns; publication is restricted to that allocated workspace. The standalone content API remains Pro-only. See [quota operations](FREE_GENERATION_QUOTA.md). New updates use shared fair-use admission and never touch wallet holds. See ADR 0140 and the fair-use runbook.
3. Creation has a retained client UUID for uncertain acknowledgements. Each draft update has a separate operation identity, persisted before inference, and an owner/workspace-scoped invocation identity. One pending operation blocks conflicting edits. Build and Discuss share fair admission; Discuss cannot replace the document.
4. Generation returns a bounded conversation envelope with a document or discussion answer and rolling summary. The server persists validated content and the actual reply; the browser renders an escaped, opaque-origin preview. Recovery reads the original operation and does not dispatch another generation. The last valid document survives invalid output.
5. Publish publicly accepts only the selected username, exact workspace and current revision. Domain reservation precedes a transaction that stores the public snapshot and managed DNS intent together. The worker registers the exact host, creates/read-backs managed DNS and verifies the exact published page over TLS. It needs no customer native connection.
6. My Sites resumes account-owned drafts and conversations. Rename changes the workspace title, not its reserved address. Archive retains publication. Unpublish clears only the public snapshot; a new publish must use the current revision. Neither action releases the hostname.

An active account receiving a workspace API 401 unmounts the editor and focuses a sign-in recovery prompt; 402 quota errors and 403 plan/access errors retain their separate handling. Same-tab unsent drafts and original operation identities remain account scoped. See [workspace authentication](../operations/workspace-auth.md) for safe return context, verified server/browser fixtures and gate-preserving rollback.

The separate native companion continues handling externally created Sites under ADRs 0136–0138. No browser flow assumes a native OAuth endpoint, public MCP executor, cross-account operator identity, authenticated iframe or automatic migration of historical native content.

## Loading and refresh

Route entry and client account hydration share a stable responsive loading shell aligned with the toolbar and 380px desktop conversation column. After six seconds the live status explains the wait and offers Home. An expected independent page-verification outage withholds workspace content and shows explicit retry under the persistent product header. Browser profile failure also withholds page content while keeping the shell and public Home available. Unexpected rendering faults use the Sites error boundary; retry fetches a fresh server render without replaying edits. Pending/failed retry and offline state have authored feedback, and keyboard focus stays on the retry action. Existing local unsent drafts survive Images/Sites navigation and successful session recovery; this is not cross-device synchronization. See [workspace authentication](../operations/workspace-auth.md) and [navigation recovery](../NATURAL_NAVIGATION_AND_OMNISEARCH.md#workspace-loading-and-render-recovery) for the full failure and fixture contracts.

The bootstrap response has only `sites`, `setup` and `site`. It remains `private, no-store`; there is no shared authenticated response cache. Library rows omit documents and conversations, and only the selected Site includes its detail. Invalid, duplicate or extra query fields are rejected. Setup failures report unavailable access; storage failures fail with a generic error. Reads do not dispatch generation.

The browser coalesces overlapping bootstrap reads for the same selection. Focus/visibility changes refresh only after thirty seconds of freshness; reconnects and account-scoped change notifications request a refresh immediately when visible and online. A change during a request or local mutation waits for that work to finish. Manual refresh remains available. Background refresh keeps the current workspace and access state visible; every mutation still validates current server authority. Unmount aborts pending reads and fences stale responses. The image and navigation budgets are maintained in [request efficiency](VERCEL_QUOTA_EFFICIENCY.md).

The combined response saves HTTP and authentication overhead; it does not eliminate the underlying bounded repository reads and is not a transactional snapshot. A slow setup check can delay bootstrap, so compare time to usable workspace after deployment. Rollback may restore the previous UI read pattern while keeping the additive bootstrap endpoint and all current security/recovery contracts.

Recovery and pending-address observation share the activity scheduler. They wait until local mutations finish, begin after four seconds, and pause while hidden or offline. A pending bootstrap defers recovery. Successful pending checks repeat after eight seconds; failures back off with jitter to 50–60 seconds and honor longer Retry-After hints. Visibility changes never accelerate a scheduled check. Access/not-found/invalid-request failures stop automatic polling and expose the existing sanitized recovery message. Changing selection, beginning a mutation or leaving the workspace aborts the current observation and fences its result; aborting a fetch does not prove remote work stopped. Generation identity and server-side recovery remain unchanged. See [request efficiency](VERCEL_QUOTA_EFFICIENCY.md) for test bounds and practical limits.

## Server configuration

| Setting | Purpose |
| --- | --- |
| Existing Sites generation configuration | Pro/free eligibility, fair admission and original-operation recovery; see [Sites operations](SITES_OPERATIONS.md) |
| `GALX_SITES_MANAGED_PUBLISH_ENABLED=1` | Enable new managed publications and managed host preparation |
| `GALX_SITES_HOSTING_PROJECT` | Exact `prj_…` Vercel project serving the narrow published handler |
| `GALX_SITES_HOSTING_TEAM` | Exact `team_…` owning the project |
| `GALX_SITES_HOSTING_TOKEN` | Server-only credential scoped to the intended project/team's domain operations |
| `GALX_SITES_HOSTING_CNAME` | Verified project-specific CNAME, restricted to the documented `vercel-dns` domain family |
| Existing native domain mutation/worker flags and cohort | Retain their exact admission, DNS authority, scheduler and retry contracts |

Only verified account sessions authorize workspace APIs. No cookie-only mutation, supplied owner ID, native credential, arbitrary hostname, SQL record, source archive or provider URL is accepted. The public setup result contains only access, publishing availability and the account's chosen username. Every document and list response uses explicit DTOs. Runtime and hosting errors are generic to customers.

Configure managed hosting on the existing owned infrastructure before enabling the flag. Do not guess the CNAME: inspect the selected project's domain configuration. The adapter uses [add project domain](https://vercel.com/docs/rest-api/projects/add-a-domain-to-a-project) and [get project domain](https://vercel.com/docs/rest-api/projects/get-a-project-domain), with fixed-origin authorization and exact readback after uncertain adds. A domain requiring ownership verification remains pending; do not automatically overwrite parent-zone verification records or transfer domains. Review actual provider limits for the intended cohort; [custom-domain setup](https://vercel.com/docs/domains/working-with-domains/add-a-domain) documents the distinction between exact CNAMEs and wildcard nameserver/certificate configuration.

## State and recovery

[Continuous conversation operations](SITES_CONVERSATIONS.md) now owns authoring history, project context and immutable versions under [ADR 0142](../adr/0142-continuous-sites-conversations.md). `private.galx_site_workspaces` retains current state and the public snapshot; private turn and version tables preserve history beyond the old eighty-entry window. The JSON message field remains a bounded compatibility cache. All Data API roles are denied and RLS is forced. Transactions retain five-second statement and three-second lock limits. Creation serializes per account; mutations require the current revision. The fifty-Site account storage bound remains. Free accounts additionally have one lifetime allocated workspace and three total turns; Pro does not consume this welcome allowance.

The new [fair-use runbook](SITES_FAIR_USAGE.md) owns paid and complimentary eligibility and shared admission; [quota operations](FREE_GENERATION_QUOTA.md) owns free eligibility and deductions. Generation uncertainty remains pinned to its original operation. The persisted `operation_mode` selects included admission recovery or legacy wallet recovery. A missing original record can clear a pending operation only after 120 seconds, beyond the request's maximum execution window. A proven pre-admission deferral clears it without consuming a logical message and atomically releases a reserved free turn. Durable not-started recovery does the same; missing receipt recovery does not by itself refund a free turn. Unknown dispatching grants retain their occupancy until authoritative completion or confirmed non-dispatch. Settlement and valid content persistence can be recovered after a lost acknowledgement. Never delete wallet holds to free a workspace.

The public handler returns only `published_document` rendered as escaped static HTML. Middleware permits the root page on exact Site hostnames and denies their other paths/mutations, including static assets. It fetches only the fixed public artifact endpoint on the GALX origin, with a six-second/64-KiB bound, and reconstructs the response from a header allowlist. Incoming credentials, query strings, upstream errors and framework rewrite headers are discarded. This extra origin read keeps the edge response independent of framework routing headers. No authoring API executes on a Site hostname. Preview and public content cannot execute scripts, forms, nested frames or arbitrary network requests. The published response does not initialize application auth or forward cookies or provider headers.

Pause managed publication before rollback, keep recovery and public readers available, and retain both database tables. The additive DOWN migration preserves all workspace state and denied access. Domain conflict stops and the existing native address worker retain their own recovery procedure in [Sites address operations](SITES_DOMAINS.md).

## Verification

```sh
npm run test:sites:workspace
npm run test:image:security
npm run test:sites:workspace:db
npm run test:sites:worker
npm run db:test
npm run db:verify
npx tsc --noEmit
python3 scripts/verify-docs.py
python3 internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/verify-application.py workspace-application-verification.json
```

The database suites create disposable PostgreSQL fixtures and never inherit production credentials. Workspace checks cover ownership, concurrent operations, stale revisions, operation reuse, immutable publication, lost commits, rollback and all Data API role denials. Adapter tests cover public DTOs, billing uncertainty, hostile generated text, domain readback and exact-content TLS checks.

`scripts/verify-sites-workspace-ui.ts` runs only against localhost with intercepted synthetic account, generation and publishing responses. Supply `GALX_BROWSER_MODULE` and `GALX_AXE_MODULE` when browser tooling is outside the repository. It checks desktop/mobile layouts, iframe isolation, creation, included access, publishing consent, visible mobile feedback, rename, archive/restore, search, direct-route loading/admission and reload. `scripts/verify-sites-published-http.mjs` additionally checks actual Host-header routing and response boundaries against the local production build. Its fixtures are not a live paid generation or domain provisioning test.

The workspace entry regression suite runs with `test:image:security`. It covers anonymous, forged, expired, refreshed and native sessions; prefetch/RSC requests; misleading extensions; independent server-page denial; and private response headers. Existing browser fixtures that only mock browser Auth/API calls need a verified server session too. Never disable the page guard to run those fixtures. Published Site root pages keep their separate public snapshot contract. Rollback must preserve account entry checks as well as API ownership checks.

Production activation and live customer acceptance must be recorded separately from these checks. Applying the migration or deploying the workspace does not itself enable generation, expand the cohort or verify a new customer publication.

## Rollout record

The [September 12 workspace release record](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/WORKSPACE_RELEASE_20260912.md) preserves the initial application/database delivery with activation disabled. The subsequent [platform activation record](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/ACTIVATION_20260912.md) records the restricted hosting credential, generation-service replacement, rollout configuration and application deployment separately from customer acceptance.

Create the hosting credential with the exact project and team scope and an explicit expiry. Verify its access to the existing project domain before storing it as a sensitive Production variable. Project-scoped credentials can read their project domains while account-level token metadata retrieval returns 404; use the token-creation metadata to verify its scope and lifetime. Do not interpret that account-endpoint denial as failed domain access, recreate credentials repeatedly, or widen runtime scope to make that unrelated endpoint succeed. Updating a Vercel environment variable requires a new deployment before it takes effect.

The installed runtime credential expires on December 11, 2026 UTC. Rotate it before then: create and verify a replacement with the same project/team restriction, update the sensitive Production variable, deploy, verify publishing and then revoke the superseded runtime token. Keep the credential out of commands, logs and repository files. Customer onboarding requires none of these platform operations.
