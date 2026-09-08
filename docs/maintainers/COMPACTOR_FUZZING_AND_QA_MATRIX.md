# 🧪 Maintainer Guide: Compactor Fuzzing, Edge Cases & QA Matrix

<!-- docs-scope: domain-reference -->
> **Reading scope:** Subsystem reference retained for its own domain; not re-certified by the federation documentation refactor. Older routing, deployment, compatibility, or performance descriptions do not override the current relay contract. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> **Target Audience**: Compactor Authors, QA Engineers, and Core Maintainers.  
> **Goal**: Ensure 100% resilience against adversarial payloads, nested structures, zero-width attacks, and ReDoS vulnerabilities.

---

## 1. The 5 Compactor Fuzzing Vectors

Every domain compactor and streaming pipeline must withstand the following adversarial inputs without throwing uncaught exceptions or suffering regex catastrophic backtracking:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          THE 5 COMPACTOR FUZZING VECTORS                    │
├──────────────────────┬──────────────────────────────────────────────────────┤
│ 1. ReDoS Attacks     │ Pathological strings designed to trigger exponential │
│                      │ backtracking (e.g. 1000 repeating characters + mismatch)│
│ 2. Unicode Anomalies │ Zero-width spaces, RTL overrides, emoji bursts       │
│ 3. Deep Nesting      │ 500+ levels of unbalanced JSON/XML/AST brackets      │
│ 4. Entity Tampering  │ Altered high-risk numbers to test fail-closed gates  │
│ 5. Truncated Streams │ Incomplete chunks, severed TCP frames, missing EOF   │
└──────────────────────┴──────────────────────────────────────────────────────┘
```

---

## 2. Standard Compactor QA Verification Recipe

When authoring or updating a compactor in `src/core/broccolidb/`:

```typescript
import { BroccoliCompactionFacade } from '../src/core/broccolidb/BroccoliCompactionFacade';
import { BroccoliCompactionSafety } from '../src/core/broccolidb/BroccoliCompactionSafety';

describe('MyCompactor Adversarial Fuzzing', () => {
  // 1. Test Empty & Oversized Payload Bounds
  it('rejects payloads exceeding MAX_TEXT_LENGTH gracefully', () => {
    const hugePayload = 'A'.repeat(3_000_000);
    expect(() => BroccoliCompactionFacade.compactDomain(hugePayload)).toThrow(RangeError);
  });

  // 2. Test Pathological ReDoS Input (Must finish in < 5ms)
  it('executes in < 5ms under pathological repeating patterns', () => {
    const pathological = ('OBJECTION '.repeat(500) + '!').repeat(10);
    const start = performance.now();
    BroccoliCompactionFacade.compactDomain(pathological, 'Interrogatory');
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5.0);
  });

  // 3. Test Fail-Closed Safety Provenance Gate
  it('fails closed when an extracted number is tampered', () => {
    const check = BroccoliCompactionSafety.verify(
      'Target total is $5,000.00',
      'Target total is $9,999.00'
    );
    expect(check.status).toBe('fallback');
    expect(check.unsupportedFacts).toContain('$9,999.00');
  });
});
```

---

## 3. Automated Regression Suites

Run the complete regression and fuzzing harness across all 180 enterprise domains:

```bash
# 1. 180-Domain Master Test Suite
npm run bench:180-domains

# 2. Production Hardening & Safety Suite
npm run test:broccolidb:hardening

# 3. 19-Mode API Gateway Test Suite
npm run test:broccolidb:api
```

---

*Fuzz aggressively. Prove invariants deterministically.* 🥦🧪🛡️
