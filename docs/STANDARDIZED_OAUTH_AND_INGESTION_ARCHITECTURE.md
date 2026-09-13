# Authentication and credential ingestion boundaries

<!-- docs-scope: domain-reference -->
> Private source reference, reconciled September 13, 2026. Relay operations use [explicit enrollment](maintainers/RELAY_CREDENTIAL_ENROLLMENT.md); this reference distinguishes other existing application paths.

## Separate authorities

| Path | Authority and scope |
| --- | --- |
| Product sign-in | Verified application user/session for customer features |
| Relay operator access | Host-held admin authorization and delegated local monitor/desktop sessions |
| New relay account | Explicit validated create-only operator enrollment |
| Existing relay account refresh | Linked guest file validation and conditional encrypted-registry update |
| Legacy application ingestion | Verified account plus developer approval; credentials create a connection, not an account |

Product login is not provider enrollment and does not grant operational administration. A desktop is neither a user identity provider nor a serving worker.

## Supported relay workflow

Use privately injected input with the operator enrollment command. Validate account consistency, expiry and authenticated inventory before encrypted create-only persistence. Duplicate creation preserves existing authority and counters. Cold allocation independently checks inventory; actual inference capability still needs worker evidence.

Existing accounts sign in through the linked desktop. File-backed credentials are watched, validated and saved through recoverable intent plus compare-and-swap. Custom guest homes are explicitly selectable; keyrings are not exported. Unknown accounts are not auto-enrolled. Bulk host-cache discovery is retired.

See [ADR 0132](adr/0132-recoverable-desktop-credential-handoff.md) and [ADR 0133](adr/0133-explicit-validated-enrollment-and-test-isolation.md).

## Existing HTTP ingestion is a different path

[POST /api/auth/ingest](../src/app/api/auth/ingest/route.ts) and its [alias](../src/app/api/ingest/route.ts) remain in source. They call [GalxAuthEngine](../src/core/auth/GalxAuthEngine.ts); the handler currently selects the OpenAI provider. They were not replaced by the operator CLI or the desktop bridge during this session.

The account-bound handler requires same-origin browser intent or an explicit bearer credential, confirmed account email and existing developer approval. It bounds and validates inputs, binds credential ownership to that account, does not inherit submitted identity/workspace claims, never falls back to an environment key, and projects an explicit public result. It does not overwrite the signed-in account cookie. Native token issuance carries signed account provenance and no initial elevation; old native tokens without that provenance are rejected.

The previous process-local nonce/idempotency/optional-signature wrapper has been removed from this connection path. It was not durable authorization or cross-process replay protection. Connections remain separate from the operator enrollment workflow; no bulk import, automatic account creation, verified upstream capability or standards certification is implied. The current [workspace auth runbook](operations/workspace-auth.md) owns account/session behavior and deployment limits. Callback proof is account-bound; refresh selects an owned identity instead of accepting an internal record ID. Browser and JSON callbacks retain finite public failures and explicit output fields.

## Custody and evidence

PostgreSQL remains encrypted registry authority; in-memory routing state is replaceable. Registry events and desktop intents exclude plaintext credentials. Guest CLI files are intentional private sources, not host-cache replicas. Edge KV is not a long-lived provider-token store.

Public content and response contracts must not expose topology, provider authentication or execution mechanics. The [public information boundary](SECURITY.md) applies independently of this private reference.

Use [hardening checks](maintainers/RELAY_HARDENING.md), [inference verification](INFERENCE_PIPELINE_VERIFICATION.md) and [dated deployment evidence](maintainers/RELAY_SESSION_VERIFICATION_20260909.md). Test counts, digest support and synthetic login do not establish standards certification or live provider approval.
