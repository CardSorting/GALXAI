# ADR 0161: BROC persistent practice for existing Stars

<!-- docs-scope: decision-record -->

Status: proposed
Delivery: source and tests complete; migration applied to the linked production database on 2026-09-25 and the public application deployed. Decision status remains proposed pending explicit ADR acceptance.

## Context and decision drivers

Existing Stars already have durable actor identities, bounded generation
attempts, a prompt-building path, and an image generation service. Their
creative direction is not yet persisted as an evolving practice. BROC needs to
carry artistic canon and recent decisions between performances while keeping
the Star identity and the existing application authoritative.

The implementation must not create another application, Star registry,
generation service, public management surface, or database. Performance output
must not silently become artistic canon, and an interrupted generation must
retain its original prompt and scene when recovered.

## Options considered

1. Add evolving practice fields directly to mutable Star/profile JSON. This
   couples artistic history to identity updates and loses an append-only audit.
2. Create a separate BROC application or database. This duplicates existing
   product and persistence infrastructure and splits Star identity.
3. Add a private append-only event stream linked to existing actors and
   generation attempts. This keeps durable identity and generation ownership
   in their current systems while retaining versioned practice history.

## Decision

Propose option 3. `BROC/practice.ts` builds a medium-aware scene and bounded
prompt context from an existing Star definition, a versioned canon, and a
bounded recent event window. `BROC/store.ts` persists that practice through the
existing private PostgreSQL authority in `galx_star_practice_events`, linked to
existing actor and attempt identifiers. The existing Star controller persists
the scene beside its immutable attempt prompt and records completed output as
an unreviewed candidate.

Canon changes require a separate versioned revision with a rationale. Critique,
discovery, rejection, and direction are explicit event types. The current
generation loop does not inspect image pixels or produce those judgments
automatically. No public route or profile field is added. This decision governs
practice memory and candidate creation; the separate rule that candidates need
institutional selection before exhibition is recorded in
[ADR 0163](0163-star-candidate-selection-before-exhibition.md).

Practice events use a database identity sequence for deterministic ordering;
wall-clock timestamps alone are not a stable order when several events commit
within the same transaction.

## Consequences and recovery

Practice history is private, append-only, bounded when retrieved, and does not
rewrite Star identity. An attempt can be resumed with its persisted prompt. The
runtime change requires the new migration before it can run; a missing schema
stops the existing bounded run as a persistence defect. The paired rollback
refuses to remove a non-empty practice history.

This proposal does not deliver pixel-level critique, user-facing direction
controls, or automatic canon promotion. Those require separate product and
review decisions. See the [account and actor schema guide](../maintainers/ACCOUNT_PROFILE_SCHEMA.md).

## Confirmation and delivery

The focused practice suite checks Star seeding, medium-aware scene construction,
recent repetition handling, explicit direction, allowlisted judgments, and
private/append-only schema rules. TypeScript, existing public image-boundary
checks, database verification, docs checks, and a production build remain
required before release. Source and migration are local only; no database
migration or deployment has been applied.

## Relationships

Related: [ADR 0016, authoritative PostgreSQL](0016-authoritative-supabase-postgresql-substrate.md),
[ADR 0025, BroccoliDB L1 table](0025-broccolidb-l1-reactive-in-memory-table-and-secondary-indexing.md),
and [ADR 0160, private human creation and Star publishing](0160-private-human-creation-star-publishing.md).
