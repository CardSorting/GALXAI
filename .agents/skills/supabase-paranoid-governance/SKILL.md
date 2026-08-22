---
name: supabase-paranoid-governance
description: Operational runbook and paranoid protocols for AI agents maintaining Supabase PostgreSQL in GALXAI without human SQL review.
---

# Supabase Paranoid Governance Runbook for AI Agents

This skill provides step-by-step procedures for AI agents to safely maintain, migrate, and optimize the Supabase PostgreSQL database for a Senior Architect who does not know SQL.

---

## 🧭 The 4-Phase Operating Protocol (AOP-DB)

### Phase 1: Forensic Discovery & Blast-Radius Assessment
Before writing or modifying any database code:
1. Run `npm run db:status` to inspect existing migration history.
2. View existing schema definitions in `src/lib/supabase/types.ts`.
3. Check affected repository classes in `src/lib/supabase/repositories/`.

### Phase 2: Provide English Architectural Impact Statement
Output a concise summary for the Senior Architect before or alongside code proposals:
```markdown
### 📋 Architect Database Impact Statement
- **Objective**: [What is being accomplished]
- **Risk Level**: [LOW | MEDIUM | HIGH | CRITICAL]
- **Tables Affected**: [List of tables]
- **Lock Contention**: [None (Concurrent / Non-blocking) | Minimal | High]
- **RLS & Security**: [Row Level Security policies applied]
- **Rollback Feasibility**: [Deterministic 1-click rollback via NNN_name.down.sql]
```

### Phase 3: Generate UP and DOWN Migrations
1. Use `npx tsx scripts/manage-migrations.ts --generate <feature_name>` or create paired files:
   - `supabase/migrations/YYYYMMDDHHMMSS_<feature_name>.sql`
   - `supabase/migrations/rollbacks/YYYYMMDDHHMMSS_<feature_name>.down.sql`
2. Enforce:
   - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
   - `ALTER TABLE ... FORCE ROW LEVEL SECURITY;`
   - `$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;`
   - Idempotent statements (`IF NOT EXISTS`, `CREATE OR REPLACE`).

### Phase 4: TypeScript Sync & Mechanical Verification
1. Update `src/lib/supabase/types.ts` `Database['public']['Tables']` and `Functions`.
2. Update repository methods in `src/lib/supabase/repositories/`.
3. Run the automated verification commands:
   ```bash
   npm run db:verify
   npm run db:test
   ```
4. Verify both commands exit with code 0 before reporting completion.
