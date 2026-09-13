# Image studio review

<!-- docs-scope: operational-record -->

Private maintainer record, 2026-09-10. `/images` restores hosted image creation at the user's explicit request. `PRODUCT.md` records that decision. The studio retains GALX's existing dark/indigo identity; `DESIGN.md` and the global sidecar are unchanged, and API Request Inspector constraints remain specific to that inspector.

## Resulting behavior

- Desktop: a persistent composer groups model, prompt, ratio, quality, and count; settings scroll while Generate stays available. The adjacent canvas shows prompt inspiration and latest results.
- Phone: Create / My images / Favorites navigation comes first in the DOM. The library occupies the full width and hides the composer; small screens use one image column. The detail dialog stacks vertically.
- Guests can prepare a draft and use inspiration before signing in. Same-tab draft recovery is best effort through browser storage. Sign-in returns to `/images`.
- Generation exposes only the established **OpenAI Image Generation** public alias, supported ratios, Standard / High detail, and one to four images. No underlying model identity is promised.
- A pending receipt resumes retrieval on reload. Pause affects status checks; an ambiguous submission remains blocked after reload until the user acknowledges starting again. Rate limits show a retry countdown. These behaviors do not guarantee exactly-once upstream execution.
- My images and Favorites support prompt search, chronological sorting, refresh, count, and Load more. Saved images can be starred. Preview failures and library/authentication failures have actionable states.
- A native modal supplies prompt copy, download, reuse, metadata, and favorites where available. Escape closes it and restores focus. Reuse fills and focuses the composer; one prompt change can be undone.

## Design rationale and assets

[Midjourney's website overview](https://docs.midjourney.com/hc/en-us/articles/33329460426765-Website-Overview) informed creation, prompt reuse, and searchable organization. [Adobe's Firefly walkthrough](https://www.adobe.com/learn/firefly/web/ai-generated-text-effects-with-reference-image) informed explicit aspect-ratio selection. The design applies familiar patterns within GALX's supported contract; reference-image uploads, editing, and negative prompts are not implemented.

The inspiration set is built-in Imagegen artwork at `public/images/studio/{desert,glass,paper}.webp`, labeled AI-generated examples. These are not saved user images or output claims for the displayed alias. [Private provenance](../../.impeccable/assets/image-studio.md) records exact prompts. Published images were re-encoded and stripped of EXIF, XMP, and ICC metadata. Keep private provenance and diagnostics out of public artifacts.

The [surface brief](../../.impeccable/surfaces/src-app-images-page-tsx.md) records local hierarchy, responsive behavior, and component choices. Seven file-scoped color exceptions in `.impeccable/config.json` preserve intentional indigo, navy hover, and amber error colors after radii, typography, and button contrast were normalized. No broad detector ignore was added.

## Verification checkpoint

Final verification reported by the implementation owner:

| Check | Result and scope |
| --- | --- |
| Image public-boundary, retry, and authorization regressions | 19 tests passed. |
| Studio browser-contract unit tests | Four tests passed. |
| Targeted ESLint / TypeScript | Passed. |
| Final production build | Passed. |
| Final controlled production browser pass | Script exited 0; eight studio states with no Axe WCAG A/AA violations or horizontal overflow. |
| Independent finish review | **Ship**, scoped to four resolved findings: mobile gallery width, DOM/focus order, expired-session sign-in action, pagination fixture count. All eight captures valid; no visible regression from the fix batch. |

Browser interactions cover guest draft recovery, one asynchronous POST, pause/reload/resume, download, modal Escape and focus return, favorite add/remove including in the dialog, search, pagination, library failure/401, cooldown without automatic retry, and ambiguous-submission recovery after reload without another POST. Explicit assertions verify full mobile canvas width, navigation before composer in the DOM, and the 401 recovery link's sign-in return destination. Fixtures inject private diagnostic sentinels and require the studio to omit them from rendered text.

Run the focused checks from the repository root:

```sh
npm run test:image:security
node --import tsx --test scripts/test-image-studio.ts
npx eslint src/app/images/page.tsx src/components/images/ImageStudio.tsx src/components/images/studio-contract.ts src/components/images/use-image-studio.ts
npx tsc --noEmit
npm run build
```

With a local production server on port 3417, run the controlled browser fixture separately:

```sh
GALX_BROWSER_MODULE=/private/tmp/galx-studio-tools/node_modules/playwright/index.mjs GALX_AXE_MODULE=/private/tmp/galx-studio-tools/node_modules/@axe-core/playwright/dist/index.mjs node --import tsx scripts/verify-image-studio-ui.ts
```

Those module paths refer to temporary local test dependencies and may need replacement on another workstation. The script accepts a localhost URL as its first argument, uses installed Google Chrome, intercepts generation/library APIs, and blocks external requests. It writes temporary verification JSON and captures under `.impeccable/review/images/`; a partial failed run may overwrite that JSON, so inspect the completed run's state count. The [retained verification JSON](../knowledge/audits/2026-09-10-image-studio-verification.json) preserves the eight-state result described here. This September 10 evidence was relocated from ignored local storage on September 13 after a clean-checkout CI failure; it is not a new browser run.

## Public boundary and material limits

The browser contract reads allowlisted fields and accepts bounded raster data or approved same-origin image artifact paths. Error copy is locally mapped; internal response objects, model diagnostics, and supplied task URLs are not forwarded into the UI. Server authorization and artifact sanitization remain separate responsibilities; see [image public boundary](image-public-boundary.md).

[The retained scoped public scan](../knowledge/audits/2026-09-10-image-studio-public-scan.json) checked `/images` rendered HTML and 21 associated scripts. No selected keywords appeared in HTML. The single script hit is the existing cookbook parameter `openai_api_key`, paired with the literal `galx_live_your_gateway_key` placeholder, not a secret. This narrow scan is not a whole-site disclosure audit. Its September 13 relocation retains the earlier observation date and scope.

No live GALX generation or deployment occurred; the labeled inspiration artwork was created with the built-in Imagegen tool. Fixture success does not demonstrate production account availability, image latency/quality, real allowance accounting, or live library persistence. Physical phone input, a full screen-reader pass, and measured Core Web Vitals remain unverified. A design comp, seed, and quality board are absent because this was a direct familiar-workflow implementation within the established identity.
