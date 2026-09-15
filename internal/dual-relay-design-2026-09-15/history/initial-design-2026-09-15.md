# Separate Premium and Standard relays: architecture and operator design

<!-- docs-scope: research-reference -->

Historical pre-implementation evidence, preserved in full. Statements about missing services, pending schemas and host prerequisites describe this checkpoint only. Use [current account management](../../../docs/reference/relay-account-management.md) and [current state](../../../post-mortem/CURRENT_STATE.md) for the implemented strategy.

Historical design checkpoint, before the central service implementation, 2026-09-15 UTC. Superseded for delivery by [the service runbook](../../../docs/runbooks/relay-pool-services.md). Private research and proposed implementation specification. This is not an accepted ADR, deployed behavior, a completed visual critique, or a live readiness certification. Source inspection and primary-source research informed this document. The independent UX critique is pending the requested sub-agent authorization. [Current operating evidence](../../../post-mortem/CURRENT_STATE.md) remains authoritative for deployment.

The [Supabase provisioning record](../provisioning-status.md) confirms two healthy new projects after the user's Pro upgrade. The databases contain no GALX application tables; relay migrations and runtimes remain unimplemented. The [delivery plan](../delivery-plan.md) now keeps all account management in `mazhcjisettrzbqhorvp`, with the two new projects reserved for execution state. [ADR 0153](../../../docs/adr/0153-central-account-authority-isolated-relays.md) records the proposed implementation.

## Product contract

GALXAI project `mazhcjisettrzbqhorvp` alone manages and manually registers upstream accounts. It assigns paid accounts exclusively to Premium and free accounts exclusively to Standard. Both serve the same intended text-model catalog, subject to fresh model evidence. Only Premium may execute Sites and image generation. Customer billing plans, public model aliases and upstream account classification are separate concepts.

Create **two independent relay deployment environments and two separately addressable operator consoles**, using one maintained implementation. Each execution environment owns its controller, supervisor, runtime database, network, daemon, scoped execution credentials, signing state, job receipts and desktops. Canonical accounts, credential records, lifecycle decisions and account leases remain in the central GALXAI project. No relay may call, query, manage or fail over to the other. This includes text requests.

The [central account management contract](../central-account-control.md) is the current proposed architecture. Two runtime labels or two schemas do not establish the execution boundary; the central management service is an explicit shared dependency. The earlier [logical-pool proposal](logical-pools-2026-09-15.md) is dated research history. Separate deployment environments still need verified placement before claiming independent availability.

## Established patterns and adaptations

These are design adaptations, not claims that GALX implements the referenced products' infrastructure.

| Reference | Documented behavior | Proposed GALX adaptation |
| --- | --- | --- |
| [AWS silo isolation](https://docs.aws.amazon.com/whitepapers/latest/saas-tenant-isolation-strategies/silo-isolation.html) | A dedicated resource boundary can encompass the complete stack | Each relay owns its execution resources; a central management service owns account decisions, with no runtime peer access. |
| [AWS control and application planes](https://docs.aws.amazon.com/whitepapers/latest/saas-architecture-fundamentals/control-plane-vs.-application-plane.html) | Central management can govern separate application environments | Keep all account management in GALXAI and scope every operation to one isolated relay. |
| [GitHub runner groups](https://docs.github.com/en/actions/concepts/runners/runner-groups) and [group plus label selection](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/use-in-a-workflow) | Groups establish access boundaries; matching group and labels are both required | Relay assignment and requested capability must both match before capacity selection. One account belongs to one relay. |
| [AWS console sessions](https://docs.aws.amazon.com/awsconsolehelpdocs/latest/gsg/multisession.html) and [account display settings](https://docs.aws.amazon.com/awsconsolehelpdocs/latest/gsg/getting-started-uxc.html) | Separate identities can remain open in separate tabs; account display colors aid recognition | Separate Premium/Standard URLs and sessions; persistent relay name in page title, header, dialogs and exports. Color supplements text. |
| [Portainer environments](https://docs.portainer.io/admin/environments/environments) | Named environments have their own details and access management | A small launcher opens either console. Both consoles use the same account table and detail layout, scoped by their server identity. |
| [Grafana state handling](https://grafana.com/docs/grafana/latest/alerting/fundamentals/alert-rule-evaluation/nodata-and-error-states/) | Missing measurements and failed evaluations are distinct states | Distinguish no traffic, unknown health, disconnected monitoring, disabled workloads and verified readiness. |
| [AWS Cloudscape creation patterns](https://cloudscape.design/patterns/resource-management/create/) and [GOV.UK task lists](https://design-system.service.gov.uk/components/task-list/) | Match creation flows to complexity; preserve progress for tasks spanning sessions | Guide initial registration, then let the account page resume the saved step. Repair does not restart onboarding. |
| [IBM Carbon data tables](https://carbondesignsystem.com/components/data-table/usage/) | Put search and actions in the table toolbar; use contextual and progressive detail | One Accounts table, one registration action, and one next action per row. Keep technical detail on demand. |
| [GitHub runner monitoring](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/monitor-and-troubleshoot) | Idle, active and offline describe different operational situations | Keep connection, active work and verified workloads separate. Zero active work is not a failure. |

## Architecture audit: gaps in the current code

Priorities below describe gaps against the requested two-relay contract, not newly confirmed production incidents.

| Priority | Evidence | Required change |
| --- | --- | --- |
| P0 | [Controller](../../../scripts/relay-federation-controller.ts) reads all registered rows; [desired shard selection](../../../src/relay/desired-shards.ts) has no relay assignment | Persist assignment and enforce it at registry reads, enrollment, reconciliation and authoritative lease acquisition. |
| P0 | [Docker worker names](../../../src/relay/docker-shard-driver.ts) derive from shard identity, independently of namespace | Preserve local worker ownership; account uniqueness and exclusive assignment are enforced in the central management transaction. A name collision on one daemon cannot enforce ownership across independent hosts. |
| P0 | [Worker creation](../../../src/relay/docker-shard-driver.ts) omits an explicit network; both controllers would control the same daemon | Install separate host/daemon authority and explicit networks. Labels and loopback publication are insufficient cross-environment boundaries. |
| P0 | [Sites configuration](../../../src/lib/sites/included-configuration.ts), [legacy Sites configuration](../../../src/lib/sites/content-configuration.ts), [image availability](../../../src/lib/images/availability.ts) and [adapter](../../../src/core/router/adapters/OpenAIAdapter.ts) use shared relay settings | Introduce server-only admission that saves one destination before dispatch. Sites/images select Premium; a new text request can select either eligible instance. No existing request changes destination. |
| P0 | [Federation dispatch](../../../src/relay/federation-server.ts) selects by model and load, while [workers](../../../src/relay/relay-server.ts) can schedule image probes | Enforce workload restrictions at both controller and worker. Standard must perform zero Sites/image upstream calls, including probes. |
| P0 | [Service installer](../../../scripts/install-federation-service.ts) points both potential instances to the same environment file; [CLI](../../../src/cli/commands/relay.ts) uses one active port | Add explicit destination configuration and disjoint host/deploy credentials, startup, status, logs and open commands. A second installation must not inherit the root environment file. |
| P1 | [Monitor sessions](../../../src/relay/monitor-sessions.ts) separate purposes and ports, but [monitor identity](../../../src/relay/federation.html) is generic | Preserve session isolation and make the active relay visible everywhere. Do not grant registration privileges to read-only monitor sessions. |
| P1 | Enrollment currently requires moving between desktop creation, sign-in, linking and enrollment controls | Provide one guided registration task with durable progress and a clear next action. Keep advanced desktop tools available. |
| P1 | General readiness means at least one eligible model, not all permitted workloads | Report Text, Sites and Images separately, with last verification and evidence freshness. |

The existing foundation is valuable: origin-bound one-time monitor tickets, separate desktop privileges, explicit manual enrollment, generation-fenced worker ownership, durable receipts, bounded capability evidence and explicit handling of uncertain execution should all be preserved.

## Isolation and authority contract

The [central account contract](../central-account-control.md) specifies sole account authority in GALXAI, separate execution databases, scoped management APIs, network policy, monitoring and cutover. The [new executable isolation proof](../isolation-proof/README.md) tests two real database clusters and both-direction network denial. The [earlier SQL proof](../schema-proof/README.md) tests local role/constraint mechanisms. Two empty hosted database projects are now provisioned; production runtime provisioning, relay migrations and adapters remain outstanding.

### Instance profile

Use a validated, immutable installation identity and a separate display name. Each environment declares one relay class, namespace, permitted workloads and private resource references. Verify actual database, network and credential authority rather than trusting distinct display names or paths. Resolve secrets server-side; never include them in launcher URLs or browser storage. A display rename must not rename state, rotate signing keys or orphan receipts.

Preserve the existing production namespace and retained state in their original environment until recovery and exclusive transition are settled. Create Standard with fresh state. Mirror reviewed software/configuration structure, not account credentials, browser homes or receipt/signing state. Existing accounts need explicit classification and destination approval; a Premium display name, desktop name or historical 403 does not establish paid status.

### Account ownership

Only `mazhcjisettrzbqhorvp` stores canonical accounts, credential envelopes, registration results, unique Premium/Standard assignments, administrative lifecycle policy and audit. The existing account lease and budget authority stays there too. The two relay databases contain runtime installation, job, receipt and telemetry records; opaque account/lease references cannot become a second registry or capacity ledger.

Central registration atomically validates administrator scope, provider identity, pool assignment, owning desktop, expected revision and current sign-in evidence. Existing unassigned records remain ineligible until explicitly reviewed. Preserve revoked and retired identities and prohibit cross-pool account transfer in v1. The operator’s paid/free declaration and provider capability evidence remain distinct.

Both monitors send account operations to the central management service. Each runtime receives only its fixed destination’s assignment and execution material through a restricted interface; neither gets central database-owner access, a broad service key, the vault master key or a combined registry. Filtering both pools after download is forbidden. The central transaction supplies global uniqueness, replacing the earlier separate administrative allocation-ledger proposal.

The [complete contract](../central-account-control.md) covers enrollment, credential delivery, scoped acknowledgements and revocation. During a central outage, new registration, credential release, account-lease acquisition and renewal stop. Existing work requires a still-valid authorization and original receipt recovery; a local store cannot authorize replacement work.

### Workload and recovery rules

- New text requests: choose one eligible relay before dispatch; the same intended catalog and capability checks apply. Its destination then remains fixed, including after rejection.
- Sites: Premium only, covering included and retained legacy generation paths, preflight, status and recovery.
- Images: Premium only, covering synchronous/asynchronous generation, availability, qualification and background probes.
- Standard: report Sites/Images as **Not enabled on Standard**, not as broken capabilities. Explicit local denial must occur before any upstream operation.
- Either relay down or exhausted: its assigned work remains unavailable. No cross-relay fallback, including text, or borrowing peer capacity.
- Pin accepted work and its status/receipt/cancel operations to the original instance and generation contract. Do not replay uncertain work through another instance.
- Preserve paid/free customer access gates separately. A free GALX customer allowed to create an image still consumes Premium upstream capacity.
- Update the application-side image lease selection too; reserving a Standard account before dispatching through Premium gives inconsistent capacity/accounting evidence.

Each environment has its own job journals, queues, runtime limits and receipt recovery. Central GALXAI owns account capacity and customer accounting with explicit pool-scoped admission. Local execution journals cannot duplicate account budget or lease authority. The shared central management dependency must be visible in outage behavior.

## Two consoles, one familiar interaction model

Each console has the same navigation: **Overview · Accounts · Activity · Settings**. Accounts include centrally persisted registration and repair; the monitor-only grant can read, while a separately authorized operator session submits mutations to GALXAI in that same visual shell. An external launcher opens either destination, which establishes its own authorization. Neither console fetches the other's state or carries credentials between them.

Persistent header: **Premium relay — Paid accounts** or **Standard relay — Free accounts**, connection age and access role. Use a secondary violet/neutral identity accent; reserve success/warning/error colors for state. Browser titles and exports include the relay name. Use separate hostnames, host-only cookies, signing keys and origin/audience checks. Ports alone do not isolate cookies. No pool switcher, global account list or peer-health panel; an unsaved registration never changes destination.

### Overview

Lead with **Can this relay accept the work I need?** Show a compact workload table, then accounts needing attention, active work and recent events. A healthy desktop is not serving capacity. Default charts should not displace the next action.

Premium shows Text, Sites and Images separately: Ready, Checking, Unavailable or Unknown. Standard shows Text plus the two intentionally disabled workloads. Display last successful verification and last collected time separately. A stopped collector preserves its last snapshot with an explicit stale label; it must not produce a green live summary.

### Accounts

Primary action: **Register paid account** on Premium; **Register free account** on Standard. Table columns: Account name, Registration, Workloads, Active work, Last checked, Next action. Use stable row identities and preserve selection/focus through polling. Search and Needs attention are the main filters; diagnostics, generations and raw identifiers belong in expandable details.

Each row offers one contextual action such as Continue setup, Sign in again, Review verification, or Resume work. Place advanced desktop actions and irreversible removal in the detail panel. Distinguish **Pause new work** from **Pause live updates** and **Stop desktop**.

### Manual registration

1. **Prepare workspace.** Show the fixed destination and account class; create or reuse the intended desktop. Reopening an unfinished registration resumes it.
2. **Sign in.** Open the isolated provider sign-in experience. Show Waiting for sign-in and cancellation. No token paste, ambient credential discovery or automatic enrollment.
3. **Review account.** Present the saved identity and fixed destination. The operator chooses **Register account**. The central registrar atomically saves the account, exclusive assignment and operation result in GALXAI. Retries use the original operation; a lost acknowledgement triggers a pool-scoped read of that central result.
4. **Verify and enable.** Show Registration saved, worker application and per-workload verification as separate results. Standard checks text only. Premium explicitly describes any verification request that consumes provider allowance before it is run. Failed image verification must not erase a successful registration or working text capability.

An operator may leave after registration and continue verification later. Automatic renewal of evidence can follow a configured approved policy; initial onboarding must not hide a consuming probe behind a harmless-looking registration or refresh button.

Use explicit states: Workspace needed, Awaiting sign-in, Ready to register, Saving, Registered/checking, Ready, Partially ready, Sign-in expired, Paused, Outcome unconfirmed and Check unavailable. Unknown is not failed. A provider permission error identifies the failed workload and safe next action; it does not automatically reclassify the account.

### Second-pass refinements: fewer wrong actions

The first registration is guided because sign-in and registration depend on each other. After creation, the durable account page becomes the task's home: its URL, fixed destination, saved step and next action survive navigation. Avoid a modal that loses context during an external sign-in. A returning operator should open **Continue sign-in** or **Review verification**, not complete every earlier step again. Completed steps use quiet text; reserve warning emphasis for unresolved work.

Separate four facts in the production view: **connection**, **registration**, **workload readiness** and **active work**. A connected workspace can be unregistered; a registered account can have unavailable images; a ready account can be idle. The synthetic prototype distinguishes central connection, relay connection, registration, acknowledgement and workload readiness; it does not simulate real occupancy or telemetry expiry. These facts must remain separate in the production data contract too.

| Action | Operator expectation | Required execution behavior |
| --- | --- | --- |
| Refresh status | Read current facts | Read only; never start verification, renewal or generation. |
| Prepare workspace | Save a resumable task | Bind the draft to this instance; recover the original operation after an uncertain save. |
| Register account | Confirm this account in this relay | Check privilege, identity, ownership and revision atomically. Persist the operation identity before sending; recover its authoritative outcome. |
| Verify workloads | Intentionally check access | Name pending workloads and disclose consuming checks. A failed image recheck must not repeat successful text/Sites checks. |
| Pause new work | Stop admitting additional work | Set an explicit desired state with a revision, rather than replaying an ambiguous toggle. Preserve accepted work and its original receipts. |
| Pause live updates | Freeze this view | Keep the last snapshot visibly frozen. Require a fresh read before mutations. |
| Stop or remove | Change the account lifecycle | Show affected active work, ownership and recovery consequences in the detail view; preserve receipt recovery. This is outside the prototype. |

Recovery requires an **operation record**, not just a toast. In production, checking a saved result must distinguish committed, rejected, still pending and unknown. A not-found operation is not proof that a delayed request cannot commit. Keep the same operation identity for allowed retries; never turn an uncertain admission into a new admission. The prototype exercises an interrupted reply *after a synchronous save*; it does not prove distributed recovery correctness.

Two open tabs add another boundary: discard reads started before a newer mutation, reject stale writes server-side, and never carry an account-type confirmation to another account page. Preserve search text and keyboard focus through background refresh. An explicit action should move focus to its result or recovery action; background telemetry should not move it. Unknown or stale state cannot silently turn into live green readiness.

On narrow screens, retain the familiar table inside a labeled, keyboard-scrollable region with a visible sideways-scroll hint. Keep relay identity in the account heading context, preserve the four step labels, and wrap long names. Mobile use should support inspection and recovery; launching a full desktop sign-in still needs a device-appropriate handoff.

### Reviewable interaction prototype

The [private two-console prototype](../prototype/README.md) makes the proposed behavior inspectable with synthetic accounts. One loopback harness now runs a central account service and two fixed-context console gateways. Only the central service persists accounts and operation receipts. It demonstrates exclusive synthetic account assignment, exact-operation recovery across refresh/restart, independent account revisions, saved versus acknowledged changes, central outages, image-only recovery and read-only presentation. A single harness does not prove production process or network isolation. It contains no real upstream connection or production relay implementation.

This keeps v1 focused: two unmistakable consoles, one account workflow and one safe next action. Fleet-wide graphs, bulk registration, account transfers and customizable dashboards should wait until these core operations work reliably.

### Interaction acceptance targets

These are proposed test targets, not measured performance or compliance claims:

- Keyboard-only registration and recovery, visible focus, focus restoration after dialogs, Escape exits and no refresh stealing focus.
- Native labels/status announcements outside the streamed desktop. Streamed pixels do not supply a semantic accessibility tree.
- WCAG 2.2 AA evaluation, including [focus visibility and target size](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/); aim for 44px primary touch controls as a product choice. Do not misstate 44px as the AA minimum.
- Test both consoles at 320/390px and desktop widths, 200% zoom, long labels, no accounts, many accounts, stale data and reconnect.
- Switching tabs, reconnecting or refreshing preserves the registration record and returns to its real server state. Never persist credentials or provider output in browser storage.

## Delivery sequence and proof

1. **Specify authority:** [ADR 0153](../../../docs/adr/0153-central-account-authority-isolated-relays.md) for sole central account management, fixed assignment, workload restrictions and request recovery. Keep proposed/accepted decision status separate from implementation evidence.
2. **Build independent environments:** separate hosts/daemons, clusters, networks, secrets and monitors. Retain original production state without cloning it. Keep canonical accounts and leases in GALXAI; preflight scoped central interfaces and runtime resource authority before launch.
3. **Implement admission enforcement:** persist one request destination; use central pool-bound account leases, controller/worker denial and Premium-only probes/availability. No cross-relay fallback or state lookup.
4. **Build both consoles:** reuse components and serve instance identity from authenticated server data. Implement registration resumption and actionable workload states.
5. **Run isolated acceptance:** two simultaneous environments, both-direction network/identity attacks, independent outages, two monitors, synthetic accounts and upstream request counters. Then production build and private-boundary scans.
6. **Activate in stages:** bring up Standard empty; manually enroll one free account and one paid account through the appropriate consoles; verify actual allowed operations. Preserve pending work and rollback state. Do not replay earlier uncertain image or Sites requests.

Required tests include wrong-instance credentials/cookies/tickets; read-only mutation denial; forged destination fields and execution authorizations; simultaneous cross-pool central registration, denied local account writes, central outages and authorization expiry; revision conflicts; independent restart/disconnect; foreign account IDs; Standard image/Sites direct calls, aliases and probes producing **zero upstream requests**; no cross-relay fallback for any workload; per-workload readiness; durable original-instance recovery; sanitized public errors, raw headers/bodies, async retrieval and image artifacts. Render both consoles and scan public pages/browser assets before making a live privacy claim.

## Evidence and limits

- Inspected controller, installer, registry projection, enrollment, desktop manager/gateway, session grants, launch commands, monitor UI, Sites/image configuration, adapters and capability paths. In that earlier research pass, no production runtime or schema changes were made. The later central foundation application is recorded separately below. Executable additions under `internal/` comprise the synthetic interaction prototype and disposable database/network proofs.
- The strict-isolation pass passed **43 new checks** using two PostgreSQL clusters, two private networks and restricted clients. Cross-network denial held with correct peer passwords; either database could fail while the other accepted reads and writes. All owned resources were removed. This does not prove separate-host administration or production adapter behavior; see the [full results and limits](../isolation-proof/README.md).
- Earlier September 15 repository validation: `node --import tsx --test scripts/test-public-information-boundary.ts scripts/test-image-public-http.ts` passed all **18 tests**, including ordinary-user administrator denial, raw HTTP errors, exact JSON allowlists, async retrieval and metadata-stripped image artifacts. Dependencies were synthetic; no provider generation occurred. These check existing public boundaries, not the proposed relay split.
- Earlier September 15 `npm run build` passed with Next.js 15.5.25 and 285 static pages. The existing lint skip and edge-runtime/static-generation notice remained. `npm run test:docs` passed all 38 tests. Unmapped private research/proof/history paths, the earlier scoped typography exception and generated inventory were semantically reviewed; no production knowledge-domain contract or review fingerprint changed.
- Earlier September 15 `npm run docs:sync`, `npm run docs:check` and `git diff --check` passed. `python3 scripts/verify-post-mortem.py --build` passed its 669-browser/rendered-asset and runtime-trace checks. A separate targeted scan of 1,331 HTML/JavaScript files under `.next/static` and `.next/server/app` found no research/proof markers (`dual-relay-design-2026-09-15`, `separation_lab`, `galx-separation-`, `pool_lab`, private pool schema names or approval-state copy). These are scoped local build checks, not live-site certification. Existing overdue review notices ACT-001, ACT-015 and ACT-016 remain open.
- Two existing focused monitor session tests passed: one-time/origin-bound/revocable grants and bounded renewal/purpose separation. These do not establish the proposed two-instance implementation.
- Earlier investigation passed 24 capability and Sites-preflight tests. Retain this as earlier evidence; the new paid/free restriction does not exist yet.
- Primary sources above were read September 15 UTC. A browser walkthrough of the synthetic prototype tested the interaction hypotheses; no operator usability study or measured task-completion improvement is claimed.
- The September 15 second pass found and corrected misleading completed-step progress, generic account-detail messages, a table without keyboard scrolling, lost action focus and a stale-read race in the synthetic client. Final browser confirmation covered completed progress, recovery focus, the read-only control, and Standard account/table containment at 320px. The earlier visual round also inspected desktop Premium and 390px Standard.
- Synthetic model checks passed for both profiles: confirmation, idempotent registration replay, revision conflicts, foreign IDs, forged destination fields, read-only mutation denial, partial verification and nested response allowlists. Standard counters remained Text=1, Sites=0, Images=0; Premium's failed-image retry produced Text=1, Sites=1, Images=2. These are simulated counters, not provider measurements.
- Loopback HTTP checks rejected a foreign Origin and forged Host with 403. This is fixture isolation, not production operator authentication. The real console must retain administrator checks and purpose-scoped sessions.
- See the [prototype verification record](../prototype/README.md#verification-and-limits) for build and documentation results. No live generation, deployment, visual score, independent agent critique or accessibility certification was performed.

### Central-account prototype pass — September 15, 2026

The [technical audit and pattern rationale](../prototype/AUDIT.md) records the central-store replacement, original-operation recovery, explicit pause/resume intent and acknowledgement states. Current commands and verification live in the [prototype guide](../prototype/README.md). Earlier independent-fixture evidence is retained as [dated history](prototype-v1-verification-2026-09-15.md). This pass changes private research implementation only; production account management still requires the main-project schema and scoped service work in the delivery plan.

### Production foundation pass — September 15, 2026

The [production audit](../production-audit-2026-09-15.md) moves this work beyond the prototype: main-project foundation migration `20260915073601` is applied, and `npm run relay:accounts:status` reads its explicit activation gates. Registration is still disabled, all existing accounts remain unassigned, and the scoped central service/lease and separate runtime deployments remain pending. [Dated verification](../../../post-mortem/releases/2026-09-15-central-relay-foundation.json) distinguishes schema delivery from the complete architecture.
