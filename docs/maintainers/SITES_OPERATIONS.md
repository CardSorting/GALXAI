# Sites generation and delivery operations (Retired)

<!-- docs-scope: current-guide -->

> [!NOTE]
> **Status: Retired / Sunset (September 2026)**
> The Sites product line has been retired in favor of GALX Images. Heavy infrastructure requirements, custom domain worker overhead, and high inference quota usage motivated sunsetting Sites. Generation endpoints are disabled and client workspace URLs (`/sites`, `/sites/[id]`) redirect to `/images`. This guide is retained for historical traceability, billing audit, and legacy data recovery.

Private maintainer guide. [ADR 0140](../adr/0140-paid-sites-and-shared-fair-usage.md) supersedes new per-generation pricing with eligible paid-plan access and shared fair usage; [ADR 0148](../adr/0148-complimentary-pro-access.md) adds explicit operator-provisioned complimentary Pro access. The [fair-use runbook](SITES_FAIR_USAGE.md) defines historical configuration, admission, membership and rollout. Public documentation describes only [the capability and access contract](../SITES_CONTENT.md).


## Current path

The browser workspace and content API use the same included-generation adapter and shared authority. They neither quote new generation prices nor reserve, debit or settle wallet funds for new work. The standalone content API requires current Pro eligibility. The browser workspace additionally offers one allocated free Site and three total turns under [quota operations](FREE_GENERATION_QUOTA.md); only that Site can publish through free access. Browsing, export, recovery and unpublishing preserve existing work.

The [workspace runbook](SITES_WORKSPACE.md) covers private drafts, publication snapshots and managed hosting. [Address operations](SITES_DOMAINS.md) covers the existing DNS worker. The optional native workflow retains its own connection and domain gates. No new worker or external service is added for fair usage.

When the explicit isolated-relay deployment mode is enabled, all Sites dispatch and receipt reads select Premium under the [service runbook](../runbooks/relay-pool-services.md). The private preflight uses Premium's separate capability key. Calls include a hash of the server-verified owner, and no legacy fallback occurs. Customer Pro/free access and fair usage remain independent from the upstream account class. Preserve original job origins during cutover; do not migrate uncertain work by changing its URL.

## Historical recovery

`PostgresSitesBilling` and the old content-route adapter are retained for original receipt lookup/settlement only. The deployed POST handlers never call their generation entry points. A workspace operation's persisted mode selects the correct reader. Original wallet holds keep their accepted tariff, evidence, identity and reconciliation behavior; missing evidence is not a refund. Do not delete holds, reprice earlier work, or redeploy an old application that restores the charged POST path.

The [archived September 12 operations guide](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/LEGACY_SITES_OPERATIONS_20260912.md) preserves the prior fixed/metered protocol, flags and historical validation. Its tariff and daily cutoff are not current configuration for new Sites updates. Earlier [platform activation](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/ACTIVATION_20260912.md) records remain dated evidence, not authority to activate this new policy.

## Verification and rollback

Run `npm run test:free-quota`, `npm run test:free-quota:db`, `npm run test:sites:fair`, `npm run test:sites:fair:db`, `npm run test:sites:workspace`, `npm run test:sites:workspace:db`, `npm run db:verify`, and `npm run db:test`. The database suites create disposable isolated fixtures; no separate legacy fixture is needed. Run the isolated application production build and public-boundary scan described in the fair-use runbook.

Disable the private policy first to stop admission. Keep included and legacy recovery, published snapshots, domains and their workers available. The additive migration's DOWN file disables admission and preserves private state. Do not turn a rollback into new wallet billing or discard unresolved reservations.
