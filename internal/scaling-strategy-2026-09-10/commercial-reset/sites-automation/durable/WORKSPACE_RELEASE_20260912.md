# Sites workspace release — September 12, 2026 UTC

Private operational record. Public workflow is `docs/SITES_WORKSPACE.md`; architecture is ADR 0139.

This record describes the initial workspace deployment. [The later platform activation](ACTIVATION_20260912.md) resolves its hosting setup and fixed-profile service rollout without rewriting the initial observations below.

## Implemented scope

New GALX-managed authoring at `/sites` and `/sites/:id` removes customer companion enrollment from this path. Draft/history ownership, accepted generation prices, interrupted-operation recovery, immutable publication snapshots, explicit public consent, management and exact-host automation are implemented. The initial document contract renders static information pages. Existing native delivery and discovery remain separate.

## Verification

- 134 isolated application regressions pass, including authorization, public response allowlists, managed-host readiness and header isolation; production build passes. `workspace-application-verification.json` records 642 public build assets scanned against 39 private markers, zero hits. This output uses synthetic credentials and is never deployed.
- Browser fixtures pass creation, accepted quote, publication consent, success/error feedback, rename, archive/restore, search, direct-route reload, and mobile New Site focus. Six shell states have zero checked WCAG A/AA violations. The opaque preview is separately checked; axe does not inspect its frame. Loading and disabled-admission assertions cover delayed draft retrieval.
- A fresh design reviewer scored four requested corrections resolved. Scoped design documentation was written from the corrected source and captures.
- Thirty workspace database checks and all 94 legacy database checks pass on automatically provisioned disposable PostgreSQL fixtures. No separate fixture is required by the wrapper commands.
- Migration integrity: 95 paired migrations, no warnings or fatal findings. Production migration `20260912003002_sites_workspace.sql` applied through Supabase CLI; inventory is 95 applied, none pending. Direct schema metadata confirms forced RLS and denied access for anon, authenticated and service_role.
- Supabase security advisor: no workspace finding. One existing project-wide warning concerns leaked-password protection; this release did not change Auth configuration.
- Six raw HTTP checks against the final local production build verify exact Site hostname handling, GET/HEAD/mutation behavior, blocked API/static paths, no cookies and no framework routing headers. The framework rewrite approach was replaced after this check exposed a rewrite address.

## Platform configuration and activation

The existing Vercel project/team and its currently recommended CNAME were read back. Server-only project/team/CNAME settings were installed. `GALX_SITES_MANAGED_PUBLISH_ENABLED=0` remains explicit. No hosting token was installed: Vercel returned HTTP 403 to the project-scoped token-creation request under the current CLI login. The user was asked to install `GALX_SITES_HOSTING_TOKEN` directly in the project's Production secret settings; no token should be pasted into chat or committed.

No new paid generation, customer session impersonation, live workspace publication, DNS mutation or migration of existing customer Sites was performed for acceptance. The pre-existing generation enablement and cohort were not changed. Production secret reads were withheld by Vercel, so an attempted external readiness inspection cannot establish the deployed service's current readiness. Do not reinterpret missing returned settings as an empty production cohort.

After the platform credential is installed, verify its exact project access, enable managed publication, and qualify generation with the existing admission/readiness gates. Perform the first authorized customer round trip and record its accepted price, recovery, publication, exact DNS/TLS result and unpublish behavior before announcing general availability. This is platform activation, not per-customer companion onboarding.

## Deployment

Production deployment `dpl_6PUQNnBnHLV7SvUex3BsrLVNjg7X` (`https://galxai-3d6w2hhhm-cardsortings-projects.vercel.app`) was built by Vercel and promoted to `galx.ai`. The first unpromoted candidate `dpl_4Vf6XERzZ392teGxKpLT7S6u4DNm` was superseded by the public-header correction.

Live `/sites` rendered correctly at 1440px and 390px with no horizontal overflow. The two captures were opened and checked. All 23 page-loaded JavaScript/CSS assets scanned clean against the checked private markers; this is a route-scoped check, not a whole-site privacy certification. Anonymous/forged workspace GET and POST both return the allowlisted 401; an unknown public artifact returns generic 404 with no rewrite header. `workspace-live-verification.json` records that evidence. No authenticated customer generation/publication was performed.

Rollback target is the preceding production deployment `dpl_3STetMGz9UezziiJMigwnqkBwcUe` (`https://galxai-9c6l8mk1w-cardsortings-projects.vercel.app`). The additive workspace table and its records remain preserved.

The existing scheduled domain worker completed normally at `2026-09-12T01:15:14.508Z` after promotion (`outcome=ok`, no recorded diagnostics). Its already deployed schedule and machine authority were reused; no scheduler code or secret was replaced in this release.
