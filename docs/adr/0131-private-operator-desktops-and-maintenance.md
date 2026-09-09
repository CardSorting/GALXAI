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

## Lifecycle and security consequences

Closing a viewer leaves the workspace running. Stop preserves home; deletion requires the exact workspace name and removes owned resources. A graceful controller stop removes unheld workers; preservation across reload requires an existing hold. Session renewal invalidates the old cookie and expiry/revocation closes display sockets.

Cookie grants are process-local and last at most 12 hours. Tickets expire after 60 seconds and are consumed once. Remote access through an ordinary tunnel is not supported by these loopback checks. Container isolation is not a VM or hardware boundary.

## Alternatives

A shared shell would couple accounts and profiles. Reusing inference credentials for operator access would collapse privilege boundaries. Killing a worker on every health fault would discard repair context. The chosen design gives an administrator bounded intervention while preserving registry authority and automatic lifecycle outside holds.

## Verification and limits

Authorization, session renewal, generation/link races, pause/resume, bounded I/O, structured activity and real Docker/Chrome interaction were exercised. Native controls support keyboard escape and text composition. Physical phone input and semantic accessibility inside streamed guest pixels remain unverified. A running desktop is not evidence of provider sign-in or serving readiness.

Operations: [desktop guide](../maintainers/RELAY_DESKTOPS.md), [API reference](../RELAY_API_REFERENCE.md), [security](../SECURITY.md).
