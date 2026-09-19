# Private access administration

<!-- docs-scope: current-guide -->

The authenticated `/admin` workspace is the only user-facing control plane for
private developer access. It uses a familiar cloud-console model: an inbox for
review, a resource detail page for credentials and allocations, a usage view
for metering, an activity trail for accountability, and role-based staff
management.

Staff membership is separate from cohort approval. Neither ordinary account
metadata nor possession of an API key grants administration. Images and Sites
retain their own product paths and eligibility rules.

## Before you start

Apply the migrations in order:

1. `20260912215724_developer_private_preview.sql`
2. `20260912222003_preview_admin_workspace.sql`
3. `20260918250000_private_developer_access_controls.sql`
4. `20260918251000_private_access_allocation_sync.sql`

Provision the first owner from a trusted server environment:

```sh
npm run developer-preview -- bootstrap-owner founder@example.com
```

Use the actual verified sign-in email. After the owner signs in, subsequent
staff changes happen in **Staff access**. Keep database credentials and raw API
secrets out of browsers, logs, tickets, and screenshots.

## Console map

| View | Use it for | Familiar pattern |
| --- | --- | --- |
| Requests | Review a bounded cohort and intended use | Triage inbox / approval queue |
| Private access | Provision, allocate, inspect, and revoke credentials | Resource detail |
| Feedback | Review participant reports without changing access implicitly | Support inbox |
| Activity | Inspect decisions, credential changes, and staff changes | Audit trail |
| Staff access | Add, change, or remove staff roles | Team/RBAC settings |

The page keeps list context and detail context together. Search narrows the
current view; filters describe a state; status chips communicate whether an
action is pending, approved, expired, paused, or revoked. A destructive action
names its target and reports its result immediately.

## Provision a bounded integration

Use this sequence for every new private integration:

1. Open **Requests** and inspect the account, intended use, cohort preference,
   and existing decision history.
2. Approve an explicit bounded cohort with an expiry when appropriate. Record
   the reason required for later review.
3. Open **Private access**, select the approved cohort, and choose
   **Generate credential**.
4. Assign a clear name, `live` or `test` environment, traffic allocation
   (requests per minute), usage allocation (USD), and credential expiry.
5. Copy the raw API secret from the one-time reveal and deliver it through an
   approved private channel. The admin API does not return the raw secret again.
6. Confirm the key prefix, environment, allocation, expiry, and current usage
   in the access detail. Do not record the raw secret in the audit note.

Approval does not automatically mint a key. The repository writes the durable
key before returning success and appends an audit record. A failed durable
write must not appear active in cache or in the workspace.

## Operate existing access

The **Private access** detail is the source of truth for the operator view. It
shows allowlisted metadata and usage summary:

- key name, prefix, environment, scopes, and expiry;
- traffic allocation and usage allocation;
- request and token totals;
- current metering-period consumption;
- remaining allocation and reset date; and
- recent decision and credential activity.

It does not expose key hashes, raw secrets, provider credentials, topology,
routing state, raw ledger rows, or internal diagnostics.

Use **Save allocation** to change a key name, traffic limit, or usage cap. The
next reservation synchronizes the active period with the assigned cap, so an
allocation change applies without deleting usage history. Use **Revoke** when a
credential is compromised, no longer needed, expired, or outside the approved
scope.

To disable a cohort, revoke its credentials and change the cohort decision to a
non-active state. New requests fail closed; already admitted work is not
cancelled. Re-enable only through an explicit administrator decision and a new
bounded allocation.

The current metering card is intentionally colocated with the credential
resource. It shows completed and pending messages, allocation, remaining
amount, accrued amount, percentage used, and reset timing where recorded. This
supports safe operations without turning metering into public billing.

## Roles and permissions

| Role | Read cohorts, credentials, usage, and history | Decide cohorts, allocate, revoke | Manage staff |
| --- | --- | --- | --- |
| Owner | Yes | Yes | Yes |
| Reviewer | Yes | Yes | No |
| Viewer | Yes | No | No |

Every request rechecks staff membership. Writes use server-side authorization,
exact same-origin mutation checks, revisions, and allowlisted DTOs. Responses
are private/no-store and noindex. Browser database roles do not access the
private tables. Ordinary authenticated users are not administrators.

The preserved API-key endpoints remain available to the admin implementation,
but `/api/keys`, key activity, verification, rotation, and revocation are
admin-only. Do not create a second public credential workflow around them.

## Recovery paths

| Situation | Operator action | Expected boundary |
| --- | --- | --- |
| Stale detail or conflicting edit | Refresh and review the current revision before saving | The stale write is rejected; the draft remains available until reload |
| Credential compromised | Revoke the named credential | New requests fail; admitted work is not cancelled |
| Cohort no longer supported | Disable the cohort and revoke its credentials | No new admission; preserve metering and audit history |
| Staff member loses authority | Refresh or sign in with an authorized role | Workspace locks; no cached staff grant is reused |
| Database or identity outage | Stop provisioning and retry after authority returns | Admin and private admission fail closed with generic responses |

The trusted CLI remains available for recovery and cohort decisions:

```sh
npm run developer-preview -- list
npm run developer-preview -- approve ACCOUNT_ID REVIEWER_NAME
npm run developer-preview -- revoke ACCOUNT_ID REVIEWER_NAME
npm run developer-preview -- feedback
```

Prefer the workspace for normal credential operations because it combines
cohort decision, allocation, metering, and audit context.

## Verification

Run:

```sh
npm run test:preview-admin
npm run test:developer-preview
npm run test:signup-credit
npm run test:stripe
npx tsc --noEmit
npm run lint
npm run build
```

The browser and HTTP checks must cover anonymous users, ordinary authenticated
users, forged staff headers, cross-origin mutations, malformed allocation
payloads, one-time secret delivery, stale revisions, revocation, expiry, and
sanitized failure bodies. Review desktop, phone, keyboard, focus, 200% text,
long email, empty-state, loading, conflict, and error states. Browser evidence
is local validation; live deployment and real-account acceptance require
separate evidence.
