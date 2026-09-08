# ADR 0022: OAuth 2.0 Token Rotation with Reuse Attack Detection Cascades (RFC 6819)

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
**Accepted & Implemented**

## Context
Long-lived bearer tokens present high vulnerability if compromised. RFC 6819 (OAuth 2.0 Threat Model and Security Considerations) recommends Single-Use Refresh Token Rotation where each token rotation invalidates the prior token. However, strict immediate invalidation breaks real-world applications experiencing network retries or concurrent in-flight requests. Furthermore, if a revoked token is presented again, it indicates that a threat actor has stolen the previous token and attempted replay.

## Decision
1. **Session Lineage Family (`session_family_id`) & Monotonic Sequencing**:
   - Every login establishes an immutable session family UUID.
   - Each token refresh increments a monotonic `sequence_number`.
2. **Atomic Token Rotation with 30-Second Grace Buffer**:
   - `fn_rotate_session_token_atomic`: Stored procedure in PostgreSQL executing atomic rotation.
   - The old token hash is moved to `previous_token_hash` with `grace_period_until_ms = now + 30000`.
   - Concurrent in-flight requests during this 30-second window succeed cleanly without causing race-condition logouts.
3. **Automatic Reuse Attack Killswitch**:
   - If an old token is presented after the grace window has elapsed, the system flags `TOKEN_REUSE_ATTACK_DETECTED`.
   - Stored procedure `fn_revoke_session_family` immediately terminates all active sessions across the entire lineage family.
   - An immutable high-priority threat event is recorded in `galx_token_revocation_log`.

## Consequences
### Positive
- **Guaranteed Forward Secrecy**: Token lifetime is constrained while maintaining active sessions through rotation.
- **Race Condition Resilient**: 30-second grace window eliminates false-positive logouts on packet loss or concurrent requests.
- **Compromise Containment**: Replay attacks trigger instant global lineage revocation.
