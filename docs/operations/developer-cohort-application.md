# Developer cohort application — 2026-09-12

## Result and product direction

The application asks who the builder is, where to find their work, what they want to build, and whether they want to participate in the next private cohort. Images and Sites retain their public paths. The primary message explains that small groups help GALX manage costs, improve performance and give each builder an attentive first experience.

The 30–60% savings range was supplied by the founder as reports from the existing cohort. Public copy attributes it to participants and says results vary by workload. No independent benchmark, universal discount, cohort size, acceptance rate or invitation date is asserted. Savings are supporting context, not the headline.

## Familiar patterns and choices

- [Vercel's original v0 beta rollout](https://vercel.com/blog/announcing-v0-generative-ui) expanded access in stages from a waitlist. GALX adopts gradual admission, without copying historical Vercel volumes or adding artificial scarcity.
- [Linear's project process](https://linear.app/now/how-we-run-projects-at-linear) describes using its Origins private beta program to gather feedback before public release. GALX makes willingness to test and share private feedback explicit, with a future-cohort option for people who are not ready yet.
- [GOV.UK's check-answers pattern](https://design-system.service.gov.uk/patterns/check-answers/) supports reviewing entered information before submission. GALX uses an editable summary before sharing the application, then a durable receipt and status page.
- [Supabase's RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security) informs the existing private storage boundary. New profile fields stay in the same protected table, with no browser-role grants.

These are adapted interaction patterns, not integrations or claims of affiliation. No external service is contacted to inspect an applicant's profile.

## Application and review behavior

- Introduction: 20–1,000 trimmed characters. Project: 20–2,000 characters. Expected traffic retains the existing four choices.
- GitHub and LinkedIn are both available. At least one valid profile is required for a new or updated application. Common pasted links work without a scheme; only exact GitHub/LinkedIn hosts and profile paths are accepted. HTTPS normalization removes tracking query strings and fragments. Userinfo, alternative ports, deceptive hosts, repositories and non-profile paths are rejected. Links open with no referrer or opener access.
- Cohort preference is an explicit `next` or `later` choice. Neither is preselected, and neither grants access or changes billing. Future interest is a legitimate application state, not an error.
- Validation provides an error summary and field-specific messages. Review and success transitions move keyboard focus to the relevant heading. Form controls use 16px text and at least 44px targets. Failed submissions retain the draft; account changes unmount it.
- Pending applicants can inspect and update saved answers. Older pending requests can complete the new fields. The original request timestamp is preserved. Submitted answers are displayed only to that account and authorized staff.
- Duplicate POSTs preserve the original application. PATCH binds to the verified identity, requires the current revision and updates only pending applications. It cannot change identity, status, access expiry, staff membership or queue order. It increments the revision used by staff review, preventing stale decisions against edited details. A staff decision racing an applicant edit permits one change; the other receives a conflict.
- Admin request details show the introduction, safe profile links, self-reported profile provenance, cohort preference and last application edit time. Historical applications indicate missing details. Owner/reviewer/viewer permissions remain unchanged.

## Database impact and rollout

Migration `20260912234139_developer_cohort_application.sql` adds nullable introduction, GitHub URL, LinkedIn URL, cohort preference and application-update timestamp columns to `private.developer_access_requests`. Nullable fields preserve existing records and approvals; the application enforces requirements on new or edited submissions. Existing forced RLS and browser-role denial are retained. No auth, staff, approval, expiry or billing records are backfilled or changed.

The migration uses short lock and statement timeouts. Apply it before deploying the updated site. The existing gateway's approval contract is unchanged and requires no new gateway deployment. The paired rollback removes only these new application fields; privately export their contents before a downgrade. Revert the site alongside a schema downgrade so queries remain compatible. Do not roll back to a pre-preview access gate.

## Verification

Targeted checks cover hostile profile URLs, canonicalization, required fields, forged identity/status/role input, explicit response DTOs, anonymous and cross-origin rejection, persisted application details, concurrent updates, stale staff decisions, private table privileges and rollback. The browser suite uses the production build with a disposable database and test-only identity-provider responses, exercising guest entry, validation focus, review/edit, failure recovery, submission, persistence, legacy completion, cohort preference changes and approval/edit conflicts at desktop, tablet and mobile widths.

The existing admin authorization, image security, database regression and migration integrity suites remain part of verification. Fixture applicants are created only in the disposable database. No live signup, message, image generation or site publication is needed to validate the flow.

## Verified local results

The production build and targeted lint passed. The final browser run completed 35 admin/applicant captures at 1440px, 768px and 390px, with no Axe A/AA findings, document overflow or page exceptions. The application suite passed 8 tests, admin authorization passed 6, image security passed 19, the existing database suite passed 94, and all 102 migration/rollback pairs passed static integrity checks. Dedicated preview and admin database suites passed against disposable PostgreSQL. See [the local receipt](evidence/cohort-local.json).

The read-only Supabase security advisor found no preview-table issue. It reported the existing Auth leaked-password-protection warning; this application migration does not change Auth configuration.

## Production activation

Migration `20260912234139_developer_cohort_application.sql` is applied. Production now has 102 applied migrations and no pending migrations. Readback confirmed all five new columns, enabled/forced RLS, denied browser-role privileges and one active Owner.

Site deployment `dpl_9b3yHoVb6CFR2VSMSrZo7dsajWCB` (`https://galxai-aujwi84uq-cardsortings-projects.vercel.app`) passed the remote production build and was promoted to `https://galx.ai`. The protected staged deployment passed 68 HTTP checks and scans of 27 public scripts. Staging used Vercel's authenticated automation cookie scoped to the exact deployment hostname; that temporary cookie jar was removed after testing. No GALX account or admin authorization was bypassed.

The final live pass at `2026-09-13T00:07:23.682Z` passed 76 HTTP checks and scanned 27 public browser scripts. This included the new PATCH endpoint's anonymous denial, private API denial, public-product authentication boundaries and protected admin entry. Live browser checks covered `/developers`, `/images` and `/sites` at 1440px and 390px, with no document overflow or page exceptions. The developer signup return path and admin sign-in redirect passed. No new gateway deployment was required.

See [staged evidence](evidence/cohort-staged.json), [production evidence](evidence/cohort-production.json), and `.impeccable/review/developer-cohort-live/` for the live browser captures. Applicant submissions and staff decisions were exercised against the disposable database, not real production accounts. This pass does not substantiate the participant-reported savings range or constitute a production load test.
