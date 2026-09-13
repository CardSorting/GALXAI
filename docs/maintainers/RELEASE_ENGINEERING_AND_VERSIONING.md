# Release engineering and rollback

<!-- docs-scope: current-guide -->

Private release procedure. Use [current state](../../post-mortem/CURRENT_STATE.md), [deployment boundaries](../DEPLOYMENT.md) and the checked-in CI workflows. Do not assume an automatic canary promotion, fixed soak period or published SDK channel unless the actual workflow establishes it.

## Before deployment

Record the intended source revision and working-tree changes, target component/environment, pending migrations, configuration requirements and compatible rollback. Inspect the relevant scripts. Inference benchmarks, credential provisioning and environment sync are separately authorized side effects, not mandatory harmless checks.

Run `npm run docs:check`, relevant authorization/security and integration tests, type/lint checks and the production build. For images, include public artifact/HTTP security and isolated durable-receipt/Favorites checks. Verify that private incident documents and raw evidence are excluded from uploads and browser code.

Apply only the reviewed migration set using [database operations](POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md). Keep accepted-operation readers available. Deploy each required component deliberately; site, gateway, controller and worker changes have independent activation.

## Acceptance and evidence

Capture the deployment ID and alias target. A built image is not a replaced worker; a source reload is not a site deployment. Verify actual affected behavior from the deployed user path and record public-response/asset scan scope. Preserve failed checks and untested scenarios.

Use conventional commits and an appropriate version change when releasing a versioned package. Git commits/tags, remote pushes and deployments are separate actions; do not claim one from another. Existing CI checks execute only after the relevant workflow is actually pushed and run.

## Rollback

Select a known compatible release based on current access and persistence contracts. A release before developer gating is not safe merely because it built successfully. Keep both API entry points gated, retain populated image receipts and financial history, preserve signing/checkpoint state and keep original-operation recovery available.

Review controller ownership and maintenance semantics before reload. Do not run legacy and current workers for the same authority simultaneously or delete all containers as a rollback. A database down migration is not an automatic incident response; inspect data loss and guard conditions first.

Record rollback, acceptance and follow-up prevention in [the rolling log](../../post-mortem/ROLLING_LOG.md). Use [storage containment](../../post-mortem/runbooks/deployment-storage.md) to manage old deployments while retaining a viable rollback.
