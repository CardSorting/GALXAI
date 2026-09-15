# Install the central authority and isolated relay services

<!-- docs-scope: current-guide -->

## Purpose and trigger

Owner: Relay operator. Use this private runbook for the Premium/Standard service release under [ADR 0153](../adr/0153-central-account-authority-isolated-relays.md). It supersedes the staging-only image procedure for serving deployment. The old `staged-20260915` images remain deliberately closed. The original five `candidate-20260915` images are the service baseline; local operation uses the reviewed image set in [local images](../../docker/relay-pools/local/images.json), including the management central/monitor images and both `tools-20260915` runtimes. Premium's preceding `candidate-20260915` and Standard's preceding `recovery-20260915` runtimes are retained as rollback artifacts.

The [original service release](../../post-mortem/releases/2026-09-15-relay-services.json) distinguishes applied databases, implemented/tested source and built images at its closed-gate observation. The owner subsequently selected local Docker operation. Follow the local procedure below for that installation; externally hosted operation still requires two SSH targets and a private central HTTPS origin. Neither host installation nor manual registration establishes provider generation readiness.

## Authority and prerequisites

| Component | Authority and state |
| --- | --- |
| Central service | Main project `mazhcjisettrzbqhorvp`; canonical accounts, encrypted credentials, manual enrollment, exclusive immutable assignment, lifecycle operations and the existing account lease/budget ledger |
| Premium runtime | Its assigned paid accounts only; text, Sites and images; execution database `prgjcyokylzcsqrjmkaa` |
| Standard runtime | Its assigned free accounts only; text; execution database `enbtzuxkguehtnrhuvlu` |
| Premium monitor | Fixed Premium operator/viewer sessions and narrow registrar handoff; own sign-in desktops |
| Standard monitor | Fixed Standard operator/viewer sessions and narrow registrar handoff; own sign-in desktops |

Both execution projects contain only a fixed identity and execution reservations/outcomes with opaque central references. They have no account registry, credentials or second capacity ledger. Main-project accounts are never copied into them. Pool and installation scope come from a hashed central principal, not request JSON, a browser selector or a session variable. The two intended text catalogs are the same; actual account access must be verified. Provider account class is separate from GALX customer billing tier.

The full schema, management and health contract is [account and registration management](../reference/relay-account-management.md). Each runtime hosts an in-process engine per eligible account inside its own container; it has no Docker socket and does not create per-account worker containers.

Use three trust boundaries: a private central service and two dedicated Linux hosts/VMs with **different Docker daemons**. The monitor needs its own host's Docker socket for manual desktops. That socket is powerful host authority, so two Compose networks on one daemon are insufficient. Docker documents both [daemon access implications](https://docs.docker.com/engine/security/) and [per-service secret mounts](https://docs.docker.com/compose/how-tos/use-secrets/). File secrets require restrictive host ownership readable by container UID 1000; they are not encrypted by Compose.

For the optional external-host procedure, required tools are Docker/Compose, Python 3, nftables, systemd, curl and SSH. Preserve working SSH access there. The selected local procedure below uses installed Docker Desktop/Colima and does not require external SSH targets. Enumerate every public/private IPv4 and IPv6 address for each execution host. Neither pool host receives the other's keys, profiles, database login, backups or config file. The central service receives no Docker socket. Its HTTPS endpoint must be private or access-controlled, with valid TLS; runtime database TLS requires the actual project CA and hostname verification. Get pooler URLs from Supabase connection settings; do not infer their hostnames from region.

## Procedure

### Local Docker operation on the owner's Mac

The local layout uses Docker Desktop for the central authority and TLS proxy, and Colima profiles `premium` and `standard` for separate Linux kernels, Docker daemons and disks. Each VM has two CPUs, 3 GiB memory and a 30 GiB data disk. Neither mounts Mac directories or forwards the Mac SSH agent. The Mac administrator and host remain a common trust boundary; this is local VM isolation, not separate physical machines. Colima uses one local user-mode network, so the guest firewalls enforce both direct peer denial and denial of peer services forwarded through the Mac.

The installation retains the same main-project account authority and two execution-only Supabase projects. Only the central container has the main database login and vault configuration. Both client-to-pooler database connections and the local authority connection verify certificates and hostnames. The local CA is trusted only by these service containers; no system-wide trust change is required. The authority's private key remains on the Mac. The authority HTTPS endpoint is `https://localhost:13443` from the Mac and `https://host.lima.internal:13443` from the VMs. It forwards only fixed central protocol routes, without upstream retries.

For everyday access, open **GALX Monitors** from the Mac menu bar, Applications or its Desktop shortcut. Choose **Open Premium** or **Open Standard**. The separate **GALX Premium** and **GALX Standard** apps are searchable in Spotlight and can be kept in the Dock. The two destinations remain fixed; the launcher has no account registry or combined browser session. The menu's **Monitor available** status describes its local HTTP listener, not execution or provider readiness.

The launcher follows the quick-access menu pattern documented by [Docker Desktop](https://docs.docker.com/desktop/use-desktop/#the-docker-menu). It uses native AppKit menus, keyboard equivalents and system symbols. Opening a shortcut starts its own stopped VM/services and the shared central dependency when necessary, verifies the accepted VM/daemon identity, absent host mounts, active isolation service and reviewed images, then requests a scoped browser ticket. Opening Premium does not start Standard. Concurrent startups serialize changes to the shared central stack. An unavailable central connection triggers one startup repair attempt; authorization is still required afterwards. No account action or inference request is retried by the launcher.

Cold startup brings the monitor up first, reads its centrally authorized last runtime heartbeat using a temporary session, and revokes that session. A stopped runtime waits until that heartbeat is more than 60 seconds old before starting with a new ownership epoch. Both own-pool listeners must become live before the browser launch is reported. This respects the existing central claim fence; the database still denies an active or competing owner. Invalid/future timestamps or mismatched installation identity stop startup. A first cold-start experiment reopened the monitor while its runtime correctly refused a premature claim; the corrected order waits for handoff instead of weakening that rule.

**Open at Login** is optional and initially off. It starts only the small menu app on the next login, not the VMs. Quitting the menu app leaves services running. Install or rebuild these local, ad-hoc signed apps with:

```sh
npm run relay:monitors:install
```

This requires macOS 13+, Xcode command-line tools, the existing local installation, and Node/Colima/Docker in the standard Homebrew/system paths. Apps go under the current user's `~/Applications`; the Desktop shortcut points to the menu app. The installation records this workspace path. Reinstall after moving the workspace. To remove the launcher, turn off **Open at Login**, quit GALX Monitors, and remove its three apps and Desktop shortcut. This does not remove accounts, VMs or service state.

The CLI remains available from the repository root:

```sh
npm run relay:local -- up
npm run relay:local -- status
npm run relay:local -- verify
npm run relay:local -- open premium
npm run relay:local -- open standard
```

`up` starts the existing VM profiles and the three component stacks. It preserves the active Docker Desktop context. `open` uses the same start-on-demand behavior as the apps and creates a one-use 60-second operator sign-in link in the default browser, without printing the ticket or storing long-lived keys in the browser. The browser consumes it automatically and immediately removes it from the address bar, including when reopening a previously authenticated page or reusing its tab. Switching to a viewer ticket revokes the prior operator session. Sign-out remains explicit; there is no automatic sign-in merely from visiting a plain monitor URL.

The monitors remain at `http://127.0.0.1:13311` and `http://127.0.0.1:13312`. Their signed-out/expired-link screens offer **Open Premium/Standard monitor**, using the fixed `galx-monitor://open/premium` or `galx-monitor://open/standard` app link. The app rejects every other destination, query, fragment, userinfo or port. Browsers may show their normal external-app confirmation. These links contain no credential. A fresh ticket still comes from the selected monitor after central authorization. Each opener writes only pool, time and a browser-launch-request flag to a private `*-last-open.json` receipt; that flag does not prove the browser completed sign-in. Runtime ports 13301 and 13302 remain loopback-only and require their distinct inference keys.

If an app cannot open a monitor, use **Try Again** after checking Docker Desktop and connectivity. If a process crashed during startup, the opener recovers a lock only when its recorded owner no longer exists. An uncertain or malformed lock, changed VM identity, missing image or isolation failure requires operator inspection; do not delete identities, disable isolation or substitute another pool's configuration. The CLI reports the owning failure without exposing subprocess arguments or credentials in the native error dialog.

`verify` checks actual VM/daemon identity, absent Mac file mounts, running-image matches, private container mounts, persistent firewall hook ordering, authenticated monitor roles, cross-monitor cookie denial, database TLS, and Standard Sites/image/provider-hosted-tool denial. It temporarily runs a credential-free listener inside each owning VM to prove a peer target is alive, then checks denial from the other VM and runtime. It removes its listeners afterwards. It writes private evidence to `.relay/service-deployment/local-acceptance.json`. This is a bounded local acceptance check; it does not qualify provider generation or turn on execution.

Manual registration is enabled centrally for the installed local monitors; execution remains closed. In each monitor choose **Register account**, prepare the desktop, manually sign in to the appropriate paid/free account, review access, and register it. The account is saved centrally in paused state. After both monitors contain a verified registered account, `npm run relay:services:gates -- serve-local` reruns actual local acceptance, checks both installation identities and registrations, and records the evidence hash before opening local execution. Enable the intended accounts separately in their own monitors and wait for acknowledgment, then qualify text/Sites/images as described below. The external-host verifier and `serve` command must not be passed fabricated SSH targets or local-loopback evidence. The public application is not pointed at these localhost URLs.

Stop the local installation with:

```sh
npm run relay:local -- stop
```

This stops both runtime/monitor stacks, the local central stack and the two VMs, freeing VM memory while preserving account records, desktop homes, state volumes and disks. `up` restores the services; monitor browser sessions need fresh opener links. Do not delete profiles, volumes or `.relay/service-deployment/authority.json` as a reset. The existing legacy Docker Desktop services are separate and are not stopped by these commands.

For reinstalling local component files, use `npm run relay:local -- install` only with the existing five narrow configurations and loaded reviewed images. It verifies separate identities, installs matching private files under `/opt/galx/config` inside each owning VM, and refuses a changed existing firewall policy. The local overlay takes each runtime and monitor tag from `docker/relay-pools/local/images.json`; the CLI verifies its exact image ID. Build, test, inspect and load replacements into only their destination VM before updating this manifest and reinstalling the overlay. Retain the preceding image and manifest as dated rollback evidence. Do not rewrite an earlier release record. The exporter uses Node's built-in environment parser and reads only the allowlisted vault settings. Preserve `.relay/service-deployment/local-tls` and its private permissions; the leaf certificate expires after one year. Renewal needs an inspected replacement and coordinated client trust, not disabled TLS verification.

For the function-tool update, build `premium-runtime` and `standard-runtime` from `docker/relay-pools/services-bake.hcl`, tagging each `galxai-relay-<pool>:tools-20260915`. Inspect the resulting image IDs and load each into only its owning Colima VM. Update the reviewed manifest, then run `npm run relay:local -- install`. With execution closed and no active work, stop `galx-premium-relay-1` on `colima-premium` and `galx-standard-relay-1` on `colima-standard`, then run `npm run relay:local -- up`. Startup waits for each central ownership fence; it does not replace an already-live runtime merely because the manifest changed. Preserve `/state`, credentials and assignments. Run `npm run relay:local -- verify` after replacement. Central and monitor images retain their pins. The [automatic-tool contract](../reference/automatic-agent-tools.md) describes client-owned callback execution and caller SDK distribution; the [scheduling contract](../reference/standard-relay-scheduling.md) retains Standard's one-job limit, fair rotation and paced recovery. Gates and real workload qualification remain separate from image updates.

The local nftables chains use priority **−150**, after connection tracking and before ordinary Docker filtering. A draft −210 rule interrupted SSH before credentials were delivered; it was corrected and recovered via Lima early-boot provisioning. Do not move connection-state rules before the connection-tracking hook. Colima's actual shared gateway is `192.168.105.2`; a conflicting per-profile gateway left Standard DNS stale during first setup and was reconciled to its saved configuration. Confirm DNS, central access and peer denial after a VM reboot or Colima upgrade. Colima profile configuration is documented in its [official configuration guide](https://colima.run/docs/configuration/).

### 1. Database and artifact preparation

`npm run relay:services:prepare` creates private immutable deployment identities under `.relay/service-deployment/authority.json`. Retain that file securely; regenerating it is not recovery. `npm run relay:services:provision` installs only the execution-context migration in an empty matching relay project, reserves central principals, and leaves gates closed. It refuses activated installations. The main migration set must already be applied through the [database procedure](../maintainers/POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md).

The September 15 main versions are `20260915073601`, `20260915081527`, `20260915163434` and `20260915191404`. The legacy guard blocks enrollment/refresh after assignment; the management migration adds registration revisions, retained removal markers and an immutable management journal. Apply the latter before installing the `management-20260915` central and monitor images. Both local runtimes use the later function-tool images without another migration; Standard retains its recovery scheduler. Each relay project has only `20260915082628` from `deploy/relay-execution/supabase/migrations`. Never push the main application migration directory to either execution project.

Build and verify:

```sh
npm run relay:services:build
npm run verify:relay:service-images
npm run test:relay:services
npm run test:relay:authorization-db
```

The default build tags are `galxai-relay-central`, `galxai-relay-premium`, `galxai-relay-standard`, `galxai-monitor-premium` and `galxai-monitor-standard`, all suffixed `:candidate-20260915`. This is the external-host build recipe, not the installed local manifest. For local updates, build under a new explicit tag and preserve the old reviewed artifacts; rebuilding an installed candidate tag causes the image check to reject it. Pin reviewed image IDs/digests at installation. Native ARM64 checks do not establish AMD64 execution; build and verify the destination platform separately. No registry push is implied by these commands. The desktop image is separately built from the existing desktop Dockerfile and must be supplied by its verified digest.

### 2. Export component-specific secrets

Copy [deployment-input.example.json](../../docker/relay-pools/deployment-input.example.json) to a private local path. Supply the real central HTTPS origin, project CA paths, actual direct/session-pooler database URLs and verified desktop image digest. The direct endpoints in the example require IPv6 connectivity. Then:

```sh
npm run relay:services:export -- /private/path/deployment-input.json
```

The exporter reads only the allowlisted central vault settings from `.env.local` and writes five mode-0600 files under `.relay/service-deployment/components/`. Passwords come from the previously provisioned restricted login roles. Only `central.json` contains the central database/vault keys; runtime files contain only their own execution login, central runtime token, inference key and private capability key. Monitor files contain only their pool's operator/viewer/registrar tokens and desktop configuration. Deliver each file only to its designated host. Do not source or copy root `.env.local` into a relay or monitor.

### 3. Install separate hosts and start closed services

On each dedicated execution host, run `scripts/install-relay-peer-isolation.py` as root with **all addresses of the peer**. It adds a dedicated nftables table covering input/output/forward, preserves other tables, and installs a systemd prerequisite before Docker. It refuses an existing installation for deliberate inspection. Verify a reboot preserves the policy; a running rule alone is not boot acceptance.

Use these files separately, on their intended hosts:

```sh
docker compose --env-file /dev/null -f docker/relay-pools/services.central.yaml up -d --no-build --pull never
docker compose --env-file /dev/null -f docker/relay-pools/services.premium.yaml up -d --no-build --pull never
docker compose --env-file /dev/null -f docker/relay-pools/services.standard.yaml up -d --no-build --pull never
```

Set each file's required config-path variables and the local Docker socket GID. Arrange secret ownership for UID 1000; do not make real keys world-readable. Each runtime has its own state volume, read-only root, dropped capabilities, no Docker socket, resource bounds and restart policy `no`. Each monitor has its own desktop state and daemon. There is no peer service discovery or shared volume. Stop and inspect a startup failure instead of adding missing authority from another component.

Expose central port 13300 and runtime ports 13301/13302 only through the designated private TLS reverse proxy. Preserve streaming and disable automatic POST retries at the proxy. Keep monitor ports 13311/13312 on loopback and reach them with separate SSH tunnels; never publish them through the customer site. Restrict central/runtime ingress to the authorized service callers and forbid proxy access to the peer origin from pool hosts. Liveness returns only `{ok:true}`. Readiness stays unavailable until fresh central authorization and an enabled worker exist.

### 4. Open manual registration and inspect each monitor

Once central and both fixed monitors are installed, `npm run relay:services:gates -- registration` opens central registration while execution remains disabled. To get a one-use 60-second local sign-in URL:

```sh
npm run relay:monitor:open -- premium /private/path/premium-monitor.json operator
npm run relay:monitor:open -- standard /private/path/standard-monitor.json viewer
```

Run on the host or through its matching localhost SSH tunnel. Keys never enter browser storage or URL parameters. Browser sessions are separate, HttpOnly, SameSite Strict, expire after 12 hours and recheck central authority. Read-only sessions cannot prepare desktops or mutate accounts.

Each console has three focused views: **Accounts · Registration · Activity**. The selected navigation item and destination stay visible. Accounts is the default; existing `#overview` links resolve there. Account search, Status and Health filters combine against the authorized snapshot, with **Issues first** or **Name A–Z** sorting, a result count and **Clear filters** recovery. Status includes Removed; the default excludes removed records. **Show issues** selects accounts needing attention. Registration has its own name search and filters for active, attention, in-progress, ready-to-register, registered, unknown and removed records. Filtering never fetches another pool.

From an empty account list choose **Register your first account**. Otherwise use **Register account**, or **Add account** within Registration. Enter a recognizable name and create its desktop. Each saved registration then shows its current **Sign in → Review access → Register** step. Start sign-in explicitly, open the desktop, and complete the provider flow manually. A valid desktop ticket connects automatically; **Back to registration** returns to the monitor. Review access to verify the paid/free classification and expand **Available models** before the final **Register account** action. An already completed manual sign-in can be reviewed through **More options**; a saved desktop login alone is not central review evidence. Registration saves the account centrally in **paused** state. Enabling is a separate explicit action. A wrong account class is rejected. No host credential scan or automated provider-token renewal runs. A later manual sign-in can be saved through the same bound registrar ticket. Tickets expire after two minutes; review evidence expires after five minutes. The browser retains a prepare intent in session storage when available so a same-name retry uses its original registration/desktop IDs. Account actions similarly retain their exact ID/body for an explicit retry against the same saved revision. No mutation is automatically retried after a lost response; refresh first to inspect the centrally saved outcome. Changing the name or desired command creates a new intent.

Completed registrations are collapsed under **Registered accounts**. An account’s **Update sign-in** or **Sign-in settings** link opens its matching registration. Complete a fresh manual sign-in in that same desktop, then use **Update saved sign-in → Save new sign-in**. A stopped desktop offers **Start desktop**. **More options → Stop desktop** (or the completed registration’s update disclosure) confirms before disconnecting a desktop and preserves its files and saved central account. Start/stop requests contain only the registration ID; the server resolves the owning desktop through central authorization before the action. It never accepts a substitute desktop ID. Starting or stopping a desktop does not enable, revoke or renew an account. If the image or Docker is unavailable, restore the local service and refresh; do not copy another pool’s configuration.

Accounts separates **Saved state**, **Relay confirmation**, and **Health**. Applied requires a non-future heartbeat under 45 seconds old, matching revision and matching epoch. Health pairs an icon and label with a reason: expired sign-in, unavailable access, cooldown, repeated failures or an overdue update. A saved change awaiting confirmation for at least 90 seconds needs attention when execution is allowed. Connection loss or an absent relay is unknown health, not proof of an account failure. **No issues detected** describes available metadata; it does not certify provider generation. A stopped desktop is normal for a registered account; an unfinished registration instead receives a desktop recovery action. Enable requires current sign-in, a fresh relay, the execution gate open and no attention condition. This is an interface guard, not a replacement for server authorization. Pause remains explicit.

Use the consistent **Manage** menu on an account or registration:

| Action | Outcome and recovery |
| --- | --- |
| Rename | Save a recognizable name of 1–64 characters. Registered account and linked registration names change together. Unfinished registrations keep their own name. |
| Remove registration | Cancel pending review/tickets, hide it from active results and request that its own desktop stop. History and desktop files remain. Under **Removed → Manage → Restore registration**, restore an unfinished registration, then review its sign-in again. |
| Remove account | Revoke central account access, cancel linked registration tickets and remove both from active results. The registered account cannot be restored or enabled again. Ownership, credentials, leases and audit history remain retained. |

Removal opens a named confirmation dialog explaining the consequence, with initial focus on Cancel. Central removal commits before the monitor disconnects its active desktop sessions and attempts to stop the desktop. A failed stop does not reverse or conceal the saved removal: the notice explains cleanup is incomplete, and the removed registration offers **Stop desktop**. Restore never restores a previous review or ticket. No removal deletes desktop files or claims to invalidate a provider session remotely. Removed records reject new start, sign-in, review and registration actions. Direct desktop controls and new display connections also check the centrally scoped registration, preventing an already-open page from restarting a removed desktop. Stop remains available for cleanup.

Rename dialogs keep input on error. Every management action carries the displayed revision; a concurrent change returns a conflict instead of overwriting it. Close the dialog, refresh, then inspect the current record before explicitly retrying. Same-intent retries reuse their operation ID/body when session storage is available. A lost response never triggers an automatic mutation retry. Activity includes rename, removal and restoration alongside account state changes; it reports saved outcomes, not proof of runtime application. Viewers can filter and inspect without management controls.

The monitor polls every ten seconds while visible. Refresh preserves filters, expanded disclosures and record/action focus. In-flight actions are locked by record identity across refreshes. Connection failure preserves the last confirmed snapshot, disables mutations and offers Refresh; first-load failure states that no update is confirmed. Requests have a bounded wait and uncertain actions require reconciliation. The monitor never starts provider sign-in, reviews account access or submits generation merely because a page was opened.

### 5. Verify isolation and open execution

Fill [host-input.example.json](../../docker/relay-pools/host-input.example.json) with the two SSH targets, complete address sets and reviewed running image IDs. `npm run verify:relay:hosts -- /private/path/host-input.json` reads actual host/daemon identities, persistent firewall rules and container configuration, then tests peer HTTPS denial from host and runtime. It writes private evidence. This verifies the listed addresses and rules; infrastructure routing, proxy paths and reboot acceptance still need the owning host/network review.

`npm run relay:services:gates -- serve /private/path/host-input.json` reruns those live checks before setting the central execution flag with the evidence hash. Enable the intended manually registered accounts in their monitors. Wait for the owning relay to acknowledge the same account and credential revision. A saved state is not an acknowledgment, and neither is proof of upstream session revocation.

Qualify Standard text and Premium text/Sites/images through their own runtime keys and mandatory idempotency keys. Standard must make zero provider calls for Sites, images and provider-hosted tool aliases. Both pools can return structured client-owned function calls; the caller executes them and submits the matching results under a new model-step identity. Premium's first image request is an explicitly requested trial under its own central image grant; it never probes automatically. Availability reports only observed image capability, not plan-based promises. Preserve failed/uncertain requests; never replay them through Standard. Real image acceptance remains separate from the passing synthetic image fixture.

### 6. Connect the application deliberately

The application supports `GALX_ISOLATED_RELAYS_ENABLED=1`, `GALX_PREMIUM_RELAY_URL/KEY`, `GALX_STANDARD_RELAY_URL/KEY`, and `GALX_TEXT_RELAY_POOL=standard|premium` (default Standard). Both origins and keys must differ. Configuration is server-only. Text stays in the selected deployment pool even on failure; Sites and images always select Premium. It bypasses application account selection/decryption and a second account lease; the relay acquires the existing central account lease. Existing customer quota, Sites fair usage and billing policy remain separate.

Set `GALX_SITES_RELAY_ADMIN_KEY` to Premium's distinct capability key for the private Sites preflight. Existing Sites rollout/access controls still apply. Transport and receipt reads carry a hash of the server-verified owner. Specialized privacy profiles remain unavailable until separately qualified; configuration does not invent supplier guarantees. Keep original origins and recovery readers for old operations; changing a relay URL cannot relocate an accepted job. Deploy the compatible application only after own-pool qualification, and verify customer response/authorization contracts and actual billing/usage delivery before opening traffic.

## Stop conditions

Stop on any shared host/daemon identity, missing peer address/rule, unexpected mount, equal endpoint/key, wrong database/installation, inaccessible central authority, stale acknowledgment or failed manual classification. Do not add an owner/service key to a runtime to resolve an error. Administrator/runtime credentials are distinct. Standard's capability rejection is permanent for that request, not a signal to retry elsewhere.

## Recovery and rollback

Central grants last 30 seconds, renew every eight seconds, and have an independent expiry timer plus a ten-minute central maximum. A failed renewal aborts active upstream work. Runtime ownership heartbeats expire after 45 seconds and a new epoch cannot take over until the prior owner is stale for 60 seconds. No new grants or refreshes are issued during central outage.

Execution identity is persisted before acquisition and bound before provider I/O. Terminal writes and original lease settlements retry; while a terminal write is unconfirmed, new local admission stops. A crash recovers old in-flight records as unknown, never as permission to redispatch. A crash between central acquisition and local binding may leave a lease to expire; it cannot start duplicate work. Retain canonical leases and execution records for investigation.

Pause/revoke/remove changes central revision, blocks renewal and stops the owning in-process account engine. This differs from the retained controller's worker-preserving maintenance hold. Credential material already delivered upstream is not remotely invalidated by a database write. Stop/fence the owning desktop/host or revoke the provider session when hard revocation is required. Historical artifact/receipt access after worker removal or epoch replacement can remain unavailable; records are retained, and uncertain execution is never retried automatically. There is no cross-host job migration.

Use `npm run relay:services:gates -- close` to deny registration/execution, then wait for grant expiry and verify worker shutdown. Stop only the matching Compose stack. Preserve its volumes, manual desktop homes, central assignments and receipts. Paired rollbacks retain identities/history and close protocol access; they do not restore broad writers or account borrowing. Do not revert to an application that routes assigned accounts through the legacy path.

The management rollback closes both gates and revokes the control protocol while retaining its columns and immutable journal. It does not undo revocation or restore removed accounts. Close services before restoring the preceding central/monitor image pins from the dated console evidence; reopen only after a compatible migration and fresh acceptance. An image rollback alone does not undo central state.

Function-tool rollback restores the preceding own-pool runtime pins: Premium `candidate-20260915`, Standard `recovery-20260915`. Reinstall the overlay and replace the affected runtimes while execution is closed. Preserve state volumes and ownership waits. The preceding runtimes do not support this client-owned function-call contract; restore compatible caller behavior and requalify before enabling execution. Do not roll back central schema, discard cooldown checkpoints, reset budgets or replay unknown work. Standard's still-earlier rotation image remains dated historical evidence.

## Verification and evidence

The [automatic-tool release](../../post-mortem/releases/2026-09-15-automatic-agent-tools.json) records the new SDK/transport contract, both installed runtime pins, synthetic tool-chain checks and local acceptance. It does not certify a published SDK, public cutover or real provider function support.

The [Standard recovery release](../../post-mortem/releases/2026-09-15-standard-relay-recovery.json) records the follow-up audit, final runtime pin, clock-independent ordering, paced probes, corrected quota recovery, cancellation/freshness checks and local acceptance. The [prior rotation release](../../post-mortem/releases/2026-09-15-standard-relay-rotation.json) retains its original source, tests and image pin. The existing state volume and ownership fence are retained; provider qualification and public application cutover remain separate.

[Release evidence](../../post-mortem/releases/2026-09-15-relay-services.json) records schema counts, role checks, native image IDs, source/HTTP/database tests, production build and local UI scope. Security advisors found no issues in either execution project; the main project's existing leaked-password-protection warning is independent of this feature. New private tables have forced RLS and no application-role table grants. Candidate source tests and synthetic browser fixtures do not establish production provider capability or physical host isolation.

The [account management evidence](../../post-mortem/releases/2026-09-15-relay-account-management.json) records the central migration, installed central/monitor images, health filtering, rename/remove/restore, conflict recovery and desktop cleanup. The [earlier console evidence](../../post-mortem/releases/2026-09-15-relay-monitor-console.json) retains its original image pins and focused-view acceptance. Management uses [Primer deletion conventions](https://www.primer.style/product/scenario-patterns/delete/) and [Cloudscape status indicators](https://cloudscape.design/components/status-indicator/) within the existing design system.

Run `test:relay:services`, `test:relay:authorization-db`, `node --test scripts/test-relay-monitor-model.mjs` and `npx tsx scripts/verify-relay-pool-monitor.ts` after management changes. The synthetic browser fixture covers both monitors, filters, rename conflicts, removal, failed-stop recovery, restore, access and sign-out. It records 28 responsive/accessibility variants under `.impeccable/review/relay-management`, including confirmation dialogs. It does not sign in to a real provider. `test:relay:access` owns launcher destination/credential boundaries; native launch dispatch and local service acceptance require separate actual-Mac evidence. The original reviewer scores and prior captures remain historical.

Operational account pages and their scripts are session-protected and excluded from the customer build. Only the local sign-in shell, access styling and ticket bootstrap are available before monitor authentication; none contains account data or long-lived keys. Keep all topology, credentials, receipts and diagnostics private. Public JSON uses nested allowlists; image responses default to freshly re-encoded binary, with explicit base64 JSON compatibility.
