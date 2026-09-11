# 🏛️ Subsystem Ownership & Maintainer Matrix

<!-- docs-scope: domain-reference -->
> **Reading scope:** Subsystem reference retained for its own domain; not re-certified by the federation documentation refactor. Older routing, deployment, compatibility, or performance descriptions do not override the current relay contract. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> **Target Audience**: Core Maintainers, Subsystem Leads, and Engineering Managers.  
> **Source of Truth**: Maps directories, primary owners, secondary on-call leads, test suites, and key Architecture Decision Records (ADRs).

---

## 1. Declarative Subsystem Matrix

| Subsystem Area | Directory Path | Primary Reviewers | Secondary Reviewers | Key Test Commands | Core ADRs |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BroccoliDB Compaction** | `src/core/broccolidb/` | `@CardSorting/galx-core-architects` | `@CardSorting/galx-broccolidb-maintainers` | `npm run test:broccolidb:api`<br>`npm run test:broccolidb:hardening`<br>`npm run bench:180-domains` | ADR 0001, ADR 0006, ADR 0060, ADR 0061 |
| **Cryptographic Vault & Auth** | `src/core/vault/`<br>`src/core/auth/` | `@CardSorting/galx-core-architects` | `@CardSorting/galx-security-team` | `npm run onboard`<br>`npm run test:router` | ADR 0002, ADR 0014, ADR 0050 |
| **Model Router & Pool** | `src/core/router/`<br>`src/core/pool/` | `@CardSorting/galx-core-architects` | `@CardSorting/galx-platform-team` | `npm run test:router`<br>`npm run test:quota` | ADR 0003, ADR 0022, ADR 0045 |
| **Rolling Context & Memory Mesh** | `src/core/router/GalxRollingContextEngine.ts`<br>`src/core/governor/` | `@CardSorting/galx-core-architects` | `@CardSorting/galx-platform-team` | `npx tsx scripts/test-chat-context-hardening.ts` | ADR 0069, ADR 0070, ADR 0071 |
| **Seat Quota & Concurrency Leases** | `src/core/subscription/GalxSeatTierEngine.ts`<br>`src/core/chat/` | `@CardSorting/galx-core-architects` | `@CardSorting/galx-security-team` | `npx tsx scripts/test-chat-context-hardening.ts`<br>`npm run db:test` (automatic disposable Docker fixture) | ADR 0068, ADR 0072 |
| **Edge Mesh & Cloudflare** | `cloudflare-edge/` | `@CardSorting/galx-edge-team` | `@CardSorting/galx-core-architects` | `npm run worker:test`<br>`npm run cf:bootstrap` | ADR 0004, ADR 0030, ADR 0048 |
| **Database & Migrations** | `supabase/migrations/`<br>`src/lib/supabase/` | `@CardSorting/galx-database-ops` | `@CardSorting/galx-core-architects` | `npm run db:verify`<br>`npm run db:test` (automatic disposable Docker fixture) | ADR 0016, ADR 0035, ADR 0068-0072 |
| **Developer SDK & CLI** | `src/sdk/`<br>`bin/` | `@CardSorting/galx-platform-team` | `@CardSorting/galx-developer-experience` | `npm run test:router`<br>`npm run design:health` | ADR 0012, ADR 0013, ADR 0032 |
| **Web Control Plane & Model Activation** | `src/app/auth/`<br>`src/app/models/`<br>`src/components/models/` | `@CardSorting/galx-developer-experience` | `@CardSorting/galx-platform-team` | `npx tsc --noEmit`<br>`npm run lint`<br>`npm run build` | ADR 0053, ADR 0119 |
| **Inference Boundary Evals** | `src/core/broccolidb/eval/` | `@CardSorting/galx-core-architects` | `@CardSorting/galx-broccolidb-maintainers` | `npm run bench:inference-boundary`<br>`npm run dissect:payloads` | ADR 0064, ADR 0065, ADR 0066, ADR 0067 |
| **Maintainer Docs & ADRs** | `docs/maintainers/`<br>`docs/adr/` | `@CardSorting/galx-core-architects` | `@CardSorting/galx-maintainers-all` | `npm run onboard`<br>`npx tsc --noEmit` | All accepted ADRs |

---

## 2. CODEOWNERS Synchronization Invariant

The assignments in this matrix are synchronized 1:1 with [`.github/CODEOWNERS`](../../.github/CODEOWNERS). Any modification to subsystem directory boundaries must update both documents and pass the 5-Gate review.

---

*Clear ownership enables zero-hesitation execution.* 🥦🏛️🚀
