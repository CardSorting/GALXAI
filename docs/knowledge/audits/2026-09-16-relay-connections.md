# Relay connections: lifecycle and recovery audit

<!-- docs-scope: operational-record -->

Private targeted audit, September 16, 2026. Owner request: fix blocked manual registration, retire obsolete credentials and provide familiar, robust account reconnect. The incumbent graphite/silver operator console remains the design baseline. Source, migration, local installation and real connection evidence are separated in [the incident record](../../../post-mortem/incidents/2026/2026-09-16-relay-registration/connection-lifecycle.json).

## Findings and disposition

| Severity | Finding | Correction and evidence |
| --- | --- | --- |
| P0 | A valid saved login matched obsolete identity records and could not finish registration | Owner-authorized, locked retirement purged 56 unused legacy credential envelopes; immutable operational tombstones retain IDs/history. Retired records cannot match or regain credentials. The original saved sign-in connected successfully. |
| P0 | Assigned-account refresh hit a legacy guard reinstated by the management migration | Scoped protocol uses its restricted base writer after authorization. Legacy entry points still deny assigned accounts. Real database tests cover fresh credential replacement. |
| P1 | Credential rejection lacked a distinct recoverable state and could leave misleading readiness | Separate connection state; immediate runtime exclusion, revision/epoch-fenced report, envelope/grant denial, same-account reconnect. Old failures cannot reject a newer credential. |
| P1 | Three-stage registration and generic duplicated errors obscured the next action | Sign in → Connect; atomic validation/enrollment, fixed errors once inline, replay of the original operation and reconciliation after lost responses. |
| P2 | Old success notice could contradict a later reconnect error | Starting an action clears its prior action notice. The final browser pass checks the error is local and stale global copy is absent. |
| P2 | Completed repair controls were buried and active result counts included removed records | Reconnect-required rows remain visible with repair controls open; healthy completed rows collapse; denominators follow the selected active/removed scope. |

No known P0/P1 finding remains in this bounded registration/reconnect scope. Execution activation and real generation capability are separate gates, not claimed by this audit.

## Pattern and interaction decisions

[Zapier connection management](https://help.zapier.com/hc/en-us/articles/8496290788109-Manage-your-app-connections) supports reconnecting an existing connection and separating removal. [GitHub OAuth guidance](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps) supports verifying identity again after a grant. GALX applies these patterns through explicit manual desktop sign-in and preserves its own authorization boundaries. It does not adopt automatic token refresh.

Saved desired state, observed connection health and installation execution permission remain distinct. Reconnect replaces credentials for the same account and preserves enabled/paused intent. Remove remains a named, terminal action with retained history. An uncertain response prompts a read of saved state; no mutation or provider generation retries automatically.

## Technical design score

This is a targeted review score, not a full WCAG certification or a measured performance benchmark.

| Dimension | Score / 4 | Basis and limit |
| --- | --- | --- |
| Accessibility | 3 | Keyboard/focus and named controls retained; tested Axe rules report zero violations. Physical screen-reader use and streamed pixels remain unqualified. |
| Performance | 3 | Small native DOM interface, bounded requests and ten-second visible-page polling. Large-registry and real-device performance were not benchmarked. |
| Theming | 3 | Existing scoped tokens and restrained palette retained; no new global theme. |
| Responsive behavior | 3 | Desktop/tablet/phone variants plus 320px reconnect errors; no document overflow. Dense account tables retain horizontal scrolling. |
| Design coherence | 4 | One primary connection task, local errors, same-account recovery, distinct removal and saved/applied state. |

Implementation integrity: **pass** for the bounded workflow; existing tokens, fixed destinations and saved/applied distinction remain coherent.

Audit health: **16/20 (Good)** for the inspected surface. The task-blocking lifecycle defects are assessed separately above; a visual score cannot establish backend correctness.

## Verification

- 58 relay/enrollment/model/security/runtime tests and six public/credential-boundary checks passed.
- Disposable PostgreSQL: 69 connection lifecycle, 155 authorization, 50 execution isolation and 94 general checks passed; 114 migration/rollback pairs passed static verification.
- Thirty synthetic responsive/accessibility variants cover both monitors, creation, rename/removal, recovery, lost acknowledgement, Connect replay, reconnect rejection, wrong-desktop denial, read-only access and sessions.
- Five built service images passed 50 packaging/isolation checks; installed local services passed 69 VM/network/TLS/role checks.
- Actual installed browser acceptance covers Accounts and Connections for Premium and Standard at desktop and phone sizes, private-asset authorization, no visible row error, matching paused-account acknowledgment and sign-out.
- Production build passed with 272 generated pages and the repository's configured lint skip. A 915-asset local scan found no new private lifecycle markers; one existing public Auth project identifier remains in its browser configuration. This is not a live public-site cleanliness claim.

No provider generation, public application deployment, physical mobile test, full screen-reader audit, real revocation of the owner's session or performance load test occurred. Rejection/reconnect races use synthetic credentials and real isolated PostgreSQL; the owner's already saved manual sign-in was verified without generating content. [ADR 0154](../../adr/0154-relay-connection-lifecycle-and-legacy-retirement.md) remains proposed with delivery evidence tracked separately.
