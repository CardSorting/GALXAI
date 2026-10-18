# Premium generation unavailable with expired provider sign-ins

<!-- docs-scope: operational-record -->

## Impact and scope

INC-20261017-PROVIDER-EXPIRY, SEV-2, controller. Active responder: Codex. Observed October 17, 2026 during the planned database migration. Local runtime liveness and current central ownership pass, but readiness and authenticated model discovery return 503. Both registered provider credentials expired before the runtime drain. The number of affected customer requests and the original sign-in expiry trigger are unknown; no new generation was submitted by this migration canary.

## Evidence and timeline

The [migration record](../../../releases/2026-10-17-local-account-migration.json) separates database acceptance from provider capability. Premium drained at 20:24 UTC, completed its native database switch at 20:37 UTC and passed 30 service checks. Capability preflight at 20:43:22 UTC returned 503. Private authorized projection confirmed two enabled accounts with credentials present and negative remaining lifetimes; the later expiry was approximately 18:56 UTC, before the drain. No credential or account identifier is included here.

## Cause and contributing conditions

The current sign-ins have elapsed, so enabled account intent and fresh runtime ownership do not establish usable provider capacity. No evidence attributes this expiry to the database placement change. This observation does not identify why upstream sign-ins were not renewed or establish continuous availability before the migration.

## Containment and recovery

The existing capability preflight and runtime admission fail closed. The canary stopped before provider I/O and retains its blocked receipt. Gate policy, account assignment and credentials were not altered to hide the condition. Do not restart healthy services, re-enable the fenced hosted execution writer or discover credentials from the host.

Use the owning Premium monitor and desktop to complete manual provider sign-in, then explicitly review **Reconnect → Save new sign-in**. Verify the same account identity, matching applied revision, current ownership and capability discovery. Preserve the blocked canary receipt; any later independently identified acceptance request must not replay uncertain work. See [FM-CTRL-004](../../../failure-modes/controller.md#fm-ctrl-004--provider-sign-ins-expire-while-runtime-ownership-is-healthy) and [local operations](../../../../docs/runbooks/relay-pool-services.md).

## Verification and limits

Database restore, permissions, TLS, local monitor authorization and ownership checks pass. No real provider completion or local execution/central settlement canary passed at this observation. Public application impact and real requested capability recovery require separate acceptance.

## Prevention and closure

ACT-052 remains open for manual sign-in renewal and actual capability/execution acceptance. Existing monitor expiry/readiness remains authoritative; no autonomous sign-in or credential-discovery mechanism is added. Mark recovered only after the affected path passes, and close only with the follow-up evidence retained.
