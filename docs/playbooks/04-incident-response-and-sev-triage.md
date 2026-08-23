# 🚨 Playbook 04: Incident Response & Emergency Triage

> **Stage 4**: Sev-1 through Sev-4 Triage Protocols, Decision Trees, Circuit Breaker Overrides & Emergency Escalations.

---

## 🎯 Incident Severity Classifications & SLAs

| Severity | Criteria | Triage Time | Resolution SLA | Key Actions |
| :--- | :--- | :--- | :--- | :--- |
| **SEV-1** | Core API outage ($> 10\%$ error rate on `api.galx.ai`), total DB failure, or active credential breach. | $< 5\text{ min}$ | $< 30\text{ min}$ | Activate incident commander; auto-route traffic to secondary models. |
| **SEV-2** | Latency degradation ($P_{99} > 1500\text{ms}$) or upstream provider outage with failover active. | $< 15\text{ min}$ | $< 2\text{ hours}$ | Inspect pooler connection spikes and circuit breaker cooldowns. |
| **SEV-3** | Non-critical service degradation (e.g. image CDN slow, async queue dispatch backlog). | $< 1\text{ hour}$ | $< 12\text{ hours}$ | Clear queue backlogs or redrive DLQ tasks. |
| **SEV-4** | Cosmetic dashboard defects, documentation issues, or non-blocking telemetry anomalies. | $< 1\text{ day}$ | Next sprint | Queue for standard release cycle. |

---

## 🧭 Emergency Incident Decision Tree

```
                       [ ALERT: Error Rate Spike or Latency Degradation ]
                                               │
                                 What is the primary HTTP status?
                                ╱              │              ╲
                       HTTP 503 ╱       HTTP 500 │       HTTP 429 ╲
                              ╱                │                   ╲
         [ All Shards Cooldown ]   [ Cryptographic Decryption ]  [ Rate Limit Exhausted ]
         • Check upstream provider • Inspect AAD tuple           • Inspect tenant RPM/TPM
         • Route to xAI Grok       • Run npm run vault:populate  • Elevated tier in /keys
         • Deposit fresh key       • Check GALX_VAULT_KEY        • Check RATE_LIMIT_KV
```

---

## 🚨 Detailed Sev-1/Sev-2 Incident Playbooks

### Playbook 4.1: Upstream Provider Outage / 429 Wave (`all_shards_cooldown`)
1. **Symptom**: Client requests receive HTTP 503 (`All active shards for provider 'openai' are in cooldown`).
2. **Automated Behavior**: GALXAI's 4-State Circuit Breaker enters `COOLDOWN` and dynamically reroutes eligible requests to healthy secondary shards or adjacent models (`x-ai/grok-4.6`).
3. **Operator Intervention**:
   - Verify upstream status (e.g. `status.openai.com`).
   - Enable global fallback header in client requests: `X-Galx-Allow-Fallback: true`.
   - Deposit backup provider keys via `/vault/deposit`.
   - Manually clear cooldowns if upstream has recovered:
   ```bash
   curl -X POST https://galx.ai/api/pool/reset-cooldowns \
     -H "Authorization: Bearer galx_live_..."
   ```

---

### Playbook 4.2: Supabase PostgreSQL Pooler Saturation (`ETIMEDOUT`)
1. **Symptom**: Serverless API calls timeout with `ETIMEDOUT` or `remaining connection slots are reserved`.
2. **Diagnostic**:
   - Check if `DATABASE_URL` is pointing to port `6543` (Transaction Pooler) or accidentally to port `5432` (Direct Session).
   - Check active PgBouncer pool count in Supabase dashboard.
3. **Immediate Remediation**:
   - Ensure `DATABASE_URL` contains `?pgbouncer=true`.
   - Check that `SUPABASE_POOL_SIZE` in Vercel environment variables is $\le 20$.
   - Restart serverless containers by triggering a redeploy or clearing the Vercel deployment cache.

---

### Playbook 4.3: Cryptographic Decryption Failure (`GalxVaultDecryptionError`)
1. **Symptom**: Server logs show `Failed to authenticate ciphertext with provided AAD`.
2. **Diagnostic**:
   - Run `npm run vault:populate` locally or in CI to test HKDF derivation.
   - Verify that `GALX_VAULT_MASTER_SECRET` matches across all environments.
   - Check if the shard was deposited under a different `tenantId` (AAD tuple: `${tenantUid}:${shardId}:${provider}`).
3. **Remediation**:
   - Align `GALX_VAULT_MASTER_SECRET` using `npm run vercel:env:print`.
   - Re-deposit affected credentials if AAD tuple was invalidated.

---

### Playbook 4.4: Volumetric DDoS / Abuse Mitigation
1. **Symptom**: Massive spike in requests from specific IP ranges or malicious API key tokens.
2. **Immediate Remediation**:
   - Blacklist abusive IP or API key in Cloudflare WAF / Rate Limiter:
   ```bash
   # Blacklist abusive API key at the edge
   npx wrangler kv:key put --binding=RATE_LIMIT_KV "blacklist:galx_live_abusive" "blocked" --ttl=86400
   ```
   - Revoke the compromised API key via the `/keys` dashboard.

---

## 📢 Communications & Status Updates
- Post update to `/status` within 10 minutes of incident declaration.
- Provide status updates every 15 minutes during Sev-1 events.
- Post a resolved notification once error rates fall below 0.1% for 15 consecutive minutes.
