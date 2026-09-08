# ADR 0021: JWE Compact Session Encryption & DPoP Client Fingerprinting

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
**Accepted & Implemented**

## Context
Standard JWT bearer tokens encode claims in base64url JSON. While signed against tampering, the claims (user email, account ID, shard ID, scopes) are visible in plaintext to any intermediary proxy, browser extension, or log aggregator. Furthermore, stolen bearer tokens can be used from arbitrary networks if not bound to client environment characteristics.

## Decision
1. **Enterprise JWE-Grade Compact Token Format (`galx_sess_v2...`)**:
   - Implemented compact AES-256-GCM encrypted tokens: `galx_sess_v2.${ivHex}.${ciphertextHex}.${tagHex}.${keyVersion}`.
   - Claims are encrypted using derived versioned master keys with AAD `galxai-auth-v2:${keyVersion}`.
   - Zero claims or identifiers are readable over the wire without the server's private keyring.
2. **DPoP-Grade Client Environment Fingerprinting**:
   - `GalxCryptoVault.generateClientFingerprint`: Calculates deterministic SHA-256 hash across the client's IPv4 `/24` subnet or IPv6 `/64` prefix combined with normalized User-Agent attributes.
   - The fingerprint is cryptographically embedded inside the JWE token payload and stored in `galx_user_sessions.fingerprint_hash`.
3. **Dual-Version Backward Compatibility**:
   - `verifySessionToken` automatically recognizes and validates both `galx_sess_v2...` (encrypted) and `galx_sess_...` (v1 signed) tokens.

## Consequences
### Positive
- **Zero Information Leakage**: No internal user metadata or shard IDs are visible in network logs or headers.
- **Transplantation Resistance**: Captured tokens used from disparate geographical subnets trigger immediate security alerts.
- **Key Version Agility**: Supports live key derivation and smooth keyring transitions.
