# Reconcile stale knowledge

<!-- docs-scope: current-guide -->

## Purpose and trigger

Use when CI reports stale navigation/reviews, source impact reveals missing guidance, an incident exposes a wrong instruction, or the weekly review is due. Owner: documentation maintainer, with the affected component maintainer.

## Authority and prerequisites

Work in the private repository. Read [documentation policy](../DOCUMENTATION_POLICY.md) and preserve the existing working tree. Git, Python 3.11+ and npm suffice for knowledge checks. Documentation access does not grant authority to change production.

## Procedure

1. Run `npm run docs:status`, `npm run docs:impact` and `npm run docs:check`. Separate generated drift, source drift, due review and unreviewed reference material.
2. For generated drift, inspect registry/paths and run `npm run docs:sync`. For source drift or due review, read the owning source, tests and complete guide; correct contradictions before attesting. For unmapped source, add a domain or extend the responsible domain's patterns.
3. Remove obsolete executable recipes from active guides. Preserve historical observations under dated evidence and add concise redirects where old links need to survive. Use a successor ADR for a changed decision; do not erase original reasoning.
4. Retain dated evidence listing inspected sources, reconciled guides, actual checks and remaining limits. Record a domain review with `--evidence` and a deliberate next review date. All registered domains require this record. If the critical incident/source guard also reports drift, review that set and record its separate attestation. These are the two review scopes documented in [command reference](../reference/knowledge-commands.md).
5. Regenerate and validate. Add a dated audit or incident follow-up for material corrections, including what remains unreviewed. Assign outstanding incident prevention work in the existing register.

## Stop conditions

Stop applying a disputed operational instruction when code, decision and deployed evidence disagree. Record the conflict and identify the component owner. Never run a production repair just to validate prose, refresh fingerprints blindly, or classify a reference as reviewed because an index build passed.

## Recovery and rollback

Repair an incorrect index through the registry and regenerate it. Review a targeted Git diff before reverting an erroneous guide edit; preserve unrelated work. Correct committed incident history by appending a correction event. If a prior review was wrong, explain it in the next dated audit and perform a new review.

## Verification and evidence

`npm run docs:audit`, `npm run test:docs` and `git diff --check` must pass. The audit includes completeness, evidence integrity, source drift and due dates. Follow the [weekly CI runbook](weekly-knowledge-audit.md) to verify the hosted run. Record inspected sources, corrected guides, remaining gaps and local/hosted execution separately. A passed freshness guard proves only the stated checks.
