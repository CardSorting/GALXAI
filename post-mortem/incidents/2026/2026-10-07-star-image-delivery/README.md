# October 7 Star image delivery configuration

<!-- docs-scope: operational-record -->

Private incident record. Owner-authorized residency generated twelve intact,
reviewed artifacts. Public feed and profiles list the selected Works, but the
first live image request returned generic HTTP 503. Server diagnostics locate
the failure at the private-storage configuration guard; the initial production inventory
lacked `R2_PRIVATE_IMAGES_BUCKET_NAME`. The private bucket exists, object access
and re-encoded previews pass, and managed/custom-domain public access is absent.

Recovery is limited to the missing production bucket-name setting and the exact
accepted Media/Connect web artifact. The existing serving release and rollback
remain retained. Current working-tree source and Nova runtime are excluded.
Candidate delivery must pass before exact existing Media aliases move.

See the [preflight](../../../releases/2026-10-07-star-residency-delivery-preflight.json).
Status: recovered. Added only the missing production bucket-name setting.
The exact accepted package was copied with verbatim internal symlinks and all
3,726 entries verified. An initial rebased-symlink copy failed local validation
and was replaced before upload. The protected candidate passed all twelve
image and twelve thumbnail reads before `galx.ai`, `www.galx.ai` and
`galxai.vercel.app` aliases moved to `dpl_QBr2WUvRcvF5RFqJvdc8FaZGaqHV`.
No current working-tree source, Nova runtime, account grant or schema changed.

[Live acceptance](../../../releases/2026-10-07-star-residency-live-check.json)
confirms twelve selected works, all twelve populated profiles, sanitized
artifacts, inactive actors and unchanged historical cohorts. The
[public scan](../../../releases/2026-10-07-star-residency-public-scan.json)
passes fifteen rendered pages, twenty-four HTTP checks and 409 browser assets.

ACT-050 completes this recovery and the hosted-storage preflight added to the
[residency runbook](../../../../docs/runbooks/star-residency.md). The original
serving deployment and artifact remain usable rollback evidence. Existing host
availability, historical-image privacy and commercial-release gates remain
separate. No generation was retried or private bucket exposed.

The preceding deployment lacks the new storage setting. An alias rollback
restores the earlier surface but cannot serve this residency's new artifacts;
full image recovery requires the verified package with the verified setting.

## Further bounded acceptance — October 7, 2026

The separately owner-authorized second residency published twelve additional
reviewed Works through the recovered path, bringing the twelve Star archives
to 35 public Works. All new full images and thumbnails return 200 and decode
without embedded metadata; all seven prior cohort counters remain unchanged.
The [second live check](../../../releases/2026-10-07-star-residency-v2-live-check.json)
and [fresh public scan](../../../releases/2026-10-07-star-residency-v2-public-scan.json)
retain this later observation. No deployment, storage-access change, retry or
incident-status change occurred. Existing broader prevention actions remain
open under their own authority.
