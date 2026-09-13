# ADR 0145: Maintain knowledge with source changes

<!-- docs-scope: decision-record -->

Date: 2026-09-13. Owner: documentation maintainer. Accepted for the user-requested private knowledge workflow. Delivery is tracked separately in the [lifecycle register](../knowledge/DECISIONS.md); local implementation does not activate hosted CI.

## Context and decision drivers

The corpus mixed current instructions, historical records and research. Existing incident controls covered critical source drift, but maintainers still lacked task-based discovery, domain responsibility and explicit decision/delivery states. Some active-looking references promised workflows or metrics unsupported by source. See the [dated audit and research](../knowledge/DESIGN_RATIONALE.md).

## Options considered

A single index preserves links but gives weak task discovery. A new hosted documentation portal adds access control, publication and infrastructure work before content authority is resolved. A private Markdown knowledge catalog can add familiar navigation, ownership and checks to the existing repository without a new service.

## Decision

Use task-oriented tutorials, how-to guides, runbooks, reference and explanations while retaining stable file paths and ADR IDs. Keep incident procedures canonical in `post-mortem/`. A local registry links domain owner roles, source patterns, canonical guides, checks and curated decision metadata. Generate indexes and provide offline search and change-impact commands.

Separate decision status from implementation/deployment/verification. Do not infer legacy status. Require reciprocal full-supersession links and evidence for delivery claims. Review fingerprints are explicit dated attestations; regeneration cannot refresh them. CI checks due/stale reviews without changing records or taking operational actions.

September 13 activation refinement: require reviews for every registered domain and retain hashed evidence with each attestation. Apply the complete/current gate to all documentation CI events, provide owner/deadline summaries, and retain bounded failure artifacts. A domain review reconciles canonical guides and source contracts with stated test coverage; the wider fingerprint inventory is change detection, not exhaustive semantic certification. The [domain review](../knowledge/audits/2026-09-13-domain-reviews.md) records the adoption work that supports this stricter policy.

## Consequences and recovery

Maintainers get task discovery and visible drift, with no model calls or additional datastore. The registry and review scopes require maintenance. Unmapped sources and unreviewed legacy references remain explicit; structural validation cannot prove all prose correct. Offline lexical search favors simple, inspectable behavior over semantic ranking.

If metadata or navigation is wrong, correct the registry and regenerate. Correct guides through reviewable diffs. Preserve dated evidence and append incident corrections. Follow [knowledge maintenance](../runbooks/knowledge-maintenance.md) for failures; no documentation command repairs or deploys the product.

## Confirmation and delivery

Validate registry/lifecycle, complete link coverage, runbook contracts, drift and explicit review behavior in adversarial fixtures. Run existing private publication guards and the production build for the changed repository boundary. Record actual local results in [the audit evidence](../knowledge/audits/2026-09-13-verification.json). Hosted weekly execution remains unverified until pushed and observed.

## Relationships

Extends [ADR 0128](0128-documentation-authority-and-federation-contract.md) and the incident workflow in [ADR 0144](0144-durable-images-and-incident-documentation.md). It does not supersede their operational or public information contracts. Public capability documentation remains governed by [ADR 0129](0129-public-image-artifacts-and-verified-identity.md).
