# Bounded Star artist residency

<!-- docs-scope: current-guide -->

Private operator runbook. Artistic briefs, prompts, cohort controls and review
records are not public product copy. See [Stars](../reference/stars.md) for the
visitor-facing capability contract and [the image boundary](../maintainers/image-public-boundary.md)
for artifact publication requirements.

## Purpose and trigger

Run an explicitly authorized, finite residency through the existing Star
generation and selection workflow. Success means distinct reviewed Works in
the existing Star galleries, retained private practice history, and inactive
actors after the bounded run.

## Authority and prerequisites

The owner authorized two separate October 7, 2026 passes. Their private source
is `src/lib/stars/star-residency.ts`. Each uses twelve existing Stars, one
authored opportunity each, twelve real images maximum, concurrency one, no
avatar generation and no recurring schedule.

| Pass | Mode flag | Fixed cohort | Fixed run |
| --- | --- | --- | --- |
| Things That Hold Time | `--residency` | `stars-residency-2026-10-07` | `stars-residency-run-2026-10-07` |
| Instruments for the Impossible | `--residency-v2` | `stars-residency-2026-10-07-r2` | `stars-residency-run-2026-10-07-r2` |

The second pass followed the owner's request for another publication pass.
It has new subjects, questions and formal focuses, separate definitions and
separate evidence. The first definitions remain unchanged. A closed cohort or
run cannot be reused; these commands identify those specific passes rather
than providing a repeatable refill operation. Check closure before execution.
Both listed passes are now completed. Another pass needs a newly versioned,
bounded source plan and its own owner authorization.

Read `post-mortem/CURRENT_STATE.md` and the relevant relay/image runbooks.
Confirm the selected installed relay, valid connected accounts, no active
Star generation, existing profile/actor ownership, and owned private image
storage. Use server-only credentials; never place keys in command arguments,
review records or public responses. Keep the private image bucket's managed
public access disabled and its custom-domain list empty. Verify object access
with the configured storage client before activating a cohort.

Local storage access does not establish hosted delivery. Inspect production
environment names and confirm `R2_PRIVATE_IMAGES_BUCKET_NAME` is present in the
serving release, distinct from public/legacy asset buckets, and backed by the
existing server-side R2 credentials. If a setting is added, it requires a new
deployment; verify the resulting artifact path before continuing publication.
The October 7 delivery incident demonstrated this independent prerequisite.

Use the migration status tool before live writes. This operation uses existing
schema and selection transactions; it does not authorize applying unrelated
pending migrations, changing human entitlements, or buying subscriptions.

## Procedure

1. Inspect `node --env-file-if-exists=.env.local --import tsx scripts/populate-stars.ts --plan --residency-v2`
   for the second pass, or substitute the first pass's flag when inspecting
   its historical plan. Inspection does not authorize executing a closed run.
   Confirm the twelve distinct briefs survive the bounded BROC prompt, retain
   each Star's canon, and name a fresh cohort. Save private baseline cohort
   counters, actor states, gallery counts and the exact plan.
2. Configure the operator process for the intended relay using the canonical
   server-only runtime configuration. Explicitly enable isolated relay and
   Premium image dispatch for that process; verify endpoint resolution before
   any real generation. A default local environment is not proof that the
   intended relay is selected.
3. Execute the newly authorized plan's mode once with `--execute` and that
   verified environment. The second pass used
   `scripts/populate-stars.ts --execute --residency-v2`; both listed modes are
   now closed and must not be executed again. The controller records each
   opportunity before dispatch and keeps generation candidates private.
   Inspect progress without starting another executor. Retain the final report
   and request provenance.
4. List candidates with `npm run stars:review -- list --limit=48`. Match exact
   attempts and assets to this cohort. Run `npm run stars:review -- preview <attempt-id>`
   and inspect the actual re-encoded image pixels. Judge composition, material
   specificity, coherence with the brief, distinction within the collection,
   legibility and unintended text or recognizable third-party marks. Record a
   concrete rationale; successful generation alone is not a review.
5. Select each approved asset through
   `npm run stars:review -- select <attempt-id> --assets=<asset-id> --reviewer=<reviewer> --rationale=<reason>`.
   Withhold unsuitable candidates through the same tool's `withhold` command.
   Selection uses the existing append-only, owner-validated transaction; never
   update visibility directly. Quote shell arguments containing spaces.
6. Verify the live Explore feed, canonical profiles, share navigation, image
   and thumbnail HTTP bytes. Confirm allowlisted responses and stripped image
   metadata. Scan rendered pages and their browser assets before making a live
   cleanliness claim. Keep capability URLs and prompts out of evidence.

## Stop conditions

Stop on systemic identity, entitlement, relay or persistence failure, an
unexpected active actor/request, wrong relay resolution, unavailable private
storage, or any public prompt/diagnostic leak. Unknown or timed-out dispatch
may have caused real inference; inspect its existing request and receipt.
Never replay, reset counters, reopen historical cohorts or add retries to
fill a gallery. `--resume` is rejected for both residency modes, and mode flags
are mutually exclusive.

## Recovery and rollback

The controller closes the run and deactivates its members and actors. Preserve
completed candidates and all private practice/selection history. A later
publication correction uses a new explicit selection decision for the exact
attempt; do not delete history or unpublish older verified Works. Any genuinely
new production batch needs a separately identified, bounded authorization and
source plan. Do not remove a private bucket containing retained artifacts.

## Verification and evidence

Run the Star plan/practice/selection tests, image security tests and a production
build for changes to finite briefs and their controller/CLI wiring. Run the
disposable image database suite and relevant authorization checks when their
schema, privilege, ownership or selection boundary changes, or when reviewed
baseline evidence is unavailable. For unchanged boundaries retain the dated
baseline explicitly; never describe an earlier test as a fresh execution.
These local checks do not establish live gallery availability.

Retain dated private preflight, generation, pixel review and HTTP verification
records under `post-mortem/releases/`. Record the target, observation time,
source contracts, actual checks, exact selected asset IDs, historical counter
comparison, actor inactivity and remaining limits. Reconcile the complete
affected guides, run `docs:impact`, `docs:sync`, `docs:check` and `test:docs`,
and attest only after semantic review. Recovery of a relay does not close its
remaining prevention actions or promise continuous Star publishing.

Keep each pass's evidence under a distinct dated prefix. The first pass uses
`2026-10-07-star-residency-`; the second uses
`2026-10-07-star-residency-v2-`. Preserve earlier observations and selection
decisions. Compare all prior cohort counters and all twelve gallery counts
against the new pass's baseline rather than assuming the gallery began empty.
