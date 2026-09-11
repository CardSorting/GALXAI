# ADR 0138: Automatic Sites domain provisioning

<!-- docs-scope: decision-record -->

Date: 2026-09-11. Status: accepted. Audience: private maintainers.
Extends [ADR 0137](0137-account-owned-sites-subdomains.md) and [customer-owned delivery](0136-customer-owned-sites-delivery.md).

## Problem and decision

The previous implementation connected an individually bound Site and performed DNS work in that request. A new Site created outside the companion's binding command had no automatic enrollment, and pending certificates needed another command. Replace that manual operating model with customer-scoped discovery and a durable server queue.

Run one address companion per enrolled customer. It pages the native owner inventory through that customer's existing authenticated connection, retaining exact opaque project IDs. The first complete inventory establishes the existing-Site baseline. Subsequently discovered Sites, including creations while the companion was offline, enter a persistent local queue. An explicit one-time `--include-existing` enrollment can include prior Sites. Partial pages, invalid cursors and listing failures cannot commit the initial baseline. There is no assumed native webhook or invented server API.

Every pending Site is checked for current native ownership and owner-private access before reserving its stable `APP.USERNAME.galx.ai` address, attaching it, and delivering the minimal registration to GALX. Native authorization stays in the customer's connection. The server does not borrow the operator's Sites account for customers. This worker does not create, populate, save, redeploy or widen a Site's audience: it observes Site creation and continues address setup while normal content population and publishing proceed independently.

The existing account/project registry row is the server outbox. `configure` and `reconcile` commit the plan and return its allowlisted public state without waiting for DNS. Repeated requests preserve existing leases, retry delays, active state and conflict stops. A dropped response therefore cannot lose the committed request or create a separate queue message gap.

## Scheduled execution

A dedicated Cloudflare scheduled Worker calls a fixed backend endpoint once per minute. It has a dedicated 256-bit machine credential, no public route and no database, DNS or customer Sites credentials. Native fetch retains its runtime receiver; `global_fetch_strictly_public` routes the fixed backend request through the public network. Redirects are rejected without following them or forwarding credentials. Worker logs retain only fixed failure categories, optional HTTP statuses and coarse redirect categories behind Cloudflare administrator access; raw URLs and response bodies are excluded. The Node handler authenticates this credential with a timing-safe comparison, validates the server cohort, and claims at most four due rows using `FOR UPDATE SKIP LOCKED`. Customer tokens, cookies, claimed administrator roles, bodies and query parameters cannot select work or authorize the scheduler.

Commit two-minute UUID leases before external effects. Process the bounded batch concurrently, with a 60-second overall deadline and existing six-second DNS/HTTPS deadlines. Record success only under the current unexpired lease. Crashes, unknown commit outcomes and failed completions leave work recoverable after lease expiry. Pending checks back off from 30 seconds to 15 minutes; successful addresses leave the queue. DNS ownership conflicts stop automatic retries and remain privately diagnosable. Re-enqueueing cannot clear a stop. Account removal from the cohort or either server pause flag prevents further worker claims.

Keep the original exact-record preflight, ownership markers, create-only writes, narrow validation-record allowlist and HTTPS checks. Pending native validation is refreshed by the customer's companion on subsequent attempts; the server can continue its stored DNS plan while that connection is offline. These are separate authorities. A provider requiring another native status refresh can remain pending until the customer connection resumes.

## Boundaries and consequences

One customer enrollment and a running, authenticated companion replace per-Site manual linking. The native host must manage connection/session renewal and supervise its companion; the Cloudflare scheduler cannot discover unconnected customer accounts. The first baseline does not silently attach historical Sites. Current admission remains the configured cohort, and the 20-address cap remains unchanged.

No new model turns, content charges, publication attempts, DNS deletion, address reassignment or credential forwarding are introduced. Public responses remain `{hostname,status,url}`; machine success has an empty 204 body and failures have fixed generic codes. Neither inventory records nor queue diagnostics are product output. Public documentation describes automatic address availability only.

Migration `20260911163542_sites_domain_automation.sql` adds private retry/stop state and a due-work index. RLS remains enabled and forced with all Data API roles denied. Pause the worker before application rollback; DOWN preserves ownership, effects and stop state. Both legacy and domain database suites now provision disposable PostgreSQL fixtures automatically.

Configuration, enrollment, recovery and dated verification are in [Sites address operations](../maintainers/SITES_DOMAINS.md). Relevant platform contracts: [native Sites](https://learn.chatgpt.com/docs/sites), [Cloudflare scheduled triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/) and [PostgreSQL queue locking](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE).
