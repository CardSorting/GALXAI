# Executable relay pool schema proof

<!-- docs-scope: research-reference -->

Private, isolated database experiment for the [historical logical-pool design](../history/logical-pools-2026-09-15.md), September 15, 2026 UTC. It is not an active migration and cannot create production relays. The current [strict separation contract](../strict-isolation.md) requires independent database clusters and deployment environments; this earlier experiment remains evidence for local role/constraint enforcement only.

## Run

With Docker running, from the repository root:

```sh
node internal/dual-relay-design-2026-09-15/schema-proof/run.mjs
```

The runner accepts no database URL or target arguments and never loads dotenv. It creates its own empty PostgreSQL 17 container from the repository's pinned pgvector image, publishes a random loopback port, generates temporary passwords and connects using actual restricted logins. It reads [schema.sql](schema.sql) and executes [the adversarial checks](verify.mjs). The SQL refuses databases with the wrong fixture name or an existing production shard registry.

Cleanup checks the exact ownership label and stops/removes only that disposable container. No account tokens, live tables, provider requests or existing Docker workloads are used. A force-killed process or unavailable Docker daemon can prevent cleanup; inspect only the unique `galx.pool-proof.run` label from that invocation before removing a leftover.

## What is modeled

- Exactly two pools and two instances, with private Premium/Standard namespace projections.
- One globally unique synthetic account ID and desktop binding.
- Separate encrypted-envelope fixture records; monitors/operators cannot read them directly.
- Controller, operator and monitor machine identities for each pool, with distinct grants.
- Protected login-to-instance binding. Caller-selected settings are ignored for authority.
- Forced RLS on every table; invoker views; non-bypass definer ownership; explicit function execution grants.
- Composite foreign keys for pool/instance/account assignment and allowed workloads.
- Atomic manual-registration records, same-operation recovery, capability freshness and retained lease identity.

The labels and envelopes must use synthetic fixture values. Evidence recording is explicitly fake; no request proves provider sign-in or model support. The narrow lease table demonstrates ownership and idempotency, not the production token accounting, settlement, original-generation signing or expiry protocol. It must never become a competing production lease authority.

## Test results

The initial full run passed the operational isolation cases but failed the final function-privilege audit: six functions still inherited `PUBLIC EXECUTE`. Private schema access and explicit actor checks prevented the tested outsider calls, but the default ACL was still wrong. PostgreSQL's per-schema default revoke cannot remove its global default. The corrected schema changes the dedicated owner's global default and explicitly revokes routine access before grants. The rerun passed 67 checks; final checks additionally cover `TRUNCATE` and `row_security=off` denial.

The final confirmation run passed **69 checks** on PostgreSQL **17.11 (Debian 17.11-1.pgdg12+2)**, including `TRUNCATE` and `row_security=off` denial. The owned fixture was stopped and removed. These tests validate this isolated pattern, not hosted Supabase configuration or the current production schema.

## Existing-system validation

- `npm run db:status`: read-only version inventory reported 108 applied, zero pending and zero remote-only migrations.
- `npm run db:verify`: passed, zero fatal violations and zero warnings across the existing 108 migration pairs. This static tool does not scan or execute this private proof.
- `npm run db:test -- --manual-shards`: passed all 28 manual enrollment checks after applying all 108 current migrations to a separate disposable database, including rollback/reapply. That fixture was removed afterward.
- JavaScript syntax checks for the runner and test file passed.

- `npm run build`: passed on this working tree, with 285 static pages generated. Linting was skipped by the existing build configuration; the existing edge-runtime/static-generation notice remained.

- Targeted scan: no proof/prototype markers in 1,328 generated HTML/JavaScript files under `.next/static` and `.next/server/app`. This is a scoped local build check, not a live-site privacy certification.
- `npm run docs:impact`: reviewed the unmapped private research/proof files, prior prototype/configuration exception and generated inventory. These do not change a production knowledge-domain contract. No review fingerprint was refreshed.
- `npm run docs:sync`, `npm run docs:check` and `git diff --check`: passed. The existing overdue review notices for ACT-001, ACT-015 and ACT-016 remain open.
- `npm run test:docs`: all 38 tests passed. Their synthetic scan fixtures are separate from the actual 1,328-file build check above.

No live schema mutation, production deployment or new provider verification is part of this proof.

## Mapping into production

`pool_lab` names are deliberately synthetic. Under the revised [central account contract](../central-account-control.md), GALXAI alone owns the real account registry, exclusive pool assignments and authoritative account leases. The proof's grants, ownership references and operation recovery can inform central pool-scoped interfaces, but its direct database logins and fixture tables are not the production design. The two relay projects store execution state only. Preserve the sole manual-desktop path, existing account lease semantics, historical records and public information boundary. Central migrations, restricted interfaces and separate local VM services were subsequently implemented and installed; see [current delivery](../delivery-plan.md) and the [full account contract](../../../docs/reference/relay-account-management.md). This historical proof does not certify that later work. Manual sign-ins, capability qualification and public application cutover remain separate acceptance.
