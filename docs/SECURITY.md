# Security boundaries and threat model

Reviewed 2026-09-07 against the repository. This document describes implemented boundaries and explicit limits; it is not a compliance certification or a guarantee against every attack. Vulnerability reporting remains in [the root security policy](../SECURITY.md).

## Trust boundaries

| Boundary | Authority | What does not grant authority |
| --- | --- | --- |
| Product end user to application | Application authentication and tenant authorization | User-supplied owner IDs or prompt claims |
| Application/client to relay | Configured relay inference key | Provider OAuth token, task ID, `X-Tenant-Id` |
| Operator to relay controls | Configured administrator key | Merely holding an inference key |
| Relay to provider | Decrypted backend registry credential | Model output, client endpoint/permission suggestions |
| Registry mutation and platform leasing | Backend services and database policies/RPCs | A cached projection or local scheduling counter |
| Agent inference to tool execution | The executing application's deterministic controls | A confident model response or tool-call description |

A shared app-to-relay key is one relay principal. The application remains responsible for distinguishing its end users. Relay administrator access does not bypass per-key job ownership.

## Relay containment

The deployed container uses UID/GID 1000, a read-only root filesystem, dropped Linux capabilities, no privilege escalation, resource limits, bounded temporary storage, and a private checkpoint volume. No home, personal Codex credential, repository, or Docker socket mounts are provided. Host credential discovery is off by default.

Inference and output remain available to user applications. The relay has no local model-selected tool executor; tool-call content is not the host security boundary. Existing protocol handling does not establish complete tool-protocol compatibility. Application adapters and SDK runtimes contain separate paths and require separate execution-boundary review. Running Node directly on the host does not inherit container isolation.

Docker settings do not impose an egress firewall, remove the need for TLS, sandbox every app-side tool, or eliminate the consequences of a runtime compromise. The relay still holds backend registry/vault credentials in its process environment and decrypted provider material in memory while operating. Stronger brokered credential scoping is follow-up work.

## Access and request controls

Non-loopback listeners require keys. Dedicated administrator keys protect `/api/*` and `/metrics`; absent an explicit administrator list, only the first inference key has those privileges. Dashboard HTML and aggregate health are public, while operational snapshots require administrator access.

Exact browser origins, loopback Host validation in unauthenticated mode, non-cacheable API data, no-referrer, no-sniff, and frame denial reduce exposure. Dashboard keys stay in page memory. Origin policy is independent of authentication and is not a substitute for it.

Requests have body limits, read deadlines, validation, admission checks, and rate buckets. Quota-management bodies use the smaller of 16 KiB and the general request bound. Retries are finite and resource-limited; cancellation is checked after asynchronous registry waits. These controls limit failure amplification, not all denial-of-service possibilities.

## Credential custody and recovery

PostgreSQL is the durable shard registry. Backend decryption binds encrypted credentials to their configured identifiers/provider through authenticated encryption. Vault roots and database service credentials must remain server-side and match the active records. Repository encryption mechanisms do not imply a hardware enclave or guaranteed JavaScript heap erasure.

The relay refreshes a local registry projection and excludes unusable credentials. JWT expiry decoding is an exclusion hint, not signature verification. Upstream rejection disables the local credential and attempts a checkpoint. Replacement fingerprints support recovery, but this local state is not a cross-replica revocation bus or a database lease.

The platform's database-backed lease procedures have their own authority rules in [ADR 0115](adr/0115-postgresql-authoritative-shard-registry-and-secret-free-projections.md). Verify the actual database grants/migrations before relying on them in an environment. This documentation update performs no database migration or privilege change.

## Retention and evidence

Sanitized telemetry excludes request/response content and authorization headers. Relay checkpoints omit provider tokens, but unfinished job records can include prompts/messages. Memory buffers, snapshots, application storage, logs, and external provider retention are separate concerns. Do not describe the full system as zero retention, zero knowledge, HIPAA-compliant, or SOC 2 certified based on an internal feature name or source module.

The 2026-09-07 relay rollout verified authentication, registry access, expired-account exclusion, chat/SSE, and runtime isolation. It did not establish remote ingress, cross-replica security, complete tool compatibility, or provider entitlements. Keep keys, account identifiers, prompts, and raw runtime environment dumps out of documentation and incident reports.

[Relay security](relay-security.md) · [Deployment](VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md) · [Verification](INFERENCE_PIPELINE_VERIFICATION.md)
