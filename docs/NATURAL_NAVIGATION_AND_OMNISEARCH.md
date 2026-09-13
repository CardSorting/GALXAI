# Navigation and request intent

<!-- docs-scope: current-guide -->

Private maintainer reference. Public discovery follows [product scope](PRODUCT_SURFACE_STRATEGY.md); search results and local history never grant developer or administrator access. This guide supersedes its earlier unmeasured latency, model, compliance and automatic preloading claims. Dated source history remains in Git.

## Public navigation

The top menu uses one order everywhere: Sites, Images, Pricing, FAQ, Developer preview, with account actions in a separate fixed-width slot. Pricing and FAQ point to their homepage sections; developer access remains private. Active links change color and underline without changing their text weight or dimensions. Account loading, guest and signed-in states reserve the same space. Below 900px the logo/account row sits above a horizontally scrollable, nonwrapping link row; at wider sizes all three regions occupy one row. A focus handler brings clipped links fully into view immediately when the row overflows.

`ProductNavigation` lives above the page loading boundary in the root layout for Home, Images and Sites (including Site detail). These routes share the same mounted header while their content changes. Other routes retain the same `Navigation` component in their page; the compatibility guard suppresses duplicate product headers on legacy error/not-found surfaces. Do not reintroduce page-dependent link lists or a second product header. This preserves the header, not the in-memory image workspace after leaving `/images`.

Pending links use Next.js `useLinkStatus` for a small, dimension-free hint after 120 ms and a text status announcement. The content-area loading placeholder leaves the header available; it never reports internal work or invented timing. Navigation uses normal client routing without a page-slide animation. The root reserves scrollbar space, declares its smooth anchor scrolling to Next.js, and disables smooth scrolling and header transitions with reduced motion. Section links keep native hashes and `aria-current="location"`; product links use `aria-current="page"`.

`Navigation`, `MobileBottomNav` and `Footer` use `IntentLink`. Links preserve their native href, keyboard focus, open-in-new-tab behavior and Next.js navigation. Rendering a link in the viewport does not prefetch it. A 120 ms hover or focus dwell requests just that destination; leaving or unmounting cancels the timer. Touch navigation works normally without speculative pointer-down work.

The shared `prefetchOnIntent` helper skips the current route, external URLs, auth/admin/API destinations, hidden/offline pages and browsers reporting Data Saver or 2G. A per-tab budget admits at most three unique destinations in any rolling ten seconds and deduplicates them for thirty seconds. It counts recent admissions directly, so crossing a fixed time-window boundary cannot admit a second burst. These are bounded opportunistic warmups, never guaranteed instant navigation. Authorization remains in middleware and handlers, including private page chunks; there is no middleware exemption for prefetch headers.

## Search and keyboard use

The public 404 page uses plain recovery copy, a static icon and Home, Sites, Images, Account and Developer preview links through `IntentLink`. It exposes no diagnostic log, routing explanation or invented service status. Its search helper searches the explicit Images, Sites, developer-preview and account list locally. Up/down selects a result and Enter follows it. Recent visits use the existing bounded local history. It warms only a stable highlighted result through the same budget; it never launches an API data prefetch.

The developer command menu retains its local catalog, typo matching, category filters, clipboard actions and keyboard shortcuts. Its warmup effect runs only while the menu is open, waits 120 ms for the selected result and excludes action-only results. Pointer selections share the global budget. It no longer prefetches the top three alternatives or calls the legacy secondary router path. Audit catalog entries against current product scope before exposing this menu to another audience.

`BroccoliOmniSearch` retains its existing local matching implementation. Its legacy prefetch method is not used by these surfaces. `ResilientClient` and `useResilientQuery` are separate helpers; their caches/retries are not part of the Sites bootstrap or image polling contract. Do not infer a production latency, an authentication guarantee or cross-account cache safety from a helper name or comment.

## Verification and recovery

Run `npm run test:egress:transport` for budget bounds and Sites response/authorization tests. The local Sites and Images browser fixture scripts check desktop/mobile flows; inspect real navigation, request counts and keyboard behavior in a production build. See [quota strategy](maintainers/VERCEL_QUOTA_EFFICIENCY.md) for measurement and limits.

Run `scripts/verify-navigation-ui.ts` with the same temporary Playwright/Axe module environment as the [image fixture](maintainers/image-studio-review.md#verification-checkpoint), optionally passing a localhost base URL (default `http://127.0.0.1:3417`). It blocks external requests and mocks account/workspace APIs. It compares header geometry and DOM identity across Home, Sites, Images, back/forward, account states, slow navigation and five viewport widths; it checks section links, reduced motion, overflow and scoped header accessibility. Captures and results stay under ignored `.impeccable/review/navigation/`. [September 13 navigation evidence](knowledge/audits/2026-09-13-navigation-continuity.json) records actual checks and limits; browser fixtures are not live acceptance or comprehensive assistive-technology testing.

If prefetch causes a regression, keep native links and disable only warmup scheduling while investigating. Never remove access checks or weaken private cache headers to make a navigation faster. An unavailable prefetched route must still have a normal click/retry path. Public UI wording describes the destination and recovery action, not operational details.

If header continuity regresses, inspect root ownership, the product-route guard, fixed account slots and wrapping before altering routing. Revert the header/root/page-wrapper changes together when necessary; restoring only a page header would create duplicates. Keep the sanitized loading copy and existing access checks. Verify a nested Site and not-found route when changing the product-route predicate.
