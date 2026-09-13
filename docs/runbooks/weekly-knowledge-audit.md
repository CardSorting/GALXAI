# Operate the weekly knowledge audit

<!-- docs-scope: current-guide -->

## Purpose and trigger

Activate or verify the private documentation workflow, investigate a missing run, or resolve a failing review gate. Owners: release operator for GitHub execution; each domain owner for content review.

## Authority and prerequisites

Use the private `CardSorting/GALXAI` repository and its current default branch. Read [knowledge policy](../DOCUMENTATION_POLICY.md) and the [CI specification](../maintainers/CI_PIPELINE_AND_AUTOMATION_SPEC.md). Local checks need Python 3.11+, Git and npm; hosted checks use Python 3.12. GitHub CLI inspection uses existing repository access. Enabling, dispatching and pushing require authorized repository write access; none grants production access.

## Procedure

1. Run `npm run docs:audit` and `npm run test:docs`. Resolve source/guide conflicts and review gaps before pushing. Preserve earlier evidence; never mass-refresh attestations to obtain a green run.
2. Inspect `gh repo view --json nameWithOwner,isPrivate,defaultBranchRef` and `gh workflow list --all`. Confirm `.github/workflows/documentation.yml` is on the default branch and the **Documentation knowledge audit** workflow is active. If authorized and disabled, use `gh workflow enable documentation.yml` after reviewing the workflow.
3. After an authorized push, dispatch `gh workflow run documentation.yml --ref main` when `main` is still the confirmed default branch. Inspect `gh run list --workflow documentation.yml --limit 10` and `gh run view RUN_ID --json event,headSha,status,conclusion,url,jobs`. Match event and revision; do not use an older green run as proof for a changed revision.
4. Require a successful final conclusion. Inspect the job summary and `knowledge-review-status` artifact: all registered domains must be reviewed and current. The validation step also verifies retained evidence and the journal baseline. Record run URL, event, revision, observed time and scope in dated private evidence.
5. The cron is `17 9 * * 1`: Mondays at 09:17 UTC. Check `gh run list --workflow documentation.yml --event schedule --limit 5` after the expected window. GitHub schedules run on the default branch and may be delayed or dropped under load; inspect workflow state and recent run history before dispatching a single manual verification. [GitHub schedule behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).
6. If failed, use the summary to find the responsible domain. Missing/stale/due reviews require the [maintenance procedure](knowledge-maintenance.md); evidence mismatch requires investigating the changed record. Broken links and generated drift require correction and regeneration. Review relevant open incident actions independently; this workflow does not close or renew them.

## Stop conditions

Stop claiming activation if the workflow is absent/disabled, the inspected revision differs, or no hosted run completed successfully. Do not call a manual or push run a scheduled execution. Do not disable completeness checks, extend deadlines without review, expose private artifacts, or enable unrelated workflows to resolve this audit.

## Recovery and rollback

Fix the owning source, guide or workflow in a reviewed change and rerun the failed job on the corrected revision. Preserve failed run evidence and incident journal history. If the workflow itself is defective, repair it with the offline fixture suite; retain local audits during the gap. An explicit authorized emergency suspension must have an owner and restoration criterion. Application or database rollback is outside this procedure.

## Verification and evidence

Local passing checks establish local enforcement. An active default-branch workflow plus a successful hosted run establishes activation and that run's execution. Only an observed `schedule` event establishes that a cron run occurred. Retain allowlisted receipts in `docs/knowledge/audits/` and update [current state](../../post-mortem/CURRENT_STATE.md); artifact retention is 14 days, so the run artifact alone is not durable review evidence. Branch protection is independent and must be inspected before claiming the check is required for merges.
