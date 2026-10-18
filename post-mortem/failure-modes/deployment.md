# Deployment failures

<!-- docs-scope: current-guide -->

## FM-DEPLOY-001 — retained deployments exhaust storage allowance

The reported values were 11.1 GB Deployment Storage and 10.06 GB Functions Storage against 10 GB allowances. Two September 12 cleanup passes removed 133 obsolete deployments while preserving the serving release, a rollback release and an active preview at that observation. Subsequent builds change that inventory.

Cleanup success is verified by explicit deployment IDs and unchanged serving aliases. Storage-accounting recovery is separate: the original report did not observe either metric below quota. Do not claim reclaimed bytes or a reset time from deployment counts. Do not repeatedly delete recovery releases because historical usage remains visible.

Follow [storage containment](../runbooks/deployment-storage.md). [The original evidence](../incidents/2026/2026-09-12-vercel-storage/README.md) retains before/after inventories and deletion receipts. Recheck the provider's current retention and accounting behavior before further cleanup.

## FM-DEPLOY-002 — working source, incomplete target configuration

The application, gateway, controller, workers, database and storage have separate activation boundaries. The September 13 site initially lacked required R2 configuration; the controller was also stopped. Ready deployment status did not establish end-to-end generation.

For each release, record source identity, migration state, target environment, deployment ID, required server-only configuration presence/type, and actual-client acceptance. A dashboard may intentionally omit sensitive values; omitted values in a configuration response are not proof of missing configuration. Keep credentials out of command arguments, logs and evidence.

Rollback must preserve preview gating and the readers for accepted durable operations. Do not automatically promote a pre-gate release, drop a populated receipt table, discard signing state, or replace workers merely because a new image was built. See [deployment boundaries](../../docs/DEPLOYMENT.md).

## FM-DEPLOY-003 — hosted Git checkout omits sibling source

The local workspace contained the independent BroccoliDB and BROCCOLIQUEUE repositories, so relative imports into their source compiled locally. Vercel checks out GALXAI alone; the production build failed when the sibling source path was absent. The prior Ready deployment remained active, and no service interruption was observed.

Keep the app boundary explicit: pin each required package to an immutable HTTPS archive in the root manifest and lockfile, import its package entry point, and keep local Docker source bundling behind explicit esbuild aliases. Push package repositories before updating the root pin. Verify installation, typecheck and production build from the root checkout, then require the Git-triggered deployment and live acceptance before marking recovery complete. Do not solve this by checking another application, generated dependency tree, or deployment target into GALXAI.

The [September 25 incident record](../incidents/2026/2026-09-25-clean-checkout-build/README.md) documents the failure and recovery. The [relay services runbook](../../docs/runbooks/relay-pool-services.md) owns local image packaging.

## FM-DEPLOY-004 — retired fixtures hide later CI failures

The October 7 application workflow stopped in an unchanged quota fixture that
still passed a boolean free-image argument to the current private/STAR request
contract. Later storage and registry fixtures also retained retired assumptions
and were never reached by that hosted run. The production programme continued
serving; this was a validation failure, not observed service downtime.

Reproduce under the workflow's Node version using isolated authority. Reconcile
fixtures with current product retirement, purchased allowance, private storage
and registry projections while preserving adversarial tests and historical
ledger/rollback coverage. Inspect every later workflow command, then require
the complete hosted run including its production build. Never reopen a retired
product, weaken ownership or storage guards, skip a test, or treat local success
as hosted acceptance. See [CI contracts](../../docs/maintainers/CI_PIPELINE_AND_AUTOMATION_SPEC.md)
and the [dated correction](../incidents/2026/2026-10-07-ci-fixture-drift/README.md).

## FM-DEPLOY-005 — reader cancellation acknowledgement blocks terminal cleanup

The October 17 cookie correction's isolated whole-image rehearsal aborted after
40 checks and the full 480-second stop allowance; that image was not deployed.
Focused tests then reproduced both Nova and relay response cleanup waiting on a
reader cancellation promise that never acknowledged. These tests establish the
bounded defect, not every cause of the original fixture failure.

Initiate remote cancellation without awaiting its acknowledgement before local
terminal delivery/closure or cleanup. Preserve the registered terminal database
write, honest `unknown`, unchanged deadlines and no replay. Test malformed stream
termination and client cancellation with a deliberately unacknowledged cancel,
then require the complete immutable-image active-drain, lost-socket and restart
checks. Capture redacted stdout/stderr and selected process/SQL states on fixture
failure; never turn a forced stop or missing receipt into acceptance. The
[account migration incident](../incidents/2026/2026-10-17-account-cutover/README.md)
and ACT-055 track renewed acceptance and both native profile replacements.

The next full-image attempt still failed: all synthetic records were terminal,
but the public pending read remained open. Nonblocking cancel acknowledgement
alone was insufficient. Separately reproduce an executor that ignores abort;
the local pending read must react to the original request/deadline signal and
close after terminal persistence, without requiring another source chunk or
remote acknowledgement. Keep both failed rehearsals and require a new complete
image pass; unit coverage does not certify the final host drain.
