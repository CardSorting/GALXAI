# Customer-local Sites delivery runbook

Private current guide, reconciled September 11, 2026. [ADRs 0134–0136](../../../../../docs/adr/README.md) define pricing, receipts and delivery. [Sites operations](../../../../../docs/maintainers/SITES_OPERATIONS.md) owns server configuration and rollout. This runbook covers the customer-local companion, which is not imported by the production application.

## Status and boundaries

The fixed-price server/relay path is implemented and locally verified, not deployed by that pass. Historical native-host save and owner-private update succeeded. Direct CLI archive save is unqualified. The preceding production release deployed a metered precursor with generation disabled; it does not establish a live billed workflow for the new mode.

The later [address rollout](../../../../../docs/maintainers/SITES_DOMAINS.md#september-11-live-rollout) deployed the current application with domain setup enabled for one verified account and generation still disabled. It activated the existing preview's custom hostname without a new Site publication or paid generation. This does not qualify the separate live billing or direct CLI upload paths.

The relay remains the sole model supplier. The companion requests bounded content from the authenticated GALX API, validates it and packages a deterministic template. Its Sites tool host executes scoped operations without a model turn. The companion has neither database access nor relay inference/administrator keys. GALX account authentication and Sites account ownership are independent.

## Billing contract

Fetch the current quote, accept its exact version and maximum, and preserve each operation ID. The provisional fixed mode charges $0.05 per durably confirmed completed generation, including completed invalid content; repairs are separately quoted. Missing token usage is permitted and is stored as unknown. Missing completion evidence retains the reservation and blocks new Sites work for that account. Positive non-dispatch evidence closes once at zero cost.

The server enforces the configured cohort, wallet funds/debt, one unresolved hold and rolling account allowance. The local account ceiling adds a companion control but cannot increase server authority. Before saving or publishing, the companion rechecks every generation's settlement at the server, including locally marked completions. Changed future prices do not change the original saved tariff. See the [public request/response contract](../../../../../docs/SITES_CONTENT.md).

## Runtime and configuration

Use the qualified companion runtime from [README](README.md#runtime-and-state), currently Node 26.8.1/SQLite 3.53.4 in the recorded local environment. It is separate from the Node 22 application and worker. Keep a protected persistent state directory for live jobs; use a separate disposable directory for offline examples. Commands do not load dotenv automatically.

| Companion setting | Meaning |
| --- | --- |
| `GALX_SITES_BILLING_ORIGIN` | Trusted GALX HTTPS origin without credentials, path or query |
| `GALX_SITES_SESSION` | Customer's verified GALX account session bearer, supplied privately in process environment |
| `GALX_SITES_MAX_CHARGE_MICRO_USD` | Exact accepted quote maximum; 50,000 for the provisional default |
| `GALX_SITES_ACCOUNT_LIMIT_MICRO_USD` | Finite local account budget, independent of server funding/allowance |
| `GALX_SITES_CONNECTION_ID` | Stable label for this customer's Sites connection |
| `GALX_SITES_ACCOUNT_USER_ID` | Independently selected Sites account subject, checked against live access policy |
| `GALX_SITES_USERNAME` | Available GALX username chosen by the customer; reserved to their verified GALX account |
| `GALX_CODEX_BINARY` | Optional absolute path to the verified installed tool-host executable; otherwise PATH resolution |

Server flags, the exact rate-card schema and administrator readiness belong in [Sites operations](../../../../../docs/maintainers/SITES_OPERATIONS.md#server-configuration). Fixed mode does not require `GALX_SITES_ACTIVATION_EVIDENCE` or output-ceiling forwarding. The selected delivery mode never authorizes a silent transport switch.

## Commands

Run from the GALX checkout. These initial commands do not create a model turn:

```sh
node --import tsx internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/live.ts check-connection
node --import tsx internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/live.ts quote
```

`check-connection` reads the customer's own Sites access. `quote` reads the GALX content quote. Neither is proof that a later save, generation or publication will succeed.

For the remaining commands, prefix `node --import tsx internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/live.ts`. Uppercase arguments below are placeholders to replace with the exact local/returned values:

| Arguments | Action |
| --- | --- |
| `create STATE_DIRECTORY REQUEST_KEY REQUEST_JSON` | Create a local job and retain its returned job ID |
| `bind STATE_DIRECTORY JOB_ID PROJECT_ID` | Verify current ownership, bind the Site and automatically connect its GALX address |
| `connect-domain STATE_DIRECTORY JOB_ID` | Resume address setup for the existing bound Site |
| `generate STATE_DIRECTORY JOB_ID` | Obtain/accept the quote and submit one bounded generation |
| `prepare STATE_DIRECTORY JOB_ID` | Prepare a dedicated static source workspace from persisted validated content |
| `accept-package STATE_DIRECTORY JOB_ID ARCHIVE_PATH` | Verify/canonicalize the packaged files and retain the immutable artifact |
| `request-hosted-save STATE_DIRECTORY JOB_ID COMMIT_SHA` | Journal a one-use native-host upload handoff for the pushed source and canonical artifact |
| `accept-hosted-save STATE_DIRECTORY JOB_ID REPLY_JSON` | Accept the original authenticated host reply and verify matching remote metadata |
| `publish-saved STATE_DIRECTORY JOB_ID INTENT_JSON` | Verify and privately publish the exact acknowledged saved version |
| `reconcile-billing STATE_DIRECTORY JOB_ID` | Read original account operations and update their local settlement state |
| `reconcile-publish STATE_DIRECTORY JOB_ID` | Observe the original version/deployment; does not start another publication |
| `status`, `recover`, or `cancel`, followed by `STATE_DIRECTORY JOB_ID` | Inspect, recover fenced local state, or request local cancellation |

`save-version STATE_DIRECTORY JOB_ID COMMIT_SHA` is the direct CLI save command. Its upload mechanism remains unqualified on the inspected runtime. Do not present it as the current successful path or use it after an uncertain native save. Retain it for separately scoped compatibility testing.

## Delivery sequence

1. Create/bind the job to a customer-owned Site, then generate and validate content. Resolve any unsettled attempt through the original account operation before delivery.
2. Prepare a dedicated source checkout containing only the validated page and Sites manifest. Commit/push the exact source through the selected Site's scoped source workflow. Registration/access remains customer-owned. Never upload this repository or the private journal.
3. Run the installed official Sites packager on that dedicated workspace, then `accept-package`. Use the canonical archive retained by the companion for the save; the initial packager output can contain macOS metadata. Preserve the pushed commit and exact local hash.
4. Run `request-hosted-save`, have the authenticated native host upload the exact handoff artifact once, persist its returned reply privately, and run `accept-hosted-save`. Remote reads must match account, project, commit and saved version. The host's attestation binds the local file to the save; remote metadata alone cannot prove that transformation.
5. Create a publication intent binding `connectionId`, `projectId`, `commitSha`, `versionId`, `artifactHash` and `audience: "owner"`. Copy opaque IDs verbatim, including compound version IDs. Run `publish-saved` only for that acknowledged saved artifact and inspect the recorded terminal result.

Sites can normalize the archive; retain local gzip and remote archive hashes separately. The public deployment audience is not changed by this companion. Existing authorization covers its intended actions, while unresolved tool-runtime approval requests remain a stop condition for that tool operation. No automatic approval, generic tool executor, fallback publication or publish-on-push behavior is introduced.

[ADR 0137](../../../../../docs/adr/0137-account-owned-sites-subdomains.md) adds `APP.USERNAME.galx.ai` handoff. Binding starts native attachment and server-mediated DNS setup. `publish-saved` reconnects after publication; a DNS failure preserves that completed publication. Enrolled customers now run `npm run sites:addresses -- PRIVATE_STATE_DIRECTORY` once as a supervised companion: new owner-private Sites are discovered automatically and the server worker reconciles DNS in the background. Per-Site binding is not required for addresses. `connect-domain` remains a diagnostic recovery path, and `status` reports an active GALX URL for bound jobs. See [ADR 0138](../../../../../docs/adr/0138-automatic-sites-domain-provisioning.md) for enrollment and restart semantics. Original hosting URLs remain private, and pending validation never authorizes another deployment. Server configuration and conflict handling are in [address operations](../../../../../docs/maintainers/SITES_DOMAINS.md).

## Failure and restart recovery

| Condition | Recovery |
| --- | --- |
| Interrupted generation or null cost | Preserve operation and reservation; `reconcile-billing` reads server evidence without another generation |
| Completed fixed response with null token usage | Server settlement can finish at the saved price; usage transparency is not required |
| Invalid completed content | Preserve its charge and request a separately quoted repair within the local attempt policy |
| Interrupted packaging | Recover the persisted content and create another staging workspace; no new inference |
| Lost upload acknowledgement | Keep the saved intent pending; recover the original native reply, never guess a version or switch transport |
| Lost publication acknowledgement | Keep the Site lock; inspect the original saved version/deployment with `reconcile-publish` |
| Existing successful publication | Return its recorded identity; do not deploy again |
| Revoked access or mismatched source/account/hash | Stop the affected action and preserve evidence for correction |
| Cancellation after possible side effect | Observe the actual outcome; cancellation does not relabel a published Site as absent or imply a refund |

A local lock covers processes using that state directory, not independent external publishers or other workstations. Keep journals, signing/account authorities, source/save receipts and immutable artifacts across upgrades. Do not clear unknown state to make a command run again. CLI errors can conservatively classify an operation as needing reconciliation; inspect its original account result before deciding what happened.

## Verification and evidence

The fixed-mode pass reran 68 companion checks, 52 disposable database/HTTP checks and 103 application regressions; counts overlap. Both TypeScript projects, production build, isolated container restart and the 633-asset local scan passed. [Verification and hashes](opaque-provider-verification.json) distinguish these local observations from deployment.

The [native-host save/update evidence](hosted-save-verification.json) is historical and separate from customer billing. [The precursor release](RELEASE_20260911.md) records earlier deployed state. No new paid generation, Site mutation or live supplier request was made by the fixed-mode pass. [The original runbook](../../historical-docs/sites-automation__durable__LIVE_ADAPTERS.md.txt) is retained verbatim for its dated observations; its metered-only activation and direct-CLI sequence no longer govern fixed-mode operations.
