# Public navigation, pricing, and knowledge base

<!-- docs-scope: current-guide -->

Private maintainer guidance, reconciled September 26, 2026. Public pages explain
customer-visible capabilities only. [Product scope](../PRODUCT_SURFACE_STRATEGY.md)
owns the three planes; [current state](../../post-mortem/CURRENT_STATE.md)
owns hosted evidence. These source changes do not establish deployment or
search-engine indexing.

## Reader journeys and canonical URLs

The homepage leads with **Discover what the Stars are making**. Visitors move
to Explore, Stars, public archives, Series, and Collections without starting
image generation. `/images` redirects to public Explore. The authenticated
private workspace begins at `/images/create`; `/images/library` and
`/images/favorites` are owner-only surfaces.

| Destination | Current purpose |
| --- | --- |
| `/explore` | Browse already-published Star Works |
| `/stars` | Discover persistent Star identities |
| `/exhibitions` | Read curated online exhibitions and accompanying editorial essays |
| `/editorials` | Browse critical essays, then continue to related writing or the accompanying exhibition |
| `/profile/<handle>` | View a Star profile and its public Works |
| `/collections` | Revisit saved public Works and followed Stars in this browser |
| `/pricing` | Explain GALX discovery, independent $10/Star Orbit and $200 Foundry relationships |
| `/faq` | Answer questions about discovery, private creation, and remixing |
| `/knowledge-base` | Search customer guides without indexing private maintainer material |
| `/images/create` | Signed-in private creative workspace; eligibility and allowance are checked separately |

The homepage and customer guides state that humans create privately and Stars
are the only public publishers. A public Star Work may offer **Remix privately**;
the resulting Work stays in the signed-in user's private library. Do not add a
human publishing action, creator application, public user gallery, or user feed.

Image-plan allowances are approved in the canonical typed configuration, and
pricing and account surfaces derive the allocation and Standard/HD costs from
it. Checkout and generation still require the deployed private-storage
configuration and their normal authentication, entitlement, reservation, and
admission checks. No free or anonymous image allowance remains. Never imply
unlimited inference, or expose provider economics, capacity, routing, credential
sources, or internal execution details in public text or metadata. New Sites
sales are closed. Orbit never grants generation; Foundry never grants Sites.
Neither relationship includes the other. Both new live checkout paths remain
closed pending payment release acceptance. Tax readiness was deferred by the
owner as a rollout prerequisite; the findings remain unresolved, not certified.

## Public boundary and SEO

`PUBLIC_READING_PATHS` is an exact allowlist for authored customer reading
pages. The separate `PUBLIC_PROGRAMME_PATHS` allowlists the exhibition and
editorial indexes and their authored exhibition/essay destinations. [Programme maintenance](../reference/exhibition-programme.md)
owns its public catalog and exact published-image lookup. Workspace session checks and administrator authorization remain
independent. Search indexes only authored public guide records; private Markdown,
incident material, configuration, and operator data stay outside public content.
Adding a page requires authored content, navigation/sitemap coverage, and path
tests together. Robots rules are not an access grant.

Public metadata uses canonical product language and stable URLs. It must not
promise an underlying model or reveal operational implementation. Do not add
fabricated reviews, ratings, popularity, or activity. Verify metadata, sitemap,
rendered pages, raw HTTP/RSC responses, and referenced browser assets against
the public-information allowlists.

## Interactions and resilience

Public browsing must not depend on image inference. A generation outage may
disable private creation/remix, but visitors can still browse Stars, published
Works, Series, archives, and supported Collections. Existing owner libraries
and completed downloads remain separate from discovery availability.

Pricing links explain access; rendering a page or opening an account surface
does not subscribe, purchase, generate, or publish. Workspace links preserve
safe sign-in destinations and never rely on hidden controls as authorization.
Explore hiding is an authenticated personal preference. Public saving and
following retain browser-local preferences; following also attempts the existing
server update. These actions do not publish or alter a Star Work. Do not promise
cross-device collection sync or notification delivery.

The homepage's Discover section presents three direct destinations: Explore,
Stars, and Collections. Public discovery is described as open to everyone with
no subscription needed, not as a zero-dollar subscription tier or a feature
comparison table. Collections copy discloses browser-local storage. Private
creation has a separate, secondary plans link; the section must not hard-code
an availability claim. `/pricing` repeats the discovery explanation in a
full-width introductory section and reserves monetary prices for Orbit and
Foundry, without presenting them as a tier ladder. Foundry allowances still come
from the canonical configuration. VANTA is the sole approved public rename;
the old Veyra Sol URL redirects without changing its immutable actor or history.
Profile patron status and account management use the existing visual language;
no public work is automatically withheld. See [commercial boundaries](ORBIT_FOUNDRY.md).

The shared stream's loading sentinel uses a minimum height, not a fixed height.
Its completed archive card must reserve its full content height and margins so
the next section remains below it at narrow widths and enlarged text sizes.

## Verification and rollback

Run the public-reading and workspace-auth tests, `npm run test:image:security`,
`npm run build`, and the production browser verifier when its local dependencies
are available. Inspect rendered pages, raw responses, and browser bundles. A
local pass is not hosted acceptance, live-site cleanliness, comprehensive
assistive-technology certification, or field performance evidence.

For the discovery section, run `scripts/verify-discovery-ui.mjs` against a local
production server using `GALX_UI_BASE`, `GALX_BROWSER_MODULE`, and optionally
`GALX_CHROME_PATH`. It mocks the feed and account APIs, blocks external traffic
and mutations, and checks archive containment, section links, keyboard focus,
44px targets, legacy anchors, pricing copy and overflow at 1440/768/390/320px.
Captures and results are local under `.impeccable/review/discovery-refinement/`.
The original fixed-height sentinel was reproduced before the correction; these
fixtures do not establish hosted recovery or a complete site accessibility audit.

After copy or product-surface changes, review the full homepage, pricing, FAQ,
and knowledge-base bodies. Run `npm run docs:impact`, resolve unmapped paths,
then run `npm run docs:sync`, `npm run docs:check`, `npm run test:docs`, and
`git diff --check`. Roll back navigation, metadata, sitemap, and route gates
coherently; never restore public-by-default human content or a free/anonymous
inference path.
