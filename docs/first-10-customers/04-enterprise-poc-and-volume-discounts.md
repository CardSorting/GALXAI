# 🤝 Enterprise Proof-of-Concept & Wholesale Volume Discount Schedule

## 1. Enterprise Volume Discount Tiers

For high-volume engineering teams spending **>$5,000/month**, GALXAI offers tiered sovereign volume pricing, dedicated Shard Vaults, and custom edge SLAs:

| Commitment Tier | Monthly Token Spend | Wholesale Net Discount | Prompt Cache Pass-Through | Dedicated Shard Vault & VPC |
|---|:---:|:---:|:---:|:---:|
| **Standard Wholesale** | Self-serve / Any | **25%–35%** | 75% | Shared Edge PoPs |
| **Growth Tier** | $2,000 / mo | **35%** | 80% | Dedicated Tenant Shard |
| **Scale Tier** | $10,000 / mo | **40%** | 85% | Dedicated Shard + Custom SLA (<10ms) |
| **Sovereign Enterprise** | $50,000+ / mo | **Custom (>45%)** | 90% | Private Enclave / On-Prem Gateway |

---

## 2. 14-Day Fast-Close Enterprise POC Process
1. **Day 1: Enclave Provisioning**: Spin up an isolated AES-256-GCM Shard Vault for the enterprise account.
2. **Day 2: Canary Staging Traffic**: Route 5% of non-critical staging requests through `import 'galxai/patch'`.
3. **Day 5: Latency & Cost Verification**: Review the automated Spend Audit dashboard comparing upstream latency and billing deltas.
4. **Day 10: Production Cutover**: Shift 100% of production traffic to GALXAI Wholesale Anycast routes.
5. **Day 14: Long-Term Contract Execution**: Formalize monthly commitment with automated Stripe billing or invoice terms.
