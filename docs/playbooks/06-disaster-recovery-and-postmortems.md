# 🌋 Playbook 06: Disaster Recovery & Post-Mortem Engineering

> **Stage 6**: Cloudflare Edge Evacuation, Point-in-Time Database Recovery (PITR), Multimodal Asset Restoration & Blameless Retrospective Protocols.

---

## 🎯 Objective & Recovery Targets
This playbook details disaster recovery (DR) procedures for extreme scenarios (e.g. major regional datacenter blackouts, catastrophic database corruption, or global Edge network degradation), targeting:
- **Recovery Point Objective (RPO)**: $< 60\text{ seconds}$ (continuous WAL replication).
- **Recovery Time Objective (RTO)**: $< 15\text{ minutes}$ (automated failover & PITR).

---

## 🧭 Disaster Recovery Scenarios & Execution Procedures

### DR Scenario 1: Complete Cloudflare Edge Network Degradation
If Cloudflare experiences a global Anycast routing failure:
1. **Reroute DNS to Direct Vercel Serverless Ingress**:
   - In your DNS registrar (e.g. Cloudflare / Route53), update `api.galx.ai` to point directly to Vercel's CNAME `cname.vercel-dns.com`.
   - Vercel's multi-region Serverless Next.js 15 App Router natively handles `/v1/chat/completions`, `/v1/messages`, and `/api/health` without Cloudflare Workers.
2. **Verify Serverless Failover**:
   ```bash
   curl -X GET https://galx.ai/api/health
   ```

---

### DR Scenario 2: Supabase PostgreSQL Point-in-Time Recovery (PITR)
If catastrophic database corruption or accidental data alteration occurs:
1. **Identify Corruption Timestamp**: Check the earliest known corrupted transaction from Merkle audit logs.
2. **Execute Supabase PITR Restore**:
   - In the Supabase Dashboard > **Database > Backups > Point in Time**.
   - Select a restore target time $t = t_{\text{corruption}} - 60\text{s}$.
   - Initiate the restore onto a secondary clone.
3. **Verify Restored Database Integrity**:
   ```bash
   npm run db:verify
   ```
4. **Promote Restored Database**:
   - Update `DATABASE_URL` in Vercel and CI environments with the restored connection string.
   - Run `npm run deploy:check` to confirm application connectivity.

---

### DR Scenario 3: Cloudflare R2 Multimodal Storage Recovery
If generated image assets in R2 require restoration:
1. Since GALXAI enforces a **Zero Content Retention (ZDR)** policy, images in R2 are transient multimodal outputs with an automatic 30-day lifecycle.
2. If bucket metadata is lost, re-initialize the R2 bucket via `npm run worker:bootstrap` and update CORS configurations via `scripts/r2-cors.json`.

---

## 📝 Blameless Post-Mortem Engineering Protocol

Within **48 hours** of any **Sev-1** or **Sev-2** incident resolution, the Incident Commander must author a blameless post-mortem retrospective using the following template:

```markdown
# 📋 Incident Post-Mortem: [INCIDENT-YYYY-MM-DD-TITLE]

## 1. Executive Summary
- **Incident Date**: YYYY-MM-DD
- **Severity**: SEV-1 / SEV-2
- **Duration**: [e.g. 24 minutes]
- **Customer Impact**: [e.g. 3.2% of inference requests on gpt-5.6-sol received HTTP 503]
- **Incident Commander**: [@username]

## 2. Timeline of Events (UTC)
- **14:02 UTC**: Upstream provider experienced 429 rate limit spike.
- **14:04 UTC**: Circuit breaker transitioned 4 shards into COOLDOWN.
- **14:07 UTC**: Incident declared (Sev-2); on-call engineer paged.
- **14:12 UTC**: Automated fallback routed traffic to xAI Grok.
- **14:26 UTC**: Primary upstream cleared; shards restored to HEALTHY. Incident resolved.

## 3. Root Cause Analysis (5 Whys)
1. *Why did error rates rise?* Upstream provider rate-limited primary shard keys.
2. *Why were backup shards not used immediately?* Cooldown threshold was configured too conservatively.
3. *Why was cooldown threshold conservative?* Default decay factor was calibrated for low concurrency.

## 4. Preventative Action Items (Action Matrix)
| Action Item | Type | Owner | Target Date |
| :--- | :--- | :--- | :--- |
| Add auto-tuning to P-AHT cooldown decay | Code Fix | @engineer | YYYY-MM-DD |
| Add new synthetic regression test | Test | @engineer | YYYY-MM-DD |
| Update Playbook 04 with new metrics | Documentation | @sre | YYYY-MM-DD |

## 5. Lessons Learned
- **What went well**: Automated circuit breaker prevented complete outage; fallback models responded within SLA.
- **Where we got lucky**: Traffic was during off-peak hours.
- **What needs improvement**: Alerting threshold should page at 5% error rate rather than 10%.
```

---

## 🧪 Authoring Automated Regression Tests
Every post-mortem MUST be accompanied by an automated synthetic test in `scripts/test-cloudflare-workers.ts` or `scripts/validate-galxai-router.ts` simulating the exact failure mode to prevent future regressions.
