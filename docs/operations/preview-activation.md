# Private preview activation — 2026-09-12

The site and API gateway now enforce the private developer preview. Images and Sites retain their public product paths and existing account/billing requirements. Signup, payment and existing API keys do not grant developer approval. No participant was approved during deployment.

## Production changes

- Applied `20260912215724_developer_private_preview` and `20260912222003_preview_admin_workspace` with the Supabase CLI, in order. History was 99 applied / 2 pending before rollout. All 101 migrations are now applied.
- Built and checked production deployment `dpl_HCagLG9v1KmEEGkxSF4ev8ZAnLJD`, then promoted it to `galx.ai`. The immutable deployment URL is `https://galxai-8fo2lo59t-cardsortings-projects.vercel.app`.
- Deployed gateway version `8913eb08-c3c3-4256-9643-1e2bb8740143` to the existing API custom domain. Existing variables and bindings were preserved.
- The previous site deployment was `dpl_E6Kc6bqUZ1a5u2i4ZW1Vuv14HzEg`; the previous gateway version was `7111ce74-5a52-4120-89c5-15006be897af`. These precede the access gate: rolling back to either would reopen legacy access and is not a safe gate-preserving rollback.

The first owner was provisioned on 2026-09-12 at 23:27:57 UTC after the founder supplied the exact account ID. The operator verified the existing account's confirmed email and eligibility, then atomically bound the owner membership to that ID and recorded the bootstrap audit event. A subsequent database read confirmed one active owner and the matching audit record; see the [owner provisioning receipt](evidence/preview-owner.json). No additional deployment was needed. No placeholder account, test participant, API key or email was created.

## Verification and scope

- The staged build passed 67 HTTP checks and scans of 27 public browser scripts. It was tested through Vercel's authenticated deployment-protection mechanism; protection was kept enabled. The testing cookie was scoped to the exact staged hostname and never sent to the public site or API gateway.
- Production database checks confirm both migrations, forced RLS on all four private tables, no `anon`/`authenticated` table privileges, and no application service-role update/delete/truncate privilege on audit history.
- The final live site/gateway pass completed 75 HTTP checks and scanned 27 public browser scripts. Image routes on both hostnames reached their normal authentication boundary; private API and admin requests were denied as expected.
- The live browser pass checked `/developers`, `/images` and `/sites` at 1440px and 390px. The signup return path and anonymous `/admin` sign-in redirect passed. The six live captures had no document overflow or browser exceptions.
- The isolated production-build suite passed 16 desktop/mobile captures, including inbox, approval, pause, stale-edit conflict, feedback, staff management, activity and expired-session recovery. It reported no automated Axe A/AA findings, document overflow or browser exceptions.
- Production build, targeted lint, 14 authorization tests, 19 image security tests, the admin database suite, all 94 existing database tests, 101 migration/rollback integrity checks and the Worker dry run passed. Image tests include rejection of 301/302/303/307/308 redirects without leaking Location or following credentials.

Raw read-only rollout evidence is in [the staged report](evidence/preview-staged.json) and [the production report](evidence/preview-production.json). Those reports precede owner provisioning and retain their original empty-roster observations. Browser evidence is under `.impeccable/review/preview-activation/`; the admin fixture evidence remains under `.impeccable/review/preview-admin/`.

Live verification covers anonymous access denial, public-product reachability, the stated public-content scan and database privileges. Approved-account workflows were tested with isolated identities and a disposable database. First-owner sign-in and a real participant's first approved request still require real-account acceptance. No paid image generation, site publication or email was triggered by rollout checks. This is not a production load test or a blanket audit of every legacy private surface.

## Live issue found and corrected

The initial gateway probe returned 503 on the image route. Private, allowlisted diagnostic metadata isolated a `TypeError` before an HTTP response. Cloudflare's runtime rejects `redirect: "error"`; its [runtime implementation](https://github.com/cloudflare/workerd/blob/main/src/workerd/api/http.c++) accepts `manual` and `follow`.

Both image forwarding and developer approval checks now use `manual`. Redirects still fail closed; the Worker neither follows them nor publishes their Location header. The image route again reaches its normal authentication boundary. Temporary diagnostic logging was removed from the final version. No gate, public image exception or credential-source rule was relaxed.

## UX refinements

Decision notes survive workspace refresh and moving between requests in the open workspace. Successful decisions clear their note, and account changes or lost access clear private drafts. The notes are held in memory, with no browser storage persistence. Expired participant sessions offer sign-in with a return to the developer page. Mobile form fields use 16px text to avoid Safari focus zoom. The triage inbox, explicit roles, expiry, private feedback and audit history remain the core workflow.

See the [implementation audit](preview-admin-audit.md) for findings and the [operator guide](preview-admin.md) for the familiar Linear/Vercel/GitHub pattern references.
