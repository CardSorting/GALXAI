# Relay access, containment, and recovery

Current decision: [ADR 0122](adr/0122-isolated-authenticated-relay-and-bounded-recovery.md). Reviewed 2026-09-07. This is the standalone relay boundary; application and external agent runtimes have separate responsibilities.

## Keys

- `RELAY_API_KEYS`: comma-separated inference keys. Each authenticated key owns its jobs and local deduplication scope.
- `RELAY_ADMIN_API_KEYS`: operator keys for `/api/*` and `/metrics`; these keys can also submit inference. Administrator status does not bypass another key's job ownership.
- If the administrator list is omitted, the first inference key receives administrator access; additional keys do not.
- `VM_RELAY_API_KEY`: app-side inference credential. The app adapter uses it for relay chat, stream attachment, and images without forwarding provider tokens on those requests.

Keep keys in deployment secrets or the ignored, mode-0600 local environment file. Never use `NEXT_PUBLIC_` variables for relay keys. Shared keys represent shared principals; application end-user authorization still applies. Key changes require updating actual running consumers and can change access to retained jobs.

The UI's access form keeps an administrator key in page memory only. Reloading clears it. Authentication/authorization failures pause automatic refresh. Public HTML shells do not imply public fleet data. Health endpoints expose aggregate process status; operational data and metrics require administrator access when keys are configured.

## Browser and listener boundary

Non-loopback listeners require configured keys. Compose publishes only host loopback while listening on all interfaces inside the container. Local unauthenticated mode requires a loopback Host header and is not multi-tenant hosting.

Browser requests are same-origin by default. `RELAY_ALLOWED_ORIGINS` accepts exact HTTP(S) origins for authenticated integrations, with no wildcard or prefix matching. An allowed origin does not bypass keys. Forwarded headers do not grant trust. Terminate HTTPS at reviewed remote ingress.

API data is not cacheable. Responses deny framing and MIME sniffing and suppress referrers. Dashboard requests stay on their own origin and refuse redirects. These controls do not establish a network firewall or complete content-security policy.

## Host filesystem boundary

The deployed container is non-root, read-only, capability-restricted, and resource-bounded. Only private Docker checkpoint persistence and bounded temporary storage are writable. No personal credentials, source tree, home directory, or Docker socket is mounted. Host credential discovery defaults off and is explicitly disabled in Compose.

Tool-call descriptions and inference output do not authorize local filesystem actions. The relay does not execute model-selected tools; user applications can use inference in their own runtimes. Existing relay protocol handling is retained without a blanket tool-call ban. Full structured tool compatibility and security of the wider application's fallback/tool paths are not established by this container.

## Failure containment

Bodies, intake time, management mutations, local shard slots, attempts, retry credits, and job duration are bounded. Status and cancellation do not wait for registry discovery. Terminal jobs stop automatic recovery. Quota reset clears local history only; it cannot refresh credentials or clear provider cooldowns.

PostgreSQL remains authoritative for credential records. The relay's refreshed projection, scheduling, retry budget, and upstream-rejection state are local to the process. Provider JWT expiry is decoded only to exclude expired credentials. Rejection checkpoints and credential fingerprints help local restart/rotation handling; they are not a shared revocation service.

Checkpoint files contain no provider tokens but can contain unfinished request content. They do not contain sockets or replay buffers. Interrupted jobs fail after restart and are not resent automatically. The relay performs no wallet refund transaction.

## Deployment evidence and operations

The 2026-09-07 canary and live rollout passed authenticated chat/SSE, registry, expiry exclusion, runtime isolation, Docker, client-auth, and TypeScript checks. Account counts and health are transient and must be re-read. No public ingress or remote app deployment was verified in that rollout.

The [runbook](VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md) owns configuration defaults, volume migration, canary/cutover, and rollback. The [API reference](RELAY_API_REFERENCE.md) owns endpoint contracts. The [verification guide](INFERENCE_PIPELINE_VERIFICATION.md) owns repeatable checks. No secret values belong in any of them.
