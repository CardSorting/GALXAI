# Image workspace UX investigation — September 13, 2026

<!-- docs-scope: operational-record -->

Method: two independent assessments, design by `workspace_design_assessment` and technical evidence by `workspace_technical_assessment`. The technical report was withheld until the design assessment finished. This is a private development record for `src/app/images/page.tsx`, not production acceptance. Both assessors inspected separate live guest browser tabs and the retained controlled desktop/mobile fixtures. Source changes began near the end of their reviews; baseline judgments below concern the prior built interface, not verification of the subsequent implementation.

## Findings and direction

The blank canvas, restrained GALX shell, and prominent artwork are strong foundations. The central weakness was continuity: the latest image, thumbnail grid, and detail dialog behaved as separate destinations. Comparing a batch required users to remember its contents and repeatedly open and close images. Waiting also exposed several operational choices before they were needed.

The refinement uses one browsing context across these views. It preserves the existing dark/indigo palette, typography, supported controls, public response projections, saved-library separation, and blank initial canvas. Familiarity comes from predictable selection and navigation rather than adding unsupported editing tools.

## Verified product precedents

These are primary documentation observations, retrieved September 13, 2026. Their application to GALX is design inference; no controlled usability study establishes a conversion or productivity improvement.

| Reference | Documented pattern | Applied decision |
| --- | --- | --- |
| [Apple Photos: viewing photos](https://support.apple.com/en-ie/guide/photos/pht8b9ba4aa9/mac) and [keyboard shortcuts](https://support.apple.com/en-mide/guide/photos/pht9b4411b24/mac) | Large image inspection, a thumbnail row to jump between images, arrow-key navigation, Escape to leave the view. | Image/Grid presentation, a selectable filmstrip, visible previous/next and position, arrow keys in the image stage and native lightbox, Escape with focus restoration. |
| [Midjourney: creating on web](https://docs.midjourney.com/hc/en-us/articles/33390732264589-Creating-on-Web) | A creation feed joins active generations and completed work; prompt reuse and image actions are nearby; clicking opens a larger view. Cmd/Ctrl+Enter retains prompt text. | Preserve the submitted prompt, retain earlier results while another request runs, expose reuse beside the selected image, and keep the existing keyboard generation shortcut. |
| [Adobe Firefly: generation history](https://helpx.adobe.com/au/firefly/web/access-your-files/view-generation-history.html) | Saved generations are discoverable in Files, with open, favorite, and download actions. | Keep My images and Favorites as durable-library destinations; explicitly distinguish the current session from saved results. |

Midjourney's documented live progress does not establish that GALX receives partial images or a completion percentage. GALX's waiting visual remains a labeled local animation. None of these references authorizes adding editing, uploads, folders, public sharing, or more model choices to GALX.

## Baseline design assessment

| Nielsen heuristic | Score /4 | Baseline finding |
| --- | --- | --- |
| Visibility of status | 3 | Clear state and elapsed time; too many waiting choices. |
| Match with real world | 3 | Familiar prompt, ratio and download; technical pause terminology. |
| User control and freedom | 3 | Undo, Escape, focus return, conservative recovery. |
| Consistency and standards | 3 | Coherent components; no continuous image browsing. |
| Error prevention | 3 | Submission locks and allowance warning. |
| Recognition rather than recall | 2 | Earlier results hidden behind Grid. |
| Flexibility and efficiency | 2 | Keyboard generation and reuse; repetitive comparison. |
| Minimalist design | 3 | Artwork hierarchy works; short-screen density needs adjustment. |
| Error recovery | 3 | Loaded library retained after transient failures. |
| Help and documentation | 1 | Prompt guidance exists; API docs do not teach the visual workflow. |
| **Total** | **26/40** | **Baseline, not a post-change usability score.** |

Cognitive load was moderate: the review identified three of eight checklist failures involving competing decisions, working memory, and waiting controls. Five visible ratio choices exceed the checklist's four-option threshold, but their clear visual labels do not justify burying them. Arrival is calm; waiting is the emotional low point; the generated image is the high point. The ending should support comparison and reuse without repetitive navigation.

Alex, a frequent creator, needs contiguous browsing. Jordan, a first-time user on a short laptop screen, needs to discover the rest of the settings. Sam, a keyboard user, needs visible focus, a contained dialog, and predictable return focus. These are heuristic walkthroughs rather than recruited-user tests.

## Technical audit

| Dimension | Score /4 | Evidence and limit |
| --- | --- | --- |
| Accessibility | 3 | Native controls/modal, labeled states, reduced motion, observed focus; no full screen-reader review. |
| Performance | 3 | Bounded, visibility-aware animation; thumbnails still use original artifacts. |
| Responsive design | 3 | No observed horizontal overflow; Clear had a 30×36px hit area. |
| Theming | 3 | Established dark palette and tokens; no separately supported light-theme contract. |
| Implementation integrity | 4 | Explicit display projections, safe artifact paths, honest waiting animation. |
| **Total** | **16/20** | **Baseline; good with specific gaps.** |

The configured detector returned `[]` and exit 0 for `src/components/images`. No rule findings or false positives were returned. Seven existing file-scoped color exceptions preserve intentional selected/focus/error colors. No suppressions were added. Native browser evaluation is read-only, so no live detector overlay was injected; source scanning, read-only geometry and screenshots supplied the evidence.

## Prioritized changes

| Severity | Finding and user impact | Refinement |
| --- | --- | --- |
| P1 | Comparing completed images requires repeated Grid/open/close transitions. | Large Image view with filmstrip and position; separate Latest image jump; previous/next and scoped arrow keys; selection and layout survive switching to the library. |
| P2 | New work can displace the image being inspected. | Explicitly selected images remain selected through generation/completion. View generation returns to the waiting visual; Latest image resumes following new results. The open lightbox keeps a snapshot of its browsing collection. |
| P2 | Phone users scroll through the composer repeatedly; close is below the lightbox image. | Composer folds to a prompt summary after submission with Edit prompt and Back to images; lightbox navigation and close stay in a sticky top toolbar. |
| P2 | Short desktop screens hide remaining settings with little scroll indication. | Short-screen prompt/header spacing is compressed, with a visible settings-scroll cue and the existing reachable Generate action. |
| P2 | Several waiting controls compete with image feedback. | Generation options progressively reveals pause/resume updates; copy explains that pausing does not cancel generation. Animation pause remains separate. |
| P2 | Clear is a small touch target. | Increase its hit area to at least 44×44px while retaining the quiet text-button appearance. The original measurement did not establish a WCAG AA failure. |
| P2, follow-up | Small thumbnails still fetch full image artifacts. | Retain authorization and sanitization boundaries; measure a populated mobile library before designing allowlisted thumbnail derivatives. No transfer-performance gain is claimed. |

The priority sequence corresponds to layout/adapt/harden work, followed by polish. The user already authorized improving the concept, so implementation continued without a separate preference gate. Questions skipped: implementation scope and familiar-workflow priority were supplied by the user; no blocking product ambiguity remained.

## Verification and remaining limits

Final commands, browser states, file hashes and reviewer disposition are retained in [workspace refinement evidence](../knowledge/audits/2026-09-13-image-workspace-ergonomics.json). The [studio maintainer guide](image-studio-review.md) owns current behavior; earlier canvas/composer records remain dated evidence.

The browser fixture uses local mocked generation/library responses and blocks external traffic. It tests selection continuity, view retention, modal paging and focus, mobile prompt return, pending/result transitions and prior recovery behavior. It cannot establish production image latency, real library persistence, allowance accounting or the quality of real generated images. No deployment or paid generation is part of this pass. Physical phone input, screen-reader usability, measured Core Web Vitals, large-library transfer costs and unbounded session-memory behavior remain outside the verified scope. A next usability study should measure time to compare a four-image batch, find the previous prompt, and recover from a delayed generation.
