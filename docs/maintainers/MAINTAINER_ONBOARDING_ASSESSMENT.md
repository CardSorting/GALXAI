# 🎓 Maintainer Onboarding Knowledge Check & Self-Assessment

<!-- docs-scope: domain-reference -->
> **Reading scope:** Subsystem reference retained for its own domain; not re-certified by the federation documentation refactor. Older routing, deployment, compatibility, or performance descriptions do not override the current relay contract. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> **Target Audience**: New Maintainers completing their Week 1 Onboarding Ramp.  
> **Goal**: Self-evaluate comprehension of GALXAI's core architectural paradigms, invariants, and operational runbooks.

---

## 📝 The 10 Invariant Questions

### 1. What is the fundamental physical thesis of GALXAI's BroccoliDB?
- **A)** It is an AI model that generates cheaper tokens.
- **B)** It is a pre-inference representation transformation layer that preserves task-relevant invariants while eliminating representational redundancy.
- **C)** It is a simple prompt compressor that deletes random adjectives.
- *Answer*: **B**.

---

### 2. What happens if a domain compactor produces an extracted dollar amount that was not in the original input text?
- **A)** The model guesses the closest number.
- **B)** An exception crashes the server.
- **C)** `BroccoliCompactionSafety` fails closed, intercepts the ungrounded entity, and returns the original raw source text with `fidelityStatus: 'fallback'`.
- *Answer*: **C**.

---

### 3. What prevents cross-tenant secret transplantation in `GalxCryptoVault`?
- **A)** Strong passwords.
- **B)** Authenticated Associated Data (AAD) binding `${tenantUid}:${shardId}:${provider}` into the AES-256-GCM cipher envelope.
- **C)** Database foreign keys alone.
- *Answer*: **B**.

---

### 4. What is the maximum permitted in-process compaction latency budget for `BroccoliCompactionFacade`?
- **A)** $<2.0\text{ms}$ ($P_{95} \le 1.5\text{ms}$).
- **B)** $100\text{ms}$.
- **C)** $500\text{ms}$.
- *Answer*: **A**.

---

### 5. When is an Architecture Decision Record (ADR) mandatory?
- **A)** Only when the CEO requests it.
- **B)** Whenever modifying public APIs, compaction modes, routing algorithms, vault encryption, database schemas, or benchmark protocols.
- **C)** Never; code comments are sufficient.
- *Answer*: **B**.

---

### 6. What command validates a maintainer's local workstation environment in $<5\text{s}$?
- **A)** `npm test`
- **B)** `npm run onboard`
- **C)** `git status`
- *Answer*: **B**.

---

### 7. How does GALXAI prevent breaking changes during PostgreSQL schema evolutions?
- **A)** Dropping tables during maintenance windows.
- **B)** Using the 3-Phase Expand/Contract Protocol with concurrent zero-lock DDL.
- **C)** Disabling foreign keys permanently.
- *Answer*: **B**.

---

### 8. What are the 4 states of the `GalxCircuitBreaker` finite state machine?
- **A)** `INIT`, `RUNNING`, `PAUSED`, `STOPPED`
- **B)** `CLOSED`, `DEGRADED`, `OPEN`, `HALF-OPEN`
- **C)** `GREEN`, `YELLOW`, `ORANGE`, `RED`
- *Answer*: **B**.

---

### 9. Why must AI agents never export generated domain compactors directly from the barrel?
- **A)** To keep TypeScript compile times under 2 seconds.
- **B)** To force all compaction calls through `BroccoliCompactionFacade` and the `BroccoliCompactionSafety` provenance gate.
- **C)** Because Node.js doesn't support more than 10 exports.
- *Answer*: **B**.

---

### 10. In the randomized branch-blinded A/B evaluation suite, how is evaluation bias prevented?
- **A)** By passing the model names in prompts.
- **B)** By decoupling the evaluator from branch identities (Branch Alpha vs Branch Beta randomized per task) and unblinding only post-hoc.
- **C)** By running tests only once.
- *Answer*: **B**.

---

### 11. How does `GalxRollingContextEngine` prevent upstream HTTP 400 crashes during multi-turn compaction?
- **A)** By deleting all tool messages.
- **B)** By strictly enforcing atomic tool turn-pair inseparability (`ensureAtomicTurnPairs`), shifting compaction boundaries to keep assistant `tool_calls` and matching `tool` results together.
- **C)** By converting tool responses to plain markdown.
- *Answer*: **B**.

---

### 12. How does the Dual Rolling Window seat quota system prevent orphaned concurrency locks on dropped client connections?
- **A)** By requiring manual administrative intervention.
- **B)** Through expiring idempotent seat request leases (`galx_seat_request_leases`) with automatic TTLs (`180s`) evaluated in single-hop atomic PL/pgSQL procedures.
- **C)** By restarting the database nightly.
- *Answer*: **B**.

---

*Score $\ge 11/12$? You are officially ready to review PRs and take on-call shifts!* 🥦🎓🚀
