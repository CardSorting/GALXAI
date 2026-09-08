# ADR 0028: SOC 2 Type II Compliance Engine, Drift Detector & Merkle Audit Ledger

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## 📌 Status
**Accepted** (2026-08-22)

---

## 🎯 Context & Problem Statement
Enterprise security officers, auditors, and compliance teams require continuous, automated proof that the AI gateway satisfies all AICPA SOC 2 Type II Trust Services Criteria, detects any configuration or security drifts, and provides immutable, tamper-evident audit trails.

---

## 💡 Decision: Continuous SOC 2 Compliance, Drift Detection & Merkle Audit Ledger

1. **5-Pillar SOC 2 Type II Engine (`GalxSOC2AuditEngine`)**:
   - 28 technical controls mapped across all 5 Trust Services Criteria:
     1. **Security** (CC6.1 - CC9.1): JWE session tokens, wildcard scopes, SUDO elevation, envelope encryption.
     2. **Availability** (A1.1 - A1.4): Multi-region failover, circuit breakers, rate limit governors.
     3. **Confidentiality** (C1.1 - C1.3): ZDR memory zeroization, KMS key rotation, Ephemeral Session Enclaves.
     4. **Processing Integrity** (PI1.1 - PI1.3): Strict JSON schema validation, idempotency hashes.
     5. **Privacy** (P1.1 - P8.1): Safe Harbor 18 de-identification, GDPR DSAR exports, RoPA registers.
   - Generates cryptographically signed SOC 2 Type II Evidence Packages and NIST OSCAL 1.0.0 assessment reports.

2. **Automated SOC 2 Drift Detector & Self-Healing Remediation (`GalxSOC2DriftDetector`)**:
   - Evaluates system state against baseline security controls.
   - Detects drift events (e.g. unencrypted shards, missing audit hashes, disabled rate limiters).
   - Executes self-healing remediation routines (e.g. re-wrapping keys, repairing audit hash chains).

3. **High-Throughput Merkle Tree Audit Ledger (`GalxHighThroughputAuditStreamer`)**:
   - Micro-batches audit events in high-velocity ring buffers.
   - Computes Merkle Tree root hashes over each micro-batch.
   - Chains SHA-256 blocks with tamper-evident cryptographic proofs (`prevHash` -> `hash`).

4. **Dynamic Security Pen Test Simulator (`GalxDynamicSecurityProbe`)**:
   - Continuous synthetic probing against SQLi, prompt injection, forged session tokens, and token reuse attacks to verify 100% automated threat mitigation.

```typescript
// Example: Generating Automated SOC 2 Type II Dossier
const report = galxSOC2.generatePostureReport();
const dossier = galxSOC2.generateSOC2EvidenceDossier();
console.log(`SOC2 Posture: ${report.overallPostureScore}% - Status: ${dossier.attestationSummary.status}`);
```

---

## 🚀 Consequences & Impact

### Positive
- **Auditor-Ready GRC Automation**: Reduces compliance audit prep time from weeks to seconds.
- **Continuous Self-Healing**: Automatically catches and remediates configuration drifts in real time.
- **Tamper-Evident SHA-256 Ledger**: Cryptographically proves that audit entries have not been modified or deleted.
