# Sites homepage: familiar patterns and a trustworthy first visit

The most useful next step for GALX is to connect the promise on the homepage to a recognizable first action inside Sites. The homepage should help someone identify a small project, understand the paid commitment, and carry an editable starting idea into the workspace. It should establish the value of revising and publishing without promising a mature application platform.

This direction retains the current GALX identity and the Sites-first positioning. It uses established interaction conventions while keeping the commercial claims specific to GALX: $20 USD per month for GALX Pro, unlimited revisions and conversation turns under fair use, saved versions, and an included public GALX address. The product remains an extremely early public beta.

## Comparable patterns

| Reference | Observed pattern | Appropriate application to GALX | Boundary |
| --- | --- | --- | --- |
| Carrd | A concrete one-page-site proposition and a prominent starting-point action, with templates or a blank page as entry choices. | Present a small set of recognizable project types with a direct route into creating. | Carrd's free offer and broader feature set do not establish GALX's pricing or capabilities. |
| Lovable | Its quick start explicitly preserves a homepage idea through signup, then describes an iterative creation and publication journey. | Preserve the visitor's selected idea and the Sites return destination across the account boundary. | Do not borrow its production-readiness claims, scale claims, or free allowance. |
| Bolt | The homepage puts a building request and project-type choices close to its main proposition. | Reduce blank-page effort by showing the kind of request someone could make. | Avoid a decorative prompt box that cannot actually hand off its contents. |
| Framer | Its public material shows editable work, visible previews, publication, and an automatically supplied public address. | Make the relationship between an idea, a revision, and a shareable result tangible. | A preview and a published version must remain distinct; do not imply automatic publication. |

These are observations of public product surfaces, not evidence that any particular layout caused those products' commercial success. The transfer to GALX is a design judgment, constrained by the capabilities already present in the product. [Carrd homepage](https://carrd.com/), [Lovable quick start](https://docs.lovable.dev/introduction/getting-started), [Bolt homepage](https://bolt.new/), [Framer publishing guide](https://www.framer.com/help/articles/publishing-your-framer-website/).

Carrd's clearest lesson is specificity: visitors can recognize a compact class of output and choose a starting point. GALX benefits from the same clarity because landing pages, portfolios, and event pages are within the current product's intended scope. Three examples are enough to establish range without implying a large template marketplace. The examples are authored illustrations and must remain labeled that way. [Carrd homepage](https://carrd.com/).

Lovable's most relevant documented convention is continuity: an initial idea survives signup. GALX already has a workspace and unsent-draft persistence, so the homepage should connect to those capabilities. The selected starting idea should arrive as editable text, and an existing unsent draft should take precedence over a new suggestion. This applies the continuity principle without introducing a second creation interface. [Lovable quick start](https://docs.lovable.dev/introduction/getting-started).

Bolt's prominent project categories support an analogous recognition-first entry. For GALX, a user can choose a landing page, portfolio, or event, see a plausible example and a specific revision request, and continue with that idea. This is preferable to asking the visitor to infer what a generic “Revision 2” control means. The proposed reduction in effort is a hypothesis to validate with users, not a measured conversion claim. [Bolt homepage](https://bolt.new/).

Framer's publication guidance makes a supplied web address and review before publication explicit. GALX should likewise explain customer control: a draft is private until publication; later work becomes public when the owner publishes again. The homepage can state this expectation without describing the delivery system. [Framer publishing guide](https://www.framer.com/help/articles/publishing-your-framer-website/).

## Usability principles

Recognition is easier than recalling an appropriate action from scratch. Visible starter categories and example requests provide context for people who understand their goal but do not know how to phrase it. A small choice set also keeps the first action concrete. It does not justify hiding the option to start with an original idea; the main Sites action remains available. [Nielsen Norman Group, Memory Recognition and Recall in User Interfaces](https://www.nngroup.com/articles/recognition-and-recall/).

Progressive disclosure separates the few decisions needed now from questions that can wait. On this homepage, product fit and price should be visible early. Details about fair use, publication and the beta belong in a concise pricing section and native FAQ disclosures. A long sequence of repeated promises does not provide useful disclosure; it makes the same decision take more scrolling. [Nielsen Norman Group, Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/).

The baseline review used Nielsen's heuristics to distinguish problems in status, consistency, recognition, error prevention and help. The scoring is an expert-review aid rather than a certification or a market-success measure. A landing page's applicable denominator also differs from a complex operating interface, so scores should not be compared without their scope. [Nielsen Norman Group, 10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/).

The example selector uses ordinary labeled buttons with a pressed state. It is not presented as an ARIA tab widget; it therefore does not imply the roving focus and arrow-key behavior specified for tabs. Keyboard activation, visible focus, and state announcements remain required. If this component becomes a tabbed interface later, it should adopt the complete pattern rather than adding roles alone. [W3C WAI-ARIA Authoring Practices, Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/).

## Findings in the original entry flow

Two independent assessments examined the same local production build. Assessment A evaluated design and first-use behavior without detector output. Assessment B separately collected deterministic and browser evidence. Assessment A scored the applicable heuristics at 23/32 and verified a material entry-flow defect; this score describes the baseline, not the revised implementation.

The most consequential finding was a broken connection between the public product and sign-in. The workspace's “Sign in to create” action used a route that sent a signed-out visitor into the private developer application flow. The homepage's promise of public Sites access therefore led into the wrong product journey. Correcting the return destination is more important than a decorative homepage change. The local browser confirmed the failure before the link was changed. [Assessment A](assessment-a.md).

The pricing action had a related mismatch. It led an anonymous visitor to a billing-management screen with a generic sign-in request, rather than directly preserving the plan-review destination. The revised homepage sends that visitor to sign-in with the plan section retained; an authenticated visitor goes to the plan section directly. The action is labeled as continuing, not as an immediate purchase. [Assessment B](assessment-b.md).

The skip link targeted a wrapper that also contained navigation. Activating it therefore failed to bypass navigation in the subsequent keyboard sequence. The homepage now provides a focusable main-content target, and its skip link points to that target. Other routes' layout ownership is outside this local change. [Assessment B](assessment-b.md).

The visual review found a coherent GALX identity, clear hierarchy, useful native controls and honest beta language. It also found repeated claims across the hero, benefits, pricing and FAQ. The example showed outputs but not the request that explained a revision. These findings justify a focused interaction and content refinement instead of a new visual identity. [Assessment A](assessment-a.md).

## Implemented decisions

The hero retains “Your idea, ready to share” and the familiar dark GALX/galaxy treatment. A concise price cue near the first action distinguishes exploring the workspace from paid creation. This helps the visitor make an informed first click without forcing them to read the full pricing table.

The illustrative example now offers three recognizable project types: landing page, portfolio and event page. Each has an authored starting idea, an example result, and a specific revision request. A visitor can inspect a revised version, return to the first draft, or carry the idea into Sites. The interaction is explicitly illustrative; it does not simulate a background generation task or claim to be an existing customer Site.

The first responsive inspection found that longer example copy moved the actions vertically by as much as 59 pixels. The preview now sizes itself to its available examples at the current width, keeping its controls stationary while allowing text to wrap. Inactive sizing content is hidden from view and assistive technology; the selected result remains the only announced example.

The entry link carries only a known starter identifier and an optional known revision selection. The workspace opens the corresponding authored text as an unsent, editable request. It does not create a Site, charge an account, publish a page or bypass paid access. The visitor retains the actual decision to send the request after signing in and obtaining an eligible plan.

Existing unsent work remains protected. When a different starter is opened while a draft exists, the draft stays in place and the interface explains how to proceed. The starting-point buttons inside Sites also refuse to silently replace an unsent message. This deliberately favors preserving user effort over a seemingly faster but destructive one-click replacement.

The three benefit rows now answer different questions: getting a first version, refining it, and deciding when to share it. The price table consolidates the overlapping revision rows. The FAQ prioritizes exploration, current product scope, unlimited-use expectations, the included address, publication control and the purpose of the beta. Cancellation and paid-period access remain explicit beside pricing.

The sign-in route used from Sites is corrected to the canonical sign-in page, with the selected idea's return destination retained. The pricing action preserves the account's plan section. These changes complete the homepage handoff without adding a checkout implementation or changing authorization rules.

## Product and trust boundaries

The public pitch must describe what someone can make and what they can expect. It must not use provider names, underlying model claims, technical architecture, delivery mechanics, credential information or private operational explanations as marketing content. Competitor names and this research remain in the private repository material rather than the public homepage.

No testimonials, customer logos, conversion statistics, revenue claims, time-to-launch guarantees or numerical reliability claims are added. Demonstrations are not customer evidence. The current task did not provide an independently measured outcome that could support those claims.

“Unlimited” stays attached to fair use and the current plan. The included address is a public GALX address, not a purchased custom domain. The current output is a small website or early product page; the homepage does not promise a complete production application, payment system or arbitrary application logic.

The early-beta explanation should invite small experiments and feedback. It should neither make the product sound finished nor bury the user in internal caveats. The meaningful expectation is that people can try a first version, learn from it, and help shape what is worth building next.

## Verification and limits

Validation covers the production build; public-response and authorization regression tests; known and hostile starter parameters; and the local browser journey from homepage to Sites and sign-in. The browser matrix includes desktop, tablet and narrow mobile widths, keyboard activation, the skip link, FAQ disclosures, starter/revision states, and unsent-draft preservation across reload and navigation.

The final local production build and 58 regression tests passed. Browser checks at 320, 390, 768 and 1440 pixels found no horizontal overflow or automated accessibility violations. The independent finish review returned **ship**, with no material fixes for this scoped extension. [Verification record](verification.md).

Browser captures and automated accessibility checks can reveal layout and interaction defects, but they are not a substitute for observing real beginners. No conversion lift, retention improvement or first-Site completion gain is claimed. Authentication and purchase are not completed against real accounts during this review.

The highest-value next validation is a short task with first-time participants: choose a small project, explain what Sites will cost, bring an idea into the workspace, make a first version and identify what publishing will expose. Observe hesitation, repeated reading and lost context. Count completed tasks and errors before asking for aesthetic preference.

After explicit authorization to add measurement, a compact funnel could distinguish homepage visit, starter choice, workspace arrival, sign-in completion, first successful version and first publication. Compare people who choose a starter with those who start independently, while accounting for acquisition source and prior account status. Collect event names and aggregate outcomes rather than the contents of people's ideas. This is a proposed evaluation plan; no analytics instrumentation is introduced in this change.

## Sources

1. Carrd. [Homepage](https://carrd.com/). Undated; accessed September 12, 2026. Starting-point selection, example sites and product scope.
2. Lovable. [Quick start](https://docs.lovable.dev/introduction/getting-started). Undated; accessed September 12, 2026. Idea continuity through signup, iteration and explicit publication.
3. Bolt. [Homepage](https://bolt.new/). Undated; accessed September 12, 2026. Prominent request entry and project categories.
4. Framer. [Publishing your Framer website](https://www.framer.com/help/articles/publishing-your-framer-website/). Updated August 7, 2026; accessed September 12, 2026. Supplied address and review/publication expectations.
5. Raluca Budiu, Nielsen Norman Group. [Memory Recognition and Recall in User Interfaces](https://www.nngroup.com/articles/recognition-and-recall/). January 15, 2024. Recognition and contextual choices.
6. Jakob Nielsen, Nielsen Norman Group. [Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/). December 3, 2006. Sequencing important and secondary information.
7. Jakob Nielsen, Nielsen Norman Group. [10 Usability Heuristics for User Interface Design](https://www.nngroup.com/articles/ten-usability-heuristics/). Current article accessed September 12, 2026. Review framework.
8. W3C WAI. [Tabs Pattern, ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/). Current reference accessed September 12, 2026. Distinction between ordinary buttons and a complete tab pattern.
9. [Independent Assessment A](assessment-a.md) and [Assessment B](assessment-b.md). September 12, 2026. Local production-build review; no live production claim.
