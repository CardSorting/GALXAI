# Private preview administration

<!-- docs-scope: current-guide -->

The admin workspace is `/admin`. Images and Sites stay public; preview approvals apply to the developer API and tools. Staff membership is a separate permission and does not itself grant developer access.

## First-time setup

Apply both migrations, in order, before deploying the updated site:

1. `20260912215724_developer_private_preview.sql`
2. `20260912222003_preview_admin_workspace.sql`

Provision the first owner from a trusted server environment:

```sh
npm run developer-preview -- bootstrap-owner founder@example.com
```

Replace the example with the founder's actual GALX sign-in email. This command only works with an empty staff roster. It sends no email and grants no developer API access. Sign in with that verified email, then open `/admin`; the membership becomes permanently bound to that account ID. Subsequent staff changes happen in **Staff access**. An invitation for a different account cannot take over an already-bound membership.

The migrations, site and API gateway were deployed on 2026-09-12. The first owner is provisioned and bound directly to the founder-specified, verified account ID; see the [activation receipt](preview-activation.md). The production roster is initialized, so use **Staff access** for subsequent changes. The Worker calls the site's approval check on every private request, so pauses and expiry apply to existing keys.

## Daily review

1. Open **Requests → Waiting**. Search by email or account ID when following up with a known participant.
2. Select a project, read the builder's introduction, supplied profiles, cohort preference, project description and expected traffic, then choose a decision. Profile ownership is self-reported. Older applications may not include the new details. Approval defaults to 30 days; 7 days, 90 days and no expiry are also available.
3. Add an internal decision note. The confirmation names the account, period and immediate effect. Saving creates the decision and history entry in one transaction.
4. Use **Next request** to continue reviewing. Each admission is individual so the operator controls cohort growth.
5. Use **Feedback** to review participant reports. Marking one resolved removes it from the open inbox; it can be reopened. Resolution does not send a response to the participant.
6. Approved accounts can be paused, and paused/declined requests can be returned to the waitlist. Expired approvals deny new private requests without requiring a background job. Already-running work is not cancelled.

Participants see their current status and any access expiry on `/developers`. They do not see staff identities, internal notes or other participants' feedback. No email is sent automatically. After adding staff, use **Copy sign-in link** and share it yourself.

## Permissions

| Role | Read requests, feedback and history | Approve, pause and resolve | Manage staff |
| --- | --- | --- | --- |
| Owner | Yes | Yes | Yes |
| Reviewer | Yes | Yes | No |
| Viewer | Yes | No | No |

Only owners can add, change or remove staff. Pending owner invitations do not count toward the last-active-owner safeguard. Concurrent owner changes are serialized; they cannot remove all active owners. Each request rechecks database membership. Writes hold the actor's membership until commit, so staff removal and in-flight decisions have a defined order.

Staff access requires a verified account session. API keys, customer approval, payment, editable profile metadata and internal service headers cannot authorize administration. The page, its JavaScript entry chunk, middleware and route handlers are protected. Responses are private/no-store and use explicit DTOs. The private tables deny `anon` and `authenticated` access and force RLS. The application service role can append audit records but cannot edit or delete them.

## Conflict and recovery behavior

Every permission record has a revision. Pending applicants can update their application; each edit increments the same revision so a stale staff review cannot decide against changed details. A stale browser receives a conflict instead of overwriting someone else's decision. Decision notes survive workspace refresh and switching between requests while the workspace remains open; reloading the browser or closing the tab does not persist drafts. Network errors do not trigger automatic mutation retries. If the account changes, staff access is removed or the session expires, the UI clears private records and drafts and requires sign-in again. On a database outage, administration and private API checks fail closed; Images and Sites retain their own access path.

The original operator `approve`/`revoke` CLI remains a trusted recovery path. It increments revisions and records an operator audit event; CLI approvals have no expiry. Prefer the workspace for normal review. Keep database credentials out of browsers and use them only in trusted server environments.

Export staff/audit records privately before rolling back. The admin rollback turns declined and expiring approvals into paused records before dropping the new fields, so removing expiry support cannot convert a temporary grant into permanent access. Roll back the application coherently; reverting to the pre-gate application would reopen the developer API.

## Pattern references and decisions

- [Linear Triage](https://linear.app/docs/triage): an incoming review queue with explicit acceptance and decline decisions. GALX uses that familiar structure and keeps admission deliberate; it does not automatically approve requests.
- [Vercel team management](https://vercel.com/docs/rbac/managing-team-members): owners control membership and roles. GALX adopts a smaller three-role model suited to the preview stage.
- [GitHub organization audit log](https://docs.github.com/en/organizations/keeping-your-organization-secure/managing-security-settings-for-your-organization/reviewing-the-audit-log-for-your-organization): records who changed access and when. GALX records staff and participant decisions without exposing operational infrastructure.
- [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security): authorization never relies on editable user metadata; private staff permissions are checked from the database instead of cached JWT role claims.

These are design influences, not claims that GALX implements every capability or guarantee of those products. Expected traffic is an admission signal, not a new quota override. Existing API key scope, billing and request limits still apply.

## Verification

```sh
npm run test:preview-admin
npm run test:preview-admin:db
npm run test:preview-admin:ui
npm run test:developer-preview
npm run test:developer-preview:db
npm run test:image:security
npm run db:verify
npm run db:test
npm run build
```

The browser suite runs the production build in a temporary directory without `.env.local`, against a disposable local database. It substitutes only test identity-provider responses and blocks external requests. Browser tooling can be configured with `GALX_BROWSER_MODULE` and `GALX_AXE_MODULE`; the local default points to temporary tooling outside the repository. Evidence is under `.impeccable/review/preview-admin/`. Live deployment and real-account acceptance need separate verification.
