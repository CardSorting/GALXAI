# ADR 0128: Documentation authority and federation contract

<!-- docs-scope: decision-record -->

Date: 2026-09-07; reconciled 2026-09-09. Status: accepted and implemented.
Audience: private maintainers. [ADR 0129](0129-public-image-artifacts-and-verified-identity.md) governs public information independently.

## Problem

Shared-relay instructions, unverified performance claims, repeated defaults and stale deployment status can contradict newer lifecycle and credential decisions. A precedence banner alone does not repair actionable obsolete commands elsewhere in the same document.

## Decision

The [federation contract](../FEDERATION_STRATEGY.md) defines current internal behavior; the [runbook](../RELAY_VNEXT_RUNBOOK.md) defines operations and the [API reference](../RELAY_API_REFERENCE.md) defines transport/recovery. Enrollment and desktop guides own their workflows. Public site content explains capability and customer contracts only and must not import repository operational details.

Reconcile affected guides and ADR bodies in full when strategy changes. Update status, decision, consequences, examples, failure guidance and navigation together. Remove obsolete actionable instructions instead of leaving contradictory bodies beneath a successor note. Preserve original measurements and rollout facts in explicitly dated evidence sections or operational records; do not rewrite what was actually observed in the past.

Record topic-specific precedence: ADRs 0123–0125 govern database health, 0126 federation ownership/capability, 0127 the explicit image alias, 0129 public boundaries, 0130 uncertain image outcomes, 0131 operator access/holds, 0132 credential handoff 0133 enrollment/test isolation, 0134 fixed-price Sites admission, 0135 durable text receipt recovery and 0136 customer-owned Sites delivery. Unrelated subsystem decisions retain their scope.

Every Markdown file under `docs/` and `post-mortem/` has one scope marker. The generated docs catalog and authored-workspace inventory preserve complete discovery. ADR IDs are contiguous and indexed. Acceptance, implementation, local verification, image build, process rollout and actual-client verification are distinct states. Avoid undated counts and blanket deployed/not-deployed statements spanning different components.

[ADR 0144](0144-durable-images-and-incident-documentation.md) extends this policy with a single private incident directory, current-state record, append-only journal, follow-up criteria and source-bound review. [Documentation policy](../DOCUMENTATION_POLICY.md) is the maintained procedure; root handover/context files reference current state rather than duplicating it. Historical fixed-price Sites records do not override later public workspace and paid-plan decisions.

## Alternatives and consequences

Deleting history would lose rationale; leaving old procedures active would create competing instructions. Complete semantic reconciliation plus dated evidence preserves both usefulness and accuracy. Domain references and research are not newly certified by a relay documentation pass.

## Validation

Run `npm run docs:sync`, `npm run docs:check`, semantic searches for retired guidance and `git diff --check`. Review command existence and linked source. The validators check coverage/navigation, incident lifecycle and monitored source drift, not every runtime claim. Explicit semantic review precedes a fingerprint refresh. Public response/auth tests, production build and scoped rendered-page/browser-asset scans establish the relevant public boundary; none proves live deployment of every origin.

Documentation publication alone changes no registry authority, worker ownership, account login, paid entitlement or production service.
