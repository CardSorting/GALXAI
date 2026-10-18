# Private Library viewer stretches image pixels

<!-- docs-scope: operational-record -->

## Impact and cause

INC-20261018-LIBRARY-IMAGE-RATIO, SEV-3. The owner reported unintended stretching
when opening a saved Library image. Read-only inspection of the actual open
dialog found a 1312×1199 artifact filling an 812×580 media panel with computed
`object-fit: fill`. The stored requested ratio is descriptive and does not match
the artifact's intrinsic shape. Original failure start and broader impact are
unknown. No artifact corruption or authorization failure is established.

`StudioArtwork` uses Next Image's `fill` layout; the private inspector had no
object-fit rule. Its panel dimensions therefore distorted the image pixels.
The correction scopes `object-fit: contain` to inspector artwork, preserving
full visibility and natural proportions. Requested metadata and stored/download
bytes are unchanged. The owner additionally requested removal of the passive
paid-tier notice; the planless-account banner is removed while creation
eligibility and purchased allowance/error controls remain.

## Recovery and acceptance

Build10 and its immutable package are accepted. The unchanged second isolated
rehearsal passes all 44 checks, including a 304,418ms deadline, clean drain,
restart, revocation and no replay. The bounded web-only replacement completed
after a clean exit with unchanged configuration, native data, Auth, Nova and
ingress. ACT-057 is completed; the image-presentation incident is recovered.

Actual desktop (1312×588) and phone (390×844) inspection show the same
1312×1199 original with computed `object-fit: contain`. Desktop media is
812×580 and phone media 334×379.797; the complete artifact retains natural
proportions with unused panel space, independently of its 1:1 requested label.
Library retains three owned images. Library and Create show neither quoted
paid-tier notice nor busy popup, and Generate remains disabled under its
existing controls. No generation, payment or artifact/metadata mutation occurred.

All 69 live HTTP/account/asset checks pass (42 assets, 13 configured secrets,
zero matches), along with 38 cache checks. Both Library stylesheets are HTTP200
CSS, immutable and byte-identical to the accepted build. The compiled scan
covers 545 JavaScript/rendered assets plus 12 CSS files with zero configured
credential or removed-notice matches. Existing paging/overflow behavior is not
certified by this focused media correction. ACT-058 below remains open.

The [release record](../../../releases/2026-10-18-library-image-ratio.json)
keeps the source, live measurements and acceptance separate. See
[FM-IMG-006](../../../failure-modes/images.md#fm-img-006--public-lightbox-escapes-the-viewport).

## First isolated rehearsal failure

Build10/package passes source equivalence and compiled-boundary checks. Its
first rehearsal passes 43 checks, including a 304,698ms full deadline, clean
exit, restart, revocation and duplicate denial. The first duplicate after the
later forced process crash returns 503 instead of the required 409. The
fixture is running without OOM; the cause is not established. No production
process was interrupted and no live replacement was attempted.

The failure remains retained. A fresh isolated run uses the same immutable
image, assertions and full budgets; no application or harness code was changed
to obtain a pass. ACT-058 separately tracks explanation and repeatability of
the post-crash result. A later passing run does not explain this first failure.
