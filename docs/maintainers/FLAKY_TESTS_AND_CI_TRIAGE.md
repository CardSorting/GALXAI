# 🛠️ Maintainer Guide: Flaky Tests, CI Traps & Deterministic Triage

<!-- docs-scope: domain-reference -->
> **Reading scope:** Subsystem reference retained for its own domain; not re-certified by the federation documentation refactor. Older routing, deployment, compatibility, or performance descriptions do not override the current relay contract. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> **Target Audience**: SREs, CI/CD Maintainers, and Test Engineers.  
> **Standard**: Zero-tolerance for non-deterministic test failures in `main`.

---

## 1. The 5 Root Causes of Test Flakiness in GALXAI

Distributed inference gateways and high-velocity compaction engines have specific concurrency characteristics that can cause non-deterministic test runs if not properly isolated:

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           THE 5 COMMON TEST FLAKINESS PATTERNS                  │
├──────────────────────┬──────────────────────────────────────────────────────────┤
│ 1. Time Drifts       │ Date.now() / ISO string comparisons across tick boundaries│
│ 2. Port Collisions   │ Next.js test instances competing for localhost:3000      │
│ 3. P-AHT Jitter      │ Adaptive micro-jitter (+-0.05) shifting shard selection  │
│ 4. V8 JIT Warmup     │ First-tick micro-benchmarks measuring un-JITed bytecode  │
│ 5. DB Pool Contention│ Parallel tests exhausting transaction pooler connections │
└──────────────────────┴──────────────────────────────────────────────────────────┘
```

---

## 2. Common Symptoms & Deterministic Fixes

### Scenario A: Port 3000 Collision (`EADDRINUSE`)
- **Symptom**: `npm run dev` or smoke tests fail with `listen EADDRINUSE: address already in use :::3000`.
- **Root Cause**: A previous test process was orphaned in the background.
- **Deterministic Fix**:
  Run the automated process killer configured in `predev`:
  ```bash
  kill $(lsof -ti:3000) 2>/dev/null || true
  npm run dev
  ```

---

### Scenario B: P-AHT Hydraulic Selection Variance
- **Symptom**: A test asserts that `shard_alpha` was selected, but under parallel execution `shard_beta` was returned.
- **Root Cause**: `GalxCredentialPool` incorporates adaptive entropy ($\epsilon_i \in [-0.05, +0.05]$) to avoid dogpiling during high-concurrency swarm bursts.
- **Deterministic Fix**:
  In unit tests, disable micro-jitter or seed the random number generator:
  ```typescript
  GalxCredentialPool.setDeterministicMode(true);
  ```

---

### Scenario C: V8 Micro-Benchmark JIT Invalidation
- **Symptom**: Compaction execution time benchmark asserts $<0.05\text{ms}$ but first run reports $0.4\text{ms}$.
- **Root Cause**: V8 bytecode compilation occurs on the first function invocation before optimizing to TurboFan machine code.
- **Deterministic Fix**:
  Execute 100 warmup iterations before taking high-resolution timer measurements:
  ```typescript
  // Warmup V8 JIT compiler
  for (let i = 0; i < 100; i++) {
    BroccoliCompactionFacade.compact(samplePayload);
  }
  // Benchmark optimized code
  const start = performance.now();
  for (let i = 0; i < 1000; i++) {
    BroccoliCompactionFacade.compact(samplePayload);
  }
  const avgMs = (performance.now() - start) / 1000;
  ```

---

### Scenario D: Date & Timestamp Mismatch in Factual Provenance Tests
- **Symptom**: `BroccoliCompactionSafety` flags a date mismatch because the test generated dynamic `new Date().toISOString()`.
- **Root Cause**: The test altered the timestamp format (e.g. `2026-08-28T10:00:00Z` $\to$ `August 28, 2026`).
- **Deterministic Fix**:
  Always use frozen static fixture dates (e.g. `2026-08-28`) in unit tests to guarantee exact source grounding.

---

### Scenario E: Seat Lease Contention & Sliding Window Drift in CI
- **Symptom**: Parallel integration tests fail with `concurrency_limit_exceeded` or sliding 5-hour quota errors.
- **Root Cause**: Tests sharing the same `userId` fixture run concurrently without releasing leases in `finally` blocks, or sliding window queries encounter clock skew.
- **Deterministic Fix**:
  1. Generate unique random UUIDs for `userId` in each test run (`test_user_${crypto.randomUUID()}`).
  2. Always release leases in `afterEach()` or `finally` blocks using `fn_release_seat_request_lease`.
  3. Execute `npx tsx scripts/test-chat-context-hardening.ts` to verify isolated lease behavior.

---

## 3. Fast Triage Command Playbook

When a CI run fails unexpectedly:

```bash
# 1. Run local maintainer diagnostic
npm run onboard

# 2. Run chat context hardening and database integrity checks
npx tsx scripts/test-chat-context-hardening.ts
npm run db:verify

# 3. Run the exact failing suite with verbose output
npx tsx scripts/validate-galxai-router.ts --verbose

# 4. Check for lingering node background processes
ps aux | grep node

# 5. Clear Next.js & TypeScript compilation caches
rm -rf .next
npx tsc --build --clean
npx tsc --noEmit
```

---

*Maintain deterministic stability across all suites.* 🥦🛡️
