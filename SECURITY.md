# 🔒 Security Policy & Vulnerability Reporting

Report security issues privately so maintainers can investigate and coordinate a fix.

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

Security reports should identify the affected feature, version or deployment, reproduction steps and user impact. Share sensitive diagnostic material only through the private reporting channels above. Do not include live credentials in a report.

Authentication, access control and safe output handling are distinct responsibilities. A successful sign-in does not imply permission to administer the service. Security features and test results are not compliance certification or a guarantee of universal data erasure.
