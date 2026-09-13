# Write and maintain an architecture decision

<!-- docs-scope: current-guide -->

Use an ADR when changing a consequential product contract, authority, ownership, persistence, retry/recovery rule, security boundary or architecture. A routine bug fix or wording change can explain its rationale in the PR. Keep records short enough to review alongside implementation.

## Create a decision

1. Inspect the [complete ADR catalog](../adr/README.md) and owning domain to avoid duplicating an existing decision. Choose the next unused four-digit ID; never reuse or renumber one.
2. Copy the [ADR template](../knowledge/templates/adr.md) into `docs/adr/NNNN-title.md` and use the `decision-record` scope marker. Explain the problem, viable options, chosen behavior, consequences, recovery and confirmation.
3. Add the record to the ADR catalog and `decisions` in [registry.json](../knowledge/registry.json), with `status: proposed` and `delivery: not-started`. Name the responsible role, date and domain. Link current guides and related decisions.
4. Obtain the review appropriate to the change and existing authorization. Record the actual acceptance basis; do not invent reviewers or assume a GitHub team exists. Update decision status explicitly.
5. Reconcile affected active guides and runbooks in full. Validate with `npm run docs:sync`, `npm run docs:check`, `npm run test:docs` and the relevant implementation checks.

## Keep two separate states

| Decision state | Meaning |
| --- | --- |
| proposed | A choice is being evaluated |
| accepted | The choice is authorized for its stated scope |
| rejected | The proposed choice was declined; rationale is retained |
| deprecated | The choice is being retired; explain the remaining scope |
| superseded | Another registered decision fully replaces it |

Delivery is independently `not-started`, `local`, `deployed` or `verified`. Every state beyond not-started requires evidence. Deployed/verified also requires target, revision and observation timestamp. Verified means the linked acceptance scope was exercised, not universal reliability. Mixed component delivery belongs in separate evidence records; choose the state supported for the whole registered scope.

An observed deployment can be recorded while a decision remains proposed, or after a choice is rejected. Preserve both facts and explain their scope; do not change approval status merely to record what is running. Validation and generated views never accept a decision. A delivery record is evidence of an observation, not permission for a future deployment.

The [lifecycle register](../knowledge/DECISIONS.md) covers explicitly curated metadata. Older ADRs remain searchable and retain their original scope; their status is not inferred from age, numbering or prose. Register a legacy record when its topic is reviewed, without silently promoting unrelated records.

## Supersession and corrections

For a new choice, create a successor and preserve the original decision rationale and dated evidence. Full supersession uses reciprocal `supersedes` and `superseded_by` links; the guard rejects missing links and cycles. Partial replacement is described by topic in both records and does not mark the whole predecessor superseded.

Current instructions belong in guides. Remove obsolete executable recipes from active guides and point historical procedural sections to the current owner. Correct factual errors in a decision with a dated correction, identifying what changed; do not rewrite old acceptance or measurements as new facts. A banner above contradictory active instructions is insufficient.

## Confirmation

Link relevant source, tests, runbook, incident/failure mode when applicable, and dated delivery evidence. Record limitations, rollback compatibility and remaining work. Use [ADR 0145](../adr/0145-maintained-knowledge-and-decision-lifecycle.md) for this knowledge workflow and the owning topic's decisions for product behavior; no single highest ADR number overrides every subsystem.
