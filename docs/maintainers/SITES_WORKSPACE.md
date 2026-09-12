# Sites workspace operations

<!-- docs-scope: current-guide -->

Private maintainer runbook. [ADR 0139](../adr/0139-browser-sites-workspace-and-managed-publishing.md) defines the browser-first path. [Public workflow](../SITES_WORKSPACE.md) contains the user-facing contract. This document must never be shipped as application content.

## End-to-end flow

1. A visitor opens `/sites`, sees a labeled example and describes a Site. Sign-in retains the unsent prompt and returns to the workspace. The account can access its own drafts without a hosting connection.
2. Setup reads allowlisted paid-plan access and publishing availability. Creation, generation and publication check verified subscription access server-side. New updates use shared fair-use admission and never touch wallet holds. See ADR 0140 and the fair-use runbook.
3. Creation has a retained client UUID for uncertain acknowledgements. Each draft update has a separate operation identity, persisted before inference, and an owner/workspace-scoped invocation identity. One pending operation blocks conflicting edits. Build and Discuss share fair admission; Discuss cannot replace the document.
4. Generation returns a bounded conversation envelope with a document or discussion answer and rolling summary. The server persists validated content and the actual reply; the browser renders an escaped, opaque-origin preview. Recovery reads the original operation and does not dispatch another generation. The last valid document survives invalid output.
5. Publish publicly accepts only the selected username, exact workspace and current revision. Domain reservation precedes a transaction that stores the public snapshot and managed DNS intent together. The worker registers the exact host, creates/read-backs managed DNS and verifies the exact published page over TLS. It needs no customer native connection.
6. My Sites resumes account-owned drafts and conversations. Rename changes the workspace title, not its reserved address. Archive retains publication. Unpublish clears only the public snapshot; a new publish must use the current revision. Neither action releases the hostname.

The separate native companion continues handling externally created Sites under ADRs 0136–0138. No browser flow assumes a native OAuth endpoint, public MCP executor, cross-account operator identity, authenticated iframe or automatic migration of historical native content.

## Server configuration

| Setting | Purpose |
| --- | --- |
| Existing Sites generation configuration | Paid eligibility, fair admission and original-operation recovery; see [Sites operations](SITES_OPERATIONS.md) |
| `GALX_SITES_MANAGED_PUBLISH_ENABLED=1` | Enable new managed publications and managed host preparation |
| `GALX_SITES_HOSTING_PROJECT` | Exact `prj_…` Vercel project serving the narrow published handler |
| `GALX_SITES_HOSTING_TEAM` | Exact `team_…` owning the project |
| `GALX_SITES_HOSTING_TOKEN` | Server-only credential scoped to the intended project/team's domain operations |
| `GALX_SITES_HOSTING_CNAME` | Verified project-specific CNAME, restricted to the documented `vercel-dns` domain family |
| Existing native domain mutation/worker flags and cohort | Retain their exact admission, DNS authority, scheduler and retry contracts |

Only verified account sessions authorize workspace APIs. No cookie-only mutation, supplied owner ID, native credential, arbitrary hostname, SQL record, source archive or provider URL is accepted. The public setup result contains only access, publishing availability and the account's chosen username. Every document and list response uses explicit DTOs. Runtime and hosting errors are generic to customers.

Configure managed hosting on the existing owned infrastructure before enabling the flag. Do not guess the CNAME: inspect the selected project's domain configuration. The adapter uses [add project domain](https://vercel.com/docs/rest-api/projects/add-a-domain-to-a-project) and [get project domain](https://vercel.com/docs/rest-api/projects/get-a-project-domain), with fixed-origin authorization and exact readback after uncertain adds. A domain requiring ownership verification remains pending; do not automatically overwrite parent-zone verification records or transfer domains. Review actual provider limits for the intended cohort; [custom-domain setup](https://vercel.com/docs/domains/working-with-domains/add-a-domain) documents the distinction between exact CNAMEs and wildcard nameserver/certificate configuration.

## State and recovery

[Continuous conversation operations](SITES_CONVERSATIONS.md) now owns authoring history, project context and immutable versions under [ADR 0142](../adr/0142-continuous-sites-conversations.md). `private.galx_site_workspaces` retains current state and the public snapshot; private turn and version tables preserve history beyond the old eighty-entry window. The JSON message field remains a bounded compatibility cache. All Data API roles are denied and RLS is forced. Transactions retain five-second statement and three-second lock limits. Creation serializes per account; mutations require the current revision. The existing fifty-Site account bound remains; it is not a lifetime generation cap.

The new [fair-use runbook](SITES_FAIR_USAGE.md) owns paid eligibility and admission. Generation uncertainty remains pinned to its original operation. The persisted `operation_mode` selects included admission recovery or legacy wallet recovery. A missing original record can clear a pending operation only after 120 seconds, beyond the request's maximum execution window. A proven pre-admission deferral clears it without consuming a logical message. Unknown dispatching grants retain their occupancy until authoritative completion or confirmed non-dispatch. Settlement and valid content persistence can be recovered after a lost acknowledgement. Never delete wallet holds to free a workspace.

The public handler returns only `published_document` rendered as escaped static HTML. Middleware permits the root page on exact Site hostnames and denies their other paths/mutations, including static assets. It fetches only the fixed public artifact endpoint on the GALX origin, with a six-second/64-KiB bound, and reconstructs the response from a header allowlist. Incoming credentials, query strings, upstream errors and framework rewrite headers are discarded. This extra origin read keeps the edge response independent of framework routing headers. No authoring API executes on a Site hostname. Preview and public content cannot execute scripts, forms, nested frames or arbitrary network requests. The published response does not initialize application auth or forward cookies or provider headers.

Pause managed publication before rollback, keep recovery and public readers available, and retain both database tables. The additive DOWN migration preserves all workspace state and denied access. Domain conflict stops and the existing native address worker retain their own recovery procedure in [Sites address operations](SITES_DOMAINS.md).

## Verification

```sh
npm run test:sites:workspace
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

Production activation and live customer acceptance must be recorded separately from these checks. Applying the migration or deploying the workspace does not itself enable generation, expand the cohort or verify a new customer publication.

## Rollout record

The [September 12 workspace release record](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/WORKSPACE_RELEASE_20260912.md) preserves the initial application/database delivery with activation disabled. The subsequent [platform activation record](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/ACTIVATION_20260912.md) records the restricted hosting credential, generation-service replacement, rollout configuration and application deployment separately from customer acceptance.

Create the hosting credential with the exact project and team scope and an explicit expiry. Verify its access to the existing project domain before storing it as a sensitive Production variable. Project-scoped credentials can read their project domains while account-level token metadata retrieval returns 404; use the token-creation metadata to verify its scope and lifetime. Do not interpret that account-endpoint denial as failed domain access, recreate credentials repeatedly, or widen runtime scope to make that unrelated endpoint succeed. Updating a Vercel environment variable requires a new deployment before it takes effect.

The installed runtime credential expires on December 11, 2026 UTC. Rotate it before then: create and verify a replacement with the same project/team restriction, update the sensitive Production variable, deploy, verify publishing and then revoke the superseded runtime token. Keep the credential out of commands, logs and repository files. Customer onboarding requires none of these platform operations.
