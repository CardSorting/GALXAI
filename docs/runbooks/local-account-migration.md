# Local account and application migration

<!-- docs-scope: current-guide -->

## Purpose and trigger

Private operator procedure for the owner's requested Supabase exit after the [native database setup](local-postgres.md). [Current state](../../post-mortem/CURRENT_STATE.md) and the [central cutover record](../../post-mortem/releases/2026-10-17-central-native-cutover.json) own actual activation. Both databases and central Auth/web/Nova now use native storage; Premium's hosted project is deleted. Central's source is write-guarded and paused; the original organization is Free and Pro is cancelled. Preparation, activation, provider acceptance and retirement remain distinct. Google credential recovery and actual return passed on October 18 after the owner saved a replacement for the same client. Mixed-cookie Library and full-image/dual-profile correction are accepted separately from initial public scans; current state records their scope.

## Authority and prerequisites

Use the two dedicated local clusters, the retained production web configuration, the existing OAuth clients and usable client secrets, and the existing account UUIDs/password hashes. Preserve vault/signing seeds, installation IDs, component tokens, ownership, RLS and operational records. All exports/configuration belong in ignored owner-only `.data/postgres-cutover/`; never print or publish them. The public web app cannot use a Mac loopback database from Vercel. The whole-web profile now serves the canonical hostname through its exact tunnel route. The existing www deployment remains a verified canonical redirect only. Nova retains its separate narrow configuration and resource route.

The management Auth export's Google/GitHub secret fields are opaque 64-character fingerprints in this account, not usable credentials. `scripts/lib/account-providers.mjs` selects retained real material only for the exact existing client ID and rejects fingerprints before future preparation/drain. Both GitHub and Google now pass actual exchange while preserving existing account identity. Google's console no longer reveals its old secret; for future recovery the owner must add one in that same client and save it through `node scripts/capture-account-provider-key.mjs` on numeric loopback. The form is one-use, CSRF/origin bounded, expires after fifteen minutes and writes an owner-only file; restart/reload it if it expires. Never send a secret through chat. `refresh-providers` changes only selected provider secret settings and replaces only the exact owned Auth image, preserving its predecessor, JWT, SMTP and verification policy. Verify actual return afterward.

The local account services use the source-matched Auth v2.197.0 and pinned PostgREST v14.18 images. Auth connects as `supabase_auth_admin`, with its database-specific `auth,extensions,pg_catalog` search path. PostgREST connects as `authenticator` and exposes `public` internally. Both require the local database certificate, with `verify-full`; neither is a cluster superuser. The central database still listens only on numeric loopback. Docker Desktop reaches that private listener through its host gateway. These services restart through Docker, and the native account gateway restarts through the owner's login LaunchAgent.

`NEXT_PUBLIC_ACCOUNT_API_URL` and `NEXT_PUBLIC_ACCOUNT_PUBLISHABLE_KEY` select the browser endpoint. Server SDKs prefer `ACCOUNT_API_INTERNAL_URL`; the administrator client uses `ACCOUNT_API_SERVICE_KEY`. Browser and server SSR clients explicitly share `sb-galx-auth-token`, independent of their different transport hosts. Legacy environment names retain compatibility for separately reviewed historical configurations; the active configuration removes hosted aliases. Never put an administrator key in a public variable.

The generated local JWT signing secret is new; the management export does not provide the hosted signing secret. Existing accounts/passwords remain portable, but hosted browser tokens are not silently accepted by the new authority. Plan and verify sign-in recovery. Do not promise preservation of an existing browser session or successful external OAuth/email delivery from a database copy.

## Procedure

1. Retain the management Auth policy and production configuration privately. Inventory providers, MFA/SSO data, hooks, email and every database/Data API caller, including web, Nova, authority, Premium and jobs. Verify real provider secret material rather than trusting an export field. The replacement sender is now verified on Resend's observed Free plan, with a separate galx.ai-restricted sending key, implicit TLS on 465, and delivered owner-alias confirmation/recovery messages. Existing mail routing is unchanged. Keep verification enabled; do not use auto-confirmation to bypass delivery.
2. Run `node scripts/stage-local-account-services.mjs prepare`. It preserves required verification, social provider credentials, source password/session policy and bounded rate settings, creates local signing/public/service credentials once, and prepares TLS/configuration. Hosted zero session-duration values mean unlimited and must remain unset in GoTrue's optional duration fields. Positive hosted durations use seconds explicitly. No hosted data or live client changes occur.
3. On the first staging attempt run `start`, then `gateway`. The account containers bind only loopback 55111/55112; the native gateway binds 55110. `start` refuses existing containers. `replace` is preparation-only and checks exact image/ownership before stopping and retaining the predecessor. `start-final` requires the verified final-copy receipt and explicit local-authority activation. Synthetic preparation mutations must refuse this live phase. Provider-only refresh has its separate final-authority gate. Gateway code changes require restarting only `ai.galx.account-api`; no shared daemon restart.
4. Run `node scripts/test-local-account-services.mjs`. It is fenced to the preparation phase, creates one confirmed `example.invalid` canary without sending mail, and exercises password identity, JWT authority, verified user lookup, claim-bound liveness, forgery/admin denial, refresh, logout/revoked refresh and OAuth initiation. Cleanup soft deletes the canary through Auth. Immutable operational account links are intentionally retained; never disable their guard to hard delete a fixture. Acceptance is written only after cleanup succeeds.
5. Run `node scripts/stage-local-relay-databases.mjs prepare`, then its `central-transport` and `vm-transport` checks. The prepared files preserve all existing cryptographic/component identity and change only database placement/CA. The VM transport installs only the known narrow firewall variant, atomically, and probes its own scoped TLS database while denying central DB, Mac SSH and direct central access. Default isolation installation retains either exact known policy; `--hosted-database` explicitly restores the known earlier variant. Do not apply a live runtime/config/image-manifest switch during a probe.
6. Retain production web variables using the existing Vercel project, then run `node scripts/prepare-account-web-config.mjs`. It selects declared application authority, preserves exact vault/audit seeds and current storage/billing/Sites configuration, replaces DB/account transport and prepares public build inputs. `prepare-nova-database-config.mjs` preserves Nova's original signing authority while selecting the fixed native central destination. The full-web profile may hold its existing scoped publishing credentials; Nova rejects those and unrelated billing/storage/admin authority. General cloud management/process injection remains refused.
7. Use the pinned clean build/package commands from [Mac hosting](mac-self-hosting.md). Run whole-image acceptance before `plan-account-migration`, which uses a distinct project and loopback 17788. Public runtime inputs must match the build hashes. Then run `node --import tsx scripts/test-local-account-web.ts` against that private candidate. It uses actual SDK cookie/login/refresh/logout traffic, private Auth and database liveness, protected workspace entry, public administration/origin denial, OAuth browser navigation and callback error sanitization. It sends no real email and does not complete an external provider login.
8. The exact `https://galx.ai/auth/v1/callback` URI is saved in both existing clients; old callbacks remain and wildcard matching is off. Registration, usable secret material and actual provider return/code exchange are separate gates. Email transport/delivery and actual token verification passed independently. The seven-check owner-alias email workflow is preparation-only, immutable and cleans up its temporary account; never run it on live authority.
9. The one-time central operator is `scripts/migrate-central-local-database.mjs`: drain, fence, copy, activate, with private phase receipts. It suspends only the relay restart owner, drains owned clients, and commits statement guards on 195 data/session tables before the final snapshot. Supabase protects platform logins from NOLOGIN, so a role fence alone is insufficient. The sole excluded table is Auth's platform version marker. Paired bounded operator SQL lives under `deploy/postgres-cutover/`, outside application migration history. Source reversal disarms the owned function before local writes; native peer administration removes imported guards after restore. Both paths were rehearsed with all DDL rolled back. Keep clients stopped through the fresh empty-destination restore, hash/owner/effective-ACL/RLS comparison, cleanup and role/TLS regeneration. Retain the preparation database separately. Inspect every interrupted phase; never replay a drain, source mutation or restore blindly.
10. Mark the phase non-preparation before starting local authority. Switch reviewed central image/configuration, start Auth, resume web, stage native Nova and restore the existing supervisor. `configure-local-account-ingress.mjs inspect` retains exact DNS/routes; apply changes only canonical web and the existing narrow Nova route, preserving unrelated routes and www's canonical redirect. Node fetch ignores custom Host headers; use raw HTTP for private virtual-host acceptance. Compare Cloudflare readback semantically because field order can change. Verify actual rendered pages, linked browser assets, account/provider entry, signed-in workspace/API content with retained hosted cookies, Connect identity, permissions and object artifacts. Execution/settlement acceptance remains separate when provider sessions are expired.
11. Select native developer transport with `select-native-development-database.mjs`; it retains the original source environment privately and removes hosted transport aliases. Take consistent encrypted off-device backups and rehearse downloaded recovery. Contain direct old callers and retire hosted resources only after accepted data/traffic and exact retention/deletion review. Source write guards do not block reads or stop billing. The paid organization has a separate subscription; deleting its projects alone is not a zero-billing claim.

### Completed central copy and current serving authority

The final frozen source verified 196 tables / 7,870 rows, owners, effective ACLs and RLS. Source guards were removed only from native central; the hosted copy retains its durable write guard. Native Auth, PostgREST, central authority, web and Nova are active, and the original relay supervisor is restored. Thirty relay isolation/authorization/TLS checks pass. Actual GitHub return preserves the existing UUID and creates a native session. The initial public scan passes 65 checks/38 assets; cache acceptance passes 38 checks and actual exhibition delivery passes five pages/30 sanitized artifacts. The subsequent corrected image passes all 44 whole-image checks and actual existing-owner Library/Favorites acceptance, including after source pause. Google return subsequently passed on October 18 with the original Google identity, account UUID and a fresh native session. The cutover record owns those correction and cost-stop observations.

Once any local write is accepted, do not disarm the source guard, rerun the copy, restore the preparation database over live central, or use old source credentials as a fallback. The default synthetic Auth commands now refuse the live phase. Keep source snapshots as dated evidence rather than claiming ongoing equality.

### Central cost stop and optional permanent retirement

`node scripts/retire-central-hosted-database.mjs review` is read-only except for
its private review receipt. It requires live native traffic, accepted public and
existing-owner Library checks, a fresh verified 196-table off-device recovery,
the exact source identity, 195 effective guards, rollback-only write denial,
unchanged frozen source table hashes, preserved account UUIDs, and no hosted
functions, active jobs or Storage/Vault data outside the copied scope. Unexpected
data or hash drift stops the review. The original organization must contain
only the named remaining project before proposing its later plan downgrade;
unrelated projects require a separate scope review. Report any still-pending Google credential
handoff explicitly; GitHub acceptance is not Google acceptance.

Permanent deletion is not required to stop operating the obsolete source. The
selected cost-stop path downgrades the original organization from Pro to Free,
then pauses only GALXAI. Review the downgrade's quota/add-on/template effects;
source policy/templates are privately retained and native SMTP/configuration do
not change. Native production must already be accepted and the organization
must contain no unrelated project. Retain invoices; cancellation does not erase
prior usage or authorize paying an outstanding invoice.

After the dashboard verifies **Free Plan**, retain that fact in the private
`central-hosted-cost-stop.json` receipt, then run
`node scripts/retire-central-hosted-database.mjs pause`. It repeats the native,
recovery, frozen-data and exact-source gates, requires the Free receipt and
active source identity, records submission, and sends one documented Management
API pause operation. Only observed `INACTIVE` completes the receipt and marks
`hostedProjectPaused` for the exporter guard. If acknowledgement/transition is
uncertain, use `inspect-pause`; that reads status and never repeats the POST.
Do not resume this stale source or treat its paused copy as a serving rollback.

The separate active-source `retire --approved-project mazhcjisettrzbqhorvp`
operation is prepared for an explicitly approved permanent deletion, not executed
by pause. Prior Premium deletion approval is a different scope. This destructive
path requires a fresh valid review and verifies absence after DELETE. Once the
source is paused, do not resume it merely to satisfy the active-source review;
any later permanent cleanup needs a separately reviewed paused-source proof.
Preserve native databases, recovery objects, OAuth clients and the external seed.
The [billing FAQ](https://supabase.com/docs/guides/platform/billing-faq) and
[subscription procedure](https://supabase.com/docs/guides/platform/manage-your-subscription)
describe the distinction between pausing, cancelling Pro and historical usage.

### Completed Premium database switch

`scripts/migrate-premium-local-database.mjs` retains its phase receipt in `.data/postgres-cutover/premium-cutover.json`; the current phase is `verified-local`. Its inspect/drain/fence/copy/activate/verify sequence stopped only the execution runtime, preserved its `/state` and desktops, disabled the hosted execution login, closed its idle source connections and made a final consistent copy. The fresh local database verified all 30 tables / 144 rows, privileges and TLS before the reviewed native image/config was installed. The original supervisor was restored; current ownership, monitor authorization and actual database TLS pass 30 checks. That earlier Premium operation left central and ingress unchanged. The later central operation above activates both: central's separate `phase.json` is now `central-local-authority` with public traffic; it is not the Premium cutover receipt and must not be reset to preparation.

Do not rerun the copy on a live local database or enable the old hosted writer. The old local preparation database is retained under a distinct name. Post-cutover backup restoration passes. `scripts/verify-premium-local-execution.mjs` retained a blocked capability preflight: no generation was submitted. Both registered provider sign-ins had already expired before the drain; manual renewal through the owning desktop and explicit reconnect is required for generation acceptance.

After owner approval, `scripts/retire-premium-hosted-database.mjs` uploaded the authenticated encrypted archive to existing private R2, downloaded/decrypted it and restored all 30 table hashes/owners/RLS in a disposable database. Hosted Premium was deleted and absence verified at 21:10 UTC. Do not call that retired source or rerun its copy. The preceding preparation/review receipts remain dated evidence. This database archive excludes VM disks, queues and some component secrets. Keep the external vault-seed recovery source available; never retire it without a replacement key-recovery path.

## Public account boundary

The application publishes only fixed `/auth/v1/` operations and the exact parameterless boolean session-liveness RPC. Auth administration, arbitrary tables/RPCs, internal health and unknown paths are not public transports. Browser OAuth/provider/email GET navigations may omit an API-key header; Auth still verifies state or the email token. All other operations require the configured public key, and ordinary account tokens cannot administer Auth.

The handler validates canonical/same-origin intent, bounds bodies/time, forwards explicit request headers once without retries, sanitizes error codes/messages and applies user/session DTO allowlists. It discards operational headers and cookies. Redirects are limited to fixed provider authorization paths or authored first-party callback/root paths; first-party query/fragment fields are allowlisted and failures reduce to a finite error. Internal PostgREST/Auth objects are never forwarded wholesale through the public application. Existing owner-bound session liveness, admin authorization and public/private error boundaries remain required.

## Stop conditions

Stop on missing email delivery, an unaccepted provider callback, identity/key/config drift, failed TLS/permission/HTTP acceptance, unexpected platform data, an incomplete writer freeze, a stale snapshot or an uncertain drain. Never enable auto-confirmation, remove account-retention guards, disable TLS validation, expose raw PostgreSQL, reuse a Premium principal for central, or accept cached browser identity to pass a gate. The private preparation phase must be marked non-preparation before the new authority accepts live traffic; the synthetic Auth mutation commands must then refuse it.

## Recovery and rollback

During an uncoupled preparation, retain active source configuration and stop only owned candidates when diagnosing. After this cutover, the retained central source is write-guarded and Premium's source is deleted. Restore a compatible native image/configuration through an explicit reviewed plan; retain previous package/config/image receipts and preserve unrelated Mac services. Never silently reuse a mutable tag or restart a shared daemon.

After local writes are accepted, a hosted snapshot is stale. Contain admission, retain accepted and uncertain records and reconcile before moving a writer. Do not repoint to Supabase as a quick rollback or apply unrelated migration DOWN files. Keep account, object storage and relay execution recovery scopes separate; same-disk archives do not prove device-loss recovery.

## Verification and evidence

Run configuration, destination mapping, public account DTO/HTTP, auth/workspace, self-hosting and database integration suites, TypeScript and the pinned production build. Scan compiled public artifacts and later the actual served pages/assets/headers; build success is not live-site acceptance. Keep source/config/image hashes and credential-free named results in a new dated release record, with email/provider/public/final-sync/retirement limits explicit. Reconcile owning guides and documentation review/sync/checks. No review fingerprint authorizes live activation.
