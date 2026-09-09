# ADR 0122: Isolated authenticated relay and bounded recovery

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

- Status: Historical containment/transport foundation, deployed September 7; shared lifecycle superseded by ADR 0126 and federation operator access by ADR 0131.
- Decision scope: standalone Node relay, Docker deployment, app-to-relay authentication
- Supersedes: relay deployment and behavior claims in ADRs 0112, 0113, and 0120
- Complements: ADR 0115 (registry authority), ADR 0114 (execution authority), ADR 0121 (image asset lifecycle)

## Context

The relay is a critical transport dependency. Expired registry credentials, unbounded management bodies, overlapping dashboard refreshes, ambiguous recovery states, and excessive container privileges made failures harder to contain. Public input can influence model output; it must not grant tools authority over the operator's device.

The previous documentation mixed simulation behavior, adjacent repositories, and product aspirations with the deployed relay. Provider quotas, recovery latency, uptime, refunds, and complete tool compatibility cannot be inferred from a transport implementation.

## Original standalone decision — September 7

1. Run the relay from this repository's `src/relay/relay-server.ts`. The deployed container publishes `127.0.0.1:3001`, runs as UID/GID 1000, has a read-only root filesystem, drops all capabilities, prohibits privilege escalation, and limits processes, CPU, and memory. Only the Docker checkpoint volume is persistent writable storage; temporary storage is bounded. No host home, personal credentials, repository, or Docker socket is mounted.
2. Keep inference and execution separate. User applications can interpret inference and tool-call output in their own runtimes. The relay does not execute model-selected local shell commands or create user workspaces on the host. Existing protocol handling is retained, not upgraded to a complete tool-execution protocol. No prompt-based refusal is used as the host security boundary.
3. Require configured keys for non-loopback listeners. `RELAY_API_KEYS` grants inference access. `RELAY_ADMIN_API_KEYS` grants `/api/*` and `/metrics` access; administrators can also submit inference. If the administrator list is omitted, only the first inference key receives administrator access. Jobs belong to the authenticated key principal; administrator status does not bypass job ownership.
4. The app uses `VM_RELAY_API_KEY`, falling back to the first configured inference key, for relay chat, stream attachment, and image requests. It does not forward provider credentials on those requests. Provider secrets remain backend registry material. At that date host discovery was disabled by default/Compose. Enabling it is now rejected under ADR 0133; use explicit validated enrollment.
5. Allow same-origin browser access by default; require an exact configured origin for authenticated cross-origin integrations. Local unauthenticated requests require a loopback Host header. Operational data is authenticated and not cacheable. The original standalone dashboard used a page-held key. Federation monitoring now uses host-delegated sessions under ADR 0131; do not use that earlier browser-key pattern for current operations.
6. Read the authoritative PostgreSQL registry into a memory-only projection with coalesced, bounded-staleness refresh. Exclude revoked, retracted, unsupported, undecryptable, and expired credentials. The earlier of supplied expiry and JWT expiry governs exclusion; decoding JWT expiry is not authentication. Upstream rejection disables a local credential and checkpoints its fingerprint; concurrent failures cannot reopen it. Rotation can clear disabled state when the changed credential can be identified.
7. Use least-in-flight selection with rotating tie-breaking, per-process shard concurrency, bounded attempts, jittered backoff, a shared process-local retry budget, and an absolute request deadline. The default three-hour window is an observation window with no local call cap. Provider feedback is separate from an optional operator cap.
8. Give chat requests an asynchronous job contract: HTTP 202, job status, and a separate SSE stream. Replay is limited to retained in-memory output. Restarted unfinished jobs fail; they are not replayed upstream automatically. Cancellation and status remain available without registry refresh. Cancellation returns no refund transaction.
9. Bound management bodies, intake time, mutation admission, and request rate. Reject late failover acquisition after cancellation. Present retry count, next retry time, terminal state, credential recovery, registry pauses, and stale telemetry honestly.
10. Deploy through a canary, preserve the existing credential checkpoint, verify a short live inference, drain before cutover, and retain a rollback image. A local host remains a single availability dependency.

## Consequences and limits

- Registry ownership is durable; the original standalone scheduling/concurrency/retry state was local. Current federation rejection revisions and maintenance holds have private persistent journals under ADRs 0131–0133; receipts remain process-local. This relay does not use the platform's PostgreSQL lease RPCs for each selected shard. Do not scale replicas assuming a global concurrency limit or immediate shared revocation.
- Checkpoints exclude provider tokens but can contain unfinished request content. They need access controls and retention; they are not a zero-data-retention guarantee.
- Provider WebSockets are opened per attempt, not a pool of permanently warm sessions. Mid-stream continuation may alter output and is not exactly-once generation.
- Health/readiness is a process/admission signal, not proof of provider authentication or available shard capacity.
- Docker containment is not a per-user execution sandbox and does not impose an outbound firewall. Ingress TLS, remote deployment, and network destination restrictions require separate configuration and verification.
- The app adapter still contains direct-provider fallback paths. Relay containment does not establish the security of every app-side or external agent execution path.
- This deployment does not certify uptime, security compliance, provider entitlements, or performance targets.

## Evidence and ownership

Implementation: `src/relay/{relay-server,request-policy,quota-policy,shard-registry,telemetry}.ts`, `Dockerfile.relay`, `docker-compose.relay.yml`, `src/core/router/adapters/OpenAIAdapter.ts`.

Checks: relay hardening, adaptive quota, client authentication, and Docker verification scripts; TypeScript; live canary and post-cutover chat/SSE; runtime UID, mounts, capabilities, and write-denial checks. These are dated observations, not permanent guarantees.

[Deployment runbook](../VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md) · [Access and recovery](../relay-security.md) · [Relay API](../RELAY_API_REFERENCE.md)
