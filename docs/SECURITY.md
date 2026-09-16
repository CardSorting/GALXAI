# Security boundaries

<!-- docs-scope: current-guide -->

Private current guidance for [central account authority and isolated pools](reference/relay-account-management.md). Vulnerability reporting remains in the [root security policy](../SECURITY.md). Controls and local acceptance are not compliance certification.

## Authority map

| Boundary | Required authority |
| --- | --- |
| Customer to application | Verified session, owned resource and operation-specific access |
| Application to runtime | Distinct destination inference key plus server-derived tenant identity |
| Operator/viewer to monitor | Own-pool host-issued session, centrally authorized role |
| Monitor to registrar | Narrow pool/installation principal and short-lived purpose ticket |
| Registrar to account authority | Validated saved desktop login, identity/class, revision and exclusive binding |
| Runtime to central | Own installation runtime principal and epoch; assigned accounts/grants only |
| Runtime to execution database | Own restricted project login; identity/reservations/outcomes only |
| Monitor to desktops | Own VM's daemon and centrally scoped saved registration |

Ordinary authentication, preview approval, task IDs, model output and tenant hints do not grant administration. Viewer access is a separately authorized operational role, not every signed-in GALX user.

## Enrollment and credential custody

All canonical accounts, encrypted credentials, assignments, lifecycle history and account leases live in `mazhcjisettrzbqhorvp`. Manual sign-in happens in the owning pool's desktop, followed by **Connect account** to verify and save access atomically. A verified installation policy enables new connections automatically; existing pauses and explicit installation holds remain in effect. Premium requires paid provider class and Standard free class. A GALX customer subscription does not prove provider classification or model access.

Only central holds the main database/vault configuration. Pool runtimes receive own execution credentials and narrow assigned execution material; neither execution database stores an account registry or second capacity balance. The monitor's registrar channel does not grant broad table access. Application/service/ordinary roles cannot directly write credentials, assignments or immutable management journals. Automatic activation can be armed only by verified owner installation tooling; runtime/registrar events reconcile their own policy without receiving owner credentials. Private functions use fixed search paths and check caller scope; database owners remain trusted.

External provider API/CLI/file ingestion and ambient host discovery remain closed. Legacy enrollment/refresh/leases reject centrally assigned accounts. Retained unassigned legacy records require their own explicit manual confirmation. Do not copy browser homes, tokens or controller environment across pools.

## Renewal, retention and isolation

Pool credential renewal is manual sign-in in the same bound desktop followed by an explicit central save/review. The legacy controller's automatic saved-file bridge is separately scoped and never renews provider sessions. Neither a name change nor local link change transfers account ownership.

Each pool has its own Linux VM, daemon, runtime/monitor state and persistent peer-denial rules. The central service has no daemon socket; runtime containers have no daemon socket or main registry/vault authority. Each monitor has powerful access to its own daemon for desktops. Each runtime hosts its own account engines in-process; it does not create isolated per-account Docker workers. Per-account engine separation must not be described as hardware isolation.

The two VMs share one trusted Mac administrator and physical host. No Mac directory mounts or peer credentials are supplied. Guest homes/checkpoints may contain sensitive data and must be retained privately. Local VM/daemon isolation does not certify resilience to a malicious Mac owner.

## Requests, visibility and recovery

Management commands require an operator, exact fields, same origin, expected revision and immutable operation identity. Exact replay is scoped to original actor/destination/record/body. Rename preserves identity. Removal revokes registered accounts permanently and invalidates pending tickets; only unfinished registrations can be restored with fresh review. Forced RLS, grants and immutable history guard direct database access.

Central removal commits before desktop disconnection/stop. Failed stop remains an explicit cleanup task; it never restores account permission. Removed records reject new direct desktop actions and display connections, while Stop remains allowed. Removal retains operational history and credentials; it is neither data erasure nor remote provider session invalidation.

New work requires a destination-bound central lease; renewal and independent expiry limit old authorization. Central outage denies new grants and renewal. Pause stops old engine authorization and differs from a legacy maintenance hold. No cross-pool or legacy fallback occurs; uncertain execution never redispatches automatically. Preserve original epoch, tenant and receipt context.

Operational assets and diagnostics require server administrator/purpose-specific session authority. Public bodies, headers, errors, streams and images use explicit allowlists and re-encoding. Never publish topology, credential sources, raw provider data or private audit objects. Local launcher links contain no long-lived key; tickets are removed after exchange.

## Verification and limitations

Use [hardening](maintainers/RELAY_HARDENING.md) for roles, peer denial, exact fields, stale revisions, removed tickets, races, rollback, image sanitation and session tests. Mutation suites use disposable databases and synthetic credentials. Local acceptance verifies installed boundaries separately from source tests and production builds.

[Current state](../post-mortem/CURRENT_STATE.md) retains actual release/acceptance and outstanding manual sign-ins, execution activation and provider qualification. Legacy controller security/recovery remains in [its scoped guide](maintainers/legacy-federation-operations.md). Never infer current capability from an old successful image or a live desktop.
