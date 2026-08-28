# 🔒 Security Policy & Vulnerability Reporting

GALXAI takes the security and cryptographic integrity of our clearinghouse, memory enclaves, and multi-tenant vaults extremely seriously.

---

## 🛡️ Supported Versions

We provide security updates and patches for the following versions:

| Version | Supported |
| :--- | :--- |
| `0.1.x` (Current Main) | :white_check_mark: |
| `< 0.1.0` | :x: |

---

## 🚨 Reporting a Vulnerability

If you discover a potential security vulnerability, memory leakage risk, or cryptographic flaw in GALXAI:

### ⚠️ Please DO NOT file a public GitHub issue.

Instead, please report security vulnerabilities through one of the following secure channels:

1. **GitHub Private Security Advisory**:
   - Open a private report at [https://github.com/CardSorting/GALXAI/security/advisories/new](https://github.com/CardSorting/GALXAI/security/advisories/new).
2. **Direct Security Operations Email**:
   - Email: `security@galx.ai` (or `willcruzdesigner@gmail.com`)
   - Please include:
     - Description of the vulnerability and attack vector.
     - Proof of Concept (PoC) code or reproduction steps.
     - Affected files, functions, or cryptographic primitives.
     - Impact assessment (e.g., privilege escalation, secret extraction, AAD bypass).

---

## ⏱️ Response SLA & Coordinate Disclosure Process

- **Initial Response**: Within **24 hours** of receipt.
- **Triage & Reproduction**: Within **48 hours**.
- **Fix & Canary Rollout**: Within **7 days** for Critical (Sev-1) vulnerabilities.
- **Public Disclosure**: We follow standard **90-day Coordinated Vulnerability Disclosure (CVD)** timelines.

---

## 🏛️ Cryptographic Invariants Enforced in Codebase

All contributions to the GALXAI codebase are held to the following cryptographic invariants:
1. **AES-256-GCM Envelope Encryption** with 96-bit random IVs and 128-bit authentication tags.
2. **Authenticated Associated Data (AAD)** binding `${tenantUid}:${shardId}:${provider}` to prevent cross-tenant shard transplantation.
3. **Active Memory Zeroization (`zeroizeBuffer`)**: Deterministic 2-pass RAM scrubbing (`0xAA` $\to$ `0x00`) in `finally` blocks for all decrypted credentials.
4. **Fail-Closed Factual Grounding (`BroccoliCompactionSafety`)**: All representation compaction routines verify numbers, currencies, dates, and identifiers against raw source text.

Thank you for helping keep GALXAI and the AI developer community secure! 🥦🔒
