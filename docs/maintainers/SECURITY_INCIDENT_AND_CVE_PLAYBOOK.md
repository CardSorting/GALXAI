# 🚨 Maintainer Playbook: Security Incidents, Key Compromise & CVE Governance

<!-- docs-scope: domain-reference -->
> **Reading scope:** Subsystem reference retained for its own domain; not re-certified by the federation documentation refactor. Older routing, deployment, compatibility, or performance descriptions do not override the current relay contract. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> **Target Audience**: Security Response Team (SRT), Core Maintainers, and Incident Commanders.  
> **Standard**: Incident Command System (ICS) with 24-hour response SLAs and private GitHub Security Advisories.

---

## 1. Security Incident Classification Matrix

| Severity | Definition & Architectural Scope | Response SLA |
| :--- | :--- | :--- |
| **`Sev-1 (Critical)`** | • Master encryption secret (`GALX_VAULT_MASTER_SECRET`) compromise.<br>• Cross-tenant AAD bypass allowing unauthorized secret decryption.<br>• Unauthenticated remote code execution (RCE) on edge mesh or serverless containers. | **Immediate (< 1 hour)** |
| **`Sev-2 (High)`** | • Memory leakage of decrypted provider keys in error traces.<br>• Bypass of `BroccoliCompactionSafety` factual provenance gate.<br>• SQL injection vector in Supabase RPC functions. | **< 4 hours** |
| **`Sev-3 (Medium)`** | • Flaw in rate-limiting token-bucket synchronization on edge KV.<br>• CORS misconfiguration on internal diagnostic routes. | **< 24 hours** |

---

## 2. Emergency Master Key Compromise Drill

If `GALX_VAULT_MASTER_SECRET` is suspected of compromise:

```mermaid
flowchart TD
    Detect[1. Compromise Detected] --> Freeze[2. Freeze Non-Emergency Deployment Pipelines]
    Freeze --> Generate[3. Generate New 32-Byte Master Seed (v2)]
    Generate --> DeployDual[4. Deploy Keyring with v1 + v2 Key Derivations]
    DeployDual --> Reencrypt[5. Run Re-Encryption Worker across all Shards]
    Reencrypt --> Prune[6. Prune v1 Key from Codebase & Deploy]
    Prune --> Invalidate[7. Invalidate Compromised Secrets with Upstream Providers]
```

### Emergency CLI Commands:
```bash
# 1. Execute instant background re-encryption of all active provider shards
npx tsx scripts/reencrypt-vault-shards.ts --from-version=v1 --to-version=v2

# 2. Audit tenant isolation invariants across all stored shards
npm run db:verify
```

---

## 3. Coordinated CVE Disclosure & Security Advisory Protocol

When a reported vulnerability is confirmed:
1. **Open Private Advisory**:
   Create a private repository advisory at `https://github.com/CardSorting/GALXAI/security/advisories`.
2. **Author Private Fix & Regression Test**:
   Collaborate with reporter in private fork. Verify via `npm run test:broccolidb:hardening && npx tsc --noEmit`.
3. **Request CVE ID**:
   Request a CVE identifier through GitHub's CNA (CVE Numbering Authority).
4. **Publish Advisory & Release Patch**:
   Publish the security advisory simultaneously with the patched release tag (e.g. `v0.1.1`).

---

## 4. IDOR Chat Ownership & Unauthorized Session Access Protocol (ADR 0072)

If cross-tenant conversation or message extraction attempts are reported:

1. **Verify Database Procedure Guards**:
   All chat stored procedures (`fn_upsert_owned_chat_messages`, `fn_get_chat_delta_sync`, `galx_delete_chat_conversation`) enforce explicit `WHERE user_id = p_user_id` checks in PostgreSQL.
2. **Execute Database Integrity Verification**:
   ```bash
   npm run db:verify
   # Requires Docker; creates its own disposable database without production credentials.
   npm run db:test
   ```
3. **Audit Token Revocation**:
   Inspect `galx_token_revocation_log` and `galx_session_risk_events` to identify compromised tokens.

---

*Security is paramount. Guard the cryptographic enclaves.* 🥦🚨🔒
