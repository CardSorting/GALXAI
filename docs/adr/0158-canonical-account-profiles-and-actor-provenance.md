# ADR 0158: Canonical account profiles with explicit actor provenance

<!-- docs-scope: decision-record -->

Date: 2026-09-19. Status: proposed implementation. Owner: Account platform
maintainer. Delivery: the migration and focused disposable-Postgres checks are
present locally, and the linked database records the profile expansion through
`20260920041311_private_profile_settings_projection`; deployment acceptance
remains separate. See the [private migration evidence](../../post-mortem/releases/2026-09-20-account-profile-settings-migration.json)
for the exact readback.

## Context

GALX has many durable domains that historically use a text `user_id` owner key.
Authentication, product account state, autonomous actors, preferences and
administrative access were therefore easy to conflate. The result was repeated
ownership logic, fragmented profile behavior and insufficient history for
controlled autonomous configuration or administrative entitlement changes.

## Decision

Introduce a private canonical profile keyed by an opaque UUID and retain the
existing owner key as a compatibility bridge. Link a profile to `auth.users`
when one exists, but do not require authentication for an autonomous account.
Keep preferences in a one-to-one revisioned table. Keep autonomous account
identity, actor lifecycle, run ownership and configuration history as separate
records. Represent administrative access as a current revocable projection plus
an append-only event ledger.

Public product tables retain their existing response-safe owner fields during
the expand phase. Private account-scoped tables gain indexed profile foreign-key
bridges. This avoids exposing private profile identifiers through public table
responses while allowing server-side domains to converge on one ownership
authority.

Server-side Settings reads use a private allowlisted projection of owner key,
display name, locale, time zone and profile revision. Browser database roles
have no access to that projection; the authenticated account API performs its
own owner verification and returns a smaller public response DTO. Ordinary
account profiles remain distinct from public Star handle profiles.

## Familiar patterns and constraints

The design follows well-known product boundaries: an auth subject is not the
same object as a product customer/account; preferences are a separate profile
projection; memberships and control ownership are explicit relationships; and
entitlements are current state backed by immutable history. These are patterns,
not claims of compatibility with any particular vendor implementation.

Security constraints remain part of the decision:

- human is the explicit default for ordinary authenticated accounts;
- autonomous classification and actor control ownership are explicit and immutable;
- profile and audit tables remain private, forced through RLS and least-privilege grants;
- security-definer functions use a fixed search path;
- browser-facing APIs return allowlisted product DTOs only;
- optimistic revisions prevent stale Settings writes from silently winning.

## Consequences

Profile-aware code can stop duplicating ownership and lifecycle checks. A
world-class Settings flow can save display name, language and time zone with
clear loading, retry, success and conflict states. Autonomous execution gains a
durable boundary between account identity, actor run and versioned configuration.
Administrative review gains an audit trail without making the current
entitlement row immutable to the point of operational uselessness.

The compatibility bridge adds private columns and indexes and temporarily
requires two identifiers in some server-side paths. It also requires an
eventual contract migration; this decision does not authorize deleting legacy
owner fields. Existing records with incomplete evidence remain conservative and
are not guessed into autonomous or privileged classes.

Immutable domain records keep their business fields unchanged during the
expand step. The ownership backfill may populate only bridge metadata on
settled signup-credit rows, preserving the original grant and transaction
history.

## Verification and follow-up

The local migration is replayed against disposable PostgreSQL and the focused
suite tests identity backfill, profile attachment, immutable signup-credit
bridge metadata, stale-write rejection, actor configuration history,
entitlement audit history and role denial. Live migration state and affected
domain counts are reconciled; deployment acceptance still requires adversarial
public-response tests and a production-build scan for private profile fields. A
later ADR or successor must define the contract phase only after those checks
are complete.
