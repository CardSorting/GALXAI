# OAuth and token lifecycle boundaries

<!-- docs-scope: domain-reference -->
> Private implementation reference, reconciled September 9, 2026. Distinguish application OAuth features from relay desktop sign-in and registry authority.

## Lifecycle map

| Credential/session | Acquisition and renewal | Boundary |
| --- | --- | --- |
| Product user session | Application authentication service and its verified session flow | Customer identity; not relay admin |
| Operator browser session | Host launcher ticket exchange; reconnect to renew | Local monitor/desktop grant, process-local |
| Provider CLI login | Operator approval through browser/device flow | Private file-backed guest credential |
| Registered provider credential | Validated enrollment or conditional existing-account refresh | Encrypted PostgreSQL authority |
| Internal worker access | Controller-assigned scoped keys | Private inference/admin transport |

Current relay setup does not require an application OAuth endpoint to discover host credentials. Bulk population is retired. The provider CLI owns its sign-in interaction; GALX observes the resulting saved login rather than running an independent refresh-token daemon.

## Current desktop synchronization

Create/verify the guest login directory before CLI startup. Present device code, fixed provider URL, expiry and cancellation using native controls. A successful challenge is not completed identity approval/MFA.

Select custom saved homes explicitly inside the guest home. Reject symlinks, unsafe ownership, special/oversized files, missing selected paths, malformed tokens and inconsistent account hints. Keyring/in-memory credentials are not exported; reauthenticate into dedicated file-backed storage.

Validate candidate account, expiry and inventory against current linked authority. Record durable intent, apply conditional encrypted update and checkpoint accepted fingerprint. Recovery never overwrites newer external authority. Distinguish saved login, saved registry revision, worker application and traffic readiness.

See [ADR 0132](adr/0132-recoverable-desktop-credential-handoff.md) and [credential recovery](maintainers/RELAY_CREDENTIAL_ENROLLMENT.md).

## Existing application OAuth components

[GalxOAuthManager](../src/core/auth/GalxOAuthManager.ts) implements configured provider exchanges and a process-local refresh promise map. [GalxAuthEngine](../src/core/auth/GalxAuthEngine.ts) contains session/provider refresh and authorization operations. These components have distinct callers, storage and tests; their existence does not prove that the desktop invokes them or that their concurrency control spans replicas.

Historical application device authorization, pushed authorization, introspection, revocation and back-channel logout designs remain in their component source/ADRs. They are not the installed CLI's device-flow implementation. Do not describe the combined repository as certified OAuth 2.1/FAPI conformance without a dedicated conformance assessment.

The [legacy HTTP ingestion routes](STANDARDIZED_OAUTH_AND_INGESTION_ARCHITECTURE.md) were not migrated to the new create-only operator path in this session. Their process-local caches and optional transport fields are not durable or administrator authorization guarantees.

## Storage and concurrency

The encrypted shard registry is durable authority. Projections are replaceable. Database registry events commit with their corresponding registry mutation; the separate desktop journal uses recoverable intent, not the database transaction. Never conflate these two journal guarantees.

Stable identity prevents duplicate logical registration, while create-only persistence prevents a collision from overwriting state. Refresh is an explicit conditional mutation. Provider token rotation, product-session renewal, vault-key rewrap and browser operator-session renewal are separate operations.

Use [key rotation](maintainers/MULTI_TENANT_SHARD_AND_KEY_ROTATION.md) for vault changes. Do not replace a vault secret in place or resurrect an old provider credential to recover availability.

## Failure and acceptance

Report expired/cancelled sign-in, wrong account, rejected candidate, updated-elsewhere and checkpoint failure separately. Retry transient I/O with bounds; no false synced claim after journal failure. A 401 rejection is revision-specific; generic transport failures are not permanent authority decisions.

Use isolated synthetic accounts and an explicit local test database for mutating integration. Keep tokens, account details and execution diagnostics out of public contracts. [Dated verification](maintainers/RELAY_SESSION_VERIFICATION_20260909.md) documents which browser, storage and provider-challenge checks ran; it does not certify physical phones, guest semantic accessibility or completed live sign-in.
