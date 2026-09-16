# Readable product URLs

<!-- docs-scope: current-guide -->

Private maintainer guide. This contract is implemented locally; [current operating state](../../post-mortem/CURRENT_STATE.md) remains the authority for deployment. Public content describes destinations and capabilities, never routing implementation or account diagnostics.

## Destinations and compatibility

| Destination | Canonical address | Compatibility |
| --- | --- | --- |
| Create an image | `/images` | Legacy `view=create`, unknown or duplicate `view` resolves here |
| My images | `/images/library` | `/images?view=library` permanently redirects here |
| Favorite images | `/images/favorites` | `/images?view=favorites` permanently redirects here |
| Billing tasks | `/billing`, `/billing/plan`, `/billing/credits`, `/billing/transactions`, `/billing/invoices`, `/billing/payment-methods` | [Billing page contract](../reference/billing-pages.md) retains old checkout URLs and section bookmarks |
| Sign in | `/login` | `/auth/signin` permanently redirects here |
| Create an account | `/signup` | `/auth/signup` permanently redirects here |
| Sign in and continue to Sites | `/login?next=/sites` | Encoded legacy return targets normalize through the shared builder |

Keep `/library` as the separate existing management dashboard: moving it into the studio would remove bulk organization/deletion functionality. Keep `/auth/callback` unchanged so existing OAuth/email redirect configuration continues to target the same endpoint. Site identifiers, starter choices and device destinations retain their existing contracts. Billing adds canonical task pages while preserving previously issued checkout return parameters.

Stable destinations belong in paths. Query parameters carry optional state: simple return paths are readable; nested query delimiters and hashes remain encoded so they cannot become sibling parameters. For example, `/login?next=/sites%3Fstarter%3Dportfolio%26refine%3D1` is intentionally encoded. Do not globally decode query strings or move return context into one shared cookie: that can corrupt delimiters or let simultaneous tabs overwrite each other's destination. The current default remains Images; a direct `/login` omits a redundant default return parameter.

## Navigation and retained work

`src/lib/images/navigation.ts` owns the finite view/path map. Studio navigation uses native anchors through Next Link with prefetch disabled. Same-tab navigation uses Next's native history integration, deriving view and Favorites from `usePathname`; it does not remount the workspace or resubmit a generation. Back/Forward restores the selected view, and document titles follow it. Modified clicks and new tabs use the actual href and a fresh guarded server entry. Create/library switches retain local prompt, selected result, result layout and recent completions. Search, sort and page positions remain local state; filter changes reset pagination. Reload or departure from Images still discards in-memory completions, while existing account-scoped drafts and durable receipts retain their own recovery behavior.

Each canonical page independently uses `WorkspacePageGate`. Middleware verifies workspace entry, including nested paths and framework requests. Client session expiry still unmounts account content and offers the exact Library/Favorites return path. No address creates an authorization grant. The shared product header recognizes nested image paths and retains its active Images link. Auth destinations are excluded from speculative prefetch and incidental mobile action overlays.

## Redirect and public-response boundary

`authEntryPath` validates local return targets before serialization and rejects external origins, protocol-relative paths, backslashes, control characters and encoded login/signup/auth loops. It preserves valid nested destination delimiters through URLSearchParams while leaving slash separators readable. Sign-in, signup, logout, callback failure and recovery use this contract. Notices are mapped to a finite set of public codes and authored copy. `authRecoveryPath` adds the finite `reauth=1` flag for explicit Sign in again actions. This keeps the form visible even if the server still has an active session; ordinary login retains automatic continuation. Only that entry-page redirect is bypassed, with session, ownership and staff gates unchanged. Supported destination fields survive recovery, including Library/Favorites and Site starters.

Legacy image/auth GET/HEAD aliases return 308 with an empty body, `private, no-store` and noindex headers. They project only supported return/notice fields and discard unrelated outer query fields. Legacy image views map to finite paths and discard unrelated query fields. Canonical workspace entry and APIs retain their independent session, owner and administrator gates. Mutation requests do not receive alias navigation redirects. Published Site hostname handling precedes application URL migration. Billing compatibility resolves GET/HEAD returns and retired routes before rendering with private 307 redirects, and uses client forwarding for fragments; supported query values are allowlisted and tested separately.

## Verification and rollout

Run `node --import tsx --test scripts/test-url-navigation.ts`, the existing auth/image security and session suites, TypeScript, ESLint, and an isolated production build. The URL tests exercise nested query round-trips, encoded loops, duplicate inputs, empty redirect bodies, private headers, callback failures and public/private path classification.

Start the isolated production fixture described in [workspace authentication](../operations/workspace-auth.md). Run `node scripts/verify-workspace-auth-http.mjs`, `node scripts/verify-url-navigation.mjs` and `scripts/verify-auth-entry-ui.ts` with the documented Playwright/Axe module paths. The dedicated URL browser fixture covers 1440/390/320px, direct entry, history, refresh, keyboard/new tabs, retained draft/results, Favorites filter, stale-session return, no automatic generation replay, overflow and accessibility. Inspect its screenshots under `.impeccable/review/url-navigation/`. Scan rendered responses and linked assets, and run the compiled private-content guard. These synthetic local checks are not live login, email delivery, image generation or production acceptance.

Ship the canonical pages, link builders, policy changes and aliases together. Image/auth URL changes alone need no database migration or callback reconfiguration. Canonical billing Checkout returns additionally require the private return-path migration before the new writer; follow the [billing release contract](../reference/billing-pages.md#verification-and-release). For rollback, retain aliases and resolvable new addresses while reverting presentation/interaction as needed; never restore cookie-only authorization or public caching. Existing bookmarks and independent tabs must continue to resolve. Do not claim the live site is clean before testing actual rendered pages and browser assets after an authorized deployment.

## Familiar precedents and limits

[GitHub's sign-in page](https://github.com/login) provides the familiar short `/login` entry. [Figma's file organization guidance](https://help.figma.com/hc/en-us/articles/1500005554982-Guide-to-files-and-folders) illustrates distinct persistent destinations and file URLs. GALX applies that organization principle to Create, My images and Favorites; this is a design inference, not a claim of Figma's internal routing. [Next.js navigation guidance](https://nextjs.org/docs/app/getting-started/linking-and-navigating) documents native links and history integration. [Supabase redirect guidance](https://supabase.com/docs/guides/auth/redirect-urls) supports keeping the configured callback contract stable. No copied architecture, conversion improvement or universal usability score is claimed.
