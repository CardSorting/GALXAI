# Incident operations and learning

<!-- docs-scope: current-guide -->
<!-- GALX_PRIVATE_POST_MORTEM_CONTENT -->

Private operational records. Start here during a failure; do not publish this directory, import it into application code, or copy its diagnostics into customer messages.

| Need | Authoritative record |
| --- | --- |
| Latest verified state and remaining uncertainty | [Current state](CURRENT_STATE.md) |
| Start containment and record progress | [Triage](runbooks/triage.md), [rolling log](ROLLING_LOG.md) |
| Recognize a repeat failure | [Failure modes](failure-modes/README.md) |
| Restore image generation or Favorites | [Image recovery](runbooks/image-generation.md) |
| Diagnose a stopped controller | [Controller ownership and locks](runbooks/controller-lock.md) |
| Address deployment storage pressure | [Deployment storage](runbooks/deployment-storage.md) |
| Review unresolved prevention work | [Open items](OPEN_ITEMS.md) |
| Find a dated incident | [Incident index](INCIDENTS.md) |
| Add or maintain records | [Documentation workflow](runbooks/documentation.md), [incident template](templates/incident.md) |
| Find all project documentation | [Documentation policy](../docs/DOCUMENTATION_POLICY.md), [complete catalog](../docs/CATALOG.md), [workspace inventory](documentation-inventory.json) |

`register.json` owns incident status and follow-up actions. `events.jsonl` is the append-only troubleshooting and containment journal. The incident index, rolling log and open-items view are generated from those files; run `npm run docs:sync` after editing them. Recovery is an incident state; completed prevention work needs its own evidence.

## Working rules

1. Record the observation before intervention: UTC time or explicitly date-only evidence, customer impact, component, operation identity, and evidence location. Separate observed facts from hypotheses.
2. Contain the smallest affected scope. Preserve accepted work, tenant authority, storage and rollback state. A retry must not repeat an uncertain generation or payment.
3. Record every action, its result, and the next decision in the rolling journal. Append corrections with the original event ID; do not rewrite observations to make a timeline look successful.
4. Restore and verify the real customer path. A health response, successful build or deployment marked Ready is insufficient evidence of generation, download, persistence or settlement.
5. Update the incident, failure mode, current state, affected guide bodies and follow-ups in the same change. Record implementation, deployment and live verification separately.

## Retention and privacy

Keep concise, reviewed evidence in Git: status codes, counts, request/deployment IDs, artifact hashes and test summaries. Exclude credentials, cookies, signed URLs, account exports, unredacted user prompts, database dumps and screenshots containing private data. `**/evidence/raw/` is local-only and ignored by Git; review and remove raw captures when no longer needed. Do not use this repository as a production telemetry sink.

All dates are historical observations, not continuous monitoring. Review open items weekly and operational source changes before release. Retain sanitized incident summaries and corrective history. If the journal eventually needs partitioning, make an explicit validator/schema change that preserves the original history; do not delete committed events to shorten the log. No autonomous monitoring, scheduled cleanup, or guaranteed recurrence prevention is implied by this documentation.
