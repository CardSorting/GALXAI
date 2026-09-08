# ADR 0024: Adaptive Behavioral Risk Scoring & Zero-Downtime KMS Key Re-Wrapping

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
**Accepted & Implemented**

## Context
Advanced adversaries often exfiltrate session tokens and replay them from external proxy infrastructures or automated bot scrapers. A static token validator cannot distinguish legitimate user traffic from exfiltrated session reuse. Furthermore, enterprise cryptographic governance requires periodic master Key Encryption Key (KEK) rotation without taking model routing offline.

## Decision
1. **Adaptive Behavioral Risk Assessment Engine**:
   - `GalxAuthEngine.evaluateSessionRisk`: Computes a 0–100 risk score on incoming requests by comparing environment vectors:
     - IP subnet drift (`/24` or `/64`) $\to$ +25 risk points
     - Operating system shift (e.g. macOS $\to$ Linux/cURL) $\to$ +35 risk points
   - Risk events are recorded in PostgreSQL `galx_session_risk_events` table.
   - Sessions exceeding risk thresholds are flagged for Step-Up challenge.
2. **User Security Posture Diagnostics (`UserSecurityPosture`)**:
   - `GET /api/auth/security/posture`: Aggregates active session risk, SUDO status, and key derivation version into a composite health grade (`A+` to `C`) and actionable recommendations.
3. **Zero-Downtime KMS Key Re-Wrapping Pipeline**:
   - `GalxCryptoVault.reencryptSecret` & `GalxAuthEngine.reencryptVaultShards`: Decrypts vaulted credentials under key version $V_n$ and re-encrypts under $V_{n+1}$ without plaintext exposure or routing downtime.
   - Triggered administratively via `POST /api/auth/vault/re-wrap` (requiring active SUDO elevation).

## Consequences
### Positive
- **Continuous Threat Telemetry**: Suspicious network or agent shifts are captured and logged immediately.
- **Enterprise Key Lifecycle**: Master keys can be rotated regularly without service interruption.
- **Non-Technical Transparency**: End users receive clear, intelligible security feedback without complex jargon.
