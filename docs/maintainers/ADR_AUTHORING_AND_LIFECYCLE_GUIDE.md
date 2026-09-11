# ADR authoring and lifecycle

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

ADRs preserve decisions and their evidence. Current operator instructions live in guides, with the [federation contract](../FEDERATION_STRATEGY.md) as relay authority. The [complete catalog](../adr/README.md) indexes every record.

## When to write a decision

Record changes to public behavior, ownership, routing, capability interpretation, credential/health authority, retries, persistence, security boundaries, or database schema. A small wording correction need not invent an architecture decision.

Use the next unused four-digit ID. Distinguish proposed, accepted, implemented, verified, deployed, rejected, and superseded: acceptance does not prove implementation, and passing tests does not prove deployment. Describe partial supersession by topic; unrelated parts of a record can remain applicable.

## Record structure

- Title, date, component, and decision status.
- Concrete problem and trigger, including observed failure where available.
- Chosen behavior, alternatives considered, and tradeoffs.
- Authority, freshness, resource bounds, and failure/recovery semantics.
- Relevant source and validation evidence with revision/environment/date.
- Deployment scope, known limits, rollback, and predecessor/successor links.

Prefer a short reviewable decision over a ceremonial template. Do not require invented performance numbers, universal guarantees, or a fixed test count. Use exact model/operation semantics and explicitly document compatibility aliases.

## Keep current guidance current

Update affected API, deployment, security, troubleshooting, and developer guides in the same change. Link shared defaults to the runbook/source instead of copying them throughout the corpus. Update catalogs and documentation scope metadata. Reconcile the entire affected ADR body: status, decision, consequences, procedures and successor links. A banner cannot make an obsolete command safe. Preserve historical measurements and rollout facts in explicitly dated evidence sections; do not rewrite past observations as new verification.

ADRs 0123–0125 govern database cooldown and observation authority. ADR 0126 establishes 1:1 capability-aware federation. ADR 0127 adds the explicit verified image alias and dated production cutover. ADR 0129 governs public information, ADR 0130 uncertain image results, ADR 0131 operator sessions/maintenance, ADR 0132 recoverable credential handoff ADR 0133 enrollment/test isolation, and ADRs 0134–0136 fixed-price Sites admission, durable text receipts and customer-owned delivery. Older shared-relay, fuzzy-routing or simulation decisions do not override those contracts.

Run `python3 scripts/verify-docs.py` and `git diff --check` for documentation changes. Validate relative targets and catalog coverage. Document source behavior separately from proposals and commercial claims; historical benchmarks do not establish production SLOs.
