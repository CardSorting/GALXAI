# ADR 0117: Server-Mediated Tenant Authority & Secure PostgreSQL Defaults

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
Accepted

## Context

Ten migrations dated `20260903193143` through `20260903202157` remained local-only after newer production migrations had already established service-mediated chat, shard, and quota authority. Applying that old branch out of order would have overwritten newer decisions.

The audit found four critical semantic defects:

1. `fn_set_tenant_session_context` allowed an authenticated caller to choose arbitrary tenant and role claims.
2. `fn_can_access_conversation` treated every anonymous caller as authorized for every `guest_%` conversation.
3. Client DML grants would have reopened chat, credential, task, wallet, billing, and quota tables that current repositories access through a trusted server boundary.
4. PostgreSQL's default `EXECUTE` privilege left existing `SECURITY DEFINER` routines callable by `PUBLIC`, including developer-key deletion and financial mutation capabilities.

The branch also attempted unverified `LEAKPROOF` markings, used a token-revocation absence check as proof of session validity, and introduced a recursive workspace-membership policy. Those mechanisms were not safe to retain.

## Decision

Migration `20260904230000_galxai_tenant_authority_reconciliation` replaces the ten never-applied migrations with one forward-only reconciliation:

- Force RLS on 32 tenant, credential, chat, queue, financial, and governance tables.
- Remove browser table privileges and mixed-era policies; create one explicit service authority policy per table.
- Keep RPC-adjudicated quota and wallet-hold state read-only even to `service_role` so raw DML cannot bypass policy functions.
- Give append-only audit and wallet ledgers only `SELECT` and `INSERT`, backed by private-schema `SECURITY INVOKER` mutation-rejection triggers.
- Revoke `PUBLIC`, `anon`, and `authenticated` execution from every existing public-schema `SECURITY DEFINER` routine, then explicitly grant `service_role`.
- Set secure default privileges so future tables, sequences, and functions are not browser-accessible unless a reviewed migration opts in.
- Remove artifacts from partially executed copies of the abandoned branch and remove their nonexistent RPCs from generated TypeScript types.

The ten old migration and rollback pairs are deleted because they never entered the production migration ledger. Recording them as applied or editing them in place would falsify deployment history.

## Authority Boundary

```text
browser / agent request
        |
        v
authenticated server policy
        |
        v
repository / adjudicating RPC
        |
        v
authoritative PostgreSQL state + journal
```

Tables store accepted state. Routines are capabilities. Browser and agent inputs are proposals, not mutation authority.

## Verification

`npm run db:audit:tenant-authority -- --assert-hardened` checks the live catalog for:

- all 32 expected tables present with enabled and forced RLS;
- zero browser table privileges across the authority surface;
- exactly one service policy per table;
- zero browser-callable public-schema `SECURITY DEFINER` routines;
- secure default privileges; and
- immutable triggers on both audit journals and the wallet transaction ledger.

The same audit accepts `--with-migration <path>` to execute the migration inside a rollback-only live transaction before deployment.

## Consequences

- Client code must use authenticated API routes rather than Supabase Data API mutations for authority state.
- Backend repositories retain access through pooled PostgreSQL or the service-role client.
- New client-facing database projections require an explicit, reviewed grant and role-scoped RLS policy.
- Rollback reopens the previous broad privilege posture and is therefore emergency-only; forward repair is preferred.
