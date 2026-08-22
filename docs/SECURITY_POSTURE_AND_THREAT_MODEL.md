# GALXAI: Security Posture & Threat Model

## 1. Threat Modeling Overview

GALXAI serves as a high-performance compute pooling gateway and execution substrate for distributed AI workloads. This document details the threat vectors analyzed, mitigation architectures implemented, and the forensic posture grading rubric.

---

## 2. Threat Vector Matrix & Mitigations

| Threat Vector | Description | Severity | Implemented Mitigation |
| :--- | :--- | :--- | :--- |
| **Cross-Tenant Shard Transplantation** | Attacker transfers encrypted secret ciphertext from Tenant A's row to Tenant B's row in PostgreSQL. | **Critical** | **AAD Binding**: AES-256-GCM includes `${tenantUid}:${shardId}:${provider}` as AAD. Decryption fails unconditionally on row movement. |
| **Token Replay / Theft Exfiltration** | Leaked bearer token is replayed by malicious actor from external network. | **High** | **OAuth 2.0 Token Rotation (RFC 6819)** with single-use tokens, 30s grace window, and automatic session family lineage killswitch. |
| **Plaintext Claims Metadata Leakage** | Intermediate proxies or extensions read user email/shard ID from standard JWTs. | **Medium** | **Compact JWE Encryption (`galx_sess_v2...`)**: Zero metadata is visible in plaintext over the wire. |
| **Heap Memory Forensics** | Process crash dump or heap inspection exposes plaintext API keys. | **High** | **Active Heap Zeroization (`zeroizeBuffer`)**: Buffers are filled with zeros immediately after cryptographic consumption. |
| **Unattended Session Privilege Abuse** | Co-worker or attacker uses an open laptop to export keys or change billing. | **High** | **Step-Up SUDO Mode**: Privileged mutations require elevation active within 15 minutes (`POST /api/auth/sudo/elevate`). |
| **Over-Privileged Subagents** | Background agent worker uses full root tokens, risking accidental billing or shard mutations. | **Medium** | **Fine-Grained Scoped Sub-Tokens**: Ephemeral child tokens limited to `chat:*` or `images:*` with short TTLs. |
| **Network & Device Hijacking (Bot Swarm)** | Token is used across rapidly shifting IP subnets or distinct user agents. | **Medium** | **Adaptive Behavioral Risk Scoring**: Telemetry engine computes 0-100 risk score and flags anomalies in `galx_session_risk_events`. |

---

## 3. Behavioral Risk Scoring Rubric

The `GalxAuthEngine.evaluateSessionRisk` algorithm evaluates every incoming request against the established session baseline:

```
Baseline Session Vectors: (Fingerprint Hash, IP Subnet /24, Normal UA)
                                  │
                                  ▼
           ┌──────────────────────────────────────────────┐
           │              Incoming Request                │
           └──────────────────────┬───────────────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         │                                                 │
         ▼                                                 ▼
[IP Subnet Shift (/24)]                           [Device OS Shift]
  • Δ Subnet = True                                 • macOS -> Linux
  • +25 Risk Points                                 • +35 Risk Points
         │                                                 │
         └────────────────────────┬────────────────────────┘
                                  │
                                  ▼
                      [Composite Score Calculation]
               Risk Score = min(100, Sum(Risk Factors))
                                  │
                 ┌────────────────┼────────────────┐
                 │                │                │
                 ▼                ▼                ▼
             0 - 24            25 - 49          50 - 100
             Grade A+          Grade A          Grade B / C
             (Normal)       (Subnet Drift)   (High Risk / Flag)
```

---

## 4. Cryptographic Key Lifecycle Governance

- **Key Derivation**: HKDF-SHA256 with static master secret, high-entropy salt, and contextual info parameters.
- **Key Storage**: Environment-injected master secret (`GALX_VAULT_MASTER_SECRET`) with support for external KMS HSM storage.
- **Key Re-Wrapping**: Non-blocking in-memory and PostgreSQL batch re-encryption (`fn_reencrypt_vault_shard_record`).

---

## 5. Security Posture API Schema (`/api/auth/security/posture`)

```json
{
  "success": true,
  "posture": {
    "overallGrade": "A+",
    "riskScore": 0,
    "riskLevel": "low",
    "activeSessionsCount": 1,
    "sudoActive": true,
    "sudoExpiresInMs": 845000,
    "primaryKeyringVersion": "v1",
    "recommendations": [
      "Single active device session with tamper-evident DPoP fingerprinting.",
      "SUDO elevated mode active (expires in 14m).",
      "Vault credentials protected with AES-256-GCM under key version 'v1'."
    ],
    "lastAuditedAt": "2026-08-22T18:25:00.000Z"
  }
}
```
