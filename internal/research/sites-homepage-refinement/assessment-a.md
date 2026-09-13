# Homepage refinement — Assessment A

Date: 2026-09-12. Target: `src/app/page.tsx` and `src/components/home`. Mode: Persuade. Independent design assessment; no detector output consumed. This assessment supports immediate bounded refinement, not a replacement visual world.

## Evidence and limits

Read root `PRODUCT.md`, root `DESIGN.md`, scoped `src/components/home/DESIGN.md`, the homepage surface brief, the Impeccable critique scoring/persona guidance, and the route/component/CSS source. The critique ignore file has no applicable entries. Reviewed the current homepage in fresh Chrome tab 733127300 at `http://127.0.0.1:3425/`, its DOM snapshot, and prior full-page 1440px/390px captures. Live native browser creation was unusually slow (~385 seconds); existing-tab interactions then worked promptly. To keep the pass bounded, mobile composition observations use the supplied validated capture rather than a second emulation pass.

Live checks: pressing Enter on Revision 2 changed the example title/content and exposed the button's pressed state; pressing Enter on the coding FAQ revealed its answer; the primary Start with Sites action opened the signed-out Sites workspace. The workspace offers three starter buttons, a description field, and Sign in to create. Following Sign in to create landed at `http://localhost:3425/developers`, showing a private-preview application instead of Sites authentication. No generation, signup, payment, or publication was attempted. The main agent owns the preview server; it was left running.

## Design specificity

**Product-grounded composition with room for a more specific interaction.** The retained galaxy field, restrained light action, and light Field Notes page make a coherent GALX scene. The example's public address and editable versions link the composition to Sites. It is substantially more specific than an interchangeable feature-card landing page. However, three similarly laid-out copy variants demonstrate an editorial result more strongly than the act of describing a Site and asking for a change. This is the central opportunity: teach the product's actual first action within the existing example and preserve the existing visual authority.

## Heuristic score

**23/32 applicable points (72%, Good), with a P1 entry-flow issue that must be fixed before release.** Eight applicable heuristics; 7 and 9 are n/a. A score of 4 is reserved for unusually strong fulfillment within this bounded marketing surface.

| # | Heuristic | Score | Evidence |
|---|---|---:|---|
| 1 | Visibility of system status | 3 | Selected revision has an outline, pressed state and changed content. The brief note below explains a result, but does not identify the visitor's illustrative request or the precise change. |
| 2 | Match to the real world | 4 | Ideas, first versions, revisions, publishing and a monthly plan appear in a natural order, using ordinary language. |
| 3 | User control and freedom | 3 | Homepage controls are freely reversible, but the signed-out entry path diverts to developer applications and loses Sites intent. A visitor can navigate back, but cannot complete the intended path through the displayed action. |
| 4 | Consistency and standards | 2 | Strong native controls and consistent local styling. The connected Sign in to create action instead opens developer applications, materially violating label expectations. The workspace also uses generic “eligible paid plans” language after the concrete GALX Pro offer. |
| 5 | Error prevention | 2 | The illustrative/beta labels and plan terms are strong safeguards, but the signed-out path sends a Sites visitor into the wrong application flow. The primary entry action also lacks nearby paid-plan context. |
| 6 | Recognition rather than recall | 3 | Primary actions and a single plan are visible. The example requires visitors to infer the conversational input that would produce it; a short visible illustrative request would close that gap. |
| 7 | Flexibility and efficiency | n/a | Expert accelerators, batch actions and customization are not required for this Persuade surface. |
| 8 | Aesthetic and minimalist design | 3 | Excellent restraint and hierarchy. Repeated first-version/revision/publishing promises across hero, benefits, pricing and FAQ add mobile length without equal gains in understanding. |
| 9 | Error recognition and recovery | n/a | The homepage has no failing form, async creation or error-recovery workflow. These require a separate workspace assessment. |
| 10 | Help and documentation | 3 | Native FAQs answer real purchase and beginner questions; visible feedback contact helps. Eight ungrouped choices and conceptual copy make the decisive “how do I start/what am I paying for” answers less immediate than they could be. |

## Cognitive load

**2/8 checklist failures: moderate, driven by scanning rather than operational complexity.** Single focus, grouping, visual hierarchy, one thing at a time, working memory and progressive disclosure pass. Chunking fails because the plan has five rows (two substantially overlap) and the FAQ presents eight equal questions. Minimal choices fails at the FAQ's eight visible choices. This does not imply that the primary conversion is overloaded: the hero has two actions, the example has three versions, and the main navigation has four destinations. The five footer links are a secondary retrieval list rather than a competing primary decision.

The largest avoidable effort is connecting “unlimited conversation turns” to what a visitor actually types, then reading repeated descriptions before reaching the price on a phone. Teach that connection once, visibly, and let later content answer new questions.

## Emotional journey

The headline and tangible Site create a credible initial peak: a small unfinished idea can become something shareable. The beta note lowers pressure without promising a mature product. A modest valley follows through the text-only benefit rows because the visitor learns little beyond the hero. The single $20 plan restores decisiveness, and cancellation/paid-period wording is useful reassurance at the commitment point. The FAQ's long equal-weight list can slow momentum; the closing invitation is warm and appropriately modest. Keep the initial artifact and the honest ending; improve the middle by demonstrating a request and shortening repetition.

## Strengths to preserve

1. One primary product, one primary action and one real plan create a clear commercial story. Pricing before FAQ is effective and should remain.
2. The light illustrative page stands apart from the dark GALX canvas, giving the abstract promise a concrete object without fabricating a customer result.
3. Native revision buttons and disclosures, readable spacing, and explicit fair-use/beta/cancellation copy form a credible accessible foundation.

## Priority material refinements

The first is a verified P1 in the connected entry flow; the remaining four are bounded P2 homepage refinements.

1. **P1 — Repair the signed-out Sites handoff.** `SitesWorkspace.tsx` links Sign in to create to `/auth/login?redirect=%2Fsites`; no matching route/redirect exists. The preview policy does not allow this path, and its middleware sends the visitor to `/developers` with the query removed. This was verified live. Use the existing `/auth/signin?next=%2Fsites` contract and retain the user's selected starter/prompt through authentication. The correct repair is at the entry link, not broadening the private-route boundary.
2. **P2 — Make the example teach the input→revision relationship.** `SitesExample.tsx` shows three outputs with labels “First draft,” “Revision 2,” and “Revision 3,” but no request. Pair each version with a concise, clearly illustrative request or change summary, and make the prompt → preview connection visually evident. Keep the illustrative label, real pressed buttons, stable dimensions, and existing Field Notes identity. Do not invent live generation or a customer provenance claim.
3. **P2 — Establish the paid start before the first workspace handoff.** The hero only says “Start with Sites” and early beta; the price is much farther down a phone page. Add concise GALX Pro/$20-month context near the action or give the adjacent pricing link more explicit cost information. Preserve the existing billing destination and do not imply a free trial. Align the workspace's generic “eligible paid plans” statement with the real offer if that route is in scope.
4. **P2 — Make the benefits teach a short sequence, and remove duplicated promises.** The three rows repeat the hero's outcomes; the five-row plan repeats revisions in both “Refine” and “Keep going.” Keep the native semantic pricing table, but consolidate the overlap and use the benefits to clarify describe → refine → publish, including the already-supported choice of when an update becomes public. This reduces mobile distance to pricing without reducing the offer. Consolidating/grouping eight equal FAQ questions is a secondary opportunity within the same scanning issue.
5. **P2 — Improve entry continuity with familiar starter choices.** The destination already shows Product launch, Portfolio and Event page starters, while the homepage demonstrates only Field Notes. A restrained set of up to three supported starter choices can help the visitor recognize their own idea. Only add a homepage starter action if its chosen intent survives the route/sign-in handoff; a decorative choice that resets on navigation creates more confusion than it solves.

## Persona observations

### Jordan — first-time visitor

The primary action is obvious within five seconds and icons accompany words. Jordan can infer the output is a website, but the example does not show what to type. The live handoff first lands on a useful empty workspace with three starters; its Sign in to create action then opens a developer private-preview application. Jordan can reasonably conclude that Sites requires a waitlist despite the public-product promise. This is the first fix. Paid eligibility wording is also generic in the workspace, and the homepage does not set that expectation near its entry action. Follow the routing repair with explicit input scaffolding and consistent paid-plan context, not an additional onboarding flow.

### Casey — distracted mobile visitor

The supplied 390px capture is readable, linear, and has usable primary/example controls. The full example plus repeated benefit prose creates a long run before the $20 amount. Casey can jump with See pricing, but a price cue near the hero lowers the need to hunt. The narrow plan labels wrap acceptably; “Keep going” uses a separate row for a point already communicated by unlimited revisions. Consolidating that row is a practical density improvement.

### Sam — keyboard-dependent visitor

Enter activates the version buttons and native FAQ disclosures successfully. DOM output confirms pressed-state semantics, a named figure, section headings, a captioned/scoped price table and a skip link. CSS provides visible amber focus outlines in the homepage. No keyboard blocker was observed. Full screen-reader speech, contrast measurement and 200% zoom were not run in Assessment A; these are technical evidence responsibilities, not grounds for claiming perfect accessibility.

## Minor observations and design questions

- “Revision 2/3” is understandable but less informative than a concise description of the requested change.
- The light preview's large reserved text areas create stability, but leave visible empty space on desktop. Retain stability while making the surrounding request/change annotation do useful work.
- The galaxy backdrop remains recognizably GALX; replacing it or importing a competitor's visual world would miss the task.
- Which single example request would make a novice think “I know what to type next”?
- Can every section below the hero answer a question the hero has not already answered?
- Can the visitor learn the exact paid commitment before leaving the homepage without being forced to read the whole page?

Questions skipped: implementation is already authorized this turn; these questions are design checks for the executing agent, not a request to pause for user input.
