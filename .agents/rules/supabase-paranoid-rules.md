---
description: Paranoid Supabase PostgreSQL & AI Agent Maintenance Rules
globs: "**/supabase/**,**/migrations/**,**/*Repository.ts,**/scripts/*supabase*"
---

# 🛡️ Paranoid Supabase PostgreSQL Maintenance Rules for AI Agents

Whenever touching Supabase PostgreSQL, SQL migrations, or TypeScript repository classes in GALXAI, the AI Agent MUST strictly abide by the following constraints:

## 1. The Senior Architect Context
- The maintainer is a Senior Distributed Systems Architect who **does not know or write SQL or Supabase internals**.
- The AI Agent is the sole database maintainer.
- **Extreme paranoia, scrutiny, and mechanical verification** are mandatory.

## 2. The 10 Invariant Commandments
1. **Zero Destructive DDL**: Never use `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, or `CASCADE` in UP migrations. Use the 3-phase Expand/Contract pattern.
2. **Default-Deny RLS**: Every table must have `ENABLE ROW LEVEL SECURITY;` and `FORCE ROW LEVEL SECURITY;`.
3. **`SECURITY DEFINER` Lockdown**: Every `SECURITY DEFINER` function MUST have `SET search_path = public, pg_temp;`.
4. **Double-Entry Financial Immutability**: No direct balance updates on `galx_wallets`. Use atomic stored procedures with `galx_wallet_transactions` ledger insertion.
5. **Zero-Lock Concurrent DDL**: Use `IF NOT EXISTS` and non-blocking constraints on high-throughput tables.
6. **Bi-directional Rollback Parity**: Every `NNN_name.sql` migration MUST have a corresponding `rollbacks/NNN_name.down.sql`.
7. **AES-256-GCM Vaulting**: Shard credentials must be encrypted with AAD binding (`tenantUid:shardId:provider`).
8. **Monotonic Fencing Tokens**: Distributed locks and task leases must increment integer fencing tokens.
9. **Architect-Readable English Summary**: Always explain database changes in non-technical architectural terms (Risk, Blast Radius, Locks, Rollback).
10. **Automated Verification**: Always run `npm run db:verify && npm run db:test` after modifying database files.
