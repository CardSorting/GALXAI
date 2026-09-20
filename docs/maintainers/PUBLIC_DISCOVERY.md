# Public navigation, pricing and knowledge base

<!-- docs-scope: current-guide -->

Private maintainer guidance, September 13, 2026. Public pages describe customer capabilities under [product scope](../PRODUCT_SURFACE_STRATEGY.md), never this private corpus. [Current state](../../post-mortem/CURRENT_STATE.md) owns hosted evidence. These source changes do not establish deployment or search-engine indexing.

## Reader journeys and canonical URLs

Global navigation and the footer expose Sites, Images, Pricing, FAQ, Knowledge base and Developer preview. Pricing and FAQ now use permanent page URLs; existing homepage `#pricing` and `#faq` targets remain valid local summaries. No server redirect is attempted for URL fragments, which browsers do not send to the server.

| Destination | Purpose |
| --- | --- |
| `/pricing` | Current free/Pro offer, clearly labeled roadmap concepts, sharing guidance and pricing-guide links |
| `/pricing/galx-pro` | Included Sites capabilities and separate product contracts |
| `/pricing/fair-use` | Revisions, conversation turns and early-beta waiting expectations |
| `/pricing/billing-and-cancellation` | Monthly renewal, account plan entry and cancellation access |
| `/faq` | Ten native disclosures in three customer-oriented topic groups |
| `/knowledge-base` | Searchable, topic-filtered index of all eight guides |
| `/knowledge-base/getting-started` | Describe an idea and create a first version |
| `/knowledge-base/revising-your-site` | Request changes, review versions and publish updates |
| `/knowledge-base/publishing-your-site` | Move from private draft to public address deliberately |
| `/knowledge-base/public-beta` | Expectations, interruptions and useful feedback |
| `/knowledge-base/images-and-developer-access` | Distinguish Sites, Images and approved developer access |

Static route files select authored guides from `src/lib/public-content/content.ts`. The homepage reuses the same FAQ answers and plan inclusions. Price/name come from `src/lib/billing/pro-plan.ts`; do not duplicate operational product mappings or supplier settings. The one-time welcome allowance permits five images under [quota operations](FREE_GENERATION_QUOTA.md), while Sites creation requires GALX Pro. Signed-in Image Studio creators can choose Private mode before generating; that owner-scoped sharing control keeps an asset out of Explore and the community stream, but is not a paid entitlement. Reconcile all getting-started, pricing and FAQ bodies with those limits. Creator, Studio and Team cards are roadmap concepts without prices, checkout actions or entitlements. No new annual plan, discount, image price or availability guarantee is introduced.

## Public boundary and SEO

`PUBLIC_READING_PATHS` is an exact allowlist shared by navigation ownership, the sitemap and preview policy. It exempts only authored reading pages from developer approval. Existing middleware checks still enforce workspace sessions and independent administrator authority. Arbitrary descendants, `/docs` and private APIs stay outside the list. Add actual static routes, content and coverage together; never make a whole knowledge prefix public to avoid a missing-path error.

The SEO site origin is pinned to `https://galx.ai`, so a local callback/application URL cannot enter public canonicals, social URLs or the sitemap. Runtime request/auth callback configuration remains separate. Each page has a distinct title, description, canonical URL and matching Open Graph URL. `constructMetadata` supplies an absolute title so the root template cannot append the brand twice. The shared `Breadcrumbs` component generates visible breadcrumb navigation and explicit `BreadcrumbList` fields from authored names/paths. It does not spread application objects or use the legacy technical article/application schema builders. No fabricated reviews, ratings, dates or FAQ rich-result promise is added. The sitemap includes all eleven reading URLs. Existing robots rules already allow these paths; a robots allow is not an access grant.

The FAQ replaces its legacy developer-specific content and metadata with current homepage-based guidance before becoming public. Keep legacy `faqData` and private technical-schema helpers out of these route imports. Search indexes only the authored public guide records; private Markdown, incident records, internal configuration and provider data are never imported.

Patterns are adapted from [Notion Help](https://www.notion.com/help), [Linear Docs](https://linear.app/docs) and [Google's URL guidance](https://developers.google.com/search/docs/crawling-indexing/url-structure): task-oriented categories, search, separate articles, readable paths and descriptive navigation. These references are design inputs, not endorsements or promises of ranking.

## Interactions and resilience

The header remains mounted across all exact reading routes. Active parent links use `aria-current="page"`. Below 1100px, the menu uses the existing scrollable second row, with keyboard focus scrolling a clipped link into view. The workspace mobile bottom bar is omitted on reading pages. Footer and guide links use the existing bounded intent-prefetch helper; no new preload scheduler or search request is introduced.

The initial guide order begins with creation, revision and publication. Search is case-insensitive, trims whitespace and matches all query terms across titles, summaries, categories and article bodies. Topic filtering combines with the query. The count is announced politely; no results offers a reset. Clear, Escape and reset have explicit behavior, and the reset returns focus to the search field. Queries stay in memory and are not new indexable URLs. All guide links are rendered on initial HTML. Native FAQ disclosures and chapter anchors work with client bundles blocked; inline framework stream completion remains necessary where Next.js streams the page.

Pricing actions reuse `PlanAction`, preserving `/billing/plan` for an authenticated account and the encoded sign-in continuation for guests. The action only opens account review; this work does not subscribe, cancel, pay, generate or publish. Support is a normal mailto link, with no new message service.

## Verification and rollback

Run `node --import tsx --test scripts/test-public-reading.ts scripts/test-public-information-boundary.ts scripts/test-developer-preview.ts scripts/test-workspace-auth.ts scripts/test-auth-entry.ts`, `npm run build`, then `node scripts/verify-public-reading-ui.mjs`. The browser script creates an isolated localhost production server without inheriting application credentials, blocks external browser requests, and checks rendered pages, raw HTTP/RSC, public script bodies, administrator denials, metadata, sitemap, native FAQ, search recovery, keyboard navigation and 320/390/768/900/1440px layouts. It uses the existing temporary Playwright/Axe modules. Captures and raw review output stay in ignored `.impeccable/review/public-reading/`. This is local Chromium/Axe evidence, not real account/payment acceptance, comprehensive assistive-technology certification, live-site cleanliness, or field Core Web Vitals.

Review the complete navigation, product-scope and developer-preview guide bodies with changes. Register source additions, retain dated evidence, explicitly attest the affected domains, then run `npm run docs:sync`, `npm run docs:check`, `npm run test:docs` and `git diff --check`.

Rollback the authored pages, links, sitemap and exact public allowlist coherently. Do not leave links pointing to removed pages or restore legacy FAQ claims while the path is public. Keep workspace, developer and administrator enforcement intact. No database migration or billing rollback is required. Deployment and search crawling require separate dated evidence.
