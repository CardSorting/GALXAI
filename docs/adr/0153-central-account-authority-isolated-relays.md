# ADR 0153: Central account authority with isolated relay execution

<!-- docs-scope: decision-record -->

Date: 2026-09-15. Status: proposed implementation. Delivery: database schemas applied and local Docker/VM services installed with manual registration open; serving activation and provider qualification remain pending. Owner: Relay operator. The user's explicit requirement is that accounts are managed only from Supabase project `mazhcjisettrzbqhorvp`; this record does not claim delivery of the complete proposed split.

October 17, 2026 placement refinement: [ADR 0168](0168-local-postgres-database-placement.md)
accepts replacing the GALXAI and Premium hosted database placement with distinct
local PostgreSQL clusters. Central ownership, credential isolation and execution
scope remain; this does not accept this entire earlier proposal or change its
dated delivery observations. The [central cutover record](../../post-mortem/releases/2026-10-17-central-native-cutover.json)
and [Premium retirement evidence](../../post-mortem/releases/2026-10-17-premium-retirement-account-email.json)
record subsequent native authority and scoped acceptance/retirement, separately
from this proposal's original scope and status.

## Context and decision drivers

Premium must use paid upstream accounts and permit text, Sites and images. Standard must use free upstream accounts and permit text only. The user requires two isolated relays and two manual-registration monitors, while retaining one account-management authority in the original GALXAI project. Two Supabase projects have been provisioned for execution state; neither holds an account registry.

## Options considered

- Autonomous account registries in each relay project would separate execution and administration, but contradict the user's explicit central-management requirement and require a separate global allocation authority.
- One shared account database distributed directly to both controllers would retain central records but expose broad registry/decryption authority and make the isolation boundary depend on application filtering.
- Central account-management services backed only by GALXAI, with scoped interfaces to two isolated execution environments, meet the requested ownership model while keeping peer access prohibited.

## Decision

Use the third option. GALXAI owns canonical accounts, credential envelopes, manual registration outcomes, paid/free pool assignments, lifecycle policy, audit and the existing authoritative account leases/budgets. Enforce exclusive assignment centrally. Preserve manual desktop-only enrollment and renewal; neither relay can create an independent account or change its assignment.

Premium and Standard projects hold only installation identity and execution state: local jobs, queues, receipts, artifacts and telemetry. Opaque account/lease references can bind work to central authorization; they are not a replicated registry or a second account-capacity authority. The main project's service key, database owner and vault master secret are never runtime credentials for either relay.

Both administrator monitors manage their fixed pool through the same central authority. Runtime identities receive only destination-bound execution material and narrow own-work acknowledgement/settlement access. Premium and Standard have no peer discovery, queries, credentials, account borrowing or cross-relay failover. Standard rejects Sites/images before any upstream call. The [implemented central account contract](../reference/relay-account-management.md) specifies the boundary and workflow in full; the [research entry point](../../internal/dual-relay-design-2026-09-15/central-account-control.md) preserves design references.

## Consequences and recovery

Global uniqueness and account lifecycle now have one transactional home; no additional external account-allocation ledger is needed. The central management service/database is a common trust and availability dependency. During its outage, new enrollment and execution authorization stop; existing work requires a still-valid previously issued authorization. Preserve local receipts and settle the original central lease after recovery.

Pause/revoke state is saved centrally and its runtime acknowledgement is tracked separately. Previously delivered provider credentials require explicit fencing; a database flag alone does not revoke a provider session. Rollback retains central account ownership and unresolved work, does not enable local account writers and never replays through the peer. The [delivery and recovery index](../../internal/dual-relay-design-2026-09-15/delivery-plan.md) links implemented work and remaining activation. The [service runbook](../runbooks/relay-pool-services.md) governs local installation; [legacy operations](../maintainers/legacy-federation-operations.md) govern the retained controller.

September 15 management clarification: removal is a retained central lifecycle transition. An unfinished registration can be restored, but its previous review and tickets remain invalid. Removing a registered account revokes access permanently and retains ownership and audit history. Rename/remove/restore require an own-pool operator, expected revision and immutable request identity. Account and linked registration names remain consistent; desktop shutdown follows the central removal commit and can be retried independently. This avoids erasing evidence or implying that a local cleanup failure restored authorization. Health filters describe observed state and preserve unknown status when evidence is unavailable. The [management release](../../post-mortem/releases/2026-09-15-relay-account-management.json) records implementation and acceptance separately from this proposed decision.

September 15 documentation clarification: the delivered execution schemas contain fixed identity and execution reservations/outcomes only; the broader jobs/queues/artifacts/telemetry description above defines their permitted execution scope, not additional implemented tables. Runtime engines are in-process within each pool container. The local installation trusts the common Mac/admin while separating VM kernels, daemons, disks and peer traffic. No physical-host independence or application cutover is implied.

## Confirmation and delivery

September 15 scheduling refinement: the then-planned free-account path selected the least recently selected eligible account across model subsets and bounded each account to one ongoing job. Engine quota feedback, current projected cooldowns and explicit central-denial backoff constrained eligibility; none created a second budget authority. Original operation identity preceded selection, and uncertain work could not fail over. This historical policy was retired with the Standard destination; the [sunset record](../reference/standard-relay-sunset.md) owns current status. Local image acceptance remains separate from this proposed decision and serving qualification.

The follow-up scheduler audit adds gradual recovery: at most one new recovery selection every five seconds across Standard, while healthy work continues. Live rotation is independent of wall-clock adjustments. Quota escalation is counted per job, fresh evidence retains its deadline, and successful recovery survives normal grant cleanup and checkpoint recovery. Cancellation before dispatch and renewed freshness checks avoid allocating abandoned/stale work. These are local scheduling controls; central custody, provider limits, request identity, proposed decision status and the closed activation gates retain their existing authority.

September 15 automatic-tool clarification: the owner requested automatic tool execution and turn continuation. Both pools now support client-owned function calling as text inference; only registered SDK callbacks run, in the caller process. This replaces the initial blanket rejection of Standard tool fields without granting provider-hosted tools, Sites, images or host execution to Standard. Complete calls/results retain identity and every model step still needs central admission. The [automatic-tool contract](../reference/automatic-agent-tools.md) records implementation, bounds and separate qualification. Manual account enrollment, proposed decision status and serving gates retain their existing meaning.

Required evidence includes central uniqueness and assignment constraints, scoped administrator/runtime/monitor authorization, wrong-pool credential and lease denial, stale revision and outage tests, expiry/fencing, lost acknowledgements and settlement, separate network/host enforcement, Standard zero-upstream Sites/image tests and public response/artifact checks. Paired migrations require isolated rollback/reapply, `db:verify`, `db:test` and exact-target verification before deployment.

The [service release](../../post-mortem/releases/2026-09-15-relay-services.json) records the initial applied schemas, closed gates and five built images. The later [local installation](../../post-mortem/releases/2026-09-15-relay-local.json) follows the owner's direction to run locally: central authority on Docker Desktop, Premium and Standard in separate Colima Linux/Docker VMs, no Mac directory mounts, persistent direct-peer and forwarded-peer denial, separate localhost monitors and verified TLS. The Mac remains their common trusted physical host. Local registration is open; account registration, serving activation, provider qualification and application cutover remain separate steps under the [service runbook](../runbooks/relay-pool-services.md). The decision remains proposed; delivery evidence does not auto-accept it or establish provider readiness.

## Relationships

The [pool-image staging procedure](../runbooks/relay-pool-images.md) now packages the mirrored engine into separate Premium and Standard artifacts. These historical staging tags contain a permanent closed gate. The later service images implement central/runtime/monitor interfaces; neither local build establishes actual runtime/monitor deployment. The [dated image evidence](../../post-mortem/releases/2026-09-15-relay-pool-images.json) is separate from database foundation evidence.

Extends [ADR 0152](0152-manual-desktop-only-shard-authority.md) with central persistence and fixed relay assignment while preserving manual-only enrollment, desktop binding and credential renewal policy. Preserves [ADR 0129](0129-public-image-artifacts-and-verified-identity.md)'s public information boundary. The earlier autonomous-registry research is retained as [dated history](../../internal/dual-relay-design-2026-09-15/history/autonomous-registries-2026-09-15.md); no accepted ADR is fully superseded.
