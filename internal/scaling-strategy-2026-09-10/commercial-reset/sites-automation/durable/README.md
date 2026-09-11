# Durable local Sites workflow

The current implementation uses [fixed pricing with local limits](OPAQUE_PROVIDER_POLICY.md), [durable completion receipts](../../../../../docs/adr/0135-durable-sites-receipts-and-local-admission.md) and [customer-owned delivery](../../../../../docs/adr/0136-customer-owned-sites-delivery.md). Supplier quotas and token costs can remain unknown. The provisional fixed price and account allowance are configuration choices; they are not supplier guarantees.

Use [Sites operations](../../../../../docs/maintainers/SITES_OPERATIONS.md) for server configuration, rollout and recovery, and [the live companion runbook](LIVE_ADAPTERS.md) for customer-local commands. The fixed-mode implementation passed local verification but was not deployed or enabled by that pass. The earlier [September 11 release](RELEASE_20260911.md) is a separate metered precursor with paid generation disabled.

The native-host save/private-update path has historical evidence. Direct CLI archive save remains unqualified. Those delivery facts do not impose a supplier ceiling or exact usage prerequisite on fixed content generation. A complete paid end-to-end workflow is still distinct from the individually tested components.

The `local.ts` paths below are offline/diagnostic with nonmonetary fixture units. Use `live.ts` in a separate state directory for server-authoritative quoted billing. The old one-shot `run-live.ts` command remains retired.

## Runtime and state

The qualified local demonstration uses **Node 26.8.1, SQLite 3.53.4 and Python 3.14.7** on macOS. The database engine must contain SQLite's WAL-reset fix. The available Node 22.21.1/SQLite 3.50.4 combination is deliberately rejected for this companion, although the separate application build passes on Node 22. The Node SQLite binding remains a release-candidate API; pin the companion runtime and requalify changes.

Use one private local state directory. The store rejects symlinked or permissive directories, unrelated databases and unsupported schema/policy changes. It persists jobs, reservations, receipts, release locks and event records in SQLite. Archives are immutable objects named by their hash. New packaging attempts use new workspaces.

The example below uses `/private/tmp` for a disposable demonstration. Customer state must eventually use a persistent, protected application directory with a tested backup/restore policy. Do not use a network filesystem, delete uncertain jobs to retry them, or copy a live database without its WAL/appropriate backup procedure. The local owner label is a trusted process context, not customer authentication.

## Offline demonstration

From the GALX repository, create a job using the synthetic request fixture:

```sh
node --import tsx internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/local.ts create /private/tmp/galx-sites-local-demo example-1 internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/example-request.json
```

Copy the returned opaque job ID exactly into the next command. `JOB_ID` below is a placeholder, not a shell variable.

```sh
node --import tsx internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/local.ts generate-fixture /private/tmp/galx-sites-local-demo JOB_ID
node --import tsx internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/local.ts prepare /private/tmp/galx-sites-local-demo JOB_ID
```

`generate-fixture` replays the previous synthetic brief; it does not call a model. It deliberately records no billing receipt. `prepare` returns a fresh workspace and an archive output path. Use those literal absolute paths in a separate invocation of the reviewed, installed official Sites helper, with the working directory set to that workspace:

```sh
env COPYFILE_DISABLE=1 node /Users/bozoegg/.codex/plugins/cache/openai-bundled/sites/0.1.66/scripts/package-site.mjs ABSOLUTE_WORKSPACE ABSOLUTE_ARCHIVE
```

The helper path above is specific to the inspected machine. On another installation, first verify the plugin path and compare its manifest, skills and helper hashes with [the reviewed connection contract](../connection-contract.json). Do not automatically accept a new version or copy the proprietary plugin into this repository.

Accept the package and read the result in a new process:

```sh
node --import tsx internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/local.ts accept-package /private/tmp/galx-sites-local-demo JOB_ID ABSOLUTE_ARCHIVE
node --import tsx internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/local.ts status /private/tmp/galx-sites-local-demo JOB_ID
```

The accepted archive is verified, stripped of extraneous metadata, reconstructed canonically and verified again. `ready` means a verified local artifact. It does not mean a registered, saved or deployed Site. The [recorded demonstration](local-observations.json) and [canonical artifact](artifacts/durable-static-draft.tar.gz) show this sequence working across separate processes.

## Designated relay integration

`generate-relay` replaces `generate-fixture` for a designated test relay. It requires `GALX_SITES_TEST_RELAY=1` and the existing relay URL/key environment variables. No dotenv file is loaded automatically. Supply authorized test configuration in the process environment; never put keys in request JSON, command arguments, archives or source control.

The command calls the existing relay transport with a persisted operation identifier, deadlines and cancellation propagation. It never starts a Codex model turn or falls back to another supplier. The relay's idempotency semantics are not assumed: an uncertain request remains blocked even though an idempotency key was sent.

The diagnostic `local.ts` relay adapter returns no trusted financial receipt, so the reservation remains pending. Local content can still be packaged. Further generation and guarded publication require reconciliation. The default numbers are **local fixture reservation units**, not dollars, credits or verified tokens. The CLI has no command to invent a receipt or clear unknown usage.

The original live relay result is historical evidence for text generation. The hardened workflow was verified with deterministic adapters and a replayed brief; it did not make another live model request during this hardening pass.

## Recovery and cancellation

```sh
node --import tsx internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/local.ts recover /private/tmp/galx-sites-local-demo JOB_ID
node --import tsx internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/local.ts cancel /private/tmp/galx-sites-local-demo JOB_ID
```

| Persisted condition | Allowed response |
| --- | --- |
| Another lease is still active | Wait for that worker or request cancellation; do not steal the lease |
| Packaging interrupted | Recover to generated content, prepare a new workspace, package and accept; no new inference |
| Generation dispatched but result missing | Preserve the reservation and reconcile the recorded operation; no automatic resubmission |
| Diagnostic content with no financial receipt | Keep the artifact; fixture units cannot authorize live billing or publication |
| Live fixed content with a matching completed receipt | Reconcile at its saved fixed price even if token usage is null |
| Publication result unknown | Keep the Site lock; reconcile the exact operation/commit/version before another release |
| Cancellation after possible publication | Verify the actual result; a published Site is not relabeled absent |
| Corrupt artifact or incompatible plugin/runtime | Fail closed; repair or requalify the specific dependency |

The local store's reconciliation methods are trusted-host interfaces, not public endpoints. Its `resolveGeneration` requires an already settled cost record and a supported outcome; in live mode that record must come from the authenticated billing API. Fixed-price settlement can carry null supplier token usage. Diagnostic fixture units cannot supply that financial authority. `resolvePublication` requires the exact operation and a supported confirmed result, using the live adapter's saved commit/version evidence. A manual claim that “it probably failed” is not sufficient.

The store does not automatically delete job history, expired receipts or uncertain locks. Retention and backup are release work; removing the evidence needed for reconciliation would weaken the guarantee. Temporary packaging directories from the demonstration can be inspected separately from the authoritative job record.

## Checks

```sh
node --import tsx --test internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/workflow.test.ts internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/durable.test.ts
python3 -m unittest discover -s internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation -p test_connection_transport.py -v
npx tsc --project internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/tsconfig.json
```

The [verification record](verification.json) records the final results. [Application verification](application-verification.json) is separate: existing adversarial/authorization checks, an isolated production build and a selected-marker scan of local generated assets. Its temporary build output uses synthetic configuration and must never be deployed.

The read-only `sites-connection.py` check needs the installed CLI, the customer's existing Sites access and permission to use its local test listener/network. It records bounded metadata, refuses mutation/approval requests, applies the pinned contract and returns a nonzero status on failure. Its [latest successful result](connection-observations.json) includes zero model turns and zero unexpected model requests.
