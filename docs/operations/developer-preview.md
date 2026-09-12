# Developer private preview

Images and Sites remain public products with their existing authentication and billing requirements.
Other API routes and developer pages require an individually approved account. Signup, payment, a pre-existing key, account metadata, and a pending request do not grant preview access.

## Rollout

Apply `20260912215724_developer_private_preview.sql` followed by `20260912222003_preview_admin_workspace.sql` before deploying the application and API gateway Worker. The [admin workspace guide](preview-admin.md) covers first-owner setup and daily review. It creates two private tables, denies all browser database roles access, and grants no accounts automatically. If approval storage is unavailable, private operations fail closed. Images and Sites do not query approval storage. The API hostname checks approval through the application's authenticated `/api/developer-access/check` contract on every private request; deploy both entry points to close legacy access.

Use `/developers` to sign up, verify an email, submit a project description and expected traffic, and check access status. Requests are idempotent per verified account. The page says invitations are reviewed individually without a promised date. No automatic email is sent. Approval is checked on every new private API request, including requests made with older API keys. Already-running work is not cancelled by revocation.

## Operator workflow (private)

```sh
npm run developer-preview -- list
npm run developer-preview -- approve ACCOUNT_ID REVIEWER_NAME
npm run developer-preview -- feedback
npm run developer-preview -- revoke ACCOUNT_ID REVIEWER_NAME
```

The CLI requires the server database credential. Read the request and confirm the account before approval. Approve a small group at a time; use expected traffic and feedback to decide when to expand it. API keys are available at `/keys` after approval. Participants send private feedback from `/developers`; feedback is limited to one submission per minute per account. Retain only feedback needed for preview support and honor account deletion requests.

The private `/admin` workspace has owner, reviewer and viewer roles, with separate session and database membership checks. Use it for normal review, access periods, internal notes, private feedback and staff management. Signup cannot grant administration. Administrative routes retain their separate server-side administrator check. Machine callbacks and public-product supporting routes retain their existing authorization. `preview-policy.ts` is the explicit public route allowlist; new routes default to private. Private route handlers have a second guard for direct handler calls. Keep both checks when adding routes.

The paired down migration deletes preview requests and feedback, so export those records privately first. Reverting only the application would reopen legacy developer routes: do not use that as a rollback while the API is meant to stay private.

## Verification for the original preview gate

- Production application build and Worker dry run passed.
- Static database integrity checks and all 94 existing database integration tests passed in a disposable fixture with all 100 migrations applied. `npm run test:developer-preview:db` also verified request persistence, duplicate submissions, approval/revocation, concurrent feedback throttling, forced RLS, and denial to browser roles.
- Six preview tests cover policy boundaries, forged grants, direct handler denial, the separate API hostname, revocation, outages and read-only authorization probes. The image HTTP/security suite passed all 19 tests; the focused Sites/signup regression run passed all 34 tests.
- Ten desktop/phone captures passed the preview workflow checks without Axe WCAG A/AA findings, document overflow or browser exceptions. Signup, generation, publishing and account responses were synthetic browser fixtures; no email was sent.
- The final local production HTTP scan checked private route denials (including misleading extensions and middleware-skip headers), redirects, public-product reachability, public image OpenAPI, six rendered pages and 26 associated browser scripts. The broader preview-page scan found only generic Supabase SDK relay-error identifiers after developer search data was removed. This is scoped local evidence, not an audit of the live deployment or every private page.

Both migrations, the production site and API gateway were deployed on 2026-09-12. The first owner is provisioned and bound to the founder-specified, verified account ID. See the [activation receipt](preview-activation.md) for exact deployments and scoped live evidence.
