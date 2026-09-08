# ADR 0128: Documentation authority and federation contract

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

Date: 2026-09-07. Status: Accepted; documentation refactor implemented.

## Problem

Older deployment guides described a shared relay and unverified ingress, while newer decisions established 1:1 capability-aware federation and a verified image alias. API/SDK examples mixed application and worker contracts. Repeated defaults, historical test counts, and promotional guarantees made it difficult to identify the current safe action.

## Decision

Use [FEDERATION_STRATEGY.md](../FEDERATION_STRATEGY.md) as the current relay contract, the vNext runbook for operations/defaults, and the relay API reference for transport/recovery. Rewrite active guides around those boundaries. Preserve broader subsystem references, research, commercial drafts, and dated evidence with explicit scope in the complete catalog.

Preserve ADR bodies as records of their decisions and evidence. Add topic-specific precedence notes instead of retroactively rewriting historical verification. Acceptance, implementation, verification, and deployment are separate states. ADR 0126 establishes federation; ADR 0127 explicitly extends its no-substitution rule with one opt-in verified image alias and records production cutover. ADRs 0123–0125 retain database health authority within their own scope.

Every documentation Markdown file is cataloged and carries a scope marker. A dependency-free documentation check verifies catalog coverage, ADR IDs, local file links, and the current guide boundaries. Historical relative links are repaired without treating their content as current deployment instructions.

## Alternatives and tradeoffs

Deleting old records would remove useful rationale. Leaving all documents labelled authoritative would preserve conflicting instructions. Scope-labelled history plus concise current guides keeps context and discoverability while avoiding invented runtime guarantees. Domain references are retained, not newly certified by this editorial pass.

## Verification and rollout

Run `python3 scripts/verify-docs.py` and `git diff --check`. This change does not run inference, change database authority, replace workers, enable paid Hive, or establish a new live availability observation. Normal repository publishing may build the application; that does not replace federation containers.
