# 📊 Document 03: Dataset & Curriculum Specification
## 4-Tier Curriculum Mix, Ingestion Pipeline & Privacy Invariants

---

## 1. Granular Curriculum Mix & Domain Breakdown

To endow **GALX-Flash-8B** with frontier multi-domain proficiency, the 155M-token dataset is divided across 4 curriculum tiers with strict domain allocations:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 4-Tier Curriculum Dataset Composition                                  │
├─────────────────┬──────────┬──────────────┬───────────────┬────────────────────────────────────────────┤
│ Curriculum Tier │ Weight   │ Sample Count │ Token Volume  │ Granular Domain Subsets & Allocations      │
├─────────────────┼──────────┼──────────────┼───────────────┼────────────────────────────────────────────┤
│ Tier 1: Fact CoT│ 20%      │ 40,000       │ 30,000,000    │ • System-1 Direct QA (35%)                 │
│                 │          │              │               │ • Wikipedia & Academic Summaries (35%)     │
│                 │          │              │               │ • Multi-turn Dialogue Context (30%)        │
├─────────────────┼──────────┼──────────────┼───────────────┼────────────────────────────────────────────┤
│ Tier 2: Logic   │ 30%      │ 60,000       │ 45,000,000    │ • GSM8K Multi-Step Reasoning (40%)         │
│                 │          │              │               │ • Formal Logic & Syllogisms (30%)          │
│                 │          │              │               │ • Symbolic Puzzles & Game Trees (30%)      │
├─────────────────┼──────────┼──────────────┼───────────────┼────────────────────────────────────────────┤
│ Tier 3: Code    │ 35%      │ 70,000       │ 55,000,000    │ • Python Backend & Data Science (35%)      │
│                 │          │              │               │ • Rust Memory Safety & Systems (25%)       │
│                 │          │              │               │ • TypeScript / Next.js Fullstack (20%)     │
│                 │          │              │               │ • SQL & Database Query Plans (10%)         │
│                 │          │              │               │ • Tool Calling & JSON Schema Routing (10%) │
├─────────────────┼──────────┼──────────────┼───────────────┼────────────────────────────────────────────┤
│ Tier 4: STEM    │ 15%      │ 30,000       │ 25,000,000    │ • MATH-500 Olympiad Problems (45%)         │
│                 │          │              │               │ • LeetCode Hard Algorithmic Synthesis (35%)│
│                 │          │              │               │ • Physics & Quantum Simulations (20%)      │
├─────────────────┼──────────┼──────────────┼───────────────┼────────────────────────────────────────────┤
│ **Total**       │ **100%** │ **200,000**  │ **155,000,000**│ Full Spectrum Frontier Engine              │
└─────────────────┴──────────┴──────────────┴───────────────┴────────────────────────────────────────────┘
```

---

## 2. SimHash Fuzzy Deduplication & Bloom Filter Mechanics

To eliminate redundant prompt-response pairs while maintaining sub-50ns classification throughput in memory:

### 2.1 Bloom Exact Filter
- Capacity: $m = 10,000,000\text{ bits}$ ($1.19\text{MB}$ in RAM).
- Hash Functions: $k = 7$ independent cryptographic hash projections derived via MurmurHash3.
- Theoretical False Positive Rate:
  $$P(\text{false positive}) \approx \left(1 - e^{-k \cdot n / m}\right)^k \le 0.0001 \quad (\le 0.01\%)$$

### 2.2 SimHash 64-Bit Fuzzy Vectorization
For token sequence $T = (t_1, t_2, \dots, t_N)$:
1. Each token $t_i$ produces 64-bit hash $h(t_i)$.
2. Weight vector $V = \sum_{i=1}^N w(t_i) \cdot (2 \cdot h(t_i) - 1)$.
3. 64-bit SimHash fingerprint $S = \text{sign}(V)$.
4. Samples with Hamming distance $D_H(S_1, S_2) \le 3$ are immediately pruned from the buffer.

---

## 3. DPO Negative Mining & Alignment Heuristics

For **Phase 5: Length-Debiased DPO Alignment**, preference pairs $(y_w, y_l)$ are mined using four adversarial heuristics:

1. **Length-Matched Rejection**: Pairing long, verbose answers with equally detailed but mathematically flawed alternatives to prevent the model from exploiting length as a proxy for quality.
2. **Sycophancy Injection**: Injecting subtle user misconceptions into prompts; rewarding responses that politely correct the error and penalizing responses that flatter false premises.
3. **Hallucination Injection**: Replacing code package imports with hallucinated/deprecated APIs in the rejected set.
4. **Superficial Formatting Rejection**: Penalizing boilerplate preamble (`"Sure, I'd be happy to help with that!"`) in favor of direct, zero-filler thought chains.

---

## 4. Cryptographic Merkle Root Sealing

Every training shard $S_i$ is hashed using SHA-256:

$$H(S_i) = \text{SHA256}(\text{CompressedBytes}(S_i))$$

The root hash $\mathcal{R}_{\text{Merkle}}$ is computed across all shard hashes in binary order and sealed into `datasets/manifest.json.gz`:

$$\mathcal{R} = H(H(S_1 \| S_2) \| H(S_3 \| S_4))$$

Remote GPU workers verify leaf proofs before consuming training shards, guaranteeing tamper-proof training data integrity.
