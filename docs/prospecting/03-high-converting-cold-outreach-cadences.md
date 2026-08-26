# ✉️ High-Converting Outbound Sales Cadences (45%+ Open, 20%+ Reply)

## 1. Cadence Philosophy: Value-First Financial Engineering
Traditional sales pitches fail with engineers. Technical founders reply to:
1. **Concrete dollar numbers** showing their exact potential cost reduction.
2. **Zero-risk implementation** (1-line drop-in, zero prompt rewrites).
3. **Free introductory compute** so they can test latency before committing.

---

## 2. The 3-Touch High-Conversion Sequence

### Touch 1 (Day 1): The 40% Spend Teardown
```text
Subject: Slashing ~45% off [ProjectName]'s monthly OpenAI token spend

Hey [FounderName],

Came across [ProjectName] on [Source/GitHub]—really impressive implementation of [Feature/RAG].

Noticed you're using OpenAI's API (`gpt-5.6-sol` / `gpt-4o`). Based on your repo structure and query volume, you're likely spending around $[EstimatedMonthlySpend]/mo on retail token pricing.

At GALXAI, we aggregate compute demand to offer direct wholesale pricing (25%–40% discount) with 100% prompt caching pass-through (giving you the full 75% cache rebate):

• Current Retail Estimate: $[RetailSpend]/mo
• GALXAI Wholesale Estimate: $[WholesaleSpend]/mo
• Net Annual Savings: $[AnnualSavings]/yr

Best part: It's a 1-line drop-in with zero prompt changes:
import 'galxai/patch';

Would you be open to a free $100 introductory compute key to test our sub-15ms edge latency on your staging environment?

Best,
[AgentName]
Growth Engineering Lead, GALXAI (galx.ai)
```

---

### Touch 2 (Day 3): The 1-Line Code Patch Diff
```text
Subject: Re: [ProjectName] - 1-line code patch (Zero prompt rewrites)

Hey [FounderName],

Following up with the exact diff to test wholesale routing on [ProjectName]:

```diff
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,4 @@
+import 'galxai/patch';
 import OpenAI from 'openai';
 
 const openai = new OpenAI();
```

All existing OpenAI SDK completions, streaming hooks, and tool calling continue working identically with zero code rewrites, but now automatically route through GALXAI with wholesale pricing and prompt caching.

Claim your live test key with $100 compute pre-loaded here: https://galx.ai/claim?ref=[ProspectId]

Best,
[AgentName]
```

---

### Touch 3 (Day 7): Executive Intro & 50% Deposit Match
```text
Subject: $100 introductory compute grant + 50% match for [ProjectName]

Hey [FounderName],

Closing the loop on this. We've reserved a $100 introductory compute grant for [ProjectName] along with our 50% First Deposit Match (e.g. deposit $200, receive $300 in compute balance).

If you'd like to spin up a dedicated Shard Vault with zero-trust key encryption and custom Anycast edge routing, feel free to grab 10 mins on my calendar: https://cal.com/galxai/enterprise

Best,
[AgentName]
```
