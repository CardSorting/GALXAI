# Complete the domain review queue

<!-- docs-scope: operational-record -->

September 13, 2026 UTC. Private maintainer review following the [initial knowledge audit](../DESIGN_RATIONALE.md). This pass reviews the seven previously unreviewed domains and renews knowledge review. [Structured evidence](2026-09-13-domain-reviews.json) names the canonical guides, inspected source contracts, actual checks and limits for each domain. Earlier audit results remain dated evidence.

## Review scope and findings

| Domain | Reviewed contract and outcome |
| --- | --- |
| Images | Durable owner-scoped receipts, acknowledgement ordering, single dispatch, uncertain outcomes, committed assets and public artifact boundaries align with the recovery guides. |
| Access | Public products, current developer approval, separate staff authority, last-owner protection and versioned reads reviewed. Corrected hybrid rollback to retain the access gate and durable image readers. |
| Sites | Paid-plan authority, fair usage, workspace recovery and domain reconciliation reviewed. Corrected relay-facing Sites guidance that still described historical wallet settlement as the managed path. |
| Relay | Lifecycle, containment and telemetry guidance checked against launcher and capability/ownership regressions. Recovery retains controller authority and original operation receipts. |
| Database | Authority, migration inventory and isolated rollback/authorization checks reviewed. Corrected a pool comment promising automatic fallback and zero loss beyond its actual contract. |
| Delivery | Build exclusions, CI triggers, release/rollback and scheduler boundaries reviewed. Docker now targets the declared Node 22 baseline; no application Docker build was performed. |
| BroccoliDB | Facade safety and hybrid read/version authority reviewed. An API fixture still assumed public access and failed; corrected approved/denied identities through real guards. Rewrote QA guidance to remove unsupported latency and resilience guarantees. |
| Knowledge | Require all registered domains to have current reviews and retained evidence; evidence changes invalidate attestations. Every documentation CI event enforces completeness and deadlines and emits an owner/deadline summary. Added the weekly activation and triage runbook. |

This is canonical-guide/source-contract alignment with stated regression coverage. The fingerprints cover a broader source inventory to detect future drift. They do not certify every generated compactor, every historical SQL statement, every legacy reference, production performance or continuous availability.

## Verification and limits

All listed local suites passed: 35 documentation guard fixtures, 23 image security checks, 37 image database checks, 20 access unit checks, 35 Sites unit checks, 26 fair-usage acceptance cases plus 60 role denials, 86 workspace database checks, 94 database tests, 152 relay capability tests, three desktop-login tests, seven BroccoliDB API groups, hardening checks and 13 transport/egress tests. Preview and administrator integration suites also passed, including current grants, batching, concurrent changes and last-owner protection. Static migration validation covered 103 pairs with no violations or warnings. The production build passed with 277 pages.

Database runners used disposable PostgreSQL fixtures and removed them. Initial sandbox permission failures were rerun with authorized local access. The initial BroccoliDB assertion failure is retained as a finding; no production authentication bypass was added. Local Node 26 execution differs from CI's Node 22 application environment.

No new production database operation, checkout, paid generation or publication was used to validate prose. The Docker application image and live public assets were not revalidated. Existing storage accounting, controller alerting and other incident follow-ups remain separate work. Final documentation checks and hosted execution require their own receipt after the push; a manual success does not assert that a future cron event fired.

## Maintenance

Every registered domain now requires an explicit review with retained evidence. Preserve this dated record; use a new audit for later observations. Follow [knowledge maintenance](../../runbooks/knowledge-maintenance.md) for drift and [weekly audit operations](../../runbooks/weekly-knowledge-audit.md) for GitHub verification. Review dates are renewed through actual inspection, never automatically by CI.
