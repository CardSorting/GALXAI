# Known failure modes

<!-- docs-scope: current-guide -->

Use symptoms to select a runbook; confirm the cause before acting. “Protected” below describes specific controls and tests, not guaranteed uptime. Action status lives in [the register](../register.json) and [open items](../OPEN_ITEMS.md).

| ID | Category | Failure and distinguishing evidence | Current protection / remaining work |
| --- | --- | --- | --- |
| FM-AUTH-001 | Identity | My images and Favorites show expired session while the account is still signed in; public Auth credentials exist but admin configuration is invalid | Dedicated `getSupabaseAuthClient().auth.getUser()`; admin configuration remains independently fail-closed. [Identity](identity.md) |
| FM-AUTH-002 | Identity | Transient Auth transport or database throttling becomes HTTP 401 | Separate eight-second Auth transport and generic 503 for unavailability; invalid credentials remain 401. [Identity](identity.md) |
| FM-AUTH-003 | Navigation | Middleware succeeds but page verification is unavailable; a generic exception escalates to the root error | Typed expected-outage recovery withholds workspace content; manual fresh render and local error/loading boundaries. [Identity](identity.md) |
| FM-AUTH-004 | Identity | A failed profile check also hides sign-in or redirects recovery back to the workspace | Exact account-entry exceptions, explicit reauthentication, current cookies, finite coalesced reads and refreshed-cookie preservation; rollout remains ACT-028. [Identity](identity.md) |
| FM-IMG-001 | Async persistence | POST accepted, subsequent status lookup loses the request on another server instance | Durable owner-scoped receipt, atomic claim, completion tied to committed images. [Images](images.md) |
| FM-IMG-002 | Storage | Receipt exists but storage is unavailable, result is missing, or favorite disappears after reload | Target-environment configuration, artifact verification and durable favorite flush. [Images](images.md) |
| FM-IMG-003 | Execution uncertainty | Lost acknowledgement encourages regeneration, duplicate cost or forged success | Same operation identity, no redispatch of claimed images, bounded failed/uncertain status. [Images](images.md) |
| FM-IMG-004 | Capacity | Available capacity rejected by empty quota projection or partial-reservation starvation | Complete reservation requirement, projection filtering and explicit `generation_not_started`. [Images](images.md#fm-img-004--available-capacity-rejected-before-dispatch) |
| FM-IMG-005 | Configuration | Ready Premium runtime disconnected or image availability calls absent worker path | Direct in-process capability reads, independent image switch, owned persistence before receipt completion. [Images](images.md#fm-img-005--premium-connection-or-observation-missing) |
| FM-CTRL-001 | Availability | Controller supervisor repeats startup failure while workers remain up; stale lock and absent listener | Guarded operator recovery only. Automated detection and a rehearsed supervisor crash test remain open. [Controller](controller.md) |
| FM-CTRL-002 | Shared quota | Concurrent sessions exhaust one account; full replay amplifies quota use or loses tool progress | Account-wide exclusion, paced recovery and explicit bounded checkpoints. Real provider/caller rollout remains separate. [Controller](controller.md#fm-ctrl-002--shared-account-exhaustion-amplifies-recovery-work) |
| FM-DEPLOY-001 | Capacity | Deployment/Functions Storage exceeds quota despite a working application | Retention and explicit-ID cleanup; below-quota accounting not yet verified. [Deployment](deployment.md) |
| FM-DEPLOY-002 | Configuration | Local test works while deployed generation fails; configuration or ingress differs by environment | Component-specific release verification, production configuration checks and actual-client test. [Deployment](deployment.md) |
| FM-ACCESS-001 | Authorization | A rollback reopens developer APIs or treats customer approval as staff authority | Explicit public exceptions, fresh developer checks, independent staff membership, gate-preserving rollback. [Access and docs](access-and-documentation.md) |
| FM-ACCESS-002 | Authorization | Anonymous workspace entry is allowed because public-product classification is mistaken for authentication | Session verification before asset bypass and at server page entry; raw HTTP and adversarial regression coverage. [Access and docs](access-and-documentation.md) |
| FM-ACCESS-003 | Authorization | A public dynamic page renders but its route chunk receives an authentication response | Exact reviewed route-template asset allowlist, adversarial sibling denial and raw hosted asset verification. [Access and docs](access-and-documentation.md) |
| FM-DOCS-001 | Operations | Old instructions are presented as current, unsafe repair commands return, or unreviewed source changes invalidate a runbook | Complete catalog, incident journal, source-bound review and CI checks. [Access and docs](access-and-documentation.md) |

Earlier relay transport, wallet, billing and egress incidents are indexed in [incident history](../INCIDENTS.md). Their observations remain dated; follow the current component runbook before repeating any historical command.
