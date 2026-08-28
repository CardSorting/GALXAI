# 🤖 Maintainer Guide: AI Agent Pair Programming & Autonomous Governance

> **Target Audience**: Human System Architects & Autonomous AI Coding Agents (Antigravity, Claude Code, Cursor, Windsurf).  
> **Core Principle**: *"AI agents operate as tireless system maintainers, governed by deterministic mechanical containment harnesses."*

---

## 1. The Human-AI Maintainer Operating Model

In the GALXAI development reality:
1. **The Human Maintainer / Senior Architect**: Directs high-level architectural strategy, specifies invariants, evaluates business models, and observes real developer behaviors.
2. **The AI Autonomous Assistant**: Acts as the primary hands-on-keyboard operator—authoring compactors, generating migration scripts, running benchmarks, maintaining TypeScript strictness, and writing ADRs.

```mermaid
flowchart TD
    Architect[Human Senior Architect] -->|High-Level Intent & Invariants| Agent[Autonomous AI Coding Agent]
    
    subgraph Mechanical Containment Harness
        Agent --> CodeGen[Generate TypeScript & SQL Code]
        CodeGen --> TypeCheck[1. Strict TypeScript Compile: tsc --noEmit]
        CodeGen --> FacadeCheck[2. Compaction Facade API Suite: 7/7 Pass]
        CodeGen --> HardeningCheck[3. Fail-Closed Hardening Regressions]
        CodeGen --> BenchCheck[4. Empirical Inference Boundary: A/B Blinded]
        CodeGen --> ADRSync[5. Architectural Decision Record Sync]
    end

    TypeCheck & FacadeCheck & HardeningCheck & BenchCheck & ADRSync --> Verify{All 5 Gates Pass?}
    
    Verify -->|YES (Deterministic Green)| Merge[Safe Commit & Release]
    Verify -->|NO (Violation Detected)| SelfHeal[Agent Self-Heals & Fixes Code]
    SelfHeal --> Mechanical Containment Harness
```

---

## 2. The 5 Autonomous Agent Containment Commandments

When an AI agent modifies the GALXAI codebase, it must adhere strictly to these 5 mechanical rules:

### Commandment 1: Never Bypass `BroccoliCompactionSafety`
- **Rule**: Never disable or weaken the factual provenance checker.
- **Rule**: If a compactor fails factual grounding on an extracted entity, it MUST fail closed to the unmodified raw text with `fidelityStatus: 'fallback'`.

### Commandment 2: Zero Destructive DDL without 3-Phase Expand/Contract
- **Rule**: AI agents are strictly forbidden from writing `DROP TABLE`, `DROP COLUMN`, or `TRUNCATE` in SQL migrations.
- **Rule**: All database changes must follow the Expand/Contract protocol across separate migration files (`.up.sql` and `.down.sql`).

### Commandment 3: Never Hardcode API Keys or Master Seeds
- **Rule**: Plaintext API keys must never be committed to git or embedded in client components.
- **Rule**: Master cryptographic seeds must always be sourced from `process.env.GALX_VAULT_MASTER_SECRET`.

### Commandment 4: No Bare Generated Compactor Exports
- **Rule**: All 180 domain compactors must remain private internal modules behind `BroccoliCompactionFacade`.
- **Rule**: Only supported facade boundaries and safety types may be exported from `src/core/broccolidb/index.ts`.

### Commandment 5: Epistemic Empirical Provenance
- **Rule**: Never manufacture or assert hardcoded synthetic token savings without running the empirical measurement suite (`npm run bench:inference-boundary`).
- **Rule**: All benchmark outputs must reflect actual provider-boundary tokens, latency, and dollars.

---

## 3. Recommended AI Agent Prompts for Common Maintenance Tasks

### Task 1: Adding a New Domain Compactor
```text
Implement a new BroccoliDB domain compactor for [Domain Name].
Requirements:
1. Create src/core/broccolidb/Broccoli[Domain]Compactor.ts.
2. Ensure regex patterns strictly hoist operative facts, numbers, dates, and codes.
3. Wire the compactor into BroccoliDomainSpendOptimizer.ts.
4. Verify using npm run bench:180-domains and npm run test:broccolidb:api.
5. Author ADR NNNN in docs/adr/.
```

### Task 2: Running a Complete Pre-Flight Verification
```text
Run the full maintainer pre-flight verification pass:
1. npm run onboard
2. npm run bench:inference-boundary
3. npm run test:broccolidb:api
4. npm run test:broccolidb:hardening
5. npx tsc --noEmit
Report the scorecard and confirm 0 errors.
```

---

*Harness AI velocity with deterministic mathematical safety.* 🥦🤖🛡️
