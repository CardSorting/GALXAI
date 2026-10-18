# Exhibition and editorial programme

<!-- docs-scope: current-guide -->

Private maintainer reference, reconciled October 18, 2026. The programme presents already
published STAR Works through online exhibitions and authored critical writing.
It is a public reading surface within GALX, not a new publication authority,
physical venue, paid collection, or generation workflow. [Stars](stars.md) owns
the creator contract; [current state](../../post-mortem/CURRENT_STATE.md) and dated
release evidence distinguish implementation from deployment.

## Destinations and content

`/exhibitions` is the programme index. It leads with *Instruments for the
Impossible*, then *Things That Hold Time*, and links to two complete essays.
Each exhibition has twelve selected Works and its own introduction, captions,
public artist-profile links and existing Explore image-inspection links.
`/editorials` is the canonical editorial index: a publication masthead, lead essay
and secondary essay with full-width text on phones, publication metadata,
uncropped illustrations and accompanying-exhibition links. The exhibition
index retains its `#editorials` section and links to this full index, preserving
existing bookmarks. The canonical essay destinations are `/editorials/what-an-object-can-ask` and
`/editorials/reading-the-trace`; the two exhibition slugs match their titles.

The shared header, mobile drawer and footer expose Exhibitions. The parent
remains active on exhibition and essay pages. Programme pages omit the mobile
workspace bottom bar. Native anchors, history, links and focus states provide
wayfinding; speculative viewport prefetch is disabled through the existing
intent-link component. The programme introduces no form, account mutation,
notification subscription, commercial availability or public human-publishing
action.

The typed catalog in `src/lib/exhibitions/catalog.ts` contains intentional public
titles, artist identities, selected asset IDs, intrinsic dimensions, image
descriptions, captions and essays. These fields were authored for publication.
Do not import residency records, production briefs, operational evidence,
generation prompts, persona versions or private Markdown into public components.
Each typed editorial owns its institutional byline, ISO publication date and
illustration position. Shared presentation derives the displayed date in UTC
and estimates reading time from the essay text at 200 words per minute, rounded
up with a one-minute minimum. The estimate is not a service timing promise.
`getEditorialContext` resolves only the matching exhibition and selected work;
an invalid association fails closed before publication lookup on essay detail.

Essays share one centered reading axis: the breadcrumb, title, standfirst,
publication line, prose and exhibition completion use a maximum 46rem measure
(about 65ch in the inherited 18px Inter). The breadcrumb names the current essay
and returns to Editorials. The opening paragraph follows the header directly;
exhibition context is available at completion rather than occupying a preamble
rail. Prose is 18px with 1.85 leading, reducing to 17px on phones.

Illustrations follow their authored paragraph position. Their width derives
from intrinsic proportions, bounded at 52rem wide and a natural 40rem height;
landscapes can extend beyond the text column and portraits remain narrower.
Captions stay attached to the actual image width. Identity, View work and the
curatorial paragraph have the same DOM and visual order. Essay illustrations
load eagerly so artwork jumps and printing do not depend on scrolling first;
other programme images retain their existing loading policy.

A small client component offers View artwork, Copy link and Print below the
publication line. Copy receives only the canonical public essay URL, never the
browser's query or fragment. It has one in-flight write, a persistent polite
success message, and a focused, selectable read-only address if clipboard access
is missing or denied. Navigation and unmount fence obsolete clipboard results.
Print invokes the browser dialog only on an explicit click. Essay print rules
use dark ink on white and hide the shared header, ambient decoration, footer,
local actions and onward reading. The print image frame drops its screen aspect
reserve and bounds the contained image to half the page height; compact captions
and zero-height link padding help the work and caption remain together even on
small paper. Figures avoid page breaks where possible.
These controls add no clipboard read, remote service, analytics or scroll state.

At completion, readers can enter the accompanying exhibition or continue in
authored essay order. The final essay wraps to the first; single-entry or
unknown sequences offer no self/unknown recommendation. Open Graph article
metadata and an explicitly projected Article JSON-LD record use only authored
title, standfirst, byline, date and canonical URL. All canonical programme routes
remain in the sitemap.

The medium is **Digital work**. A surface that evokes charcoal, paper or textiles
does not establish a physical medium or photographic provenance. GALX Editorial
is the institutional byline; do not invent curator identities, awards, lenders,
editions, opening hours or a physical address.

## Published-image boundary

`getPublishedWorks` runs only on the server. It groups the catalog selection by
public STAR handle and requests exact asset IDs through
`PublicParticipantRepository.getSelectedCreations`. Each lookup accepts at most
24 syntactically valid IDs, parameterizes its query and uses the existing
service-role-only published STAR profile projection. The lookup remains scoped
to the author and creator class. It does not read private candidates or depend
on the newest archive page, so new releases cannot push an older exhibition
off the first page. No schema, grants, RLS, publication or storage changes are
introduced.

The final projector accepts only the selected ID, matching public STAR author,
and site-relative opaque image artifact URL. Its explicit DTO contains only
`id`, `src`, and `thumbnailSrc`; the thumbnail must be the exact artifact’s
thumbnail child. Upstream/database objects are never spread into browser props.
Small exhibition-index editorial illustrations use the existing thumbnail
contract. The editorial index and inline essay illustrations use full images
through the existing sanitized binary artifact endpoint and its current
publication checks. No metadata is embedded into images by this frontend feature.

Intrinsic dimensions are verified from the released artifact, not requested
generation dimensions. Images remain uncropped, with reserved layout space.
Failed publication lookup or image loading produces an authored unavailable
state; captions and artist links remain readable. Compact exhibition-index
previews use a short unavailable message instead of clipping the full recovery
copy. Phone previews stack artwork and text; captions wrap their identity and
View work action, and artist/section links reserve at least 44px touch height. No unrelated image is
substituted and no generation is triggered. Pages are dynamically rendered so a
failed lookup does not become a permanent build-time catalog snapshot.

## Anonymous reading and account recovery

`src/lib/exhibitions/paths.ts` contains the exact authored path allowlist.
Preview policy permits only these concrete destinations and the two reviewed
dynamic page-chunk templates. Drafts, extra descendants, sibling APIs and
diagnostic chunks retain their existing private denial. Sitemap includes the
canonical exhibition/editorial indexes and authored details. Unknown slugs produce not-found responses before artwork lookup.

The account-content wrapper allows these exact reading destinations during
browser profile unavailability. Pending or failed sign-out still hides content,
as on existing public reading pages. This exception grants no account session,
private-library access, generation entitlement or administrator permission.

## Verification, evidence and rollback

Run `node --import tsx --test scripts/test-exhibition-programme.ts` with the
existing public-reading, community-profile, public-information-boundary,
developer-preview and account-recovery tests. The programme tests cover catalog
integrity, canonical destinations, anonymous/ordinary-user access, encoded and
decoded framework templates, hostile private siblings, unselected/wrong-author
images, authored figure placement, publication metadata, reading estimates,
invalid editorial associations, authored-order continuation and explicit DTO projection.
`node --import tsx --test scripts/test-essay-actions.ts` covers canonical copying,
single-flight writes, denial/unsupported recovery, selection focus, navigation
races and explicit print activation in a disposable DOM fixture. A poisoned input record must not expose
private fields or accept an arbitrary storage URL.

Run focused ESLint, the production build and the compiled private-content guard.
`node --import tsx scripts/verify-exhibition-http.mjs` targets local port 3421
by default (`GALX_UI_BASE` overrides it) and records private HTTP evidence.
The HTTP verifier treats `/editorials` as a canonical 200 response and verifies
article semantics, caption placement, actual-title breadcrumbs, eager essay
illustrations, reading tools and onward-reading links.
On a local production server, inspect desktop and mobile index, exhibition and
essay layouts; verify links, full compositions, focus and horizontal overflow.
Request raw HTML/RSC bodies, response headers and linked browser assets. Check
all selected published artifacts and unavailable/private-route responses.
Retain dated results under private release evidence. Local verification is not
live-site acceptance or a comprehensive assistive-technology/performance audit.

For an authorized release, start with [current operating state](../../post-mortem/CURRENT_STATE.md)
and the [release readiness procedure](../runbooks/release-readiness.md). Match
the serving target and exact package; the programme's original Vercel evidence
is historical, not an instruction to reactivate retired hosting. Verify the
protected candidate, runtime-setting presence, published artifacts, HTTP access
boundaries and desktop/phone presentation before changing a live assignment.
Retain the preceding serving artifact for rollback. A Git push alone does not
publish this application. Record the source revision, package identity and
actual acceptance separately. Keep any missing browser review explicit;
successful HTTP checks do not become visual acceptance.

For a presentation rollback, retain resolvable reading destinations and existing
publication checks while reverting scoped components and styles. Catalog removal
does not revoke a Work’s publication; publication revocation is a separate
authorized operation. Never make a withheld image public to repair an exhibition.
