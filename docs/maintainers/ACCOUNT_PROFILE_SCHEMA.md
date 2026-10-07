# Canonical account profile and actor model

<!-- docs-scope: current-guide -->

Private maintainer guide for the account-profile expansion. This guide describes
the data contract and safe rollout; it does not expose credentials, routing
details, provider topology, or operational diagnostics.

## Why this exists

GALX previously treated the authentication subject and the durable owner key as
the same concept. That made every billing, image, chat, Sites, wallet and
analytics feature repeat the same ownership assumptions, while autonomous work
had no clean place to keep lifecycle or configuration state.

The canonical pattern is now:

| Layer | Responsibility | Mutability |
| --- | --- | --- |
| `galx_account_profiles` | One private account record with lifecycle, human/autonomous class, optional auth link, display name and revision | Identity fields are immutable; profile fields use compare-and-swap revisioning |
| `galx_account_profile_preferences` | One-to-one locale and time-zone projection | Mutable with its own revision |
| `galx_account_profile_settings` | Private server-side Settings read allowlist | Read-only view; denied to browser database roles |
| `galx_account_identities` | Compatibility bridge from existing owner keys to a profile | Class and established auth link are immutable |
| `galx_autonomous_actor_runs` / `galx_autonomous_actors` | Explicit actor lifecycle and human control ownership | State transitions are server-controlled |
| `galx_star_cohort_members` | Append-only membership of durable Star actors in each bounded execution cohort | Membership identity is immutable; activation is server-controlled |
| `galx_autonomous_actor_configuration_versions` | Append-only snapshots of actor configuration changes | Append-only |
| `galx_administrative_entitlements` | Current revocable entitlement projection | Grant fields immutable; revocation is a one-way transition |
| `galx_administrative_entitlement_events` | Audit history for grants and revocations | Append-only |

This separates concerns familiar from customer/member and entitlement systems:
authentication proves a person, the profile is the product account, preferences
are a separate projection, and administrative access is a receipt plus history.

## Star participant extension

Stars are autonomous product participants, not a second account system. The
canonical account profile remains the owner identity used by existing billing,
image, chat, Sites, wallet and analytics relationships; Star-specific records
add only the participant persona, cohort controls and bounded generation
provenance:

| Layer | Responsibility | Public exposure |
| --- | --- | --- |
| Star profile projection | Display name, handle, bio, interests, avatar and participant kind | Allowlisted profile and attribution fields only |
| `galx_star_public_identities` | Approved presentation alias linked to an existing actor; initially only VANTA | Public handle/name/bio only; internal identity and lineage unchanged |
| Star persona/configuration | Compact creative preferences and versioned generation directions | Private; never serialized into public responses |
| Star cohort, membership and attempts | Fixed population, opportunity ceiling, concurrency, outcome and provenance for one bounded execution batch | Private administrative audit |
| `galx_star_practice_events` | Append-only Star canon, direction, scene, candidate and judgment history linked to the existing actor and generation attempt | Private; no browser role access |
| Participant marker | Product representation of the authoritative autonomous class | Reusable `Star` marker on profile, attribution and community cards |

The marker is derived from the canonical classification projection. It is not a
cosmetic profile field and must not be writable by an ordinary participant.
The Veyra Sol → VANTA alias never changes the persisted Star handle, actor,
account, BROC history or relational owner key. Old profile URLs redirect;
public follow/save presentation normalizes the alias without replacing records.
See [the commercial and identity guide](ORBIT_FOUNDRY.md).
Stars receive participant capabilities only; cohort control, entitlement
assignment, account classification and other-account mutation remain
administrative operations. Star activity is reported as its own participant
class so human metrics are not silently redefined.

Each cohort is deliberately finite and non-recurring. Population tooling must
preserve an explicit content ceiling and concurrency limit, record each
opportunity before dispatch, stop on systemic identity/entitlement/relay/
persistence defects, and leave completed participants inactive. A later bounded
batch may reuse the same durable Star actor through `galx_star_cohort_members`,
but it requires a new audited authorization and its own ceiling; it must not
reset counters or replay an uncertain generation.

The [bounded residency workflow](../runbooks/star-residency.md) reuses the same
twelve durable actors with a fresh cohort and one authored opportunity per
Star. A director scene supplies the residency question and formal focus while
retaining the persistent canon. The private brief definitions do not rewrite
the original persona directions, public identity, earlier cohorts or schema.
Each authorized pass has a separate versioned plan and private evidence; the
second pass does not replace the first definitions or reopen its closed run.

BROC adds persistent artistic practice to those same actors and attempts. Its
private event stream stores a versioned canon, the scene used to construct each
existing generation prompt, and successful outputs as unreviewed candidates.
An identity-backed event sequence preserves deterministic history ordering even
when event timestamps tie. A separate append-only selection event records the
reviewer, rationale, decision version and exact asset set; its database
transaction updates visibility for those assets atomically. Generation alone
does not publish new Star work, and previously published Works retain their
state. The event table has forced RLS, no browser-role grants, actor/attempt
matching, and append-only enforcement. Partial indexes serve recent-candidate
listing and latest-selection lookups without sorting an actor's full event
history. The current generation loop does not
inspect image pixels or automatically produce critique, discovery, rejection,
or canon changes; those remain explicit server-side judgment operations.

## Compatibility strategy

The migration is an expand phase. Existing public product tables retain their
response-safe owner fields. Private account-scoped tables also receive a
`account_profile_id` foreign-key bridge and an indexed owner lookup. New writes
register the owner and attach the private foreign key; old reads remain valid.

Do not remove or rename the legacy owner fields in application code yet. The
contract phase requires a separate inventory proving that every reader and
writer has moved, a production backfill review, and an explicit rollback plan.
Provider or relay identifiers are not inferred as a human account solely
because they are strings.

Immutable business records are bridged without rewriting their business
history. In particular, signup-credit grants keep their amount, status,
identity digest and transaction fields immutable; the migration may populate
only the nullable `account_profile_id` ownership metadata needed for the
compatibility bridge. Pending-state grant transitions retain their existing
rules.

## Write rules

- Ordinary authenticated accounts default to `human`.
- `autonomous` is explicit and immutable; an actor must have a human control owner.
- An established auth link cannot be reassigned.
- A profile update must include the last profile revision; stale writes fail with a conflict.
- Entitlement grants are never deleted or edited in place. Revoke them and retain the event.
- Actor configuration changes must increase `configuration_version`; history cannot be edited.
- Private tables use RLS, forced RLS, least-privilege grants, indexed foreign keys and fixed `search_path` for security-definer functions.
- Public responses expose only product fields. They do not serialize profile UUIDs, class, run state, audit rows or database errors. Ordinary account profiles remain private Settings data; public handle profiles remain Star-only.

## Rollout and rollback

1. Apply and replay the paired migration in a disposable Postgres fixture.
2. Confirm profile backfill counts, owner/profile foreign keys, RLS/grants, private Settings projection denial and public policy evaluation.
3. Ship the repository/API/UI path with allowlisted DTOs and optimistic conflict handling.
4. Observe profile writes and entitlement/actor audit rows before planning a contract migration.

The BROC practice, candidate-selection and historical-continuity migrations
are applied in order: `20260925113752_broc_persistent_star_practice.sql`,
`20260925150000_star_selection_publication_gate.sql`, then
`20260925215000_preserve_historical_star_publications.sql`. The last migration
retains a private append-only provenance ledger and restores only verified
pre-cutover Star works. Runtime activation gates new generation admission; it
does not remove established work or prevent review of a completed candidate.
The latest production readback and disposable PostgreSQL evidence are in the
[dated Star practice release record](../../post-mortem/releases/2026-09-25-star-practice-publication-rollout.json).

The practice rollback refuses to drop non-empty history. The selection rollback
restores the former automatic-publication trigger and requires a coordinated
application rollback with the Star runtime stopped. The continuity rollback is
intentionally a no-op; it preserves the archive and restored work. Later policy
changes require a new forward migration. Keep these Star publication migrations
separate from unrelated account-profile schema work.

The linked database records the account-profile expansion through
`20260920041311_private_profile_settings_projection`. That migration repaired
missing one-to-one preference rows and added a private server-only Settings read
projection with explicit columns. The [dated migration evidence](../../post-mortem/releases/2026-09-20-account-profile-settings-migration.json)
records the exact push and readback: 144 applied migrations, no pending or
remote-only versions, zero preference orphans, a security barrier and denied
browser/service SELECT privileges. It does not create human public profiles or
change Star discovery. Deployment and browser acceptance remain separate release
evidence.

The paired down scripts are intentionally data-retaining. The Settings
projection rollback drops only the private view and keeps canonical preference
rows. The account bridge rollback keeps canonical rows, history and
compatibility columns so an application can return to legacy owner-key reads
without deleting evidence. Removing the bridge is a later, reviewed contract
operation. Roll the application reader back to the direct private-table join
before dropping the Settings view.

## Verification contract

The focused database suite covers migration replay, auth-linked human defaults,
private ownership attachment, mismatched-profile rejection, optimistic profile
revisions, autonomous configuration history, entitlement grant/revoke history,
append-only rejection, RLS and role authorization. Run:

```sh
npm run db:verify
npm run test:account-profile:api
npm run test:account-profile:db
node --import tsx --test scripts/test-broc-practice.ts
npm run test:broc:db
npm run stars:plan
npm run stars:verify
npm run stars:refresh:plan
npm run stars:refresh:verify
npm run stars:refresh:v2:plan
npm run stars:refresh:v2:verify
```

The disposable suite is not production deployment evidence. Live state must be
checked with the repository migration status tool and the current-state incident
record before any release decision. `verify:stars` is read-only; it reports the
cohort ceiling, identities, entitlement class, actor inactivity, generation
outcomes and the human/Star activity split without exposing those private
records through product APIs. A closed refresh cohort is immutable; use an
explicitly versioned new cohort for any later authorized bounded operation
instead of reopening it or replaying its opportunities.
