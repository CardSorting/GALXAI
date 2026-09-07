# 🔒 Security Policy & Vulnerability Reporting

GALXAI takes the security and cryptographic integrity of our inference platform, relay, and credential vaults extremely seriously.

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

## Implementation and scope

The [technical security guide](docs/SECURITY.md) documents application, registry, and relay boundaries. The [relay security policy](docs/relay-security.md) covers key roles, browser origins, container isolation, and retained state.

Credential encryption and AAD binding are implemented in the registry vault path. Buffer clearing is best effort in a garbage-collected runtime; do not interpret it as guaranteed erasure of every string, process copy, or checkpoint. Relay job checkpoints can contain request content. Container isolation applies to the relay process, not every application adapter or external agent runtime.

See [ADR 0115](docs/adr/0115-postgresql-authoritative-shard-registry-and-secret-free-projections.md) and [ADR 0122](docs/adr/0122-isolated-authenticated-relay-and-bounded-recovery.md) for current decisions and limitations.
