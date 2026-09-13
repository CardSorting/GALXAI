# ADR 0147: Verified account and session authority

<!-- docs-scope: decision-record -->

Date: 2026-09-13. Owner: security/account maintainer. Status: proposed; security corrections are deployed with bounded production account acceptance under the requested auth audit. Decision acceptance and production delivery remain separate in the [lifecycle register](../knowledge/DECISIONS.md).

## Context and options

The workspace gate exposed a broader mismatch: cached browser users, provider credentials and session identifiers could be mistaken for account authority. Legacy elevation granted privileges without a fresh-proof ceremony. Removing only the page bypass would leave those independent boundaries inconsistent.

Continuing to trust provider metadata or local-storage profiles preserves compatibility but does not establish an account. Treating any bearer string as a session identifier permits unowned revocation. A verified account authority with separate connection, device and administrator permissions provides a testable boundary and familiar browser-local logout.

## Proposed contract and delivered correction

Use Auth-service verification plus an uncached, owner-bound active-session lookup for the canonical account and confirmed email for account/staff operations. Native credentials carry signed provenance from an already verified account, active owner-matching database state and bounded scopes. Creation, lookup, rotation and revocation require authoritative storage results; a cache cannot grant access or acknowledge a failed write. Previous-token acceptance is limited to its recorded grace window. Credentials without that provenance fail closed. Connection registration binds existing account ownership and cannot manufacture a new person, reuse an environment credential, or confer sudo/paid privileges. Credentials travel in headers/cookies, never query parameters.

Project explicit public profile/device/token DTOs. Require same-origin browser intent for session mutations, verified ownership for remote revocation and server-only administrator authorization for diagnostics. Retire unverified elevation until a fresh-proof, expiring, replay-resistant ceremony exists. Restricted/device credentials have separate identities, parent-bounded scope/expiry and cannot manage browser account sessions. Device approval/polling require durable RPC results.

Browser state is a presentation of server verification. Fence obsolete requests, clear the previous owner on change, and never turn key/SSO failures into signed-in users. Sign out targets the current browser, hides private content immediately, shares pending state across tabs, preserves verified rotated cookies on a temporary revocation failure, and provides an explicit retry. Successful sign-out verifies that the current session is no longer active, clears credential cookies and opens a new document. A copied JWT cannot authorize a subsequent GALX account request after that acknowledgement; independent browser sessions continue.

## Consequences and limits

Legacy native tokens must be replaced, connection clients must first authenticate an account, and the old elevation endpoint stays closed. Removing process-local connection replay wrappers does not create a durable idempotency guarantee. The additive active-session migration closes the copied-JWT window at GALX account authorization boundaries. Unavailable authority yields a retryable 503; in-flight authorized requests and unrelated JWT consumers are outside that guarantee. Fresh proof remains a separate requirement for privilege elevation. Native device endpoints do not provide a full Supabase device inventory. The new lookup requires migration before dependent code. Native persistence uses configured PostgreSQL or, without it, an administrator Data API client; storage failure never grants cached authority. Live migration/deployment/test-account evidence is retained separately in current state.

## Relationships and confirmation

This proposes a topic-specific replacement of the account-creation claims in [ADR 0020](0020-provider-as-auth-zero-friction-session-substrate.md), implicit sudo grant in [ADR 0023](0023-step-up-sudo-elevation-and-fine-grained-token-scoping.md), and HTTP connection-wrapper guarantees in [ADR 0054](0054-apex-transport-hardening-rfc9530-rfc9421-idempotency-and-anti-replay.md). Their original decision history remains unchanged. Relay operator enrollment and encrypted registry custody are separate contracts.

Follow the [current workspace auth runbook](../operations/workspace-auth.md) and [source audit](../knowledge/audits/2026-09-13-session-lifecycle.md). Retain authorization/adversarial tests, production build, compiled responses/assets and browser recovery evidence. ACT-013 retains successful hosted account replacement, refresh/logout and copied-token denial in the [release receipt](../../post-mortem/incidents/2026/2026-09-13-workspace-auth/session-revocation-release.json). Real external-provider callbacks and device-RPC acceptance are outside that result; fresh-proof and device prevention remain open under ACT-014. This record does not auto-accept itself or authorize release.
