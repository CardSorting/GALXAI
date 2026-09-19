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
| `galx_account_identities` | Compatibility bridge from existing owner keys to a profile | Class and established auth link are immutable |
| `galx_autonomous_actor_runs` / `galx_autonomous_actors` | Explicit actor lifecycle and human control ownership | State transitions are server-controlled |
| `galx_autonomous_actor_configuration_versions` | Append-only snapshots of actor configuration changes | Append-only |
| `galx_administrative_entitlements` | Current revocable entitlement projection | Grant fields immutable; revocation is a one-way transition |
| `galx_administrative_entitlement_events` | Audit history for grants and revocations | Append-only |

This separates concerns familiar from customer/member and entitlement systems:
authentication proves a person, the profile is the product account, preferences
are a separate projection, and administrative access is a receipt plus history.

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
- Public responses expose only product fields. They do not serialize profile UUIDs, class, run state, audit rows or database errors.

## Rollout and rollback

1. Apply and replay the paired migration in a disposable Postgres fixture.
2. Confirm profile backfill counts, owner/profile foreign keys, RLS/grants and public policy evaluation.
3. Ship the repository/API/UI path with allowlisted DTOs and optimistic conflict handling.
4. Observe profile writes and entitlement/actor audit rows before planning a contract migration.

The linked database currently records the full account-profile expansion through
`20260919120000`; deployment and browser acceptance remain separate release
evidence.

The paired down script is intentionally data-retaining. It keeps canonical rows,
history and compatibility columns so an application can return to legacy
owner-key reads without deleting evidence. Removing the bridge is a later,
reviewed contract operation.

## Verification contract

The focused database suite covers migration replay, auth-linked human defaults,
private ownership attachment, mismatched-profile rejection, optimistic profile
revisions, autonomous configuration history, entitlement grant/revoke history,
append-only rejection, RLS and role authorization. Run:

```sh
npm run db:verify
npm run test:account-profile:api
npm run test:account-profile:db
```

The disposable suite is not production deployment evidence. Live state must be
checked with the repository migration status tool and the current-state incident
record before any release decision.
