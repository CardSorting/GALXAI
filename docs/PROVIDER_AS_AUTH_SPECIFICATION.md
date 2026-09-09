# Provider credentials and application identity

<!-- docs-scope: domain-reference -->
> Private component reference, reconciled September 9, 2026. The former provider-as-auth design does not define the current relay onboarding flow.

## Identity is separate from provider authority

A verified product user can access authorized application features. A provider credential authorizes an upstream account. A relay operator session administers local infrastructure. None of these identities automatically grants the others.

The current relay path uses explicit new-account enrollment and linked-desktop refresh. Bulk personal-cache ingestion is retired. A saved login or open desktop is not a healthy shard. See [enrollment](maintainers/RELAY_CREDENTIAL_ENROLLMENT.md) and [desktop operations](maintainers/RELAY_DESKTOPS.md).

## Component map

| Component | Source responsibility |
| --- | --- |
| [GalxAuthEngine](../src/core/auth/GalxAuthEngine.ts) | Application provider-auth compatibility, session verification/refresh, restricted tokens and account operations |
| [GalxOAuthManager](../src/core/auth/GalxOAuthManager.ts) | Configured provider exchanges and process-local refresh coalescing |
| [GalxCryptoVault](../src/core/vault/GalxCryptoVault.ts) | Encryption, key derivation and signed/encrypted token helpers |
| [Operator enrollment](../src/relay/operator-enrollment.ts) | Candidate account/expiry and inventory validation |
| [Desktop credential refresh](../src/relay/desktop-credential-refresh.ts) | Existing-account conditional authority replacement |
| [Shard repository](../src/lib/supabase/repositories/ShardRepository.ts) | Durable registry persistence under the selected mutation path |

Existing application ingestion remains a separate compatibility path. It is not certified by the operator enrollment tests and must not be presented as having identical admin, validation or conflict semantics. See [the ingestion boundary](STANDARDIZED_OAUTH_AND_INGESTION_ARCHITECTURE.md).

## Credential custody

Registry provider tokens use encrypted payloads with tenant/shard/provider binding. Deployment secrets supply vault roots and stable opaque ID derivation. Routing projections and journals cannot become independent credential authority or copy tokens into public storage.

The guest provider CLI deliberately stores a private file-backed login. Reads validate each owned guest path component and reject unsafe files. Custom homes must be selected explicitly; keyring-only storage requires reauthentication. No host-home scanning or browser token-upload interface is part of this bridge.

Buffer clearing is best effort in a garbage-collected runtime, not a mathematical guarantee of erasing every string/copy. Guest homes, backups, worker checkpoints and receipts have their own sensitive retention boundaries. These mechanisms do not establish SOC 2, HIPAA, FAPI or zero-retention certification.

## Refresh and recovery

Application provider refresh methods and the desktop bridge are different paths. A process-local single-flight map coalesces calls within that process; it is not cluster-wide refresh ownership or a zero-error guarantee.

The desktop observes operator-completed sign-in, validates account and inventory, flushes intent and replaces encrypted authority conditionally. Recovery finalizes committed state or retries unchanged authority; external newer revisions win. Journal/registry stores are separate. UI success requires the relevant checkpoint, then independent worker readiness. See [ADR 0132](adr/0132-recoverable-desktop-credential-handoff.md).

## Authorization and operational response

Verify identity through its authoritative authentication path. Decoded claims, task IDs, account hints, caller tenant headers and ordinary sessions do not establish admin authority. Public contracts use explicit field allowlists; internal identifiers and provider diagnostics stay private.

A credential 401 can suppress a revision; 403/5xx/timeouts alone do not prove permanent invalidity. Repair by obtaining valid authority, not resetting health/quota or replaying old caches. New enrollment is create-only; vault rotation is a separate [operator procedure](maintainers/MULTI_TENANT_SHARD_AND_KEY_ROTATION.md).

## Evidence and limitations

The [session record](maintainers/RELAY_SESSION_VERIFICATION_20260909.md) dates tests, deployment and remaining live sign-in work. Historical throughput equations, zero-millisecond recovery claims and synthetic account fixtures are not current guarantees. External client repositories and legacy application-auth routes require their own verification.
