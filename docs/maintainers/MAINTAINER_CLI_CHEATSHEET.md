# Maintainer CLI reference

<!-- docs-scope: current-guide -->
> Private command navigation. [package.json](../../package.json) defines scripts; read each harness before running commands that can mutate state or call live providers.

## Local isolated relay operations

| Task | Command or action |
| --- | --- |
| Everyday monitor access | **GALX Monitors → Open Premium / Open Standard**, or the separate apps |
| Open a fixed monitor | `npm run relay:local -- open premium` / `npm run relay:local -- open standard` |
| Start installed local services | `npm run relay:local -- up` |
| Inspect installed services | `npm run relay:local -- status` |
| Verify actual local isolation | `npm run relay:local -- verify` |
| Read central account inventory | `npm run relay:accounts:status` |
| Install native launchers | `npm run relay:monitors:install` |
| Build service candidates | `npm run relay:services:build`; building does not install or activate them |
| Register/renew/manage accounts | Use the fixed monitor and [manual procedure](RELAY_CREDENTIAL_ENROLLMENT.md) |

[Service installation](../runbooks/relay-pool-services.md) owns secrets, reviewed image pins and explicit registration/execution gates. Current local operation needs no external SSH target. Gate changes and provider requests are deliberate mutations; `serve-local` is not a troubleshooting command. Rename/remove use expected revisions and retained central history. Account removal is permanent revocation, not file deletion.

## Retained controller operations

Only for the existing single-controller deployment and eligible unassigned accounts: `relay:open`, `relay:monitor`, `relay:desktops`, `relay:desktops:build` and `relay:federation`. See [legacy operations](legacy-federation-operations.md) and [legacy enrollment](legacy-desktop-enrollment.md). Do not start a second controller owner or use these commands for new pool registration. Assigned accounts are excluded from legacy writers/leases. The old **Check now** and saved-file bridge are not new-pool renewal controls.

`shards:doctor` reads retained registry categories. Fixture quarantine defaults to dry-run and is scoped by its exact historical evidence; it is not account management. CLI add/import and external credential ingestion remain closed.

## Local validation

```sh
npx tsc --noEmit
python3 scripts/verify-docs.py
node --import tsx scripts/test-docs.ts
npm run test:relay:services
npm run test:relay:access
node --test scripts/test-relay-monitor-model.mjs
npm run test:relay:desktop-login
npm run build
```

Use [hardening checks](RELAY_HARDENING.md) for enrollment, public-response, storage and Docker coverage. Local builds do not deploy application/controller/worker changes.

## Database authority

| Task | Command and constraint |
| --- | --- |
| Static integrity audit | `npm run db:verify` |
| Broad integration suite | `npm run db:test`; automatically creates and removes a disposable Docker database |
| Local authority boundary | `npm run shards:test-authority` |
| Central management/authorization tests | `npm run test:relay:authorization-db`; disposable database only |
| Manual enrollment role/rollback tests | `npm run test:relay:manual-db`; disposable database only |
| Target policy inventory | `node --env-file-if-exists=.env.local --import tsx scripts/apply-manual-desktop-enrollment.ts`; read-only without flags |
| Vault rewrap preview | `npm run shards:rotate-vault -- --from v1 --to v2`; apply is a separate explicit option |

The broad integration guard rejects production settings and strips inherited Data API configuration before repository imports. Do not bypass it. Billing/storage harnesses have their own disposable environments. See [test isolation](RELAY_CREDENTIAL_ENROLLMENT.md#isolated-integration-tests) and [key rotation](MULTI_TENANT_SHARD_AND_KEY_ROTATION.md).

The historical `shards:verify-authority` harness predates the closed-upsert policy and is not current acceptance. It refuses a migrated target. Use the policy inventory and isolated manual enrollment tests above; do not restore old grants to satisfy an obsolete assertion.

Database migrations, service restarts, live provider requests, deployment and billing changes are different mutations. Use their component runbooks and existing task authorization; a command's presence in this table is not a blanket production procedure.

## Other subsystems

Use the [maintainer catalog](README.md) for compaction, application routing, cloud deployment, governance and database procedures. Historical test counts and benchmarks are dated results, not current command guarantees. Follow [Git workflow](GIT_WORKFLOWS_AND_HOOKS.md) and [deployment boundaries](../DEPLOYMENT.md) for release.
