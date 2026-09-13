---
name: GALX public homepage
description: A scoped editorial extension of the established dark GALX world.
colors:
  home-bg: "#07080d"
  home-fg: "#f3f4f6"
  home-muted: "#9ca3af"
  home-line: "rgba(255, 255, 255, 0.15)"
  home-accent: "#fbbf24"
  supporting-text: "#d4d4d8"
  inset-surface: "#14192d"
typography:
  preview-heading:
    fontFamily: "Georgia, serif"
    fontSize: "36px"
    fontWeight: 400
    lineHeight: 1.06
    letterSpacing: "-.03em"
  headline:
    fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "36px"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-.03em"
  title:
    fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "-.02em"
  body:
    fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.75
  action:
    fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 600
rounded:
  starter-control: "6px"
  action: "8px"
spacing:
  compact: "12px"
  small: "16px"
  medium: "20px"
  gutter: "24px"
  large: "32px"
  section: "88px"
components:
  button-primary:
    backgroundColor: "{colors.home-fg}"
    textColor: "{colors.home-bg}"
    typography: "{typography.action}"
    rounded: "{rounded.action}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.supporting-text}"
  button-secondary:
    textColor: "{colors.home-fg}"
    typography: "{typography.action}"
    padding: "12px 0"
  starter-control:
    textColor: "{colors.supporting-text}"
    rounded: "{rounded.starter-control}"
    padding: "8px 6px"
  starter-control-selected:
    backgroundColor: "{colors.inset-surface}"
    textColor: "{colors.home-fg}"
---

# Design System: GALX public homepage

## Overview

**Creative North Star: "The established GALX dark world"**

This is a scoped extension of the [GALX design system](../../../DESIGN.md), grounded in [PublicHome.tsx](PublicHome.tsx), [SitesExample.tsx](SitesExample.tsx), [PlanAction.tsx](PlanAction.tsx), and [public-home.module.css](public-home.module.css). It applies to this component family on `/`. Shared navigation, other routes, and the operator interface retain their existing design authority. The [homepage surface brief](../../../.impeccable/surfaces/src-app-page-tsx.md) owns the audience, offer, section sequence, and conversion strategy.

The homepage retains the dark GALX field, galaxy artwork, and Inter voice. Generous editorial spacing, light actions, and divided content sections give this public surface a calmer density. A light illustrative Site is a distinct content object within that world, with the serif headings already used by the [Sites preview](../../lib/sites/site-preview.ts).

**Key Characteristics:**

- An established dark canvas with retained galaxy artwork.
- Inter page typography with serif headings confined to the illustrative Site.
- Light primary actions and restrained amber interaction details.
- Divided sections, native controls, and responsive stacking.

The [finish review](../../../.impeccable/review/sites-home-refinement/finish-review.md) records the reviewed built state and its desktop, tablet, and mobile evidence. This extension retains the existing galaxy asset; it introduces no new visual world or generated shipping image.

## Colors

The palette extends the incumbent cool near-black and light-neutral family; amber is a small interaction and annotation accent.

### Primary

- **Light action** (`home-fg` on `home-bg`): primary actions invert the page's foreground and background, with `supporting-text` supplying the hover fill.
- **Amber detail** (`home-accent`): keyboard outlines, inclusion checks, the beta marker, and disclosure hover. It is not the page's primary action fill.

### Neutral

- **Dark field** (`home-bg`): the continuous page ground and text on light surfaces.
- **Light foreground** (`home-fg`): primary text, selected-control borders, actions, and the illustrative page canvas.
- **Supporting and muted text** (`supporting-text`, `home-muted`): introductory copy and small labels use the lighter tone; section descriptions and supporting terms use the muted tone.
- **Dividers** (`home-line`): section, row, table, and disclosure separation.
- **Inset surface** (`inset-surface`): the example address bar and starter-control states; also secondary ink inside the light example.

**The Restrained Accent Rule.** Preserve a light primary action and reserve amber for the small interaction and annotation roles built on this homepage.

Text selection retains the established indigo treatment from the shared palette. The galaxy image supplies its own color; it is not a source of new UI color tokens.

## Typography

**Display and Body Font:** Inter, inherited from the shared application font stack.
**Illustrative Preview Headings:** Georgia, serif, inherited from the existing Sites page-preview vocabulary.

The page combines a large, closely tracked display with medium-weight section headings and comfortable body leading. The frontmatter records recurring section, title, body, and action roles. The hero is a local display treatment: weight 600, line height 1.04, tracking −.04em, and a desktop size of `clamp(3rem, 5vw, 3.75rem)`. Its size becomes 60px at the 1000px breakpoint, `clamp(48px, 8vw, 60px)` at 760px, and 48px at 380px.

Section headings use the headline role; the closing heading uses a slightly looser line height (1.2). Benefit titles use the title role. The hero introduction uses 20px text, reducing to 18px at 1000px. Body copy remains 16px, with the FAQ using line height 1.8. Supporting labels range from 12px to 14px; table values are 14px. Price figures use tabular numerals.

**The Preview Voice Rule.** Georgia belongs only to the illustrative Site's two heading levels. Keep the GALX hero, navigation, section headings, body, and controls in Inter.

The example's main heading is regular-weight Georgia at 36px with line height 1.06; its section heading is 20px with line height 1.2. These describe content inside the example, not new GALX display roles.

## Layout

Major sections share a centered maximum width (1280px) and side gutters (24px). The hero pairs text and example in columns (`1.05fr 1fr`) with a 64px gap and 80px vertical padding. Divided sections pair an introduction with content (`.85fr 1.15fr`), a 100px gap, and the recurring section padding. Benefit rows use a 30px gap and matching padding across their divider. Descriptive lines have measured widths, including 35ch section introductions and 60ch benefit text.

At 1000px, horizontal gaps tighten. At 760px, the hero and divided sections become a single column, section padding becomes 52px, and the closing action stacks beneath its text. The illustrative Site is bounded to 560px when stacked. At 380px, page gutters reduce to 20px and the example's internal content columns become one. Actions wrap while retaining their reading order.

The example canvas shares one intrinsic grid area across all six authored results, so its tallest content at the current width determines the available height. Sizing copies stay `aria-hidden` and `visibility: hidden`; only the active result is visible and announced. Preserve this sizing when editing examples so the revision and entry actions remain stationary. At 380px and below, the address bar reserves a minimum height of 60px for a two-line address; the draft label does not shrink.

The pricing table stays a semantic two-column table at narrow widths. Its first header cell retains a right gutter (20px); body labels have a right gutter of 20px, reducing to 16px at 760px. Wrapped labels must remain visibly separate from their values. Text can wrap within paragraphs and cells, and grid children can shrink without forcing document overflow.

**The Divided Sections Rule.** Use spacing and rules to separate this homepage's content; reserve the enclosed light sheet for the illustrative Site.

## Elevation & Depth

Most content rests directly on the dark page. Thin dividers and tonal differences provide separation. The retained galaxy artwork is confined to the hero background at opacity 0.42 (0.32 on mobile), with a static edge mask and dark scrim protecting text contrast. Fine elliptical orbits, an amber orbital highlight, sparse stars and two short constellation segments extend the galaxy theme. The geometry uses the existing foreground and accent families. All artwork remains decorative, with an empty alternative text, an aria-hidden wrapper and no input interception. Scroll translates the background by at most 72px and scales it by at most 6%. Fine mouse movement adds up to 12px horizontal and 8px vertical depth, with counter-motion in the orbital layer; text and controls remain stationary. Touch input never drives parallax. Orbital rotation takes 80 seconds and small star drift takes 14 seconds in each direction; both stop offscreen, when hidden, with reduced motion, or when paused. SVG rotation uses a group with a fill-box transform origin.

The later reading sections share a quiet star map, two faint orbital paths and dark tonal fields from the existing inset palette. One amber path draws with reading progress. It connects the story visually and never represents a real generation or publication. The closing invitation contains three concentric rings that settle with scroll, clipped behind the content. These layers require no additional bitmap or canvas.

The illustrative Site is the local raised object, with a soft shadow (`0 20px 48px rgba(0, 0, 0, 0.4)`). The enclosing address bar and light page establish its boundary. This does not create a new shadow system for other homepage sections.

## Shapes

Primary actions and starter controls use the modest recurring radii recorded in the frontmatter. The revision and example-entry actions are underlined text controls. The illustrative Site alone has a clipped outer radius (12px). Tables, benefits, and disclosures have thin rules and no outer card shell. The small beta marker is round. Icons use the existing Lucide stroke vocabulary rather than text glyph substitutes.

## Components

### Actions

Primary and secondary actions share a minimum height (48px), medium-size type, and a 12px content gap. The light primary action has a neutral hover fill. The secondary action remains text with an underline-like bottom border that brightens on hover. Links retain their native destinations; the visual style does not imply a form submission.

Interactive links, buttons, and disclosure summaries inside the homepage use an amber focus-visible outline (3px) with a 5px offset. Content controls reserve 84px of scroll space for the sticky bar; controls inside the bar use zero scroll margin. Touch feedback uses the amber family and `touch-action: manipulation` preserves normal pan/zoom behavior. Color-state transitions last 160ms; spatial feedback uses `cubic-bezier(0.16, 1, 0.3, 1)`. Primary actions compress slightly on press, and arrows advance two pixels on fine-pointer hover. Reduced-motion preferences and the per-tab pause control remove transitions, animation and smooth scrolling while retaining immediate selected, hover, focus and disclosure states. Device reduced motion takes precedence and updates live. Synchronized pause controls sit above the hero and in the sticky navigation, use 44px targets, and do not move the primary actions or reset reading position.

The hero's optional “Send a star” button shares the small control row with pause. It sends a decorative shooting star across the sky over 1.1 seconds, equally accessible by mouse, touch or keyboard. Its pale trail stays behind content, emits no sound and makes no product claim. A second activation replaces the first effect. The button is disabled while motion is off; pause, hidden/offscreen state and unmount cancel the effect. No particles accumulate or autoplay shooting stars are introduced.

### Illustrative Site and starter controls

The figure has a visible illustrative label, a request above the sheet, and a separate address bar with a first-draft or revised label. The light content panel uses the preview voice, thin internal rules, and the intrinsic sizing described in Layout. The address and content can wrap.

Three native buttons select Landing page, Portfolio, or Event page in equal columns with a 6px gap and a minimum height of 44px. A decorative inset selection with a light border slides between buttons over 280ms; hover brightens a button's border and text. Selection remains exposed through `aria-pressed`. Choosing a starter returns it to its first draft. The active result enters over 360ms with an 18px horizontal movement in the direction of selection; returning to the first draft reverses that movement. A thin amber line accompanies the explicit Revised label. The existing live region remains mounted inside the intrinsic sizing grid. Rapid selection replaces the result animation immediately. Keep the visible example identity and the controls' group label; these are ordinary pressed buttons, not a tab widget.

Below the sheet, a separate pressed button toggles “See a revision” and “Back to first draft.” The request and displayed result change together; the active result uses a polite, atomic live region. Both this control and “Use this idea” have a minimum height of 44px. They use underlined text with amber hover states.

“Use this idea” opens the selected first or revised brief as an editable, unsent draft in Sites. Existing unsent work takes precedence. The Sites sign-in step retains that destination through `/auth/signin?next=…`. Keep the explanatory caption adjacent to the action; choosing an example does not generate or publish a Site.

### Pricing table

The four-row table uses a screen-reader caption, column and row header scopes, thin row dividers, and no outer shell. Inclusion checks are decorative icons accompanying full text. Header and body columns preserve their gutters as copy wraps. The plan name and tabular price sit above; the action and supporting terms follow in normal document flow. Plan name and price come from [PRO_PLAN](../../lib/billing/pro-plan.ts), including the price cue near the hero action.

The plan action leads signed-in visitors to `/billing#plan` and guests to `/auth/signin?next=%2Fbilling%23plan`. Its adjacent copy describes plan review before subscribing, monthly renewal, and cancellation. Preserve that visible next-step explanation; the action itself does not charge the visitor.

### FAQ disclosures

Six native `details` and `summary` pairs supply the open state and keyboard behavior. Their conceptual topics belong to the surface brief. Summaries have a minimum height of 66px, balanced spacing, and a trailing plus icon. The icon rotates 45 degrees when open with a 200ms ease transition; answers enter over 200ms with four pixels of movement. Hover changes summary text to amber; the same visible focus treatment as other homepage controls remains available. Answers stay in the document beneath each summary with comfortable leading. Native disclosure behavior works without JavaScript.

### Reading motion and local navigation

Below the hero, an opaque sticky section navigation links to Possibilities, Pricing and Questions. Its minimum height is 60px (56px on mobile), with a small amber underline for the current section and native anchor destinations. Section targets reserve 84px above them. A synchronized, named pause/resume button remains reachable in the bar, and the Sites action is available there on desktop. The shared product header remains separate and unchanged. On mobile, all three section links and the 44px motion control fit one row; the additional Sites action is omitted. The hero's mobile top padding is 68px to accommodate the two galaxy controls.

The benefit rows share a thin connected track with static amber nodes. The track fills with scroll progress to connect describing, revising and sharing. Introductions enter once from 12px left over 420ms; the plan enters from 16px below over 500ms. The closing invitation has one short arrival and scroll-responsive orbital rings. No whole-page fade, scroll hijacking or scroll snapping is used. All content starts visible; failed client bundles or missing observers leave the story readable after the framework's inline stream completion. Fully disabling JavaScript still leaves the existing framework loading shell; this refinement does not change that route-level limitation. Anchored and keyboard-focused destinations skip arrivals. Listeners, observers, pending input frames and finite animations are cleaned up on unmount. See [navigation guidance](../../../docs/NATURAL_NAVIGATION_AND_OMNISEARCH.md) for the runtime contract and local verification command.

### Shared navigation and footer

The homepage uses the existing navigation and footer components. Their local product order belongs to the surface brief. This scoped record does not redefine the shared shell or prescribe ordering on other routes.

## Do's and Don'ts

### Do:

- **Do** preserve the dark GALX ground, retained galaxy artwork, and Inter page voice.
- **Do** keep the light illustrative Site distinct from GALX interface typography.
- **Do** use light primary actions, thin dividers, and small amber interaction details within this homepage.
- **Do** preserve native button, table, link, and disclosure semantics with visible keyboard focus.
- **Do** retain table gutters, wrapping actions, and the observed mobile stacking order.
- **Do** keep example actions stationary across every starter and revision at the current width.

### Don't:

- **Don't** promote the illustrative Site's Georgia headings into GALX display or navigation styles.
- **Don't** turn this local homepage treatment into a replacement for the shared operator design system.
- **Don't** replace the illustrative label or pressed-state semantics with appearance alone.
- **Don't** collapse the pricing header gutter when labels wrap on narrow screens.
- **Don't** expose hidden sizing copies to assistive technology or silently replace an unsent draft.
