# 💳 GALXAI Developer Compute Wallet & Micro-Billing Architecture

GALXAI implements a high-precision, low-friction prepaid and auto-reload compute wallet designed for autonomous agent fleets, enterprise development teams, and independent developers.

---

## 1. Unified Wallet Economics & Token Micro-Metering

Unlike traditional SaaS subscriptions that charge static seat fees or rigid tier gates, GALXAI operates a **pure consumption-based compute ledger**:
- Every API key generated under a tenant workspace draws from the tenant's **Unified Compute Wallet**.
- Deductions occur in real-time down to $\$0.000001$ precision upon completion of each streaming chunk or HTTP response.
- **Zero Inactivity Penalties**: Deposited funds and promotional match grants never expire.

```mermaid
flowchart TD
    subgraph Tenant Unified Wallet
        W[Available Balance: $114.59 USD]
        AR[Auto-Reload Safeguard: Trigger @ $10.00]
    end

    subgraph Active Developer Keys
        K1[Key 1: Cursor IDE] -->|Micro-Billing Draw| W
        K2[Key 2: Production Agent Fleet] -->|Micro-Billing Draw| W
        K3[Key 3: Staging Backend] -->|Micro-Billing Draw| W
    end

    subgraph Upstream Routing Substrate
        W -->|25%-40% Wholesale Arbitrage| P[Pooled Compute Fleet]
        P -->|100% Pass-Through| C[75% Prompt Caching Rebate]
    end
```

---

## 2. 50% Instant Match Compute Model & Proof-of-Deposit Security (ADR 0007)

To prevent automated Sybil scraper swarms and key-harvesting botnets from exhausting dedicated reasoning capacity, **GALXAI requires an initial refundable compute deposit of at least $10.00 USD** to activate developer API keys (`galx_live_...`).

### 50% Instant Match Value Equation
Upon making their first $10.00 deposit, developers immediately receive a **$5.00 Free Introductory Compute Grant** from the platform developer fund:
$$\text{StartingBalance} = \text{Deposit}_{\$10.00} + \text{IntroductoryGrant}_{\$5.00} = \$15.00\text{ USD Total Compute (50\% Match)}$$

> **Zero Hidden Fees**: 100% of deposited funds and bonus compute go directly toward usable tokens with **$0 platform or monthly maintenance fees**.

| Starter Pack | Your Deposit | Match / Tier Bonus | Total Credit Credited | Effective Match % | Best For |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **$10 Starter Key** | **$10.00** | **+$5.00 Free Grant** | **$15.00 USD** | **+50% Match** | Prototyping & Cursor IDE activation |
| **$25 Standard Dev**| **$25.00** | **+$5.00 Free Grant** | **$30.00 USD** | **+20% Match** | Side projects & lightweight agents |
| **$50 Growth Pro**  | **$50.00** | **+$5.00 Grant + 5% Bonus** | **$57.50 USD** | **+15% Bonus** | Power users & full-time coding IDEs |
| **$100 Scale Fleet**| **$100.00**| **+$5.00 Grant + 10% Bonus**| **$115.00 USD**| **+15% Bonus** | Multi-agent swarms (*Most Popular*) |
| **$500 Enterprise** | **$500.00**| **+$5.00 Grant + 20% Bonus**| **$605.00 USD**| **+21% Bonus** | High-throughput enterprise production |

---

## 3. Real-Time Cross-App Event Synchronization

Client-side wallet balances and deposit verification status synchronize instantly across all open browser tabs without requiring manual page reloads:
- `useDepositVerification` listens for storage changes and dispatches custom `galx_wallet_update` events.
- Header navigation badges, API key generators, and billing meters reflect live balances instantaneously.

---

## 4. Automated 1-Click Refundability Protocol

Developers evaluate GALXAI with complete peace of mind:
- Any unspent balance from the initial deposit can be refunded with 1 click directly from the Billing dashboard.
- Zero lock-in and zero cancellation hurdles.

---

## 5. Auto-Reload & Zero-Downtime Protection

Production AI agents and mission-critical developer IDEs cannot tolerate unexpected `402 Payment Required` interruptions:
- **Configurable Low-Balance Thresholds**: Set trigger thresholds ($5, $10, $25, $50).
- **Automated Reload Amounts**: Top up $25, $50, $100, or $250 automatically via saved payment method.
- **Circuit Breaker Immunity**: Keys continue streaming without interruption while the reload transaction settles asynchronously.

---

## 6. Multi-Tenant Budget & Spend Governance

Organizations can enforce granular spending limits across individual projects and keys:
- **Per-Key Spend Caps**: Set daily or monthly limits per key (`galx_live_...`).
- **Real-Time Revocation**: 1-click immediate token invalidation purges active worker leases in $< 40\text{ms}$.
- **Detailed Exportable Ledger**: Download CSV / JSON audit trails with model breakdown, token metrics, wholesale discount applied, and net cost.

---

## 7. Cloudflare Edge Batch Micro-Metering (`fn_batch_draw_wallet_tokens_cf`)

To eliminate database connection thrashing during multi-agent swarm bursts, Cloudflare Workers buffer token deductions into 100-item micro-batches before executing atomic PostgreSQL ledger commits:
- **Zero-Egress Processing**: The Cloudflare Edge Mesh aggregates micro-draws across hundreds of concurrent SSE streams.
- **Single SQL Transaction**: `fn_batch_draw_wallet_tokens_cf` settles up to 100 token draw operations in one atomic database roundtrip.
- **Double-Entry Ledger Invariance**: Each draw creates an immutable row in `galx_wallet_transactions` with exact prompt, completion, and cached token quantities.

---

## 8. Compound Savings Multiplier: BroccoliDB Compaction + Wholesale Clearing

Enterprise billing leverages a compound economic savings multiplier:
$$\text{Net Billed Expenditure} = \left[ \text{Raw Tokens} \times (1 - \text{Compaction Ratio}) \times \text{Discounted Rate} \right] + \text{Output Floor}$$

1. **Input Boundary Compaction**: Eliminates representational redundancy across 180 enterprise domains and 19 streaming formats (saving $61.04\% - 94.69\%$ of input tokens).
2. **Wholesale Clearing**: Routes remaining tokens through consolidated Tier-5 wholesale pools with $100\%$ prompt caching rebates.
3. **Combined ROI**: Customers experience a **$2.89\times - 3.32\times$ cost efficiency multiplier** per successful task execution, verified by head-to-head empirical testing (`npm run bench:inference-boundary`).

---

## 9. Dedicated 2-Column Checkout Funnel & 1-Click Express Pay (`/checkout`)


To maximize conversion without third-party vendor lock-in or external redirects, GALXAI features a native 2-column e-commerce checkout funnel mirroring modern industry standards:
- **3-Step Visual Breadcrumbs**: `1. Compute Tier` ➔ `2. Secure Checkout & Rate Lock` ➔ `3. Instant Key Activation`.
- **Native 1-Click Express Pay Strip**: Integrated  Apple Pay, Google Pay, and USDC 1-Click crypto payments with zero-redirect settlement.
- **Dynamic Tiered Compute Match Selectors**: Pre-selected compute amounts ($25, $50, $100, $250) with instant visual match bonuses (+10% to +50%).
- **Interactive Workload Capacity Estimator**: Dynamically calculates and displays estimated frontier queries (~15,000 to ~220,000 queries) based on selected compute volume.
- **Amazon-Style Zero-Downtime Order Bump**: 1-click opt-in checkbox to enable auto-reload safeguards with a 15% rate lock guarantee.
- **Instant Key Reveal Hub (`/checkout/success`)**: Provides instantaneous live bearer API key provisioning (`galx_live_...`), 1-click copy, printable official tax receipt, and 30-second IDE/SDK drop-in configuration widget.

---

## 10. Authenticated Perimeter & Financial Privacy (`<AuthRequiredGate />`)

All billing management routes (`/billing`, `/billing/invoices`, `/billing/payment-methods`, `/billing/auto-reload`, `/billing/expenses`, `/billing/teams`, `/billing/tax`, `/billing/reports`, `/billing/audit-logs`) are protected by the Universal Developer Authentication Perimeter. Unauthenticated visitors are presented with the high-converting Authentication Gate with dual onboarding and checkout pathways.


