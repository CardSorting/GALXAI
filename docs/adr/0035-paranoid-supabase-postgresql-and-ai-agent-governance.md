# ADR 0035: Paranoid Supabase PostgreSQL Architecture & AI Agent Long-Term Governance Substrate

## Status
**Accepted & Implemented**

## Context
GALXAI relies on Supabase PostgreSQL as its authoritative, ACID-compliant single source of truth for developer keys, encrypted shard vaults, double-entry financial ledgers, distributed locks, CloudTasks queues, and vector embeddings.

The operational reality of the platform is that:
1. The human maintainer is a **Senior Distributed Systems Architect** who governs system topology, performance, and invariants, but **does not know or inspect SQL or Supabase syntax**.
2. **AI Autonomous Assistants** act as the sole database maintenance operators.
3. Without deterministic boundaries, AI agents can introduce catastrophic failures: unindexed foreign key locks, search path hijacking in `SECURITY DEFINER` functions, accidental RLS bypasses, non-expand-contract breaking migrations, and ledger math corruption.

## Decision
We implement the **Paranoid Autonomous Database Governance Framework (PADGF)** and the **AI Agent Database Operating Protocol (AOP-DB)**:

1. **The 10 Invariant Commandments of Paranoid PostgreSQL**:
   - Zero destructive DDL without 3-phase expand/contract lifecycle.
   - Default-deny Row Level Security (RLS) on 100% of tables with `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`.
   - Explicit `SET search_path = public, pg_temp;` on all `SECURITY DEFINER` functions.
   - Double-entry financial immutability; balances can only be updated via atomic RPC stored procedures with audit log append.
   - Zero-lock concurrent index and DDL operations (`IF NOT EXISTS`, non-blocking constraints).
   - Mandatory bi-directional rollback parity: every `NNN_name.sql` migration must have a paired `NNN_name.down.sql`.
   - AES-256-GCM envelope encryption with Authenticated Associated Data (AAD) for all shard credentials.
   - Monotonic fencing tokens for distributed concurrency leases and locks.
   - Non-technical Architect-Readable English Impact Statement for every proposed change.
   - Automated continuous verification via `npm run db:verify` and `npm run db:test`.

2. **Mechanical Containment Linter (`verify-supabase-integrity.ts`)**:
   - Programmatically audits all SQL files and migration history.
   - Statically verifies RLS policies, search path locks, foreign key indexes, rollback parity, and TypeScript type alignment.

3. **Safe Migration Runner (`manage-migrations.ts`)**:
   - Transaction-wrapped execution, cryptographic SHA-256 checksum tracking, dry-run simulation, and 1-click rollback.

## Consequences

### Positive
- **Complete Human Decoupling**: The Senior Architect never has to read or write raw SQL to maintain 100% operational confidence.
- **Zero Hallucination Blast-Radius**: AI agents cannot apply destructive changes, bypass RLS, or introduce table locks because the mechanical linter blocks non-compliant code.
- **Guaranteed Reversibility**: Every migration is tested with an automated rollback counterpart.
- **Continuous Type Safety**: TypeScript repository interfaces remain in mathematical lockstep with PostgreSQL schema definitions.

### Negative
- Schema changes require a strict 3-phase expand/contract lifecycle rather than instant one-off column drops.
- Additional verification overhead during CI/CD (`db:verify` and `db:test`).
