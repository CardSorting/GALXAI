# October 7 application CI fixture drift

<!-- docs-scope: operational-record -->

Private dated incident. Application workflows at `436d457` and `fb7d266` failed
in an unchanged legacy quota database fixture. Its boolean image argument,
positive free balance and Auth deletion expectations no longer matched current
retirement, private purchase admission and canonical ownership. The programme
remained serving; no production service outage was observed by this repair.

Status at this record: contained locally, complete hosted validation pending.
The [local correction evidence](../../../releases/2026-10-07-ci-fixture-repair-local.json)
retains the original failures, exact scope, changed fixtures, isolated checks
and separate archive commit. Later workflow commands uncovered stale private
storage and registry fixtures; those now exercise current fail-closed contracts
without changing runtime authority or skipping checks. Historical internal gate
races, RLS, record preservation and rollback coverage remain.

The dirty deployed-source checkout was committed and pushed to a private archive
branch after exact deployed-source hash verification and a private-value scan.
No archived work was discarded or merged into current main. Other nested
repositories and accepted source snapshots were initially clean.

ACT-051 requires the complete hosted workflow, including production build and
compiled boundary scan, plus retained contract regression coverage. Follow
[FM-DEPLOY-004](../../../failure-modes/deployment.md#fm-deploy-004--retired-fixtures-hide-later-ci-failures)
and [CI contracts](../../../../docs/maintainers/CI_PIPELINE_AND_AUTOMATION_SPEC.md).
Production/runtime/database configuration and earlier incident actions remain
outside this correction.

## Hosted acceptance — October 7, 2026

The [complete hosted result](../../../releases/2026-10-07-ci-fixture-repair-hosted.json)
verifies application run `37697229999` and documentation run `37697229897` at
`298fc8d8db22a39ee660bbe8db0790f0cc12e6ab`. All application steps passed,
including the formerly failing quota fixture, later storage/registry checks,
lint/typecheck, clean credential-free production build and compiled private
boundary scan. No test was skipped to resolve the failure.

ACT-051 is completed and this CI incident is closed. Contract regressions remain
in the existing workflow; eight Git checkouts were clean, with current main and
the deployed-source archive synchronized to their remotes. This is CI/Git
acceptance, not a new production release. Earlier visual and prevention limits
remain separate. Original failed-run and local-only observations above are
retained as dated evidence.
