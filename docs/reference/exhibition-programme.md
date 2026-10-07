# Exhibition and editorial programme

<!-- docs-scope: current-guide -->

Private maintainer reference, October 7, 2026. The programme presents already
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
`/editorials` redirects to the index’s editorial section. The canonical essay
destinations are `/editorials/what-an-object-can-ask` and
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
Small editorial illustrations use the existing thumbnail contract. Full images
use the existing sanitized binary artifact endpoint and its current publication
checks. No metadata is embedded into images by this frontend feature.

Intrinsic dimensions are verified from the released artifact, not requested
generation dimensions. Images remain uncropped, with reserved layout space.
Failed publication lookup or image loading produces an authored unavailable
state; captions and artist links remain readable. No unrelated image is
substituted and no generation is triggered. Pages are dynamically rendered so a
failed lookup does not become a permanent build-time catalog snapshot.

## Anonymous reading and account recovery

`src/lib/exhibitions/paths.ts` contains the exact authored path allowlist.
Preview policy permits only these concrete destinations and the two reviewed
dynamic page-chunk templates. Drafts, extra descendants, sibling APIs and
diagnostic chunks retain their existing private denial. Sitemap includes the
canonical index and authored details; the redirect-only editorial index is
omitted. Unknown slugs produce not-found responses before artwork lookup.

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
images and explicit DTO projection. A poisoned input record must not expose
private fields or accept an arbitrary storage URL.

Run focused ESLint, the production build and the compiled private-content guard.
`node --import tsx scripts/verify-exhibition-http.mjs` targets local port 3421
by default (`GALX_UI_BASE` overrides it) and records private HTTP evidence.
On a local production server, inspect desktop and mobile index, exhibition and
essay layouts; verify links, full compositions, focus and horizontal overflow.
Request raw HTML/RSC bodies, response headers and linked browser assets. Check
all selected published artifacts and unavailable/private-route responses.
Retain dated results under private release evidence. Local verification is not
live-site acceptance or a comprehensive assistive-technology/performance audit.

For an authorized hosted release, follow the
[clean package procedure](../VERCEL_DEPLOYMENT.md#canonical-clean-hosted-package).
Extend the accepted serving Media/Connect source with only the reviewed
programme delta. Verify the resulting package, runtime-setting presence,
published artifacts and protected candidate before moving the existing Media
aliases. Retain the preceding deployment and exact package for rollback. A Git
push alone does not publish this application. Record the feature commit,
artifact/source manifests, actual alias assignments and hosted HTTP checks.
Keep any denied browser review explicit; successful HTTP checks do not become
desktop or mobile visual acceptance.

For a presentation rollback, retain resolvable reading destinations and existing
publication checks while reverting scoped components and styles. Catalog removal
does not revoke a Work’s publication; publication revocation is a separate
authorized operation. Never make a withheld image public to repair an exhibition.
