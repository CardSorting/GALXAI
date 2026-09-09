# Security boundaries

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](FEDERATION_STRATEGY.md) and [complete catalog](CATALOG.md).

This guide describes the current federation boundary, not a compliance certification. Vulnerability reporting remains in the [root security policy](../SECURITY.md).

| Boundary | Authority |
| --- | --- |
| User to application | Application authentication and tenant authorization |
| Application to controller | Configured inference credential and trusted tenant mapping |
| Operator to controller | Host-held administrator credential delegates separate local monitor/desktop sessions |
| Desktop to credential authority | Safe guest file read, validation, durable intent and revision-conditional replacement |
| Controller to worker | Scoped internal inference/admin credentials and authenticated delegation |
| Worker to provider | Its one assigned upstream credential |
| Registry and account health | Backend database policies, current leases, credential revisions |
| Agent to tools | Consuming runtime's explicit execution controls |

Task IDs, prompts, model output, and caller-supplied tenant headers grant no authority. Signed job identity binds tenant and worker generation. Administrator access does not bypass job ownership.

## Containment and custody

Each shard worker is a non-root isolated container with a read-only root, dropped capabilities, resource limits, bounded temporary storage, and a private checkpoint volume. Workers receive no database/vault keys, repository, host home, or Docker socket mounts. They hold their assigned provider credential in memory and configuration.

The host controller holds registry decryption and Docker authority. Its host-process boundary is different from worker isolation. Protect the supervisor, persistent signing secret, lock, and ignored configuration directory. Single-host ownership does not provide multi-host consensus. Container settings do not establish an egress firewall or isolate application-side tools.

Each repair desktop has an independent guest home, browser profile and network, with bounded resources and explicit deletion. It is a Linux container, not hardware isolation. Guest login files can contain provider credentials; custom sources must remain within the owned guest home and pass path/ownership checks. Keyrings are not exported.

Explicit operator enrollment validates before create-only persistence. Bulk host-cache discovery is retired. Existing-account sync uses a flushed private intent and conditional registry update, not a distributed atomic transaction. Checkpoint failure must remain explicit. Mutating integration tests require a dedicated loopback database before repository imports and strip inherited Data API credentials.

## Request and observation controls

Controller operational data requires server-side administrator authority or the appropriate delegated local session. Anonymous monitor/desktop entrypoints expose generic connection guidance only; operational HTML, scripts, noVNC modules and data are authorized. Host launchers issue short-lived one-use tickets and HttpOnly sessions. Ordinary inference keys cannot issue grants. Admin keys never belong in browser storage. Foreign origins, nonlocal clients and forwarding headers are rejected; display connections are rechecked on expiry/revocation. Product browser clients use their application backend. Input sizes, read deadlines, concurrency, receipts, polling, and shutdown are bounded.

Health is changed only under current authority. Stale generation/inventory/health observations cannot restore routing. Telemetry is observation-only. Capability denial removes that pair; it does not authorize deleting the account or cancelling otherwise valid streams.

Execution metadata belongs only in internal transport and administrator-authorized records. Public image responses contain sanitized artifacts or allowlisted JSON, with generic errors and opaque request IDs. Model aliases do not establish an exact underlying model or authorize replay of ambiguous work. See [ADR 0129](adr/0129-public-image-artifacts-and-verified-identity.md) and the [image boundary guide](maintainers/image-public-boundary.md).

JWT identity is verified by the authentication service; decoded claims, bare UUIDs, and developer/session identifiers are not credentials. Verification failures deny access. Browser cookie chunks are reassembled before verification. Ordinary sessions do not acquire priority or sudo from user-editable claims, and ordinary authentication never grants operational administrator access.

## Retention

Sanitized telemetry is separate from job/checkpoint storage, which may contain unfinished request content. Bounded receipts may contain response bytes. Provider retention, application assets, and consuming agent storage are separate policies. Do not claim universal zero retention, zero knowledge, HIPAA compliance, or SOC 2 certification from these mechanisms.

Keep credentials, raw runtime environments, prompts, and private operational identifiers out of logs and shared incident reports. For implementation scope and dated deployment evidence, use the [contract](FEDERATION_STRATEGY.md), [runbook](RELAY_VNEXT_RUNBOOK.md), and [ADR catalog](adr/README.md).
