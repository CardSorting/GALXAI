# Security and key rotation

<!-- docs-scope: current-guide -->

Private maintainer procedure.

Identify the authority first: GALX customer identity, pool inference key, monitor operator/viewer principal, registrar, runtime, main database/vault root or provider login. Their scopes and rotation procedures differ. Only central services receive main-project account authority; each pool keeps its own execution credentials and state.

Use [key rotation](../maintainers/MULTI_TENANT_SHARD_AND_KEY_ROTATION.md) for deliberate vault/database changes and [manual registration](../maintainers/RELAY_CREDENTIAL_ENROLLMENT.md) for provider renewal. Re-encryption preserves identity, plaintext, provenance and assignment; it cannot transfer or revive an account. Central removal retains evidence and does not invalidate an upstream session remotely.

Verify scoped authorization, peer denial, own-daemon custody and fixed installation identity. Keep tokens out of browser bundles, argv and evidence. Preserve accepted-operation references when changing principals. Close execution before incompatible rollback; never restore broad writers or peer fallback for availability.

The shared Mac/admin remains trusted; local VM isolation is not physical-machine independence or compliance certification. Use [security](../SECURITY.md), [service acceptance](../runbooks/relay-pool-services.md) and [current state](../../post-mortem/CURRENT_STATE.md).
