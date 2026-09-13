# Navigation and request intent

<!-- docs-scope: current-guide -->

Private maintainer reference. Public discovery follows [product scope](PRODUCT_SURFACE_STRATEGY.md); search results and local history never grant developer or administrator access. This guide supersedes its earlier unmeasured latency, model, compliance and automatic preloading claims. Dated source history remains in Git.

## Public navigation

`Navigation`, `MobileBottomNav` and `Footer` use `IntentLink`. Links preserve their native href, keyboard focus, open-in-new-tab behavior and Next.js navigation. Rendering a link in the viewport does not prefetch it. A 120 ms hover or focus dwell requests just that destination; leaving or unmounting cancels the timer. Touch navigation works normally without speculative pointer-down work.

The shared `prefetchOnIntent` helper skips the current route, external URLs, auth/admin/API destinations, hidden/offline pages and browsers reporting Data Saver or 2G. A per-tab budget admits at most three unique destinations in any rolling ten seconds and deduplicates them for thirty seconds. It counts recent admissions directly, so crossing a fixed time-window boundary cannot admit a second burst. These are bounded opportunistic warmups, never guaranteed instant navigation. Authorization remains in middleware and handlers, including private page chunks; there is no middleware exemption for prefetch headers.

## Search and keyboard use

The public 404 helper searches its explicit Images, Sites, developer-preview and account list locally. Up/down selects a result and Enter follows it. Recent visits use the existing bounded local history. It warms only a stable highlighted result through the same budget; it never launches an API data prefetch.

The developer command menu retains its local catalog, typo matching, category filters, clipboard actions and keyboard shortcuts. Its warmup effect runs only while the menu is open, waits 120 ms for the selected result and excludes action-only results. Pointer selections share the global budget. It no longer prefetches the top three alternatives or calls the legacy secondary router path. Audit catalog entries against current product scope before exposing this menu to another audience.

`BroccoliOmniSearch` retains its existing local matching implementation. Its legacy prefetch method is not used by these surfaces. `ResilientClient` and `useResilientQuery` are separate helpers; their caches/retries are not part of the Sites bootstrap or image polling contract. Do not infer a production latency, an authentication guarantee or cross-account cache safety from a helper name or comment.

## Verification and recovery

Run `npm run test:egress:transport` for budget bounds and Sites response/authorization tests. The local Sites and Images browser fixture scripts check desktop/mobile flows; inspect real navigation, request counts and keyboard behavior in a production build. See [quota strategy](maintainers/VERCEL_QUOTA_EFFICIENCY.md) for measurement and limits.

If prefetch causes a regression, keep native links and disable only warmup scheduling while investigating. Never remove access checks or weaken private cache headers to make a navigation faster. An unavailable prefetched route must still have a normal click/retry path. Public UI wording describes the destination and recovery action, not operational details.
