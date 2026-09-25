# Private image release and privacy audit

<!-- docs-scope: current-guide -->

## Purpose and trigger

Run this read-only release audit before enabling paid private creation or
claiming complete historical image privacy. It must not apply migrations, edit
hosted settings, change bucket visibility, purge caches, or create production
images. Use the [private image boundary](../maintainers/image-public-boundary.md),
[accounting lifecycle](../maintainers/private-image-accounting.md), and
[release readiness](release-readiness.md) as the source for their respective
contracts.

## Authority and prerequisites

The release operator owns the report; database metadata requires an explicitly
selected read-only audit target. Object storage and CDN controls require
read-only access to the production inventory and origin configuration. Do not
copy credentials or private records into the evidence.

## Required result vocabulary

Record each external asset or control as:

- `VERIFIED PRIVATE` — the full in-scope object set and unauthenticated origin,
  cache, and application paths were tested and denied; retain the date, target,
  method, coverage, and result.
- `VERIFIED PUBLIC/NEEDS REMEDIATION` — public access was observed for a human
  artifact; preserve evidence and escalate under the incident process. Do not
  mutate or purge it as part of this audit.
- `UNVERIFIED` — target, complete inventory, or direct evidence is missing. Do
  not infer privacy from current code, an unguessable URL, a private database
  row, or response cache headers.

Historical `UNVERIFIED` assets remain an accepted audit state when provenance
or complete enumeration is unavailable. Record that uncertainty without
claiming privacy; it does not by itself block deployment of the new architecture
unless that deployment could expose, overwrite, publish, or otherwise weaken
the historical objects. A separately authorized follow-up may establish the
historical cohort's disposition.

## Procedure

1. Run `npm run audit:image:release`. It checks local source boundaries and, if
   `GALX_RELEASE_AUDIT_DATABASE_URL` is explicitly set, opens a read-only Postgres
   transaction to inspect only migration markers, relation/RLS flags, view
   predicates, and role grants. It must never print the URL, database name,
   object keys, user rows, or private definitions. Without an explicit audit
   target the hosted database gate is `BLOCKED`.
2. Run `npm run db:verify`, then the disposable `npm run test:image:db` harness
   with `GALX_INTEGRATION_DATABASE_URL` unset. Static SQL review and a different
   hosted database do not substitute for the isolated integration test.
3. Inspect production environment *presence and names* in the approved
   deployment console without copying values into the report. Confirm the
   Vercel application has its server-side private R2 configuration and the
   private bucket has no public origin/custom domain. This path does not depend
   on a Cloudflare Worker image-bucket binding. Confirm the deployed canonical
   allowance configuration before paid checkout or dispatch can be enabled.
   Verify all public HTTP generation routes require
   authenticated identity and the same reservation/admission boundary.
4. Inventory public object-storage buckets, custom origins/domains, cached image
   URLs, legacy human-generated assets, and any copied thumbnails/derivatives.
   Probe unauthenticated direct-origin and CDN retrieval for the full inventory
   or a defensible complete set. A sample is not a complete inventory. Record
   each historic object set with one of the three statuses above.
5. Inspect hosted Supabase migration application state, `user_image_library`
   and private request/allowance RLS flags, grants for `anon`, `authenticated`,
   and `service_role`, and public view definitions. Verify that the public feed
   and Star archive contain only authorized `star_published` Works, that raw
   user-library rows are not granted to browser roles, and that owner-scoped
   private-library operations cannot cross accounts.
6. Confirm the deployed routes and server actions have no unmetered image
   dispatch path. Exercise unauthenticated, authenticated-without-purchase,
   exhausted, and modified-payload requests. Verify a human cannot set or
   transition `work_class` into `star_published`, while the authorized Star
   operation still publishes through the internal path.
7. Verify no public traffic causes inference: pageviews, follows, saves, search,
   and archive browsing must work with inference disabled and must not enqueue a
   job. Verify a private create/remix reserves before dispatch and stays in the
   owner's library.

## Stop conditions

Stop deployment certification on any observed public human object that the
deployment could expose further, weak hosted grants/RLS/view predicate,
deployed unmetered route, or missing Star publishing authorization. Preserve
the evidence and use the incident process; do not attempt remediation during
this audit. Historical `UNVERIFIED` status is not a privacy claim or an
automatic deployment blocker when the new private path is independently
verified and does not alter those objects.

## Recovery and rollback

This runbook performs no production mutation, so it has no rollback procedure.
If evidence identifies a failure, hand off to the authorized owner for a
separately reviewed containment/remediation action. Do not purge storage or CDN
state as a side effect of certification.

## Verification and evidence

Keep production evidence private and allowlisted. Never include credentials,
database URLs, object keys, user prompts, raw provider responses, or private
runtime topology. A read-only audit result is not a deployment or remediation.

The local certification distinguishes `RELEASE CANDIDATE READY` from
production deployment. Historical provenance, hosted database access, and
production provisioning may remain unknown or blocked without invalidating a
locally correct candidate; they remain explicit deployment prerequisites. Do
not claim `PRODUCTION DEPLOYED` or `HISTORICAL PRIVACY VERIFIED` from local
tests.
