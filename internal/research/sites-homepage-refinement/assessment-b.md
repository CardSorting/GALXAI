# Homepage refinement — Assessment B

Internal evidence record. Target: `src/app/page.tsx`, including its active `PublicHome` / `SitesExample` components. Reviewed the parent-owned production preview at `http://127.0.0.1:3425/` on 2026-09-12 local time (2026-09-13 UTC).

## Independence and method

Assessment B was performed without receiving Assessment A’s findings. This record is withheld from parent synthesis until the parent explicitly confirms “Assessment A complete.” The CLI detector ran once against `src/components/home`; the complete JSON is retained in [assessment-b-detector.json](assessment-b-detector.json). No ignore file exists at `.impeccable/critique/ignore.md`.

A fresh Chrome tab (733127303) was created for B. Native CUA screenshot, AX tree, keyboard interactions, read-only DOM evaluation, and route navigation supplied direct browser evidence. Desktop viewport was 1311 × 644; document scroll width was 1305, with no horizontal overflow. Existing screenshots and `checks.json` supplied supplementary mobile evidence; a new mobile viewport override was deliberately not applied because viewport control is browser scoped and another independent assessment was using that shared browser.

The browser API explicitly documents `playwright.evaluate` as read-only. No mutable injection API was available. Consequently, no detector overlay was injected, no user-visible overlay is claimed, and no overlay live server was started. The fallback is CLI findings plus native screenshot / AX / DOM inspection.

## Objective findings

### P1 — The plan action drops anonymous visitors into account-management copy

**Observed:** Activating “Choose GALX Pro” on the homepage navigated to `/billing#plan`. The anonymous destination showed “Billing,” “Manage your plan, check your balance, and review payments,” navigation for balance/transactions/invoices, and “Sign in to view your balance, transactions, and invoices.” It did not display the selected GALX Pro plan or a subscription selection affordance.

**Impact:** A first-time visitor who has just chosen the advertised plan encounters a page written for an existing customer and must infer that sign-in is the next step toward purchase. This interrupts the conversion the homepage explicitly invites.

**Fix direction:** Preserve the chosen-plan intent through a purposeful sign-in / plan-selection route, or provide an anonymous billing state that repeats GALX Pro, its price, and the reason sign-in is required. If this pass is constrained to homepage copy, make the immediate sign-in step explicit without inventing a new purchase contract. Do not route directly into a financial transaction without the normal user action.

**Locations:** `src/components/home/PublicHome.tsx` plan action; destination `/billing#plan` is the cross-route evidence. The latter’s implementation is outside this assessment’s editing scope.

### P2 — “Skip to main content” does not skip the header navigation

**Observed:** The skip link targets `#main-content`, which is a focusable `DIV` containing `HEADER`, `MAIN`, and `FOOTER`. Keyboard activation followed by one Tab focused the “GALX home” logo link in the header. The user still traverses the header links before reaching the hero’s action.

**Impact:** The advertised keyboard shortcut does not bypass repeated navigation. A keyboard or screen-reader user must traverse the header on each route visit.

**Fix direction:** Point the skip target at the actual route main or place the homepage header before the target’s focus boundary. Preserve exactly one main landmark and avoid duplicate IDs. Because the wrapper is shared, choose a scoped approach or verify other routes if changing the shell.

**Locations:** `src/app/layout.tsx:167`, `src/components/common/SkipToContent.tsx:11`, and `PublicHome` placing `Navigation` before its inner main.

## Direct browser checks that passed

- **Primary action:** “Start with Sites” navigated successfully to `/sites`. Anonymous visitors can inspect the workspace, idea presets, prompt field, and illustrative preview. “Sign in to create” is visible beside the composer. No creation request or account mutation was submitted.
- **Keyboard order:** The skip link, logo, Sites, Pricing, FAQ, Images, Sign in, primary hero action, pricing anchor, and example controls were reachable in a coherent sequence.
- **Visible focus:** Hero actions and example buttons had a 3px amber outline with 5px offset. Navigation links retained a visible browser focus outline.
- **Version feedback:** Keyboard Enter on “Revision 2” changed the visible title/body/note and changed its `aria-pressed` value to true, clearing First draft’s pressed state. The content has `aria-live="polite"` and `aria-atomic="true"`. No actual screen-reader audio test was performed.
- **FAQ:** Keyboard Enter on “Do I need to buy a domain?” opened a native disclosure and made its full answer visible. The AX state changed from collapsed to expanded.
- **Semantics:** One h1 and one main landmark were present. The illustrative figure is labeled; the revision controls have a labeled group; the pricing table has a meaningful caption and source-defined column/row scopes. Decorative imagery and icons are appropriately hidden/empty-alt in source.
- **Touch sizing from source:** Main actions are at least 48px tall, revision controls at least 44px, FAQ summaries at least 66px, and navigation items at least 44px.
- **Motion:** The homepage CSS includes a reduced-motion rule suppressing transitions and smooth scrolling.

## Responsive evidence and limits

I inspected the existing `.impeccable/review/sites-home/hero-390.png` and `full-320.png` directly. They show a coherent single-column stack, wrapping hero text/actions, a readable pricing table, and FAQ disclosures within the narrow width. At 320px the secondary pricing action wraps to its own row; it remains visible and usable. The 390px example uses a two-column internal text section with narrow prose columns; this is a density observation, not a demonstrated overflow defect.

The prior `checks.json` is timestamped `2026-09-13T01:25:18.782Z` and records checks at 1440, 768, 390, and 320px: no document overflow, zero axe violations, zero page errors, and passing version/keyboard/copy/pricing checks. These are supplementary prior results, not a fresh axe or mobile execution by B. The current B desktop check independently corroborated control behavior and lack of horizontal overflow.

## CLI detector

Command: `node .agents/skills/impeccable/scripts/detect.mjs --json src/components/home`

Exit code: **2** (findings). **117 total findings: 115 advisories and 2 warnings**:

| Rule | Count |
|---|---:|
| `design-system-font-size` | 112 |
| `design-system-color` | 2 |
| `design-system-radius` | 1 |
| `design-system-font` | 2 |

| File | Count | Scope relevance |
|---|---:|---|
| `ArtisanalSignalSection.tsx` | 43 | Not mounted by current homepage |
| `GalxScenicHero.tsx` | 28 | Not mounted by current homepage |
| `HomeClient.tsx` | 20 | Not mounted by current homepage |
| `public-home.module.css` | 26 | Active homepage styling |

The 91 advisories in the three legacy components are not current rendered-homepage defects. The route imports `PublicHome`, which imports `SitesExample`; it does not mount those older components.

Active CSS findings:

- **Font size (21):** lines 20, 30, 34, 37, 40, 45, 47, 50, 62, 63, 65, 66, 67, 69, 76, 79, 94, 95, 103, 109, 122.
- **Color (2):** line 12, indigo text selection `#6366f1`; line 36, the example’s black translucent shadow.
- **Radius (1):** line 36, the example’s 12px outer radius.
- **Font (2):** lines 41 and 44, Georgia inside the illustrative Site.

### False positives and advisory interpretation

These are deterministic DESIGN.md machine-record mismatches, not proof of poor visual design. The nearby `src/components/home/DESIGN.md` explicitly explains Georgia’s preview-only role, the hero’s fluid display sizes, the preview’s 12px corner radius, shadow, inherited indigo selection treatment, and smaller supporting labels in prose. Its frontmatter records only a narrower recurring type/shape palette, so several intentional, documented exceptions are still flagged. Do not mechanically remove the preview’s serif identity or flatten typography to clear the detector.

Some support sizes, mobile exceptions, and the 24px plan / 48px price hierarchy remain incompletely represented in the machine record. Treat that as documentation drift to reconcile only within an authorized documentation task, not a reason to alter working visual roles. The active advisories should be reviewed alongside the rendered evidence rather than counted as 26 user-facing defects.

All precise file paths, line locations, descriptions, and snippets — including legacy-file locations — are preserved in the JSON artifact.

## Browser diagnostics

One captured error appeared after visiting `/sites`: Next’s prefetch of `/auth/login?redirect=%2Fsites` failed to fetch the RSC payload and fell back to normal browser navigation. This was a cross-route prefetch diagnostic, not a demonstrated broken homepage action. The login destination itself was not submitted or exercised, and B does not infer an authentication defect from this log alone. Keep this diagnostic internal.

## Cleanup and handoff

- No app code was edited.
- No overlay server or other local server was started by B; the parent’s preview remains running.
- No browser viewport override was applied; no reset is needed.
- The B research tab was closed after inspection.
- The report and detector JSON are intended internal artifacts, not temporary files.
- No temp body file was created.
- No detector rerun is necessary; reuse the complete saved JSON.
- Implementation and final synthesis belong to the parent. This assessment is not a report-only stop for the user’s broader refinement task.
