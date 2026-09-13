# Homepage refinement verification

Local verification completed September 12, 2026 (America/Denver). The final browser run completed at 2026-09-13 01:59 UTC. These results describe the working tree and local production build, not the deployed site.

## Build and regression checks

| Check | Result |
| --- | --- |
| `npm run build` | Passed, including TypeScript validation. |
| Sites starter, workspace and conversation suites | 25 passed, 0 failed. |
| `npm run test:developer-preview` | 14 passed, 0 failed. |
| `npm run test:image:security` | 19 passed, 0 failed. |
| Targeted ESLint | 0 errors. One existing effect-dependency warning in `SitesWorkspace.tsx`, in the unchanged reset-on-Site-id effect. |
| `git diff --check` | Passed. |

The regression suites cover known and hostile starter parameters, message bounds, public Sites contracts, image response/artifact sanitization, and private developer access. No database, permission policy, purchase handler, or publishing behavior was changed by this refinement.

## Browser checks

[`scripts/verify-homepage-ui.mjs`](../../../scripts/verify-homepage-ui.mjs) starts an isolated local production server with a minimal environment. Browser requests to external origins are blocked. It does not sign into a real account, generate content, buy a plan or publish a Site.

| Width | Horizontal overflow | Axe violations | Page errors | Height difference across six example states |
| --- | --- | --- | --- | --- |
| 1440px | None | 0 | 0 | 0px |
| 768px | None | 0 | 0 | 0px |
| 390px | None | 0 | 0 | 0px |
| 320px | None | 0 | 0 | 0px |

All three example choices and both draft states are exercised at each width. Keyboard activation selects one pressed button, revision changes the visible heading, and the entry link reflects the selected idea. The homepage skip link moves focus past navigation. Native FAQ disclosures open with the keyboard. The plan table precedes the six-question FAQ.

The connected entry checks verify:

- A revised portfolio idea arrives as an editable, unsent request in Sites.
- The guest creation action opens the existing sign-in route with the Sites starter return path intact.
- Returning from sign-in preserves the draft.
- Existing custom unsent text survives a different starter URL and a starting-point button click.
- Clearing the draft allows another starting point; reloading retains it.
- Unknown starter parameters leave an empty composer rather than injecting arbitrary content.
- The plan action opens sign-in with `/billing#plan` retained.
- Shared footer behavior on other routes remains intact.

Rendered homepage copy and metadata were checked for the restricted public vocabulary. Eight homepage browser scripts were scanned for the specified internal identifiers in the verification script; none matched. Both social preview routes returned valid 1200×630 PNG images and were visually inspected. This is a bounded scan, not a claim that all deployed assets or all possible internal strings were exhaustively examined.

The final captures and machine-readable browser receipt are under `.impeccable/review/sites-home-refinement/`. Screenshots cover the full page at all four widths, desktop/mobile hero, revised example, pricing and expanded FAQ, plus the starter workspace and social previews.

## Review decisions and limits

The independent baseline assessments identified the broken Sites sign-in route, an unclear anonymous plan handoff, a skip link that returned focus to navigation, repeated marketing copy, and a demonstration without an explicit request/change relationship. These findings informed the implementation; the original 23/32 heuristic score is not presented as a score for the revised page.

The first responsive inspection found example-height changes of up to 59px. Intrinsic sizing now keeps the example controls stationary. At 320px the address header also reserves space for two lines. Hidden sizing panels are excluded from the accessibility tree; only the selected example is announced.

The existing Georgia heading style remains confined to the illustrative Site. It is documented in the scoped homepage `DESIGN.md`. A `design-system-font=georgia` exception is persisted for `src/components/home/public-home.module.css` only; the hook otherwise remains active. The last stylesheet edit reported no deterministic design-quality issues. The detector was not rerun after the independent baseline collection.

Automated accessibility results and expert review do not replace real-user sessions or establish conversion improvement. Real account creation, payment, generation and publication were outside the verification scope. No commit, push or deployment was performed in this refinement.

The independent finish review returned **ship**, with no material fixes, after reviewing all 15 captures and the bounded implementation evidence. It confirmed the Sites-first story, starter and pricing handoffs, responsive adaptation, public copy boundaries and craft requirements. The report is recorded at `.impeccable/review/sites-home-refinement/finish-review.md`. This disposition applies to the reviewed local extension, not an independently completed real-account purchase or publishing journey.
