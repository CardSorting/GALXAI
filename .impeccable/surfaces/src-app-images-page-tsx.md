---
version: 1
slug: "src-app-images-page-tsx"
primary_target: "src/app/images/page.tsx"
related_targets: ["src/components/images/ImageStudio.tsx","src/components/images/studio.css","src/components/images/studio-contract.ts","src/components/images/use-image-studio.ts","route:/images"]
---

# Image studio — surface brief

## Scope and mode

Operate. `/images` lets a person describe an image, select supported settings, generate, inspect the result, and return to saved work. Hosted image creation was explicitly restored at the user's request on 2026-09-10; the earlier retirement decision does not govern this surface. This is private maintainer context, not public product documentation.

The studio extends the established GALX identity recorded in `DESIGN.md`. Its restrained indigo actions, dark panels, inherited sans-serif typography, compact controls, and subtle borders remain consistent with the surrounding application. The API Request Inspector's restriction on generated-content libraries remains scoped to that inspector. Neither the global design system nor its sidecar is rewritten for this surface.

## Direction and first viewport

The familiar creation workflow leads: compose at the left, explore or review images at the right. A compact title and persistent Create / My images / Favorites navigation establish the workspace. The creation pane groups model, prompt, aspect ratio, quality, and count in that order. Its controls scroll independently on desktop while Generate remains available at the bottom.

The desktop sidebar is 328px wide, becoming 300px below 1200px and 360px from 1600px. The canvas has a maximum content width of 1480px. The first Create view contains a wide desert inspiration image followed by two smaller product and illustration examples. Latest results appear above inspiration after a completed generation. Artwork supplies expression while the controls stay quiet and task-focused.

Observed local styling uses the incumbent dark background and panels, an indigo primary action (`#4f46e5`), light indigo selected states, and readable muted text (`#a9aebc`). Controls generally use 8px corners; larger containers use 12px. Main section titles are 24px, body and control text mostly 13–14px, and supporting labels 11–12px. These are descriptions of this surface, not new global tokens.

## Creation and recovery

- The only model choice is the established public alias **OpenAI Image Generation**. Supported controls expose five aspect ratios, Standard / High detail quality, and one to four images. The pixel hint describes the requested size. The alias is not a promise about an unverified underlying model.
- Guests can write a prompt, choose settings, and use inspiration. Sign in returns to `/images`; a same-tab draft can carry into the account session. Draft persistence is best effort when browser storage is available.
- A starter or Reuse prompt action fills the composer and focuses the prompt. Clear, New prompt, and reuse retain a single Undo prompt change opportunity. Reusing a prompt produces a fresh image; it does not edit an existing artifact.
- Generate and Cmd/Ctrl+Enter submit the current settings once per explicit attempt. Pending or ambiguous attempts block a second submission. A retained pending receipt resumes status retrieval after reload; it does not resubmit the generation.
- Status text separates submitting, waiting, creating, interrupted, and complete. Pause status checks pauses retrieval only. Starting again from an unresolved attempt requires acknowledgement that the earlier generation may still finish and another attempt can consume allowance.
- Rate limits display a countdown when the response supplies a retry interval. Session failures link back to sign-in. Uncertain results direct the user to check their library before starting again. No automatic retry is presented as exactly-once execution.

## Library and image detail

My images and Favorites share prompt search, Newest first / Oldest first sorting, refresh, result counts, and explicit Load more pagination. Saved image cards offer preview, prompt reuse, favorite, and download. Latest results offer preview, reuse, and download; favorites belong to saved library records. Empty, loading, failed, expired-session, and failed-preview states explain a useful next action.

A native modal dialog shows the image beside its prompt, public model name, ratio, quality, and creation time. It offers copy, download, reuse, and favorite controls where applicable. Escape, the close button, the backdrop, and Back to studio dismiss it; focus returns to the invoking control. Long prompts wrap and scroll within their bounded detail area. Download failure preserves the image and supplies feedback.

## Responsive and accessible behavior

At 760px and below, navigation precedes the composer in both DOM and visual order. The composer enters normal flow with paired quality/count groups; My images and Favorites hide it so the library uses the full viewport width. The gallery becomes one column at 420px and below. Image detail stacks the preview above its controls. Safe-area padding keeps lower content reachable.

Visible focus rings, labeled native controls, pressed/selected states, text status announcements, modal focus management, and reduced-motion support are part of the implementation. Most primary controls are at least 44px tall. The small inline Clear control is 36px tall, so this surface does not establish a universal 44px target guarantee. Automated accessibility findings apply to tested studio states only.

## Research and artwork

The workflow draws on [Midjourney's website overview](https://docs.midjourney.com/hc/en-us/articles/33329460426765-Website-Overview) for creation, prompt reuse, and searchable organization, and [Adobe's Firefly walkthrough](https://www.adobe.com/learn/firefly/web/ai-generated-text-effects-with-reference-image) for explicit aspect-ratio controls. Applying these familiar patterns is a design inference; it does not import those products' full feature sets. Uploads, reference images, editing tools, and negative prompts are outside the supported contract.

The three shipped inspiration assets are built-in Imagegen artwork, labeled **AI-generated examples**. They are not user library entries or evidence of a particular GALX model's output. Exact prompts and provenance are recorded in [the private asset note](../assets/image-studio.md). Public WebP artifacts were resized, re-encoded, and stripped of metadata; do not embed provenance or operational details in public image metadata.

## Evidence and limits

The implementation owner reports 19 image/security tests, four studio contract tests, targeted ESLint, TypeScript, and the final production build passing. The final production browser run exited successfully across eight captured studio states with no Axe violations or horizontal overflow. Its interactions covered draft recovery, one asynchronous submission, pause/reload/resume, download, modal focus/Escape, favorites, search, pagination, failures, and ambiguous-submission recovery.

The independent finish reviewer returned **ship**, scoped to four initial findings: populated mobile gallery width, navigation/focus order, an expired-session sign-in link, and the pagination fixture's total count. All four were resolved; the eight captures showed no visible regression from that fix batch. This verdict is not a universal UX or server-security audit. See [the maintainer review note](../../docs/maintainers/image-studio-review.md) for commands and evidence locations.

The scoped public scan checked rendered `/images` HTML and 21 associated scripts. HTML had no selected keyword hits; one shared cookbook parameter named `openai_api_key` uses the literal `galx_live_your_gateway_key` placeholder. It is not a secret. This does not establish that the entire site is free of disclosure.

No live GALX generation, deployment, physical-device test, comprehensive assistive-technology assessment, or measured performance audit was performed. A comp, seed, and quality board were not produced for this implementation within the incumbent identity. Seven color-only, file-scoped detector exceptions in `.impeccable/config.json` preserve intentional studio indigo/navy/amber values; there are no broad ignore rules. These exceptions and this page composition are not promoted to global design rules.
