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
| **Heap Memory Forensics** | Process crash dump or heap inspection exposes plaintext API keys. | **High** | **Active Heap Zeroization (`ScopedMemorySanitizer`)**: 2-pass deterministic overwrite (`0xAA` -> `0x00`) in `finally` blocks. |
| **Unattended Session Privilege Abuse** | Co-worker or attacker uses an open laptop to export keys or change billing. | **High** | **Step-Up SUDO Mode**: Privileged mutations require elevation active within 15 minutes (`POST /api/auth/sudo/elevate`). |
| **Over-Privileged Subagents** | Background agent worker uses full root tokens, risking accidental billing or shard mutations. | **Medium** | **Fine-Grained Scoped Sub-Tokens**: Ephemeral child tokens limited to `chat:*` or `images:*` with short TTLs. |
| **Network & Device Hijacking (Bot Swarm)** | Token is used across rapidly shifting IP subnets or distinct user agents. | **Medium** | **Adaptive Behavioral Risk Scoring**: Telemetry engine computes 0-100 risk score in BroccoliDB `riskEvaluationTable`. |
| **PHI / PII Leakage to Upstream LLMs** | User prompts contain sensitive patient health records or European PII. | **Critical** | **Safe Harbor 18 & GDPR Redactor**: Tokenizes 18 Safe Harbor PHI categories and European identifiers before transit. |
| **Upstream Model Data Retention** | Upstream LLM providers retain user prompts for model training. | **Critical** | **Zero Data Retention (ZDR v10.0)**: Enforces `store: false` parameter, strips tracking cookies, and applies strict `no-store` cache headers. |
| **Audit Ledger Manipulation** | Rogue admin or compromised service deletes or alters compliance audit records. | **High** | **Merkle Tree SHA-256 Ledger**: Chains micro-batch Merkle roots with cryptographic tamper-evident signatures. |
| **Silent Security Configuration Drift** | Shard encryption or rate limiting accidentally disabled during updates. | **High** | **Autonomous SOC 2 Drift Engine**: Evaluates 28 controls in real-time and triggers automatic self-healing routines. |
| **Volumetric Edge Ingress Flooding** | Bot swarms attempt to exhaust origin servers with HTTP request storms. | **High** | **Cloudflare Anycast WAF & Fast-Path Prefix Filter**: Drops invalid keys and floods in $<1\text{ms}$ at the 300+ Edge PoPs. |
| **Edge Rate Limit Query Storms** | Million-request bursts hammer PostgreSQL connection pools with rate checks. | **High** | **Distributed Edge KV Sliding-Window Limiter (`RATE_LIMIT_KV`)**: Evaluates token buckets in V8 isolates without DB IOPS. |
| **Webhook Delivery Spoofing** | Attacker injects forged completion events to client webhook endpoints. | **Medium** | **HMAC-SHA256 Signatures (`GalxEdgeWebhookDispatcher`)**: Cryptographically signs every payload with `X-Galx-Signature-256`. |

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
- **Forward Secrecy Key Ratchet**: Ephemeral session keys ratchet every 1000 tokens during long-running streams.

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

---

## 6. AICPA SOC 2 Type II 5-Pillar Control Matrix

| Category | Controls Covered | Core Verification Mechanism |
| :--- | :--- | :--- |
| **Security (CC6.1 - CC9.1)** | CC6.1, CC6.2, CC6.3, CC6.6, CC6.7, CC7.1, CC7.2, CC7.3, CC8.1, CC9.1 | JWE session encryption, DPoP fingerprinting, Step-Up SUDO elevation, envelope encryption. |
| **Availability (A1.1 - A1.4)** | A1.1, A1.2, A1.3, A1.4 | 4-state circuit breaker, zero-allocation ring buffers, continuous token bucket rate limits. |
| **Confidentiality (C1.1 - C1.3)** | C1.1, C1.2, C1.3 | ZDR v10.0 memory zeroization, Zero-Knowledge Attestation Tickets (ZKAT), KMS key re-wrapping. |
| **Processing Integrity (PI1.1 - PI1.3)** | PI1.1, PI1.2, PI1.3 | JSON schema validation, Stripe-grade request deduplication, monotonic fencing tokens. |
| **Privacy (P1.1 - P8.1)** | P1.1, P2.1, P3.1, P4.1, P5.1, P6.1, P7.1, P8.1 | Safe Harbor 18 de-identification, GDPR DSAR exports, Article 30 RoPA registers. |
