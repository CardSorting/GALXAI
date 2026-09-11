# Sites delivery strategy

Private strategy, reconciled September 11, 2026. [ADRs 0134–0136](../../../docs/adr/README.md) record the accepted architecture; [Sites operations](../../../docs/maintainers/SITES_OPERATIONS.md) owns configuration and rollout. The new fixed-price mode is implemented and locally verified, with no new deployment or customer billing in that implementation pass.

## Chosen product

Use the existing relay to produce bounded text for a deterministic static template. A customer-local companion validates and packages the result, then uses that customer's own Sites connection to save and privately publish an exact version. The model provides content, while the runner controls tools, files and publication. This delivers a narrow repeatable workflow with one model supplier.

The default content tariff is a provisional $0.05 per completed generation and 20 admitted operations per account in a rolling day. Both are configurable, and new work requires an explicit account cohort and feature flag. Quote acceptance, wallet reservations, local limits and durable completion control admission and settlement. Supplier costs and quota can remain unknown; they are not substituted with invented usage or claims of unlimited capacity.

A completed receipt with missing token counts can settle at the fixed price. An uncertain completion stays reserved. A completed invalid draft can incur the fixed charge, and a repair is separately quoted. This strategy changes the basis of the customer price; it does not prove supplier profitability or unlimited availability.

## Capability and evidence

| Capability | Current result and limit |
| --- | --- |
| Relay-generated short text | Historically demonstrated live; fixed-mode behavior has local regression coverage |
| Deterministic static artifact | Implemented and verified with schema validation, exact files and canonical archive retention |
| Durable account billing | Implemented, with 52 disposable PostgreSQL/HTTP checks in the fixed-price pass; no live customer wallet charged by that pass |
| Receipt recovery | A precursor receipt survived a live worker replacement; fixed-mode usage-less recovery passed local process/container checks |
| Native-host save and private update | Historical customer-owned canary succeeded; preserve its original source/version/receipt evidence |
| Direct CLI archive save | Unqualified on the inspected tool path; does not block content generation or native-host delivery |
| General Codex agent using GALX as model provider | Still outside this workflow; the earlier Responses/tool compatibility failure is not repaired by text generation |
| Multi-customer hosted publishing service | Not implemented by this customer-local companion |
| Full live fixed-price generation through publication | Not established by the current evidence |

The [native compatibility experiment](sites-relay/README.md) remains scoped evidence for a different integration. Its failure does not require adding another provider or rebuilding a native agent loop to deliver the selected workflow. A relay key also does not establish the customer's Sites access.

## Ownership, actions and recovery

The GALX server authenticates the account and owns the wallet, tariff and relay access. The companion holds only its own customer session/connection and private job state. Every save binds local artifact hash, pushed source commit, selected project and remote version. Publication rechecks account ownership, original save acknowledgement and owner-only audience.

Use `request-hosted-save` and `accept-hosted-save` for the documented native-host handoff. A missing upload acknowledgement stays pending; never invent a saved version or repeat the upload through another transport. Publication reconciliation observes the original deployment instead of issuing another release. Existing authorization applies; unresolved runtime approvals are not granted automatically.

Local jobs and immutable artifacts survive process restart. The companion's pinned WAL runtime and the worker's rollback-journal runtime are separate. Retained state is sensitive and requires compatible backups; local locks do not coordinate independent publishers on other workstations.

## Commercial scope

The separately proposed $299/month agency operations service and $750 setup engagement remain business hypotheses. The fixed content tariff does not implement those plans, turn compute into an included subscription allowance, or demonstrate paid renewal. A complete deliverable can require generation, a paid repair, packaging, hosting access and support; the $0.05 amount prices only one completed content generation.

Conservative planning scenarios may be used for supplier expense and support effort while facts are incomplete. Label them as assumptions, preserve measured receipts independently, and revise future scope/prices based on observations. Do not delay implementation to manufacture exact quotas or pass a supplier-ceiling assertion. Continue to enforce the defined account, runtime and storage limits and stop new admission when local capacity or funding is unavailable.

## Next operating work

Roll out the compatible worker, federation and application with generation paused, preserve volumes/signing state, verify readiness and account isolation on the exact environment, then enable the intended cohort. Keep original-price reconciliation available during pause and rollback. Native-host delivery independently verifies the customer's save and publication; direct CLI delivery needs its own successful upload test before being offered as unattended.

The [operations guide](../../../docs/maintainers/SITES_OPERATIONS.md#rollout) contains the concrete sequence. No additional supplier or complete quota model is a prerequisite for fixed-mode implementation. Wider rollout still needs observation of the actual product journey, not a claim inferred from test counts.

## Evidence register

- [Fixed-mode verification](sites-automation/durable/opaque-provider-verification.json): 103 application, 52 database and 68 companion checks, TypeScript, production build, packaged restart, and 633 scanned local assets; counts overlap.
- [Precursor production release](sites-automation/durable/RELEASE_20260911.md): earlier deployed components with paid activation disabled; distinct from fixed-mode rollout.
- [Native-host save/update](sites-automation/durable/hosted-save-verification.json): historical private delivery, no paid generation.
- [Initial relay-only feasibility](sites-automation/live-observations.json): historical single generation and packaging observation, not full delivery proof.
- [Original assessment snapshot](historical-docs/SITES_ASSESSMENT.md.txt): verbatim initial account/plugin diagnostics, source citations and measurements, retained as historical evidence.
