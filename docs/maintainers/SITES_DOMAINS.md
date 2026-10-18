# Sites address operations (Retired)

<!-- docs-scope: current-guide -->

> [!NOTE]
> **Status: Retired / Sunset (September 2026)**
> New Sites sales and browser authoring are retired. Existing domain reservations, reconciliation code and the separate domain scheduler are preserved; retirement does not delete DNS or release owned names.

Private maintainer runbook. [ADR 0137](../adr/0137-account-owned-sites-subdomains.md) defines address ownership; [ADR 0138](../adr/0138-automatic-sites-domain-provisioning.md) defines automatic discovery and reconciliation. [Site addresses](../SITE_ADDRESSES.md) is the historical capability contract. Never bundle this guide, native registrations or queue rows into product output.

The retained [workspace-managed publishing contract](SITES_WORKSPACE.md) needs no customer companion, but current browser entry redirects to Images. The discovery lifecycle below describes existing customer-native connections and recovery, not permission to enroll a new cohort. The native account cutover preserved one external-domain reservation and zero managed workspaces; no new publication was tested.

## Automatic lifecycle

A customer enrolls once with an available GALX username and their existing native Sites connection. The address companion observes new Sites in that account; no per-Site project binding or DNS entry is needed. It verifies current ownership and owner-private access, reserves a stable name from the title, attaches the native custom domain, and commits the narrow registration to GALX. Site creation and content population continue through the normal native workflow. Address automation never creates a second Site, regenerates content, saves versions, publishes or changes audience.

The backend registry is the durable outbox. The customer request returns after enqueueing. A separate Cloudflare scheduler invokes the backend every minute; it claims up to four due rows and creates/read-backs exact DNS records before checking TLS reachability. The customer companion retries native attachment observation and certificate-status refresh. Both queues survive restarts. Work already stored at GALX can continue while the companion is offline, but a native status refresh may still need that connection to resume.

The previous one-shot `bind` and `publish-saved` commands remain compatible producers. `connect-domain` is a diagnostic/recovery command, not the normal operating model. All use the same reservation and enqueue operation. `status` exposes the GALX URL only when its job is published and the address is active; original hosting URLs remain private records.

## Configuration and authority

| Setting | Location and meaning |
| --- | --- |
| `GALX_SITES_DOMAINS_ENABLED=1` | Backend mutation gate |
| `GALX_SITES_DOMAINS_WORKER_ENABLED=1` | Backend scheduled-work gate; independent of admission and paid generation |
| `GALX_SITES_WORKER_TOKEN` | Same random 32-byte lowercase hex secret in backend and scheduler; never a customer session |
| `GALX_SITES_COHORT_ACCOUNT_IDS` | Existing exact verified-account cohort; only these accounts can enqueue or be claimed |
| `GALX_SITES_DNS_ZONE_ID` | Backend-only `galx.ai` zone ID |
| `GALX_SITES_DNS_API_TOKEN` | Backend-only DNS edit credential restricted to that zone |
| Existing PostgreSQL configuration | Backend-only privileged connection |
| `GALX_SITES_USERNAME` | Customer's explicitly selected available username |
| `GALX_SITES_SESSION` / `GALX_SITES_BILLING_ORIGIN` | Customer account session and trusted GALX HTTPS origin |
| `GALX_SITES_CONNECTION_ID` / `GALX_SITES_ACCOUNT_USER_ID` | Customer host connection identity and exact native owner identity |

No username is inferred from email, editable profile metadata or provider workspace names. The same account keeps its username and each Site keeps its address despite title edits. Duplicate titles receive numeric suffixes. The existing 20-address-per-account cap, reserved names and non-transferable ownership remain. The customer receives no DNS/database secret; the scheduler receives no customer native credential.

## Customer enrollment

Use the qualified companion runtime (Node 26.8.1 with fixed SQLite WAL support), reviewed Sites plugin and authenticated customer host described in [the companion runbook](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/LIVE_ADAPTERS.md). Supply its environment through the host's private session manager, never in CLI arguments, tracked files or Site assets. The worker does not load dotenv.

Start one supervised process per customer with a persistent private state directory:

```sh
npm run sites:addresses -- /ABSOLUTE/PRIVATE/STATE_DIRECTORY
```

The first complete inventory is the enrollment baseline: existing Sites are left alone, and later discoveries enter the queue. Do not announce enrollment until the process reports `watching`. Sites created while the process is offline are discovered on restart. For an explicitly authorized backfill, add `--include-existing` from initial enrollment onward; retain that flag on subsequent restarts. `--once` performs one bounded discovery/processing pass for diagnostics. The stored enrollment binds origin, username, connection ID, native owner and backfill choice. Changing those requires a separate state directory and explicit enrollment.

Native inventory is owner-only, paginated with unmodified opaque cursors, and bounded to 20 pages of 50 entries. Invalid/incomplete listings cannot establish the baseline. Repeated entries are deduplicated. The local SQLite queue uses WAL, full synchronization, private files, transactions, five-minute fenced leases and 30-second-to-15-minute retry delays. Each native processing attempt is bounded to four minutes. Existing queued work can proceed even when the inventory query fails. Only public summary counts leave the worker process; project identity is stored privately.

The host must supervise restart and renew the customer session/connection. This repository does not claim that a Cloudflare worker can read arbitrary customer Sites without a connected customer host. Ordinary operation requires one enrollment, not an operator action for every new Site. Revoked or shared access is retried without making a DNS mutation; it is never repaired by changing audience.

## Backend worker and deployment

Migration `20260911153205_sites_custom_domains.sql` owns namespaces and domain reservations. Migration `20260911163542_sites_domain_automation.sql` adds `retry_count`, `automation_stopped` and the partial due-work index. Both tables retain forced RLS and revoked PUBLIC/anon/authenticated/service_role access. No public SQL function or Data API permission is added.

For a separately approved recovery installation, deploy in this order: apply only a reviewed missing additive migration; install the backend machine secret and worker flag; deploy the backend; upload the same secret to the scheduler; deploy `workers/sites-domains/wrangler.jsonc`. The scheduler has no public route or preview URL. It calls only `POST https://galx.ai/api/internal/sites/domains/process` with no submitted scope. This route uses timing-safe machine authentication and returns an empty 204 on a completed batch. Unknown failures return generic codes; customer JWTs, cookies and claimed administrator roles cannot authorize it.

```sh
npm run worker:sites:build
npm run worker:sites:deploy
```

Use Wrangler's secret input mechanism for `GALX_SITES_WORKER_TOKEN`; never pass its value in an argument or print it. The existing main edge gateway is a separate worker and is not redeployed by these commands. Its obsolete database polling cron is removed; this fixed canonical-backend domain scheduler is a different contract. The backend now uses native central storage; the scheduler holds no database destination to migrate. The scheduler holds neither PostgreSQL nor DNS credentials, and the backend keeps the existing connection pool. It binds the native fetch receiver and enables `global_fetch_strictly_public` so the fixed backend request uses public routing. The scheduler never follows redirects or forwards its secret to another destination. Failures log only a fixed category, optional HTTP status and coarse redirect category to administrator-only Worker logs; no response body, raw URL, credentials or account data is logged.

Claims use `FOR UPDATE SKIP LOCKED`, at most four rows, exact server cohort filtering, two-minute leases and UUID completion fencing. Database transactions end before network operations. External work has a 60-second deadline; each DNS/HTTPS request has a six-second deadline; the backend platform limit is 90 seconds and scheduler HTTP deadline is 85 seconds. Pending work backs off from 30 seconds to 15 minutes. Active rows leave the queue; DNS conflicts set a private stop flag. Duplicate enqueue requests cannot steal leases, reset backoff or clear conflict stops.

Pause `GALX_SITES_DOMAINS_WORKER_ENABLED` to stop new batch claims. Pause `GALX_SITES_DOMAINS_ENABLED` to stop admission and claims. In-flight work can finish under its existing lease. Authenticated status reads and existing DNS continue. Before rollback, pause the worker and allow leases to expire. Both DOWN migrations preserve all reservations, DNS plans, retry state and conflict stops. Do not drop state or recycle hostnames to recover uncertain effects.

## Native attachment and DNS contracts

Customer POST actions are `reserve`, `attach`, `configure` and `reconcile`, each with exact input fields and verified-account ownership. `attach` grants one native add through HTTP 201; a repeated 200 is not another add authorization. The companion lists the exact hostname before adding and after any ambiguous result. `configure` validates and enqueues a plan; `reconcile` retains the existing plan. Responses contain only `{hostname,status,url}` with a null URL until active.

Use the returned `custom-domains.chatgpt.site` CNAME, DNS-only, TTL 300. Validation records are restricted to the reserved hostname's `_openai-site-verification`, `_cf-custom-hostname` and `_acme-challenge` names. Certificate CNAMEs must target `dcv.cloudflare.com`; at least one valid OpenAI verification TXT is required. Ignore only a completely null native placeholder. Arbitrary targets, wildcards, partial records and changed plans fail. The generated Site URL is not a custom-domain target.

Every record carries a marker tied to its reservation UUID. Preflight all names; adopt only exact matching marked records and create missing ones. Never overwrite or delete a foreign record. Lost writes recover by readback of the same intent. Readiness requires exact DNS readback and credential-free, certificate-verified HTTPS from the reserved hostname. Accept 2xx/3xx and the native private-Site 401; 403, 404, 5xx and TLS errors stay pending. Do not follow redirects or send a GALX session, cookie or bypass token. Readiness is an observation, not continuous uptime or audience authorization.

## Recovery

| Observation | Automatic behavior or private operator action |
| --- | --- |
| Newly created Site | Customer discovery enqueues and connects it after ownership checks |
| New Site while customer host offline | Next complete inventory discovers it on restart |
| Attachment response lost | List the original project and adopt only the exact hostname; never blindly add again |
| Empty native listing after an issued attempt | Retain reservation and retry observation; investigate original native connection if persistent |
| Partial DNS write, timeout or worker crash | Reclaim after deadline/lease, read exact marked records and continue |
| TLS or native validation pending | Server probes with backoff; companion refreshes native validation |
| Foreign DNS record or changed validation plan | Preserve state and inspect ownership privately; only a reviewed operator repair may clear the stop |
| Session expired or owner/access changed | Reconnect the original account or resolve its access; never move the name or widen audience |
| Account removed from cohort | No new worker claims; existing names remain owned |

Operator repairs are not public endpoints. Inspect exact reservation/plan/marked DNS and current native ownership before changing a stopped row. Restore the original intended records without deleting unrelated DNS. A stale worker cannot finish over a newer lease. No automatic detach, rotation, rename, ownership transfer or namespace reclamation is provided.

## Verification

```sh
npm run test:sites:worker
npm run test:sites:domains
npm run test:sites:domains:db
npm run db:test
npm run db:verify
npx tsc --noEmit
npx tsc --noEmit -p workers/sites-domains/tsconfig.json
npx tsc --noEmit -p internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/tsconfig.json
python3 scripts/verify-docs.py
```

The domain and legacy DB commands each automatically start an isolated PostgreSQL 17/pgvector Docker fixture, apply all migrations and remove only their own fixture. Neither needs a separately prepared database. Production credentials and outgoing fetch are excluded. The domain checks exercise overlapping workers, partial writes, lost acknowledgements, preserved retry delays, expired leases, cohort isolation, role denial and rollback preservation. The discovery tests exercise enrollment, creations while offline, pagination, restart, ownership and concurrent local workers.

The earlier dated rollout below remains evidence for its manual example only. New worker deployment and acceptance evidence are recorded separately; neither that example nor a passing isolated build proves enrollment of all customer connections or paid generation availability.

## September 11 live rollout

The exact migration passed the CLI dry run and was applied to the linked project. The example's native owner was privately matched to an existing verified, non-anonymous GALX account before reserving `goldeneggie`. Its address is `https://studio-delivery-preview.goldeneggie.galx.ai`. The native custom-domain operation returned the target and validation records. Three exact managed DNS records were created and read back. Native domain status, hostname status and certificate status subsequently reached `active`; the private registry also reached `active`.

Anonymous HTTPS returns 401 with a valid certificate. Native access remains owner-only: one allowed account user, no external visitors, and the original custom access policy. No Site save, new deployment, audience change, paid generation or wallet mutation was performed to attach this domain. Setup initially observed an all-null validation placeholder and a temporary 404 before native activation; the tests cover those cases without treating them as success.

Owner-private Sites retain their native sign-in page. This custom-domain rollout does not replace or white-label that authentication UI, and the GALX public-asset scan does not claim to audit the hosted Site or its authentication screen.

The existing Vercel project received sensitive server-only domain configuration and a cohort containing that one verified account. The content-generation enable flag was left unchanged at `0`. Application deployment `dpl_HXEnCXxzKm27od6pqDK9vECwwM3J` was built from the current application source using production configuration, reached `READY`, and was explicitly promoted to `galx.ai`. The preceding production deployment `dpl_CsffXEUDD25CFNDiKhB2hpfre1Nn` is retained as the application rollback target.

The [live HTTP record](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/domains-live-verification.json) verifies four authentication-denial cases against the deployed address endpoint, including cookie-only and unauthenticated POST. Each returned the exact public 401 DTO and private/no-store header. The scan found no matches for 12 checked private markers across four main pages, their 29 directly linked browser assets, and checked response headers. It is a scoped scan, not a claim about all routes or dynamically imported assets. The example custom hostname returned the expected anonymous 401 over verified TLS.

The [native and registry record](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/domains-native-verification.json) preserves the domain activation, unchanged access policy, migration and deployed-source fingerprints separately from local build evidence. All 93 migrations were confirmed applied after rollout.

No customer session was extracted or minted for acceptance testing. Live provisioning used the authenticated native owner connection and private operator registry/DNS access. Authenticated customer-to-application-to-native setup is covered by component tests, not claimed as a live customer round trip. Generation availability and direct CLI archive upload retain their independent qualification status.

## September 11 automation rollout

The additive automation migration was applied and verified; all 94 local migrations have paired rollbacks. The 36 domain database checks and all 94 legacy checks passed on automatically provisioned PostgreSQL 17 fixtures. Thirteen worker/discovery tests include a combined new-Site-to-active-address scenario with a lost DNS write acknowledgement. The 15 domain/companion, 68 existing delivery, 14 native bridge and nine enrollment/isolation checks passed. TypeScript checks and the worker bundle passed; documentation navigation contains 288 documents and 138 ADRs. These test counts overlap with the broader regression pass.

[Application evidence](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/domain-worker-application-verification.json) records 121 passing regressions, a production build and no selected private-marker hits in 635 local rendered-page/browser assets. [Live boundary evidence](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/domain-worker-live-verification.json) records four pages, 29 linked browser assets, nine authorization-denial cases and zero hits for 15 selected markers. This remains a scoped scan. The existing custom hostname retains its verified-TLS, anonymous 401 behavior.

[Deployment evidence](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/domain-worker-deployment-verification.json) identifies the promoted backend `dpl_3STetMGz9UezziiJMigwnqkBwcUe`, scheduler version `97b6a9aa-d6d6-4e7a-9df0-3a15686e3002`, source fingerprints, applied migration and successful authenticated empty-204 endpoint check. Two observed scheduled runs completed successfully after the scheduler transport changes; acceptance does not rely only on a direct endpoint call. These live runs exercised the deployed scheduler and backend; no new customer Site was created during this check. The worker is deployed with a one-minute cron and both public and preview URLs disabled. Machine configuration must be installed with exact bytes: pass the 64-character secret and one-character enable flag to CLI stdin without appending a newline. The live check caught and corrected that input issue before acceptance.

The real customer-native inventory call passed with a 50-item page limit and returned only the allowed discovery fields. The workspace rejected the initial 100-item request, so the implemented adapter and tests use its actual limit. No Site creation, save, publication or access change was performed for this live inventory check. The backend's existing single active reservation remained active.

This change enrolls no additional customer companions and does not enable paid generation or expand the cohort. Customer discovery requires the one-time supervised companion enrollment above and its session renewal. A newly created customer's authenticated creation-to-DNS round trip is covered by adapter tests, not claimed as a live customer acceptance test. Historical native-host delivery and the separate CLI archive qualification retain their original scope.
