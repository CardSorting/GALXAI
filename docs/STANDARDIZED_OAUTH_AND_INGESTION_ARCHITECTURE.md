# Authentication and credential ingestion boundaries

<!-- docs-scope: domain-reference -->
> Private source reference, reconciled September 9, 2026. Relay operations use [explicit enrollment](maintainers/RELAY_CREDENTIAL_ENROLLMENT.md); this reference distinguishes other existing application paths.

## Separate authorities

| Path | Authority and scope |
| --- | --- |
| Product sign-in | Verified application user/session for customer features |
| Relay operator access | Host-held admin authorization and delegated local monitor/desktop sessions |
| New relay account | Explicit validated create-only operator enrollment |
| Existing relay account refresh | Linked guest file validation and conditional encrypted-registry update |
| Legacy application ingestion | Existing HTTP handler and auth engine; separate implementation and acceptance scope |

Product login is not provider enrollment and does not grant operational administration. A desktop is neither a user identity provider nor a serving worker.

## Supported relay workflow

Use privately injected input with the operator enrollment command. Validate account consistency, expiry and authenticated inventory before encrypted create-only persistence. Duplicate creation preserves existing authority and counters. Cold allocation independently checks inventory; actual inference capability still needs worker evidence.

Existing accounts sign in through the linked desktop. File-backed credentials are watched, validated and saved through recoverable intent plus compare-and-swap. Custom guest homes are explicitly selectable; keyrings are not exported. Unknown accounts are not auto-enrolled. Bulk host-cache discovery is retired.

See [ADR 0132](adr/0132-recoverable-desktop-credential-handoff.md) and [ADR 0133](adr/0133-explicit-validated-enrollment-and-test-isolation.md).

## Existing HTTP ingestion is a different path

[POST /api/auth/ingest](../src/app/api/auth/ingest/route.ts) and its [alias](../src/app/api/ingest/route.ts) remain in source. They call [GalxAuthEngine](../src/core/auth/GalxAuthEngine.ts); the handler currently selects the OpenAI provider. They were not replaced by the operator CLI or the desktop bridge during this session.

The handler has its own process-local rate, nonce and idempotency caches, optional digest/signature/timestamp processing and response shaping. Those mechanisms must not be described as the operator path's admin gate, create-only conflict policy, inventory validation or durable deduplication. A supplied digest alone is not authorization. Do not claim multi-provider acceptance from historical examples.

This route's authorization, optional transport checks, response-field projection and replay behavior require their own source-level review before relying on them for a new enrollment integration. Its continued presence does not justify re-enabling bulk import. This documentation reconciliation does not change the route.

## Custody and evidence

PostgreSQL remains encrypted registry authority; in-memory routing state is replaceable. Registry events and desktop intents exclude plaintext credentials. Guest CLI files are intentional private sources, not host-cache replicas. Edge KV is not a long-lived provider-token store.

Public content and response contracts must not expose topology, provider authentication or execution mechanics. The [public information boundary](SECURITY.md) applies independently of this private reference.

Use [hardening checks](maintainers/RELAY_HARDENING.md), [inference verification](INFERENCE_PIPELINE_VERIFICATION.md) and [dated deployment evidence](maintainers/RELAY_SESSION_VERIFICATION_20260909.md). Test counts, digest support and synthetic login do not establish standards certification or live provider approval.
