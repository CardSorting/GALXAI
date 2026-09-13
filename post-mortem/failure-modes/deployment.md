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
