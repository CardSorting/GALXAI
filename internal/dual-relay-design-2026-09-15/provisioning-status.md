# Supabase relay project provisioning

<!-- docs-scope: operational-record -->

**Historical checkpoint.** The observations and pending items below are preserved as recorded before later local installation and management releases. They are not current setup requirements. Use [current delivery](delivery-plan.md), [the implemented account contract](../../docs/reference/relay-account-management.md) and [current state](../../post-mortem/CURRENT_STATE.md) for subsequent completion and remaining acceptance.

Dated September 15, 2026. Private administrative evidence. After the user upgraded the existing organization to Pro, both authorized relay projects were created and verified healthy. **At this initial provisioning checkpoint, no relay schema migration had been applied and no new runtime was deployed.** The later [service release](../../post-mortem/releases/2026-09-15-relay-services.json) supersedes the migration/implementation status below; this record preserves project creation evidence. [Current operating evidence](../../post-mortem/CURRENT_STATE.md) remains authoritative for the existing service. The owner subsequently clarified that accounts must remain managed only in `mazhcjisettrzbqhorvp`. The new projects are reserved for execution state; the [delivery plan](delivery-plan.md) and [central account contract](central-account-control.md) describe that revised target.

## Created projects and verification

| Setting | Premium | Standard |
| --- | --- | --- |
| Project name | GALX Relay Premium | GALX Relay Standard |
| Project reference | `prgjcyokylzcsqrjmkaa` | `enbtzuxkguehtnrhuvlu` |
| Region | Oregon, `us-west-2` | Oregon, `us-west-2` |
| Requested compute | Micro | Micro |
| Observed platform status | ACTIVE_HEALTHY | ACTIVE_HEALTHY |
| Observed platform PostgreSQL release | 17.6.1.166 | 17.6.1.166 |
| Centrally assigned upstream account class | Paid | Free |
| Canonical account-management project | `mazhcjisettrzbqhorvp` only | `mazhcjisettrzbqhorvp` only |
| Intended workloads | Text, Sites, images | Text only |
| Initial capacity | Empty; admission disabled | Empty; admission disabled |

Both projects belong to the existing upgraded organization, `CardSorting's Org` (`jklmauhrqxjkpcurpmwz`). No additional organization or subscription was created. Upstream account class is unrelated to the Supabase subscription plan. Each project supplies an independent PostgreSQL instance; separate hosts, scoped identities, network enforcement, registration and compatible runtime adapters remain required by the [strict separation contract](strict-isolation.md). Common organization ownership and billing remain a trusted administrative exception, not isolation from that owner or common usage restrictions.

Authenticated project inventory confirmed both distinct references and the original GALXAI project as ACTIVE_HEALTHY. A read-only SQL query against each exact new reference returned database `postgres`, PostgreSQL `17.6`, and zero `public.galx_%` application tables. The queries ran through CLI administrator access; they do not verify future runtime roles or database-password authentication. No application tables or relay installation identity were installed.

Independent database passwords were generated and supplied through the CLI's masked terminal prompt, without secret command arguments. Their local values were verified different and both credential files have mode `0600`, under separate ignored `.relay/supabase-provisioning-20260915/<pool>/` directories. No secrets were printed or committed. Creation checked that the root `.env.local` content and root Supabase project link were unchanged; a final link read confirmed `mazhcjisettrzbqhorvp`.

## Current billing and historical preflight

**After the user's upgrade:** the authenticated Dashboard billing page showed Pro, a paid September 15 invoice, and the spend cap enabled. The two requested Micro projects were then added to that existing organization. The agent did not change the subscription or spend cap.

**Historical preflight before the upgrade:** authenticated organization/project inventory found one organization and one active GALXAI project in Oregon. The Dashboard showed Free and an Egress Exceeded grace-period notice with possible restrictions starting October 9, 2026. Those observations described the previous plan, not the post-upgrade state.

[Supabase's billing documentation](https://supabase.com/docs/guides/platform/billing-on-supabase) limits Free to two active projects across organizations where the user is an owner or administrator. One remaining Free slot could not accommodate both new projects. The user resolved that blocker by upgrading the existing organization to Pro.

The [billing FAQ](https://supabase.com/docs/guides/platform/billing-faq) and [pricing page](https://supabase.com/pricing) give a $25/month Pro subscription, approximately $10/month per Micro instance, and $10/month in compute credits per paid organization. Therefore:

- Current selected arrangement, with three Micro projects in the upgraded organization: approximately **$45/month** base cost, including approximately $20/month for the two new projects.
- Earlier alternative, not taken: another Pro organization with two Micro projects would have been approximately $35/month while leaving GALXAI on Free.

These are estimates before taxes, variable usage, addons and billing-period adjustments, not a final invoice. The existing production project was not paused. Compute and certain addons are outside the spend cap: [cost control](https://supabase.com/docs/guides/platform/cost-control).

## Provisioning tools

Supabase CLI 2.116.0 created both projects using explicit organization, region and Micro size. Official CLI source was inspected for masked password input and work-directory behavior. The first Premium attempt stopped at the password prompt because the allocated terminal had zero dimensions; no password was submitted, and a fresh remote inventory showed no new project. The terminal dimensions were corrected, inventory was checked again, and one successful create returned Premium's reference. Standard's subsequent create succeeded. Local evidence preserves the failed prompt and successful outcomes; no blind repeated POST or duplicate project was used.

Read-only verification used `supabase db query --linked --project-ref <exact-ref>`; this CLI requires `--linked` together with `--project-ref`. Creation and future migration workspaces remain separate from the root application's linked project. Keep operational secrets in private ignored storage, never tool output, source control or journal records.

The required Stripe Directory lookup found Supabase, and the Stripe Projects catalog listed a Supabase project service. Directory plugin 0.3.2 was present; Projects plugin 0.40.0 was installed. `stripe projects status --json` reported no initialized project. The read-only init preflight did not pass. Its account-identity connectivity diagnostic also reported that its configured account identifier cannot establish the credential's actual owner. No Stripe initialization, account switch, login, terms acceptance or provisioning followed.

The failed `PROJECTS_SESSION_UNUSABLE` check reported the following remedy verbatim:

> A Stripe CLI session exists for this account, but Stripe Projects cannot read live-mode credentials from it. A person has to run `stripe projects init` in a terminal with browser access to finish authenticating Projects. Nothing you can run resolves this, so do not retry the command.

The [Stripe Projects skill](../../.agents/skills/stripe-projects/SKILL.md) says: “If any check fails with `BROWSER_AUTH_REQUIRED`, `PROJECTS_SESSION_UNUSABLE`, or `ACCOUNT_NOT_ELIGIBLE`, stop here.” That provisioning route was stopped. The independently authenticated Supabase route remains available; this task does not require repairing Stripe authentication.

## Initial provisioning readiness and next actions — historical

The post-upgrade `npm run db:status` inventory again found 108 applied application migrations, zero pending and zero remote-only. The checked-in SQL and network proofs are disposable experiments, not deployment migrations. Do not apply the 108 application migrations or the proof fixtures wholesale to the new relay projects.

Project creation and administrator SQL connectivity are complete. Next, prepare paired main-project migrations for exclusive pool assignment and central registration/lease checks, together with restricted management interfaces. Canonical accounts, credentials and account leases stay in GALXAI. Prepare a separate execution-state-only migration set for the two new projects. Validate each against its exact target in isolation, then implement the runtime, network and centrally backed monitor boundaries in the delivery plan. Never infer full relay readiness from successful project creation. Runtime credential isolation, admission policy, account uniqueness, cross-project denial and monitor sessions have not been validated against these new projects.

Documentation impact inspection found only the existing private research/proof/prototype artifacts, private inventory/configuration and ignore-file changes; no production source boundary was introduced in this preflight. The provisioning plugin added four local cache/vault/state ignore rules and rearranged the environment-file rules. The original environment-file rules were restored in place; the four added exclusions were retained. Semantic review covered the complete ignore file, the precise diff and the private provisioning record: credential, dump, runtime and raw-evidence exclusions remain intact. Only this affected critical-source review is recorded; no ADR, domain review deadline or overdue prevention action is advanced.

## Subsequent central foundation application — September 15

Main-project migration `20260915073601` adds four private relay foundation tables with registration disabled. It does not copy accounts into the two execution projects or activate either relay. The original provisioning observations above remain dated evidence. Use the [foundation verification](../../post-mortem/releases/2026-09-15-central-relay-foundation.json), [production audit](production-audit-2026-09-15.md) and [delivery plan](delivery-plan.md) for the updated stage.
