# Current implementation context

Updated 2026-09-07. This is orientation, not an independent architecture specification.

- Product surface: inference API, model discovery, and API playground. User applications retain their own agent/tool runtimes.
- Current architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- Current relay decision: [ADR 0122](docs/adr/0122-isolated-authenticated-relay-and-bounded-recovery.md).
- Durable credential authority: PostgreSQL registry; standalone relay scheduling/retry state remains process-local.
- Verified relay: this repository's `galxai-relay` container on loopback port 3001, non-root/read-only, no host personal/source mounts, private checkpoint volume.
- Keys: app inference uses `VM_RELAY_API_KEY`; fleet/telemetry uses administrator keys. Provider tokens are not relay API keys.
- Recovery: finite attempts, retry budget, deadlines, expiry/rejection exclusion, bounded memory replay, explicit terminal failure. No relay wallet refunds or automatic crash replay.
- Execution boundary: inference output does not authorize local tools. Existing relay tool handling remains; complete tool-protocol support and wider app-side execution containment are not established.
- Deployment evidence: canary and live chat/SSE, authentication, registry, isolation, client-auth and Docker checks passed on 2026-09-07. Remote app/ingress deployment was not part of that verification.

Follow the [relay runbook](docs/VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md) for setup/cutover/rollback. Keep secrets in ignored restricted environment files or deployment secrets, never documentation. Use source and current test results over old performance claims or simulation assumptions.
