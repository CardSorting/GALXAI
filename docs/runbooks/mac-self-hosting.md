# Operate Mac-hosted web and Nova

<!-- docs-scope: current-guide -->

Private release-operator runbook. [Current state](../../post-mortem/CURRENT_STATE.md) records active placement. Canonical web/Media/Connect and separate narrow Nova now run on the owner's Mac against native central data/Auth. The [October 17 cutover record](../../post-mortem/releases/2026-10-17-central-native-cutover.json) owns activation, account corrections and limits. The October 3 [transition](../../post-mortem/releases/2026-10-03-nova-mac-transition.json) and [origin correction](../../post-mortem/releases/2026-10-03-mac-origin-transport-correction.json) remain dated evidence for preceding Nova-only placement; their unchanged-byte observation does not certify a later image.

A verified archive or healthy startup cannot authorize staging without its matching successful acceptance receipt. Operator commands do not grant new cohort membership or change public routes. Follow the [transition runbook](nova-hosting-transition.md) for separately authorized future changes.

The October 17 [account migration](local-account-migration.md) uses `plan-account-migration` for whole-web authority and `plan-nova-native` for Nova's separate narrow profile. Both preserve canonical issuer/resource, signing seeds and exact permissions. Initial final-copy/public switch is complete; Google secret recovery/actual return and mixed-cookie Library correction have separately recorded acceptance. Plans/staging do not themselves change ingress; their output does not determine whether a running listener is publicly routed.

## Purpose and trigger

Use this procedure to package, inspect, rehearse, stage, stop or resume the accepted Nova runtime without a new hosting subscription. Success means a retained immutable release and verified request-lifecycle behavior; each new candidate still needs its own acceptance. A green Docker health indicator is application liveness, not successful authentication, provider availability, database durability or rollout approval.

Use one operator entry point:

```sh
node scripts/self-host.mjs --help
node scripts/self-host.mjs doctor
```

Both applications stay in `desktop-linux`, outside the Premium provider/desktop daemon. Native central owns account/application data; Premium uses its separate native execution cluster. Exact canonical ingress reaches web; only authored Nova resource paths reach its separate container. R2 authority stays with web, never Nova. The retained www Vercel deployment redirects canonically. No self-host command changes DNS/routes, grants, schema, provider accounts or Vercel; the separate inspected ingress operator owns routing changes.

## Authority and prerequisites

The release operator needs the retained accepted build, its provenance and archive, Docker Desktop, sufficient local disk, and an explicit private runtime configuration file. Do not use the generic root Dockerfile or silently rebuild during packaging. Source changes require an explicitly identified clean candidate under the [canonical build procedure](../VERCEL_DEPLOYMENT.md#canonical-clean-hosted-package). The current accepted Linux x86-64 dependencies run under emulation on this ARM64 Mac; a native rebuild is a different artifact requiring acceptance.

Read [Connect authority and revocation](../operations/galx-connect.md), [application configuration](../VERCEL_DEPLOYMENT.md), and [local provider operation](relay-pool-services.md). Keep the existing account, entitlement, capacity, provider-health and unknown/no-replay contracts. Do not install another process watchdog alongside Docker's restart owner.

The Mac must remain powered, awake, signed in and connected, with Docker Desktop running. `doctor` observes an existing sleep-prevention assertion; it does not install one, prove closed-lid availability, guarantee automatic login after reboot or test a power outage. Do not change global power or FileVault settings to hide these limitations. Two containers or tunnel connectors on this Mac still share its failure domain.

**Operator restriction: test the service without disrupting the workstation.** Do not reboot, shut down, sleep, power-cycle or log out the physical Mac, disrupt its network, exhaust host storage, or restart a shared daemon/ingress that interrupts unrelated work. Do not change system-wide power settings. Physical-host drills are **UNVERIFIED — DEFERRED BY OPERATOR**. Documented startup surviving a normal reboot is only a provisional operational assumption for continued controlled development; it is not acceptance evidence or a production-readiness claim.

## Procedure

### 1. Retain the package

Use fresh output directories. The accepted-build argument is the directory containing `app/`, `provenance.json`, `artifact.json`, `artifact-manifest.json`, `build-canaries.json` and `hosted-candidate.tgz` from the established clean build. These inputs must be retained; a mutable working directory is insufficient provenance.

```sh
node scripts/self-host.mjs package <accepted-build-directory> <new-package-directory>
node scripts/self-host.mjs verify <new-package-directory>
node scripts/self-host.mjs build <new-package-directory>
node scripts/self-host.mjs verify <new-package-directory>
```

`package` checks source hashes, the accepted archive and mapped application bytes, copies Next output traces and public assets, and adds the declared startup helpers. The acceptance receipt is bound to the image, package manifest and combined runtime-test/fixture hashes. `plan` refuses an image without a matching successful whole-image rehearsal. This is a local preparation gate, not public rollout acceptance.

A serverless trace can omit the persistent Next startup module: the command separately traces `next/dist/server/lib/start-server.js` using the accepted Next version's own tracer inside the pinned target Node image with networking disabled. Framework trace warnings are retained as a count and require runtime acceptance; trace generation alone is not proof that every optional integration works.

The package refuses trace escapes, symlinks, modified candidate payloads, private workspace paths, build-only secrets and selected private markers in public assets. It contains neither the original source workspace nor arbitrary `node_modules`. Application bytes remain unchanged from the newly accepted build. It retains the build's Next configuration and standard startup; no compiled-file edits, framework patch or replacement server is used. The bootstrap selects the explicit origin policy below. A Docker build uses only this allowlisted context, a pinned base image and no build network; it does not compile or install dependencies again.

The package retains `manifest.json`, the exact image ID and a reloadable `image.tar` with its SHA-256. `verify` checks every file plus the retained image archive. Retain a protected reloadable package and compatible previous release. The controlled transition verified the local archive; independent-storage restoration remains an availability follow-up. A local archive on the same Mac is not a disaster-recovery backup. Do not run global Docker pruning or delete failed acceptance evidence.

### 2. Rehearse before staging

Run the container acceptance using the retained package and its original public build inputs:

```sh
node --test scripts/test-self-host.mjs
node --import tsx scripts/test-self-host-runtime.ts <package-directory> <public-build-inputs.json> <new-evidence-directory> <accepted-build-directory>
npm run test:connect
npm run test:relay:services
```

The runtime test creates a uniquely labeled internal Docker network, disposable PostgreSQL data in tmpfs, synthetic accounts/grants and a fixed provider fixture. The fixture anchors a shared network namespace so the application can use authenticated HTTP loopback and an authenticated database TCP bridge on numeric loopback, as the existing plaintext destination policies require; plain Docker hostnames are correctly rejected. The application retains separate process, filesystem, configuration and resource limits. This test-only placement preserves reachability across application restart and is not a production topology change. A test-only TCP entrance exposes those fixtures solely to host loopback; the application, provider and database have no public egress. It loads the existing migrations into that disposable database only. Cleanup verifies ownership labels before removing resources and removes the temporary configuration file. No production database URL is accepted from the environment.

When earlier checks pass, the full deadline test takes five minutes. It sends SIGTERM while Nova is active and verifies terminal persistence before process exit. It also exercises an abrupt application-process crash: abrupt loss cannot commit terminal work, so the original retained record must remain honest and a repeated request must be denied without another upstream attempt. Restart recovery must not rewrite execution history.

A remote reader cancellation acknowledgement must not hold local terminal
delivery or shutdown open. Run the Nova and relay hung-ack regressions when
changing this boundary, then require a fresh whole-image receipt. Capture both
stdout and stderr with fixture secrets redacted and selected exit/SQL state on
failure. A deadline or forced-stop failure is retained evidence, never a reason
to shorten the 300/480-second budgets or skip the gate. See
[FM-DEPLOY-005](../../post-mortem/failure-modes/deployment.md#fm-deploy-005--reader-cancellation-acknowledgement-blocks-terminal-cleanup).

Also test a pending source read whose executor ignores abort. The local public
stream must observe its existing request/deadline signal independently, retain
terminal persistence and close with an unknown outcome. A completed database
write alone does not prove the HTTP body or host drain finished.

The fixture drives actual HTTP authorization initiation, PKCE exchange, refresh and revocation through the image. Only the account-session/consent actor and provider are synthetic. A raw Node HTTP adapter sends the canonical Host: Node fetch does not honor a custom Host override. The real Chromium probe uses a separate loopback-only fixture entrance that forwards exactly once to Next, without buffering response bodies or replaying requests. It uses the hash-verified candidate buffer source, measures first/terminal bytes, and observes a quiet-stream keepalive. No such test proxy is added to deployment infrastructure.

Inference, cancellation, lost connection, full deadline with active drain, restart, duplicates, current-grant denial, capacity rejection and preserved completed records must all pass. Abrupt process loss may leave a retained `running` row; public duplicate handling must remain unconfirmed with zero new upstream attempts. No historical record is rewritten. The HTTP provider fixture counts explicit failure signals; the separate established relay suite verifies actual provider-health classification and private monitor ownership projections. Failed checks stay private with bounded error details and no credentials. Real sign-in, real provider and public tunnel acceptance remain excluded.

### 3. Prepare explicit runtime configuration

After the whole-image rehearsal has produced its acceptance receipt, use a dedicated owner-only JSON file (`chmod 600`) outside the application package, with the existing application configuration names and values. See the allowlist in [runtime-config.cjs](../../deploy/self-host/runtime-config.cjs). No ambient `.env` is loaded. Do not mount the workspace, Docker socket, provider desktop homes or general cloud management credentials. The active Nova profile also excludes billing, storage, account-admin and scoped publishing credentials. The separately fenced whole-web migration profile retains the existing web app's necessary billing/storage/scoped publishing authority; it does not give that authority to Nova.

For the active Nova profile, supply only the primary database/TLS and pool bounds, existing vault/audit keys, Connect enable/issuer/resource/client registration, public build identity and the existing server-side relay capability required by Nova. `validateNovaConfig` in [the operator library](../../scripts/lib/self-host.mjs) rejects unrelated Media, storage, billing and administrator settings. Provider account credentials never enter this file. Public inputs must match the compiled image; runtime settings cannot rewrite browser assets. Preserve vault/signing roots. Database CA certificates may use literal `\n` as the existing client permits. Never import the entire developer environment.

The active profile requires `GALX_CONNECT_ENABLED=1`, `GALX_CONNECT_ORIGIN=https://galx.ai`, `GALX_NOVA_RESOURCE=https://nova.galx.ai` and the reviewed first-party registry. This enables validation; the primary database's explicit entitlement and application grant still determine eligibility. It creates no grant. Use:

```sh
node scripts/self-host.mjs plan-nova-native <package-directory> <private-nova-runtime.json> <new-plan-directory>
```

`plan-nova-native` additionally requires native central's fixed verified-TLS destination/local account transport and rejects hosted aliases. Legacy `plan-nova` retains hosted compatibility for explicitly reviewed historical recovery, not current authority. Generic `plan` remains disabled preparation with `GALX_CONNECT_ENABLED=0`. Whole web uses `plan-account-migration` with its declared broader configuration. All require matching whole-image acceptance and unchanged fingerprints.

Native Nova defaults to `127.0.0.1:17789` under `galx-web-nova-native`; whole web defaults to 17788 under `galx-web-account-migration`. The earlier hosted-compatible Nova project/17787 is retained stopped. An explicit final argument selects another unprivileged loopback port. Plans reference an immutable image and one read-only private configuration, print no values, and fingerprint configuration/Compose policy. Changes require a new reviewed plan.

### 4. Stage, inspect and stop

After the relevant local checks pass, the prepared operator commands are:

```sh
node scripts/self-host.mjs stage <plan-directory>
node scripts/self-host.mjs status <plan-directory>
node scripts/self-host.mjs stop <plan-directory>
node scripts/self-host.mjs resume <plan-directory>
```

`stage` creates one loopback container in the explicitly selected disabled-preparation or Nova profile and refuses to replace an existing one. `resume` explicitly starts that same stopped container only when its image and configuration still match. Neither changes public routing. A lost Docker command acknowledgement requires `status` before another mutation. Raw `docker inspect`, resolved Compose configuration and application logs are private administrator material; the tool emits only an allowlisted status summary.

The container runs as UID/GID 1000, drops capabilities, denies privilege escalation, has no Docker socket, uses a read-only root and has explicit memory/CPU/PID/log bounds. These protections also apply to `plan-account-migration`, whose fixed project is `galx-web-account-migration` and default loopback port is 17788; only its explicit validated local central database/account API and preserved web configuration are accepted. All profiles require the matching whole-image receipt. Node starts directly under Docker's init, so signals reach Next. Next's existing SIGTERM handler is intended to stop new connections, drain active requests and wait for registered `after` work; the whole-image active-drain check must demonstrate that behavior before staging. The 480-second stop grace exceeds Nova's unchanged 300-second deadline and bounded terminal I/O. Never substitute Compose's default ten-second stop or force removal during an active operation.

Next writes regenerated pages beside its server output. The image retains an immutable seed; bounded tmpfs mounts hold runtime copies of the app/pages output, image/fetch cache and temporary files. Every start reseeds the runtime output. Cache loss is acceptable; database identity, grants, execution history and object storage are never reconstructed from this cache. Cache exhaustion must be diagnosed rather than giving the container a writable copy of the entire checkout.

Docker `unless-stopped` owns recovery after process exit. An unhealthy check does not restart the container. Do not add an automatic health-based killer: failed dependencies or quiet streams do not prove safe termination. A manual stop remains stopped across Docker restarts. For a reviewed immutable web replacement, retain the preceding package/configuration, drain the exact owned container with the full allowance and verify clean exit/no OOM before removing only its disposable container/cache. Stage the new reviewed plan against the same live native authority; never roll the database back with the image.

The October 17 correction operator is deliberately bound to the retained
`web-plan-final` / `nova-plan-final` and newly reviewed `web-plan-cookie-fix` /
`nova-plan-terminal-fix` plans under `.data/postgres-cutover`. Each replacement
requires the same project, port and exact configuration hash, matching whole-image
acceptance, a clean old exit, and only tmpfs/read-only configuration mounts. Run
`node scripts/rollout-native-web-correction.mjs` for web and the same command with
`nova` for the narrow Nova profile, only after preparing those accepted plans.
Its separate private phase receipts prevent blind repeat. Inspect an interrupted
phase before taking a recovery action; never delete persistent data or change
DNS/database authority to complete an image correction. This bounded operator is
not a reusable arbitrary-container replacement tool. Both original replacements ran
the accepted correction image; retain their completed phase receipts. The later
`web-notice` correction selects only `web-plan-cookie-fix` →
`web-plan-no-busy-notice`, with its own `web-notice-correction.json` receipt,
the same configuration and all the same acceptance/drain guards. It removes the
passive image-availability popup in the full-web profile; Nova is unchanged.
The subsequent `web-create-asset` correction selects `web-plan-no-busy-notice` →
`web-plan-create-asset`, with its own `web-create-asset-correction.json` phase
receipt and identical configuration/drain checks. It restores the exact Create
script classification while preserving workspace authentication.
Prepare the new accepted plan before running
`node scripts/rollout-native-web-correction.mjs web-notice`. The predecessors named by the original `web`/`nova` corrections have known
mixed-cookie and stream-drain defects. The later notice predecessor preserves
those repairs but still denies Create's entry script. Retention alone is not
full workflow acceptance. Recover with a verified compatible native image,
preserving current data and the source's inactive state.

### 5. Preserve the accepted ingress

Before any cutover, capture current DNS/ingress versions, aliases, serving deployment and compatible rollback artifacts. Preserve `galx.ai` and `nova.galx.ai` origin/callback contracts. Use explicit tunnel host/path matches with a final deny rule; expose no monitor, ownership-control, metrics or Docker surface. Do not add a buffering proxy, cache inference, enable request replay or replace server-side permission with a hidden URL. The tunnel's healthy status proves connector connectivity only.

Persistent placement does not remove the observed edge idle limit: earlier external synthetic evidence observed a roughly 125-second silent-response failure and a 310-second keepalive success. The new Nova candidate emits bounded 15-second SSE comments, while the SDK requests streaming once and assembles default complete answers locally. It validates terminal evidence and applies separate answer/event/wire byte limits. Raw long JSON callers can still exceed an edge idle limit; use the streaming client contract. TCP keepalives alone do not supply response bytes. Local image acceptance demonstrates this transport behavior but does not certify a later public ingress configuration.

The October 3 controlled cutover verified existing-account consent/PKCE, explicit eligibility, real streamed completion and neutral interruption, duplicate denial, revocation/refresh denial, bounded admission contention and private/public responses. The transition retained Media source and shared configuration; paid Media generation, billing and publication were not exercised. For any future change, repeat only acceptance invalidated by that change and record its limits. Keep public-release gates and ACT-043 separate.

## Request-origin trust policy

The bootstrap exclusively sets `GALX_REQUEST_ORIGIN_MODE=mac-loopback-v1` and `GALX_SELF_HOST_AUTHORITY=0.0.0.0:3000`; ambient overrides and these names in runtime JSON are refused. Next's native request URL must identify that exact internal listener. Only exact HTTPS authorities from `NEXT_PUBLIC_APP_URL`, `GALX_CONNECT_ORIGIN` and `GALX_NOVA_RESOURCE` can select the external origin. The raw Host is a bounded virtual-host selector inside this deliberately private listener, not authentication. Unregistered ports, aliases, suffixes and loopback Host values are rejected. Direct access with a configured canonical Host still needs all route permissions.

`Origin`, `Forwarded`, `X-Forwarded-Host`, `X-Forwarded-Proto` and forwarded ports cannot select deployment identity. Browser Origin remains independently enforced against client registration or same-origin mutation policy. The same helper governs Connect/Nova issuer/audience origin checks, account callbacks, workspace redirects and session mutations. Authorization reads its query from the preserved native URL: Next's general URL accessor can normalize an embedded `127.0.0.1` callback to `localhost`, which exact callback validation must reject. Preserve the registered callback; do not broaden its allowlist. Direct/non-Mac deployments retain native Request authority and exact loopback ports. No wildcard, localhost exception, database-only admission or audience bypass is added.

The port remains `127.0.0.1` on the Mac; `0.0.0.0:3000` is only the container's internal listener. An unconfigured Host receives a sanitized denial. `curl`/raw HTTP may explicitly send the configured Host for private testing; browser/public access needs separately reviewed exact-host ingress. Do not expose the container or claim the loopback boundary proves the caller's identity. See [ADR 0166](../adr/0166-private-self-host-request-origin.md).

## Stop conditions

Stop on image/source/config drift, a missing traced dependency, a failed boundary test, unbounded caches/logs, short forced shutdown, failed terminal persistence, unexpected upstream attempts, unverified rollback or missing current-state evidence. A stage timeout is uncertain startup, not permission to recreate the container repeatedly.

Startup logs report only a phase and allowlisted category: `configuration`, `cache-initialization` or `framework-startup`, with `ENOENT`, `EACCES`, `EROFS`, `ENOSPC`, `MODULE_NOT_FOUND` or `invalid`. Check the private file/mount/manifest before rerunning. Never solve a startup error by copying provider credentials, making the checkout writable or relaxing grants.

Ordinary provider unavailability and an honest terminal `unknown` do not themselves require rollback. Authorization bypass, exposed credentials/ownership evidence, revoked authority accepted after acknowledgement, replayed inference, corrupted records or neutral interruptions counted as provider failures do.

## Recovery and rollback

For an unhealthy but running process, inspect bounded private logs, memory, disk, configuration and dependencies. Preserve request identifiers and delivered output. Do not replay an uncertain request or rewrite an old execution as completed/failed to restore a green status.

Before a planned replacement, withdraw the ingress route or close admission through the separately reviewed mechanism, allow existing work to finish, then use `stop`. Changing only a configuration file does not hot-reconfigure the running app. Check the exit code and terminal evidence; exit 137/OOM or exhausted grace is not a clean drain. Restore the prior matching image/configuration using an explicit new plan; the tool refuses silent replacement.

The operator tool never applies database migrations. The controlled transition applied only the already-reviewed additive exact-refill migration after a rollback-only dry run; the accepted Connect schema was already present. Inspect actual migration state before a later release and verify forward compatibility before promising rollback. Preserve grants, identities, completed records and unknown records. Do not invoke a destructive migration DOWN just to change application placement.

For containment, withdraw only the affected exact-host route, preserve active/unknown records, then drain its container. A prior Vercel Nova route is deny-only and cannot serve as a long-inference fallback. Restore a compatible native Mac image/configuration after verification; do not reinstate a hosted writer, restore stale data or remove the retirement firewall. Web/account recovery and Nova availability remain separate scopes.

If an unplanned host interruption has already occurred, confirm login, Docker Desktop, the existing keep-awake owner, tunnel connectivity and application status using bounded read-only checks before any new inference. Do not induce that interruption for acceptance. Physical-host and shared-daemon fault drills remain **UNVERIFIED — DEFERRED BY OPERATOR**; this Mac is not a high-availability cluster.

### Non-disruptive resilience acceptance

Use the accepted immutable package and synthetic state in an isolated replica. The supplemental command does not replace its existing whole-image acceptance receipt:

```sh
node --import tsx scripts/test-self-host-resilience.ts <accepted-package> <public-build-inputs.json> <new-evidence-directory>
```

It refuses ambient database configuration and a mismatched receipt. It loads the verified archive without replacing a service, uses a uniquely labeled internal network and disposable PostgreSQL, and creates no real account, entitlement, provider request or public route. Only owned fixtures are stopped or removed. It tests actual Next HTTP behavior across container death/restart, an isolated entrance restart, a full 128 MiB cache, and fresh-container reconstruction from a synthetic database dump. A separate 64 MiB memory/swap-limited container tests OOM containment. It does not pressure the workstation disk or claim an application OOM/reboot drill. Temporary synthetic configuration and containers are removed; failure evidence is retained.

Required results are preserved completed/uncertain history, no ambiguous replay, scoped authorization, revoked access and refresh still denied, unchanged private keys across restart, exact fractional quota credit across restart/restore, and sanitized responses. Abrupt container loss may retain `running`; clients must receive `unknown` on a duplicate without another provider attempt. A clean shutdown must retain its full 480-second allowance. Use the existing whole-image evidence for the unchanged 300-second deadline and automatic process-exit recovery unless a relevant change invalidates it.

For monitor-only faults, run the existing `test:relay:monitor-package` command with the reviewed tag and Docker context from the component manifest. Its synthetic inputs now travel through stdin into bounded tmpfs, so the isolated daemon requires no Mac filesystem mount. It executes the image's real entrypoint with no network, a synthetic loopback authority and a synthetic Unix daemon. Test monitor process death, fresh browser-session establishment, control loss, private ownership projection, and denial after revocation across another process restart.

The [non-disruptive resilience record](../../post-mortem/releases/2026-10-03-nova-nondisruptive-resilience.json) separates fresh isolated results, retained live recovery evidence and deferred host drills. Compare live container IDs/start times and private configuration fingerprints before/after; leave the shared connector running. A synthetic entrance restart does not certify Cloudflare connector restart. Same-Mac reconstruction does not prove off-device recovery. Stop after the safe checks; do not reboot to fill an evidence gap.

## Verification and evidence

Keep image/manifest/archive digests, public-input hashes, named checks, timestamps, observed revocation latency, terminal states and actual limitations in private release evidence. Never retain runtime credentials or unnecessary identity data. Preserve failed attempts and distinguish ACT-044/045/046 synthetic target acceptance from ACT-047 real-provider/cutover evidence. The latter records the owner-authorized controlled transition. Host power, login, sleep/wake and disruptive shared-daemon drills are **UNVERIFIED — DEFERRED BY OPERATOR**. Native database off-device recovery is separately verified in the October 17 record; complete application-package/VM/queue/secret recovery remains unverified. None is passed, failed or waived by the provisional reboot-startup assumption; continued controlled operation is not public-launch or production-readiness certification.

Authoritative implementation references: [Next self-hosting and graceful `after` shutdown](https://nextjs.org/docs/15/app/guides/self-hosting), [Next output tracing](https://nextjs.org/docs/15/app/api-reference/config/next-config-js/output), [Docker service limits and stop grace](https://docs.docker.com/reference/compose-file/services/), [Docker restart policy](https://docs.docker.com/engine/containers/start-containers-automatically/), and [Cloudflare origin parameters](https://developers.cloudflare.com/tunnel/reference/origin-parameters/). These define the selected familiar operating patterns; local and hosted evidence determine whether this particular release satisfies them.
