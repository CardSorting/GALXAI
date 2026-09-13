# Incident documentation reconciliation — September 13, 2026

<!-- docs-scope: operational-record -->

Private record for `INC-20260913-DOCS`. The audit concerns stale operational instructions and fragmented evidence; it does not assert a new production outage. Local verification is complete; remote CI enforcement and continuing reviews remain open.

## Findings

- The existing documentation validator failed with 12 issues: six developer-preview guides lacked scope markers and catalog entries.
- Root handover/context described September 11 source as current and undeployed, conflicting with later product work and the September 13 image recovery.
- Product/contributor/developer guidance retained the retired no-image-studio and customer-local-only Sites strategy. Some migration instructions described a disabled manager as an apply workflow.
- A troubleshooting guide instructed operators to print a vault secret and invoke vault-population during diagnosis. Generic rollback advice could reopen private developer access or discard accepted operation state.
- The image and storage incidents were spread through `internal/operations` without an ongoing journal, explicit failure-mode index or tracked prevention criteria.

## Changes

Consolidated seven earlier incident records in `post-mortem/incidents/2026`, preserving observations and linked evidence. Archived the prior root handovers, retained compatibility links for moved docs, and made current state a single maintained record. Raw controller snapshots remain local-only under ignored evidence storage.

Reconciled the complete affected product, contributor, developer, database, diagnostic and release guides. Added structured incident/action/event records, generated rolling views, categorized failure modes, bounded recovery procedures, a documentation authority policy and source-bound review checks. CI and the local deployment-check path now include the documentation guard; image security/database regression gates are explicitly named.

Historical research/commercial/reference documents remain classified in the complete inventory. This change does not certify every historical claim or implement monitoring, automatic stale-lock removal, receipt retention cleanup or a storage-accounting fix. Those items remain visible in the follow-up board.

## Verification

Documentation checks passed for 305 guides, 29 incident documents and 144 ADRs, with 398 authored Markdown files inventoried. Seventeen adversarial incident-guard tests, 23 image/security checks, 37 isolated image/Favorites database checks and 14 developer-preview tests passed. The production build passed with 277 generated pages. A local scan of 640 browser/rendered assets and runtime traces found none of the checked private incident markers or incident-file inclusions. `git diff --check` passed.

Vercel uploads and Docker build contexts exclude private incident/internal/docs directories; raw incident evidence is Git-ignored. A targeted known-secret pattern scan found no matches in the non-raw incident files. Docker exclusion was verified as configuration, not by rebuilding the application image. See [verification.json](verification.json) for exact scope and limits.

The HTTP and Docker fixtures initially hit sandbox restrictions, then passed with the required local permissions. No production configuration, access approval, database schema or service state changed during this documentation pass. No new live generation or publishing was performed.

## Follow-through

See `ACT-007`, `ACT-008` and `ACT-010` in [the action board](../../../OPEN_ITEMS.md). The remote CI run still requires a pushed workflow and recorded run result; source review and local tests alone do not establish it.

## Follow-up: private knowledge system, September 13

A further audit reconciled architecture/Sites guidance, CI, observability, ownership, onboarding and ADR lifecycle. Added task-based discovery, offline search and source-impact commands, domain review metadata, standardized knowledge/release runbooks and a weekly read-only CI audit. The incident journal check now compares PR/push history against the event baseline instead of only HEAD. The [research and audit rationale](../../../../docs/knowledge/DESIGN_RATIONALE.md) and [new local verification](../../../../docs/knowledge/audits/2026-09-13-verification.json) describe this extension; earlier counts above remain the original pass's dated evidence.

The new pass validates 323 docs pages, 29 incident documents and 145 ADRs, with 416 authored Markdown files inventoried. Twenty incident guard fixtures, thirteen knowledge fixtures, 23 image/identity checks and fourteen preview checks passed. The production build passed; the expanded private-boundary scan checked 640 browser/rendered assets and runtime traces. Knowledge-domain review is recorded; seven broader domains remain unreviewed in the new domain system. Existing critical source review remains separate. Hosted CI, continuous monitoring and production recovery work are not implied.

## Follow-up: complete domain review and activation preparation, September 13

The user requested activation and review of the seven remaining domains. The [new domain review](../../../../docs/knowledge/audits/2026-09-13-domain-reviews.md) records completed canonical-guide/source-contract reviews across all eight domains, relevant local tests, corrected Sites/rollback/QA guidance and explicit coverage limits. All registered domains now require current attestations with retained evidence hashes. Documentation CI enforces missing, stale and due reviews on every event and provides owner/deadline summaries plus retained status artifacts. The [weekly runbook](../../../../docs/runbooks/weekly-knowledge-audit.md) separates workflow activation, manual execution and actual scheduled events. Hosted acceptance will be recorded after the authorized push and observed run.
