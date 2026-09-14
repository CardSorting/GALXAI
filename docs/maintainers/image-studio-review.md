# Image studio review

<!-- docs-scope: operational-record -->

Private maintainer record, 2026-09-10. `/images` restores hosted image creation at the user's explicit request. `PRODUCT.md` records that decision. The studio retains GALX's existing dark/indigo identity; `DESIGN.md` and the global sidecar are unchanged, and API Request Inspector constraints remain specific to that inspector.

Current entry requires authentication; the earlier guest interactions below are historical evidence. Use [workspace authentication](../operations/workspace-auth.md) for current entry/recovery validation. The legacy browser fixture commands below require a verified server session, not only a browser-local user.

Current canonical addresses and native navigation are maintained in [readable URLs](readable-urls.md); historical URL examples below describe the earlier checkpoints.

Current large-library behavior is maintained in [image library scale](image-library-scale.md), with [dated local evidence](../knowledge/audits/2026-09-13-image-library-scale.json). The behavior and measurements below preserve the earlier studio checkpoints.

## Historical behavior through the ergonomics refinement

- Composer refinement, 2026-09-13: removed the model selector, Standard / High detail buttons, and their helper copy at the user's request because the product serves a single image model. The initial September 10 interface included those controls; the verification checkpoint below remains dated evidence of that initial implementation.
- Results refinement, 2026-09-13: the Create canvas starts blank. Completed images append to a session array in completion order, deduplicated by receipt/image ID. Image view follows the newest result by default. Selecting an earlier image pins it across later submissions and completions; Latest image resumes following new results, and View generation opens the pending visual. A filmstrip and previous/next controls keep the collection reachable. Grid shows compact clickable thumbnails from every completed batch in the current workspace session. Selection and Image/Grid choice survive Create/library navigation. Reloading or changing owners resets that local array; My images remains the saved library.
- Desktop: a persistent composer groups prompt, ratio, and count; settings scroll while Generate stays available. Short desktop windows use a shorter prompt field and an explicit settings-scroll cue. A denoising-style canvas simulation accompanies an active submission or pending receipt, then real output replaces it on completion. It is labeled Generation animation and does not display a partial generated image or a progress estimate. Each requested image gets a pending grid slot.
- Phone: Create / My images / Favorites navigation comes first in the DOM. Submission folds the composer into a prompt summary and moves focus/scroll to the result area. Edit prompt and Back to images support the return trip; generation errors reopen the composer so recovery controls remain visible. The saved library occupies the full width and hides the composer; the session grid retains small thumbnails on phones. The detail dialog stacks vertically beneath a sticky navigation/close toolbar.
- Guests can prepare a draft before signing in. Same-tab draft recovery is best effort through browser storage. Sign-in returns to `/images`.
- Generation controls expose supported ratios and one to four images. On phones both groups span the composer width. The established public alias, default quality, request contract, and saved/reused settings remain unchanged; the detail dialog retains image metadata. No underlying model identity is promised.
- A pending receipt resumes retrieval on reload. Generation options reveals Pause updates / Resume updates, with an explanation that pausing does not cancel generation. Pausing updates pauses retrieval and the simulation; Pause animation affects only the visual. Reduced-motion preference keeps it static, and hidden/offscreen canvases suspend their animation work. Errors stop animation; invalid output never enters the array. An ambiguous submission remains blocked after reload until the user acknowledges starting again. Rate limits show a retry countdown. These behaviors do not guarantee exactly-once upstream execution.
- My images and Favorites support prompt search, chronological sorting, refresh, count, and Load more. Saved images can be starred. Preview failures and library/authentication failures have actionable states.
- A native modal supplies prompt copy, download, reuse, metadata, and favorites where available. Previous/next buttons, position and unmodified left/right arrows browse a snapshot of the collection opened in the dialog without closing it; arriving results do not displace that inspection context. Arrow keys are scoped away from editable controls, text selections and modified key combinations. Escape closes it and restores focus to the opener, falling back to the canvas if needed. Reuse fills and focuses the composer; one prompt change can be undone.

## Design rationale and assets

[Midjourney's website overview](https://docs.midjourney.com/hc/en-us/articles/33329460426765-Website-Overview) informed creation, prompt reuse, and searchable organization. [Adobe's Firefly walkthrough](https://www.adobe.com/learn/firefly/web/ai-generated-text-effects-with-reference-image) informed explicit aspect-ratio selection. The [September 13 workspace audit](image-workspace-ux-audit-2026-09-13.md) adds primary Apple Photos, Midjourney Create and Firefly history references, baseline heuristic/technical scores, prioritized findings and implementation decisions. The design applies familiar patterns within GALX's supported contract; reference-image uploads, editing, and negative prompts are not implemented.

The initial September 10 inspiration set used built-in Imagegen artwork at `public/images/studio/{desert,glass,paper}.webp`. The September 13 results refinement removes those examples and their copy from the interface and browser contract. The existing assets remain as historical/fixture material, with [private provenance](../../.impeccable/assets/image-studio.md). They are not user results or output claims. The new procedural canvas simulation uses no raster assets, request contents, or provider data. Keep private provenance and diagnostics out of public artifacts.

The [surface brief](../../.impeccable/surfaces/src-app-images-page-tsx.md) records local hierarchy, responsive behavior, and component choices. Seven file-scoped color exceptions in `.impeccable/config.json` preserve intentional indigo, navy hover, and amber error colors after radii, typography, and button contrast were normalized. No broad detector ignore was added.

## Historical verification checkpoints

The September 13 workspace ergonomics refinement passed the production build/TypeScript, targeted ESLint, 23 image/security tests, five studio tests, 40 request-efficiency tests and 36 documentation tests. Its final browser fixture passed 21 states with zero reported Axe A/AA violations or horizontal overflow, including 320px, 390px, short desktop and twelve-image filmstrip cases. The final compiled boundary scan checked 640 assets, and the removed-copy scan checked 21 route files with no hits. [Workspace evidence](../knowledge/audits/2026-09-13-image-workspace-ergonomics.json) retains the commands, corrections and limits. The independent finish reviewer closed the sole responsive correction with **ship** after recaptures, with no remaining material findings; the final verdict is scoped to that scored fix. The following canvas/composer checkpoints describe earlier local revisions; their scores and checks are not silently reused as validation of the newer controls.

The later September 13 results-canvas change passed the production build/TypeScript, targeted ESLint, 23 image/security tests, five studio tests, 40 request-efficiency tests and 36 documentation tests. The expanded browser fixture passed 13 states with no Axe A/AA violations or horizontal overflow, including blank state, successive batches, latest/grid, thumbnail lightbox, malformed output, manual animation pause, hidden-tab suspension/resume and reduced motion. The independent finish reviewer returned **ship**, with no material fixes, for the requested extension. The compiled boundary scan checked 640 files; the removed-copy scan checked `/images` HTML and 20 associated scripts with no hits. [Results-canvas evidence](../knowledge/audits/2026-09-13-image-generation-canvas.json) keeps this local validation separate from the earlier checkpoints. No live generation or deployment occurred.

The September 13 composer refinement passed the production build, 23 image/security tests, four studio contract tests, targeted ESLint, and the existing eight-state desktop/mobile browser fixture. The composer screenshots confirm the removed controls and full-width phone count group. The compiled private-content scan covered 640 browser/rendered assets. [Retained refinement evidence](../knowledge/audits/2026-09-13-image-composer-simplification.json) records this local validation separately from the initial checkpoint below; no deployment or live generation was performed.

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
npx eslint src/app/images/page.tsx src/components/images/*.tsx src/components/images/studio-contract.ts src/components/images/use-image-studio.ts
npx tsc --noEmit
npm run build
```

With a local production server on port 3417, run the controlled browser fixture separately:

```sh
GALX_BROWSER_MODULE=/private/tmp/galx-preview-browser/node_modules/playwright/index.mjs GALX_AXE_MODULE=/private/tmp/galx-preview-browser/node_modules/@axe-core/playwright/dist/index.mjs node --import tsx scripts/verify-image-studio-ui.ts
```

Those module paths refer to temporary local test dependencies and may need replacement on another workstation. The script accepts a localhost URL as its first argument, uses installed Google Chrome, intercepts generation/library APIs, and blocks external requests. It writes temporary verification JSON and captures under `.impeccable/review/images/`; a partial failed run may overwrite that JSON, so inspect the completed run's state count. The current fixture covers blank canvas, batch accumulation, Image/Grid, filmstrip selection, arrow navigation, lightbox paging and focus containment/return, selection retention through completion and library navigation, mobile prompt folding/recovery, 320px/390px widths, a short desktop, malformed output, animation pause and reduced motion. The [retained verification JSON](../knowledge/audits/2026-09-10-image-studio-verification.json) preserves the earlier eight-state result described here. That September 10 evidence was relocated from ignored local storage on September 13 after a clean-checkout CI failure; it is not a new browser run.

## Public boundary and material limits

The browser contract reads allowlisted fields and accepts bounded raster data or approved same-origin image artifact paths. Error copy is locally mapped; internal response objects, model diagnostics, and supplied task URLs are not forwarded into the UI. Server authorization and artifact sanitization remain separate responsibilities; see [image public boundary](image-public-boundary.md).

[The retained scoped public scan](../knowledge/audits/2026-09-10-image-studio-public-scan.json) checked `/images` rendered HTML and 21 associated scripts. No selected keywords appeared in HTML. The single script hit is the existing cookbook parameter `openai_api_key`, paired with the literal `galx_live_your_gateway_key` placeholder, not a secret. This narrow scan is not a whole-site disclosure audit. Its September 13 relocation retains the earlier observation date and scope.

No live GALX generation or deployment occurred; the labeled inspiration artwork was created with the built-in Imagegen tool. Fixture success does not demonstrate production account availability, image latency/quality, real allowance accounting, or live library persistence. Physical phone input, a full screen-reader pass, and measured Core Web Vitals remain unverified. A design comp, seed, and quality board are absent because this was a direct familiar-workflow implementation within the established identity.
