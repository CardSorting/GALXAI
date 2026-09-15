# Maintainer CLI reference

<!-- docs-scope: current-guide -->
> Private command navigation. [package.json](../../package.json) defines scripts; read each harness before running commands that can mutate state or call live providers.

## Relay operations

| Task | Command |
| --- | --- |
| HTML monitor | `npm run relay:open` |
| Terminal HUD | `npm run relay:monitor`; press `o` to open HTML |
| Operator desktops | `npm run relay:desktops` |
| Build guest image | `npm run relay:desktops:build` |
| Start host controller | `npm run relay:federation` |
| Inspect registry categories | `npm run shards:doctor` |
| Enroll or confirm an account | Open Relay Desktops, manually sign in inside its running workspace, then choose **Enroll shard** |
| Preview exact legacy fixture quarantine | `node --env-file-if-exists=.env.local --import tsx scripts/quarantine-fixture-shards.ts` |

The controller command reads configured authority; its canary namespace default does not make real credentials disposable. Do not start a second owner. CLI add/import and external provider ingestion are closed. Renew expired provider sessions manually inside the bound desktop; saved-file synchronization validates that login without renewing the provider session. Cleanup defaults to dry-run; review before explicit apply.

## Local validation

```sh
npx tsc --noEmit
python3 scripts/verify-docs.py
node --import tsx scripts/test-docs.ts
npm run test:relay:capabilities
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
| Manual enrollment role/rollback tests | `npm run test:relay:manual-db`; disposable database only |
| Target policy inventory | `node --env-file-if-exists=.env.local --import tsx scripts/apply-manual-desktop-enrollment.ts`; read-only without flags |
| Vault rewrap preview | `npm run shards:rotate-vault -- --from v1 --to v2`; apply is a separate explicit option |

The broad integration guard rejects production settings and strips inherited Data API configuration before repository imports. Do not bypass it. Billing/storage harnesses have their own disposable environments. See [test isolation](RELAY_CREDENTIAL_ENROLLMENT.md#isolated-integration-tests) and [key rotation](MULTI_TENANT_SHARD_AND_KEY_ROTATION.md).

The historical `shards:verify-authority` harness predates the closed-upsert policy and is not current acceptance. It refuses a migrated target. Use the policy inventory and isolated manual enrollment tests above; do not restore old grants to satisfy an obsolete assertion.

Database migrations, service restarts, live provider requests, deployment and billing changes are different mutations. Use their component runbooks and existing task authorization; a command's presence in this table is not a blanket production procedure.

## Other subsystems

Use the [maintainer catalog](README.md) for compaction, application routing, cloud deployment, governance and database procedures. Historical test counts and benchmarks are dated results, not current command guarantees. Follow [Git workflow](GIT_WORKFLOWS_AND_HOOKS.md) and [deployment boundaries](../DEPLOYMENT.md) for release.
