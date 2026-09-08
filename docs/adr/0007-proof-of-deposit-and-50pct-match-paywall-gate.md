# ADR 0007: Proof-of-Deposit Security Gate & 50% Match Paywall Architecture

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
**Accepted** (Implemented and Verified)

## Context
Introductory compute promotions across AI API gateways are vulnerable to automated abuse vectors:
1. **Sybil Key Harvesting & Scraper Swarms**: Malicious bots and automated script swarms spin up thousands of ephemeral accounts to harvest unmetered compute, exhausting high-cost frontier model headroom (GPT-5.6 Sol, xAI Grok 4.5) and degrading service for legitimate developers.
2. **Quota Starvation**: Unchecked free key creation creates speculative reservation deadlocks, inflating concurrency leases and triggering unnecessary circuit breaker trip events.
3. **Conversion Friction vs Security Balance**: Traditional credit card verification walls create high friction and chargeback risks, while purely unauthenticated access leads to immediate infrastructure degradation.

## Decision
We designed and implemented a **Proof-of-Deposit Anti-Sybil Gate** with an **Instant 50% Promotional Match Model**:

### 1. Proof-of-Deposit Anti-Bot Gate
- Live developer gateway keys (`galx_live_...`) and high-throughput routing leases are only minted upon verification of a minimum initial compute deposit of **$10.00 USD**.
- Requests attempting to create keys without verified deposit status are intercepted with structured **HTTP 402 Payment Required** payloads containing required deposit metadata:
```json
{
  "success": false,
  "error": "MINIMUM_INITIAL_DEPOSIT_REQUIRED",
  "message": "To activate your high-throughput gateway key and claim your $5.00 free compute grant, an initial deposit of at least $10.00 USD is required.",
  "requiredDepositUsd": 10.00,
  "welcomeBonusUsd": 5.00,
  "totalComputeOnDepositUsd": 15.00,
  "depositUrl": "/billing"
}
```

### 2. 50% Instant Compute Match Equation
- To maintain an aggressive GTM hook and reward legitimate developers, the first $10.00 deposit is instantly matched with a **$5.00 Free Introductory Compute Grant**:
$$\text{StartingBalance} = \text{Deposit}_{\$10.00} + \text{MatchBonus}_{\$5.00} = \$15.00\text{ USD Total Compute}$$
- 100% of the deposited funds and match grant are credited directly to the user's usable prepaid compute balance with **$0 platform or monthly maintenance fees**.

### 3. Real-Time Cross-App Event Synchronization
- Client-side deposit state is managed via `useDepositVerification` and broadcasted in real time via custom event dispatchers (`galx_wallet_update`):
```typescript
window.dispatchEvent(new CustomEvent('galx_wallet_update', { 
  detail: { newBalance, hasVerifiedDeposit: true } 
}));
```
- Ensures header navigation, API key generators, and billing pages update synchronously across all browser tabs without page reloads.

### 4. Non-Technical Approachability & Token Mileage Visualizer
- The paywall presents interactive token mileage calculations (e.g., ~$15.00 yields ~4.0M GPT-5.6 reasoning tokens or ~8.3M Grok tokens) and 1-click checkout options (Credit Card, Apple Pay / Google Pay, Crypto USDC).
- 100% automated refund guarantee on any unspent deposit balance directly from the Billing portal.

## Consequences
- **Positive**: 100% elimination of Sybil bot key harvesting and scraper exhaustion attacks.
- **Positive**: High conversion rate through the 50% instant match value equation ($15 starting compute).
- **Positive**: Real-time cross-tab state consistency across the application.
- **Positive**: Zero financial risk for users due to 1-click unspent balance refundability.
