# Canonical account-profile migration backfill

<!-- docs-scope: operational-record -->

Status: recovered. Observed 2026-09-19 UTC.

## Summary

The canonical account-profile migration initially rolled back while backfilling
the new ownership metadata on an existing settled signup-credit record. The
existing immutability trigger correctly rejected a broad update, but did not
distinguish business fields from the new bridge column.

The three preceding pending migrations committed in order. The failed
canonical migration was transactional, so it left no partial profile bridge.
No user-facing outage or data loss was observed.

## Recovery

The migration now preserves all signup-credit business and transaction fields
and permits only `account_profile_id` metadata to be populated on settled rows.
Disposable PostgreSQL replay and regression checks pass. The repaired migration
was dry-run and applied to the linked database, then verified through the
migration ledger, profile counts, ownership backfill, forced RLS and grants.

## Prevention

Retain the immutable-record bridge regression in the focused database suite and
require an exact pending-migration dry-run before future live application.

Evidence: `supabase/migrations/20260919120000_canonical_account_profiles_and_ownership_bridge.sql`,
`scripts/test-account-profile-db.ts`, and the append-only event journal.
