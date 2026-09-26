---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/components/home/PublicHome.tsx","src/components/home/HomeMotion.tsx","src/components/home/use-story-entrance.ts","src/components/home/GalaxyScene.tsx","src/components/home/GalaxyFormation.tsx","src/components/home/use-galaxy-interactions.ts","src/components/home/SitesExample.tsx","src/components/home/PlanAction.tsx","src/components/home/public-home.module.css","route:/"]
---

# GALX homepage

Built visual record: [scoped homepage DESIGN.md](../../src/components/home/DESIGN.md). It records the implemented homepage extension; this brief retains its product strategy and section sequence.

## Discovery refinement — September 25, 2026

The current homepage serves visitors discovering published Star Works. This code-led refinement extends its established dark visual world; no new visual-world seed or composition was required. The user requested familiar discovery navigation in place of the “Explore & collect” $0 feature table. Public discovery is open to everyone, with no subscription needed to explore; private creation remains a separate capability with plans and usage limits.

After About and before FAQ, `#discover` pairs “Find your next favorite.” and an access explanation with three full-row destinations: Explore the work (`/explore`), Find your Stars (`/stars`), and Keep what inspires you (`/collections`). The Collections destination visibly says “Saved in this browser.” An understated creation-plan link to `/pricing` follows the list. No price figure, comparison table, or discovery tier remains in this section. The legacy `#pricing` fragment still lands here for compatibility.

Keep divider-only rows, trailing arrows, native link/list semantics, visible keyboard outlines, and introduction-first stacking at 760px and below. The chapter bar reads Releases, About, Discover, FAQ; its Discover link targets `#discover`. Preserve reduced-motion and pause behavior; the destination list arrives as one block, without per-row choreography. Typography and spacing are recorded in the scoped design guide.

Scope and evidence: this entry describes the built source, not deployment acceptance. The homepage hero, shared shell, existing Star spotlight, and other routes are outside this discovery refinement. The older Sites brief below is dated historical context, not current product guidance; [PRODUCT.md](../../PRODUCT.md) and the current source own present product behavior.

## Historical Sites homepage brief — September 13, 2026

Mode: Persuade. Primary target is `/`, not `/pricing` or the Sites editor. Extend the existing GALX dark identity and galaxy asset with a Sites-led story: first version, unlimited revisions and conversation turns under fair use, included public GALX address, one real $20/month GALX Pro pricing table, then a conceptual beta FAQ. Images remains accessible; developer access remains private and secondary.

Audience: people with a small idea, project, portfolio, or early product concept who want something they can show others without taking on development and publishing setup. Main action: Start with Sites. State the paid creation requirement near that action. Pricing continues to the existing account plan section, through sign-in when needed.

First viewport: a large, left-aligned “Your idea, ready to share” headline and action alongside labeled illustrative Sites. Three native pressed buttons select a landing page, portfolio, or event page. A visible request explains each first draft and revision; Use this idea carries an editable starting request into Sites. The preview keeps its actions in place as content changes. No generation, customer result, or live publication is implied. Retain Inter for the page and the existing Sites paper-preview serif vocabulary for the example. Follow with three distinct benefit rows, a semantic four-row plan table, six native FAQ disclosures and a final Sites action.

Entry continuity: preserve the selected idea through the canonical sign-in route; open it as an unsent draft. Existing unsent work takes precedence over a newly selected starter. Keep the original-idea route equally available. Explain the next step before any paid commitment.

No new visual world or concept-selection round: the user specified the product emphasis and section sequence for this existing homepage. No providers, model names, implementation explanation, invented free tier, production-ready app promise, custom-domain purchase claim, or service guarantee. State that this is an extremely early public beta; fair-use and availability copy describes customer expectations only.

Quality target: accessible keyboard interactions, stable example layout, 44px controls, responsive table and no overflow at 320/390/768/1440px. Changes remain local until separately deployed.

Galaxy motion refinement, September 13: strengthen the existing artwork with fine orbital geometry and gentle scroll depth. Keep the idea-to-draft example as the focal interaction: a sliding pressed-button selection and short result transitions, without auto-rotation. Native section navigation, a connected benefit track, brief introductions and FAQ feedback support reading. Preserve a readable static fallback, live device reduced-motion support, and a visible per-tab pause control. Decorative motion stops when hidden or offscreen. No product claims, new generated imagery, animation dependency, or shared-shell redesign is part of this pass.

Playful refinement, September 13: the galaxy now responds to fine mouse movement while controls stay stationary. An optional Send a star action is equally available by touch and keyboard. Continuous orbital artwork carries the reading flow into the closing invitation, and draft transitions respect selection direction. Keep synchronized pause/resume available in the sticky chapter bar and show the Sites action there on desktop. Use lightweight geometry and finite, interruptible feedback. No touch scrolling interception, auto-rotating examples, mandatory toy interaction, sound or accumulating particles.

Cinematic refinement, September 13: a single bounded star scene cycles through a three-arm spiral, six traced constellations and dispersal. Increase distant stars in the hero and reading sections; add six scroll-traced constellations to the story. Keep the text pocket calm, colors within the established palette and the illustration legible. Use fewer stars and paints on mobile, pause all work when hidden/offscreen, freeze on user pause and retain a static image/SVG fallback. Automatic meteors share the scene clock; no accumulated particle systems, new dependencies, audio or product progress claims.

Reading-flow refinement, September 13: connect the benefits, complete plan, FAQ rows and closing action with one gentle upward entrance language. Use soft deceleration, short overlapping delays and smaller mobile travel. Keep default content fully visible; skip already-visible or revisited content, and settle entire sections immediately for focus, pointer interaction and native anchors. Ease the existing constellation paths and benefit track between scroll samples without intercepting scrolling or delaying actions. Preserve all copy and public pricing.
