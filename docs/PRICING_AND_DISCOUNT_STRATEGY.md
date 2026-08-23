# 💰 GALXAI Pricing & Multi-Tiered Discount Strategy

GALXAI delivers market-leading pricing by combining **pooled infrastructure arbitrage**, **75% prompt caching pass-through**, **progressive volume rebates**, and **off-peak dynamic yield balancing**.

---

## 1. Core Economic Model & Arbitrage Architecture

Traditional developers purchase individual API access at retail rates with low individual volume brackets. GALXAI operates a high-concurrency unified compute fleet that consolidates multi-tenant query volume into Tier-5 enterprise capacity brackets:

```mermaid
flowchart LR
    subgraph Retail Single-Key User
        U1[Single Developer] -->|Retail List Price| O1[Upstream Tier-1: 0% Discount]
    end

    subgraph GALXAI Pooled Gateway
        Dev1[Dev 1] & Dev2[Dev 2] & Dev3[Dev 3] --> Gateway[GALXAI Gateway]
        Gateway -->|Consolidated High-Throughput Pool| O2[Upstream Tier-5 Fleet: Volume Brackets]
        Gateway -->|Pass-Through 20%-36% Discount| Dev1 & Dev2 & Dev3
    end
```

---

## 2. Four Pillars of the Discount Strategy

### Pillar 1: Pooled Infrastructure Arbitrage (20% to 36% Base Discount)
- High-volume pooled compute slots reduce per-token infrastructure costs by 20% to 36% below direct single-key list prices.
- Dispatches are automatically leveled across available accounts using **Predictive Adaptive Hydraulic Headroom (P-AHT)**, avoiding single-key rate spikes while maximizing volume tier benefits.

### Pillar 2: 75% Prompt-Caching Automatic Pass-Through
- For requests with prefix contexts $> 1,024$ tokens (e.g. system prompts, few-shot examples, codebase ASTs, RAG embeddings), OpenAI and xAI provide upstream cache discounts.
- GALXAI passes **100% of the 75% prompt caching rebate** directly to client accounts without retaining a margin.
- **Compound Net Savings**: When combined with base discounts, workloads with 60% cached context achieve **50%–70% net savings** compared to retail list prices.

### Pillar 3: Progressive Monthly Volume Tiers (Up to +15% Extra Rebate)
Rebates scale automatically with monthly token volume without requiring sales calls or custom commitments:
- **Starter Developer ($0 - $250/mo)**: Base **25%–36%** pooled discount.
- **Scale & Growth ($250 - $1,500/mo)**: **+5% Extra Rebate** (Total: **30%–41% OFF**).
- **Production Fleet ($1,500 - $5,000/mo)**: **+10% Extra Rebate** (Total: **35%–46% OFF**).
- **Enterprise Sovereign ($5,000+/mo)**: **+15% Extra Rebate** (Total: **40%–51% OFF**) + Dedicated VPC peering.

### Pillar 4: Off-Peak Dynamic Yield Rebates (+10% Floating Discount)
- When fleet-wide hydraulic headroom exceeds $75\%$ (night hours / weekends), batch jobs passing `x-galx-off-peak: true` receive an instant **additional 10% floating rebate**.

---

## 3. Flagship Model Rates & Discount Matrix

### Flagship Reasoning & LLM Fleet
| Model ID | Provider | Context Window | Retail List Rate (In / Out) | GALXAI Base Rate | Cached Prompt Rate | Wholesale Discount |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`gpt-5.6-sol`** | OpenAI | $900,000$ | $5.00 / $20.00 | **$3.75 / $15.00** | **$1.25 / 1M** | **25% OFF** |
| **`gpt-5.6-terra`** | OpenAI | $900,000$ | $3.00 / $12.00 | **$2.25 / $9.00** | **$0.75 / 1M** | **25% OFF** |
| **`gpt-5.6-luna`** | OpenAI | $900,000$ | $1.50 / $6.00 | **$0.95 / $3.80** | **$0.30 / 1M** | **36% OFF** |
| **`x-ai/grok-4.6`** | xAI Grok | $1,000,000$ | $3.00 / $12.00 | **$2.10 / $8.40** | **$0.70 / 1M** | **30% OFF** |
| **`x-ai/grok-4.5`** | xAI Grok | $500,000$ | $2.50 / $10.00 | **$1.80 / $7.20** | **$0.60 / 1M** | **28% OFF** |

### Visual Synthesis & Image Generation Fleet
| Model ID | Provider | Resolution | Retail List Price | GALXAI Base Rate | Wholesale Discount |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`openai-gpt-image-2`** | OpenAI | $1792 \times 1024$ | $0.080 / \text{img}$ | **$0.060 / \text{img}$** | **25% OFF** |
| **`openai-gpt-image-1.5`**| OpenAI | $1024 \times 1024$ | $0.060 / \text{img}$ | **$0.045 / \text{img}$** | **25% OFF** |
| **`openai-gpt-image-1`** | OpenAI | $1024 \times 1024$ | $0.040 / \text{img}$ | **$0.030 / \text{img}$** | **30% OFF** |
| **`openai-gpt4o-image`** | OpenAI | $1024 \times 1024$ | $0.050 / \text{img}$ | **$0.038 / \text{img}$** | **24% OFF** |
| **`openai-dalle-3`** | OpenAI | $1792 \times 1024$ | $0.040 / \text{img}$ | **$0.030 / \text{img}$** | **25% OFF** |
| **`openai-dalle-2`** | OpenAI | $512 \times 512$ | $0.020 / \text{img}$ | **$0.014 / \text{img}$** | **30% OFF** |
| **`xai-grok-image`** | xAI Grok | $1024 \times 1024$ | $0.050 / \text{img}$ | **$0.036 / \text{img}$** | **28% OFF** |
| **`xai-grok-2-image`** | xAI Grok | $1024 \times 1024$ | $0.040 / \text{img}$ | **$0.028 / \text{img}$** | **30% OFF** |

---

## 4. Measuring Savings via CLI & SDK

### Instant Terminal Calculation (`npx galxai tokens`)
```bash
npx galxai tokens "Paste massive document text here..."
# Output:
# 📊 Token Count: ~12,450 tokens
# 💰 Retail Cost: $0.0623
# 🌟 GALXAI Cost: $0.0467
# 💵 You Save:    $0.0156 (25% instant savings)
```

### Programmatic SDK Savings Calculator
```typescript
import { TokenOptimizer } from '@galxai/sdk';

const savings = TokenOptimizer.calculateSavings({
  inputTokens: 100_000,
  outputTokens: 50_000,
  cachedTokens: 80_000,
  model: 'gpt-5.6-sol'
});

console.log(`Standard Retail: $${savings.standardCostUsd.toFixed(4)}`);
console.log(`GALXAI Wholesale: $${savings.galxaiCostUsd.toFixed(4)}`);
console.log(`Total Saved: $${savings.savingsUsd.toFixed(4)} (${savings.savingsPercentage}%)`);
```

---

## 5. Prepay Compute Packs & Instant Match Grants

| Compute Tier | Prepay Amount | Match Grant / Volume Bonus | Total Credited Wallet Balance | Effective Bonus | Workload Capacity Estimate |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Starter Prototyping** | **$25.00 USD** | +$2.50 (+10% Bonus) | **$27.50 USD** | +10% | ~15,000 to ~22,000 queries |
| **Growth Builder** | **$50.00 USD** | +$12.50 (+25% Grant) | **$62.50 USD** | +25% | ~40,000 to ~55,000 queries |
| **Scale Fleet (Recommended)** | **$100.00 USD** | +$50.00 (50% Match Grant) | **$150.00 USD** | +50% | ~88,000 to ~120,000 queries |
| **Enterprise Fleet** | **$250.00 USD** | +$125.00 (50% Match Grant) | **$375.00 USD** | +50% | ~220,000+ deep reasoning tasks |
