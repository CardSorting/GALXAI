# Knowledge operations

<!-- docs-scope: current-guide -->

Maintain knowledge in the same change as the behavior it describes. Start with [the task guide](../how-to/change-with-documentation.md); use [the maintenance runbook](../runbooks/knowledge-maintenance.md) when drift is detected.

## Working loop

1. **Discover:** search active guides and inspect [current state](../../post-mortem/CURRENT_STATE.md).
2. **Map:** run `npm run docs:impact`; identify source ownership and affected canonical guides.
3. **Decide:** use an ADR for a consequential contract/authority change; use a PR explanation for a small fix.
4. **Implement:** update the entire affected procedure, failure handling and rollback alongside code.
5. **Verify:** run relevant checks, record their actual scope, explicitly review source/guide changes, then regenerate navigation.
6. **Observe:** if deployed, append dated acceptance evidence. If a failure occurred, update the incident journal and prevention work.

The loop guides ongoing development. It does not create an autonomous deployment, incident repair or acceptance process.

## Sources and generated views

| File | Purpose | Edit directly? |
| --- | --- | --- |
| [registry.json](registry.json) | Domain owner roles, source patterns, canonical guides, checks, curated content kinds and decision metadata | Yes, with the change |
| [reviews.json](reviews.json) | Explicit review dates, source/guide fingerprints and retained evidence hashes | Use `docs:review` after review |
| [catalog.json](catalog.json) | Complete searchable document metadata; unassigned material stays unreviewed | No; `docs:sync` |
| [DOMAINS.md](DOMAINS.md) | Task owner and guide navigation | No; `docs:sync` |
| [DECISIONS.md](DECISIONS.md) | Curated decision status separate from delivery evidence | No; `docs:sync` |
| [Audit and rationale](DESIGN_RATIONALE.md) | Established patterns, local findings, decisions and limits | Preserve dated findings; add later audits |

Domain review reconciles canonical guides with source contracts and relevant checks. Its evidence names the inspected sources, corrections and limits; a fingerprint inventory is broader change detection, not a claim of exhaustive semantic or security review of every module. Historical references remain separately classified. Roles are responsibilities, not verified GitHub teams or authorization grants. [CODEOWNERS](../../.github/CODEOWNERS) independently declares repository reviewers.

## Review states

`unreviewed` means no domain attestation exists. `reviewed` means the recorded source/guide fingerprints still match and review is not due. `stale` means a monitored file changed, appeared or disappeared. `due` means the review date passed, even if files did not change. None proves continuous availability or factual correctness of every sentence.

Every registered domain requires an explicit review with retained evidence. `npm run docs:check` rejects missing reviews, missing or changed evidence, and stale source/guide fingerprints. `npm run docs:audit` adds the deadline check. All documentation CI runs enforce the complete, current set; adding a domain requires a review in the same change. Legacy document curation remains a separate state and is not silently certified. The older critical incident/source review remains enforced separately and is refreshed with `docs:review` without a domain.

## Automation and limits

The [documentation workflow](../../.github/workflows/documentation.yml) validates on pull requests, pushes, manual dispatch and a Monday 09:17 UTC schedule on the default branch. It emits an owner/deadline table in the job summary and retains private status JSON for 14 days, including failed runs. Use the [weekly audit runbook](../runbooks/weekly-knowledge-audit.md) for activation, run verification and triage. GitHub scheduling can be delayed; it is not a deadline alarm or uptime monitor.

The [September 13 domain review](audits/2026-09-13-domain-reviews.md) records the seven broader reviews and renewed knowledge review. The [activation receipt](audits/2026-09-13-ci-activation.json) verifies active default-branch configuration and successful manual/push execution. A future scheduled event is not yet observed. The workflow does not send messages, open issues, rewrite guides, approve decisions, merge changes or deploy. Branch protection remains independent.

The full inventory preserves research and dated records; default search excludes them. Read [command reference](../reference/knowledge-commands.md) for exact behavior, [ADR lifecycle](../maintainers/ADR_AUTHORING_AND_LIFECYCLE_GUIDE.md) for new decisions and [documentation policy](../DOCUMENTATION_POLICY.md) for authority.
