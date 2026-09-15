# ADR 0131: Private operator desktops and maintenance holds

<!-- docs-scope: decision-record -->

Date: 2026-09-09. Status: implemented; local production controller and desktop verified.
Audience: private maintainers. Extends [ADR 0126](0126-capability-aware-shard-relay-federation.md). Verification is dated in [the session record](../maintainers/RELAY_SESSION_VERIFICATION_20260909.md).

## Context

A container list cannot explain whether an account is valid, a worker can serve a model, or an operator can repair it. Requiring a raw admin key in a browser also confuses read-only monitoring with mutation authority. Automatically retiring every rejected worker prevents useful inspection during an intentional repair.

## Decision

Provide a read-only monitor and a separately authorized desktop workspace interface. Host launchers exchange server-held administrator credentials for one-use, short-lived tickets, then origin-bound HttpOnly sessions. No browser admin-key storage. Locality, host, origin and forwarding-header checks apply to sessions, assets, data and display upgrades. Ordinary inference credentials cannot issue these grants.

Anonymous entry pages expose only generic connection guidance. Operational HTML, JavaScript, data and noVNC modules require the appropriate session. Public application assets must not contain topology or diagnostic information.

Each desktop is a separate bounded Linux container with Terminal and Chromium, an isolated home/profile and a macOS-inspired interface. It has no host home, source, Docker socket, registry credentials or vault roots. Desktop identity is distinct from shard authority and worker generation. Links are explicit and checked against expected state; creating a desktop does not enroll an account.

Manual maintenance holds persist in a private journal. They stop new admissions and replacement starts and preserve an existing worker, including one with rejected credentials, for repair. Accepted work can finish. Removal, revocation, expiry or rotation of registry authority still retires old authority. Resume is explicit and does not erase rejection, cooldown or capability evidence.

The interface distinguishes availability, traffic policy, worker health, desktop connectivity and setup progress. Structured activity supplies time, safe event codes, correlation and next actions without prompts, guest output or credential payloads. Quick views reduce navigation without changing authority.

Workspace organization has a separate full-width view. **By health** derives attention, healthy, paused, setup and unconfirmed groups from fresh desktop and linked-shard evidence; a connected desktop alone cannot qualify as healthy serving capacity. **All groups** presents custom named tabs as columns, with an Ungrouped destination. Operators can create, rename, remove and reorder up to twelve tabs, drag workspaces between tabs or column positions, and use an equivalent Move dialog with explicit destination and position. Insertion lines identify the intended position. On narrow screens, the whole organizer scrolls instead of confining workspaces to a small nested pane. Returning to a desktop preserves its existing viewer connection.

Names, membership and order are controller-wide private presentation metadata in a separate mode-0600 `<desktop-journal>.organization.json` file. Atomic journal replacement and revision preconditions prevent partial saves and stale-window overwrites. A removed tab returns its workspaces to Ungrouped; newly created desktops appear there and deleted identities are pruned from snapshots. Missing organization metadata starts empty; malformed or unconfirmed storage disables organization changes without changing desktop records or claiming saved state. Organizing never changes account identity, credentials, links, traffic policy or worker lifecycle. The API, HTML and organizer assets require the existing desktop administrator session and exact-origin mutation checks.

## September 14 enrollment extension

[ADR 0152](0152-manual-desktop-only-shard-authority.md) retains desktop/session isolation and maintenance holds while making the manually created desktop the sole enrollment source. Explicit **Enroll shard** after guest sign-in creates or confirms a unique durable binding. Matching, linking, creation and polling cannot enroll. Saved-file sync requires the bound desktop and follows manual provider renewal. Deletion does not release the database binding; preserve the home for repair and use [the current enrollment procedure](../maintainers/RELAY_CREDENTIAL_ENROLLMENT.md). The September 9 acceptance below remains historical.

## Lifecycle and security consequences

Closing a viewer leaves the workspace running. Stop preserves home; deletion requires the exact workspace name and removes owned resources. A graceful controller stop removes unheld workers; preservation across reload requires an existing hold. Session renewal invalidates the old cookie and expiry/revocation closes display sockets.

Cookie grants are process-local and last at most 12 hours. Tickets expire after 60 seconds and are consumed once. Remote access through an ordinary tunnel is not supported by these loopback checks. Container isolation is not a VM or hardware boundary.

## Alternatives

A shared shell would couple accounts and profiles. Reusing inference credentials for operator access would collapse privilege boundaries. Killing a worker on every health fault would discard repair context. The chosen design gives an administrator bounded intervention while preserving registry authority and automatic lifecycle outside holds.

## Verification and limits

Authorization, session renewal, generation/link races, pause/resume, bounded I/O, structured activity and real Docker/Chrome interaction were exercised. Native controls support keyboard escape and text composition. Physical phone input and semantic accessibility inside streamed guest pixels remain unverified. A running desktop is not evidence of provider sign-in or serving readiness.

Organization fixtures exercise persistence, membership uniqueness, names and limits, conflicts, corrupt and failed storage, authorization, origin checks and unchanged desktop journals/driver calls. Browser checks use the real private organization API and storage with synthetic workspaces and a substituted display client. They cover drag destinations and order, keyboard moves, tab editing, recoverable conflicts, reload persistence, viewer retention and responsive accessibility. These checks do not establish physical phone drag support; the Move dialog provides the touch alternative.

Operations: [desktop guide](../maintainers/RELAY_DESKTOPS.md), [API reference](../RELAY_API_REFERENCE.md), [security](../SECURITY.md).
