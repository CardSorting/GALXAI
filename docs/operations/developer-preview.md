# Private developer access

<!-- docs-scope: current-guide -->

GALX has retired Developer Access as a public subscription and self-service
product. The inference gateway, API request handling, API-key authentication,
metering, accounting, quota reservation, scheduling, reliability controls, and
administrative records remain operational. The change removes the public
obligation to accept arbitrary developer demand; it does not roll back the
machinery.

## Decision at a glance

| Audience | Can do what | Where |
| --- | --- | --- |
| Public visitor | Read the capability and access boundary | `/developers` |
| Ordinary signed-in user | Use GALX products that are independently available | Product workspace |
| Authorized administrator | Review a bounded cohort, provision credentials, allocate, meter, and revoke | `/admin` |
| Approved private integration | Call the assigned API scope within its allocation | API base URL |

There is no public checkout, enrollment form, waitlist, application flow,
automatic key issuance, upgrade path, or public inference price sheet. The
public page is informational. Do not add a replacement public application or
waitlist without a separate product decision.

## Private access lifecycle

Treat access as an administered resource with a visible state transition:

```text
reviewed cohort → approved → credential provisioned → allocated and metered
      └─────────────── expiry / disable / revoke ────────────────┘
```

Approval and credential provisioning are separate actions. A successful
payment, historical invoice, product subscription, account email, or API-key
prefix never proves private API authorization.

Private access is always:

1. **Explicit** — GALX chooses the cohort or integration.
2. **Bounded** — traffic, usage, scope, and expiry are assigned deliberately.
3. **Metered** — consumption remains observable even when no public billing
   product exists.
4. **Administered** — staff membership and role checks protect the control
   plane.
5. **Revocable** — credentials and cohorts can be disabled immediately.

## Preserved infrastructure

The retirement is a distribution change, not an infrastructure rollback. Keep
the following available to GALX products, internal systems, experiments, and
explicitly authorized private integrations:

- gateway endpoints and request handling;
- API-key verification, scopes, expiry, rotation, and revocation;
- request, token, traffic, reservation, completion, and release accounting;
- per-key rate limits and private allocation caps;
- workload scheduling, worker/pool boundaries, recovery, and reliability
  controls;
- request logs, diagnostics, and administrator audit records; and
- internal service integrations that depend on the gateway or metering data.

The current internal consumption reference may be used for allocation and
accounting decisions, but it is not a public rate card. Public docs must stay
at the capability/outcome level and must not disclose provider relationships,
routing, capacity acquisition, scheduling, internal economics, or diagnostics.

## Database rollout

Apply the existing preview/admin migrations and the two additive private-access
migrations before deploying the matching application revision:

1. `20260912215724_developer_private_preview.sql`
2. `20260912222003_preview_admin_workspace.sql`
3. `20260918250000_private_developer_access_controls.sql`
4. `20260918251000_private_access_allocation_sync.sql`

The additive migrations extend durable key controls and keep allocation changes
effective for the current reservation period. They do not delete keys, usage
records, subscription records, worker boundaries, reliability state, or
historical billing data.

## Operator entry points

Use the [private access administration guide](preview-admin.md) for the normal
console workflow. Its navigation follows familiar cloud-console roles:

- **Requests** — triage private access records and review intended use;
- **Private access** — inspect credentials, allocation, usage, and expiry;
- **Activity** — review the append-only decision and credential history;
- **Staff access** — manage administrator roles; and
- **Feedback** — keep approved-cohort feedback separate from authorization.

The trusted CLI remains a recovery path for cohort decisions:

```sh
npm run developer-preview -- list
npm run developer-preview -- approve ACCOUNT_ID REVIEWER_NAME
npm run developer-preview -- revoke ACCOUNT_ID REVIEWER_NAME
```

CLI approval is necessary but does not create a credential. In `/admin`, an
authorized administrator selects the approved cohort, generates a credential,
assigns its environment, traffic limit, usage cap, and expiry, then delivers
the raw secret through an approved private channel. The raw secret is returned
once. The same resource detail shows metered consumption and supports
allocation changes and revocation.

Disabling or revoking a cohort prevents new private requests. Revoking a key
does not cancel work already admitted; existing key, quota, and worker checks
remain authoritative for every request.

## Recovery and verification

The admin workspace and private-access checks fail closed when identity,
membership, or storage authority is unavailable. Public denial responses are
allowlisted, private/no-store, and contain no internal diagnostics or
enrollment link. Keep middleware and route-level guards when adding a private
route.

Public framework assets inherit access only from exact reviewed route
templates. Dynamic templates are not concrete customer paths: for example,
the public profile page emits a browser chunk under `profile/[handle]`, while
the public page validator accepts only a normalized real handle. Keep that
template in the explicit framework-asset allowlist. Do not exempt arbitrary
bracketed paths, private descendants, unrelated page chunks, or administrator
assets.

Run the focused checks after changes:

```sh
npm run test:developer-preview
npm run test:preview-admin
npm run test:signup-credit
npm run test:stripe
npx tsc --noEmit
npm run lint
npm run build
```

Verify both sides of the boundary: anonymous and ordinary authenticated callers
cannot provision keys or reach public enrollment, while an authorized
administrator can create, inspect, update, meter, and revoke a bounded
credential. Scan rendered HTML, RSC responses, and browser assets for retired
checkout, enrollment, pricing, and internal implementation copy. Local
verification is not evidence of a hosted deployment.

For each public dynamic route, request the encoded and decoded route-chunk
forms anonymously and keep adversarial private siblings in the same test. A
hosted acceptance must confirm the exact chunk returns JavaScript with a
successful status and that a clean anonymous browser renders the route. A page
document returning 200 does not prove its browser assets are accessible.

Do not roll back to a pre-gate or pre-retirement application: that would reopen
the public distribution contract. A safe rollback keeps the admin-only boundary
and the durable metering schema together with the backend implementation.
