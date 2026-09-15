# Authentication and credential enrollment boundaries

<!-- docs-scope: domain-reference -->

Private source reference, reconciled September 15, 2026. [ADR 0152](adr/0152-manual-desktop-only-shard-authority.md) replaces external provider ingestion. [Workspace authentication](operations/workspace-auth.md) continues to own GALX account sessions.

## Separate authorities

GALX signup, verified account login, logout, session renewal, developer approval and staff authorization do not enroll provider credentials. The local administrator workspace uses separate host-authorized sessions. Neither ordinary account access, preview approval nor an inference key grants access to Relay Desktops.

## One provider enrollment path

Manually create a Relay Desktop, sign in inside it, then explicitly choose **Enroll shard**. The controller reads the saved guest login, checks fresh expiry and identity, validates inventory, encrypts and commits the unique desktop binding. The browser accepts no pasted provider credential. Creation, polling and link changes alone never enroll an account. The [enrollment runbook](maintainers/RELAY_CREDENTIAL_ENROLLMENT.md) owns new-account, existing-account confirmation, recovery and migration steps.

Only that bound desktop can synchronize later saved logins. Provider session expiry requires manual sign-in there; automatic saved-file synchronization is not automatic provider renewal. Revoked/dead accounts cannot be restored by replaying a login. Model/inventory access is independent of verified inference/image capability.

## Closed application and CLI paths

The legacy OpenAI/ingest aliases, provider OAuth URL, PAR, callback and refresh endpoints return HTTP 410 with the allowlisted body `{"error":"Provider connections are unavailable."}` and private/no-store caching, without parsing or forwarding credentials or changing cookies. The [private API reference](RELAY_API_REFERENCE.md#manual-credential-authority) lists exact paths, methods and the separately authorized desktop enrollment request. CLI add/import and ambient discovery fail before enrollment. General repository saves update only policy metadata, never credentials or ownership. Account session APIs and GALX device grants keep their existing verified-user boundaries.

The database enforces writer-role restrictions, paired enrollment columns and a unique desktop binding. Service-role credentials cannot create records or call private enrollment/refresh functions. Controller and database lease admission exclude unconfirmed legacy rows. Credentials, original source labels and operational history remain retained. Deliberate vault ciphertext rewrap uses the separate private transactional administrator CLI and preserves plaintext and enrollment; no public rewrap path writes provider authority.

## Privacy, verification and limits

Use explicit public DTOs, finite errors and private/no-store responses. No routing, role, desktop, credential-source or upstream diagnostic details belong in public pages or bundles. Private administrator state may identify the workspace but never exposes its credential contents.

Tests must cover closed external routes, anonymous/ordinary/monitor-session rejection, unknown JSON fields, changed links, stopped desktops, concurrent enrollment, wrong-desktop refresh, revoked/expired accounts, generic database-role denial and rollback. Run the production build and scan rendered/browser assets. [Current state](../post-mortem/CURRENT_STATE.md) distinguishes local tests, migration application, deployment and real sign-in acceptance.
