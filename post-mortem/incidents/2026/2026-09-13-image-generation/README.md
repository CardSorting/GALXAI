# Image generation recovery — 2026-09-13

> Historical evidence from the date in this record. Commands and deployment observations below are not current operating instructions. Use [current state](../../../CURRENT_STATE.md) and the [incident runbooks](../../../runbooks/triage.md).

<!-- docs-scope: operational-record -->

Status: deployed and verified in production using the existing authenticated browser session at `https://galx.ai/images`.

## Findings and changes

- Async image creation previously acknowledged process-local queue entries. Polling a different server instance returned 404, and work depended on untracked background timers.
- Added `private.galx_image_requests`, committed before 202, with owner-scoped retrieval, unique per-owner idempotency keys, payload conflict detection, atomic dispatch claims, and bounded execution. Next.js `after` keeps accepted work alive after a response. Status reads can resume queued work; ambiguous attempts are never automatically regenerated.
- Completion requires all image records to exist in the owner's authoritative library. Completed receipts retain only asset references and output preferences. JSON URL requests return compact opaque download links; binary delivery remains sanitized.
- Session verification uses the public Auth credential and a dedicated eight-second transport, independent of database throttling. Temporary Auth errors return 503; rejected credentials still return 401.
- Favorites now commit before acknowledgement, including cold-server operations.
- Existing R2 configuration was missing in Vercel production. Added four existing server-only encrypted variables: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ASSETS_BUCKET_NAME`. Verified read/write capability with a temporary object, then removed it. No values recorded here.
- Removed operational metadata from newly uploaded image object headers.
- The first test after deployment reached its durable receipt but failed because the generation controller was stopped. Its launch supervisor repeatedly refused an existing lock containing PID `56815`. Verified that PID was absent and port 3001 had no listener, then rechecked the lock identity and archived it as `controller-stale-56815.lock`, now retained only under ignored `evidence/raw/` in this incident directory. The existing supervisor restarted the controller as PID `79601`; health, telemetry, and capability endpoints returned 200 with healthy workers. No worker containers were replaced. This was operational recovery; automatic stale-lock recovery was not added.

## Validation

- Image HTTP/security suite: 23 passed (raw bodies/headers, metadata stripping, async retrieval/streaming, opaque URLs, invalid credentials, outage handling, owner isolation).
- Durable image request/Favorites integration suite: 37 checks passed on disposable PostgreSQL, including cross-connection retrieval, concurrent retries, single dispatch, ambiguous failure, incomplete storage, forced RLS, role denial, output format retention, and guarded rollback.
- Full database integration suite: 94 passed on disposable PostgreSQL.
- Database integrity checks passed; BroccoliDB production hardening suite passed; developer preview authorization suite: 14 passed.
- Migration `20260913025900_durable_image_requests.sql` applied with Supabase CLI after its dry run identified exactly that one pending migration. Rollback refuses to discard existing receipts; application rollback can retain the additive table.
- Production build passed (Next.js 15.5.25, TypeScript, 277 generated pages).
- Live public-response scan checked three rendered pages and 23 browser scripts for the configured private markers. Anonymous and forged-credential library/Favorites requests all returned 401. See `public-verification.json`; this is a bounded scan, not a claim that every public resource was examined.

## Production frontend verification

- The pre-recovery test submitted at approximately `2026-09-13T03:16:36Z` produced durable request `c8b9f25f-934d-41f5-93c4-3276e9d50cca`. Its failed state was retained and retrieval returned a generic failure instead of a missing process-local request. Private runtime logs correlated this failure with the unavailable generation service.
- After controller recovery, submitted one image at `2026-09-13T03:25:20.204Z` through the production frontend using the existing signed-in Chrome session. No session credentials were extracted or replaced.
- Prompt: “A cobalt blue ceramic teapot on a warm cream table beside a small yellow lemon. Soft morning window light, gentle shadows, clean editorial still-life photograph, square composition, no text or logos.” Settings: one image, Standard quality, square.
- Generation succeeded. The saved asset `img_1789269951444_6a644f57` appeared in My images after a page reload. Visually inspected the image in the frontend: a blue teapot and yellow lemon on a cream surface, matching the prompt. This verifies completed-image persistence; the reload timing does not establish an interrupted in-flight recovery test.
- Download through the image inspector succeeded. The actual downloaded PNG decoded successfully at 1254 × 1254, 3,191,052 bytes, with no EXIF, XMP, IPTC, ICC, or comments reported by Sharp. See `download-verification.json` for the local path and SHA-256. The UI labels 1024 × 1024 as the requested size; the downloaded square artifact has the dimensions above.
- Added the image to Favorites and observed confirmation. Reloaded the page, opened Favorites, and verified one image with the same prompt and “Remove from favorites” checked. Neither My images nor Favorites required signing in again.

## Operational behavior

Queued requests can be claimed for five minutes. An interrupted generating request becomes a failed status after its execution deadline and is not redispatched. This avoids duplicate image costs after an ambiguous interruption. Images already saved remain in the library. User-facing errors expose no internal cause.

Primary implementation references: [Next.js after](https://nextjs.org/docs/app/api-reference/functions/after), [Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser), [Cloudflare R2 S3 API](https://developers.cloudflare.com/r2/api/s3/api/).

## Deployment

Production deployment Ready: `dpl_GvvnzykiKbuJa3EPt8RU8yg3xsfN`, `https://galxai-2m98f2la0-cardsortings-projects.vercel.app`, serving `galx.ai` and `www.galx.ai`. Source changes are deployed from the working tree and remain uncommitted and unpushed.

## Follow-up controller recovery evidence

The historical stale-marker repair above did not include automatic recovery. A separate 2026-09-14 implementation pass now has focused evidence for the local guardian, live-controller hang detection, Docker command cleanup, immutable container targeting, durable admission uncertainty, retained-worker adoption and an isolated Docker lifecycle canary. See [the dated verification record](controller-recovery-verification-20260914.json). Its local process and container results do not certify production rollout, host reboot, Docker-daemon restart, delayed daemon startup or retained-state restoration; those drills remain open under ACT-018.

## Recovery release-candidate acceptance audit — 2026-09-14

The follow-up audit reconciled the reviewed checkout with the running target before further changes. The local implementation and fixture regressions pass, and the Docker policy migration was exercised in a disposable namespace against the real Docker Desktop daemon. The installed launchd job, however, is still the older direct launcher with a legacy ownership marker; the running federation worker retains `unless-stopped`. The reviewed guardian is therefore not deployed or boot-verified. See the [private acceptance audit](recovery-acceptance-audit-20260914.json) for the evidence table, exact environment, real-versus-fixture coverage and remaining ACT-018/ACT-019 work. No production process, container, credential or state volume was changed during this audit.

## ACT-019 rollout verification — 2026-09-14

The reviewed host controller was then installed through the existing launchd boundary. The old plist and legacy marker were copied with checksums before bootout; the owner removed its marker during graceful shutdown, and the exact bytes remain in the private rollback archive. The new launchd job now runs the Node launcher, Python guardian and Node controller with one kernel-held authority. The old controller drained its worker during shutdown, so the first start cold-started a same-volume worker; subsequent controller-crash and paused-controller canaries adopted that worker without duplicate authority. The worker's effective Docker restart policy is `no`, and its retained state volume is unchanged.

The crash canary measured 21 ms to guardian detection, 211 ms to new authority, 802 ms to worker adoption and 37.813 s to required capability readiness. The paused-controller canary detected the blocked event loop in 14.718 s and restored readiness in 15.576 s. A stable-key request returned `202 Accepted` and reached terminal `completed`; the client harness did not retry a separate accepted request after a local URL-handling error. The d228 worker image was built locally but not substituted into the retained container, so worker-side receipt-expiry changes and a post-admission rollback using the old binary remain open. See the [private rollout verification](act019-rollout-verification-20260914.json) and [rollout plan](act019-rollout-plan-20260914.json). ACT-018 destructive dependency and storage drills remain unperformed in production by design.
