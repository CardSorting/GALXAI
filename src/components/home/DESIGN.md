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

September 25, 2026 scope: the discovery layout, discovery component, and local navigation below have been reconciled with the built Star-network homepage. Unrelated Sites/Image Studio descriptions and preview-specific tokens are retained as historical records of the September 13 homepage, not current instructions or product promises. This narrow merge does not certify those older surfaces; [PRODUCT.md](../../../PRODUCT.md) owns current product scope.

## Overview

**Creative North Star: "The established GALX dark world"**

This is a scoped extension of the [GALX design system](../../../DESIGN.md), grounded in [PublicHome.tsx](PublicHome.tsx), [SitesExample.tsx](SitesExample.tsx), [PlanAction.tsx](PlanAction.tsx), and [public-home.module.css](public-home.module.css). It applies to this component family on `/`. Shared navigation, other routes, and the operator interface retain their existing design authority. The [homepage surface brief](../../../.impeccable/surfaces/src-app-page-tsx.md) owns the audience, offer, section sequence, and conversion strategy.

The homepage retains the dark GALX field and Inter voice, with a text-first hero that introduces the creation loop before asking visitors to choose a path. Generous editorial spacing, light actions, and divided content sections give this public surface a calmer density. A light illustrative Site remains a distinct content object within that world, with the serif headings already used by the [Sites preview](../../lib/sites/site-preview.ts).

**Key Characteristics:**

- An established dark canvas with a resilient, image-independent first viewport.
- A static Image Studio preview that explains Describe → Make → Discover without simulating generation.
- Inter page typography with serif headings confined to the illustrative Site.
- Light primary actions and restrained amber interaction details.
- Divided sections, native controls, and responsive stacking.

The [finish review](../../../.impeccable/review/sites-home-refinement/finish-review.md) records the reviewed built state and its desktop, tablet, and mobile evidence. The current hero introduces no production showcase image, remote artwork dependency, or generated shipping image.

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

Text selection retains the established indigo treatment from the shared palette. The studio preview uses the existing cool inset and amber detail tokens; it does not derive UI colors from an image.

## Typography

**Display and Body Font:** Inter, inherited from the shared application font stack.
**Illustrative Preview Headings:** Georgia, serif, inherited from the existing Sites page-preview vocabulary.

The page combines a large, closely tracked display with medium-weight section headings and comfortable body leading. The frontmatter records recurring section, title, body, and action roles. The hero is a local display treatment: weight 600, line height 1, tracking −.04em, and a desktop size of `clamp(3rem, 5.4vw, 4.5rem)`. Its size becomes 60px at the 1000px breakpoint, `clamp(48px, 8vw, 60px)` at 760px, and 48px at 380px. The studio preview prompt uses a slightly larger body scale to read as authored content rather than a fake form control.

Section headings use the headline role; the closing heading uses a slightly looser line height (1.2). Benefit titles use the title role. The hero introduction uses 20px text, reducing to 18px at 1000px. Body copy remains 16px, with the FAQ using line height 1.8. Supporting labels range from 12px to 14px; table values are 14px. Price figures use tabular numerals.

**The Preview Voice Rule.** Georgia belongs only to the illustrative Site's two heading levels. Keep the GALX hero, navigation, section headings, body, and controls in Inter.

The example's main heading is regular-weight Georgia at 36px with line height 1.06; its section heading is 20px with line height 1.2. These describe content inside the example, not new GALX display roles.

## Layout

Major sections share a centered maximum width (1280px) and side gutters (24px). The hero pairs the value proposition and static Image Studio preview in columns (`1fr .9fr`) with a fluid 48–96px gap and 88px vertical padding. Divided sections pair an introduction with content (`.85fr 1.15fr`), a 100px gap, and the recurring section padding. Benefit rows use a 30px gap and matching padding across their divider. Descriptive lines have measured widths, including 35ch section introductions and 60ch benefit text.

At 1000px, horizontal gaps tighten. At 760px, the hero and divided sections become a single column, section padding becomes 52px, the studio flow becomes a vertical list, and the closing action stacks beneath its text. The studio preview is bounded to 560px when stacked. At 380px, page gutters reduce to 20px and the example's internal content columns become one. Actions wrap while retaining their reading order.

The example canvas shares one intrinsic grid area across all six authored results, so its tallest content at the current width determines the available height. Sizing copies stay `aria-hidden` and `visibility: hidden`; only the active result is visible and announced. Preserve this sizing when editing examples so the revision and entry actions remain stationary. At 380px and below, the address bar reserves a minimum height of 60px for a two-line address; the draft label does not shrink.

The discovery section uses the divided two-column layout: introduction and access message on the left, three full-row links and a separate creation-plan link on the right. Rows have 24px vertical padding, a 24px gap between text and arrow, and divider-only separation. At 760px and below, the introduction precedes the links in one column with a 34px gap and 52px section padding. At 380px and below, side gutters become 20px. Text wraps and grid children can shrink without forcing document overflow. There is no discovery pricing table or price figure.

**The Divided Sections Rule.** Use spacing and rules to separate this homepage's content; reserve the enclosed light sheet for the illustrative Site.

## Elevation & Depth

Most content rests directly on the dark page. Thin dividers and tonal differences provide separation. The studio preview is the one raised object in the first viewport: a restrained inset surface, a clear authored prompt, a three-step flow, and a small status footer. Its elliptical geometry is decorative and clipped inside the preview; it never represents a generated image or progress state. Later reading sections use lightweight geometric paths and static tonal backgrounds from the existing inset palette. They connect the story visually without a bitmap, canvas, or production asset request.

The later reading sections share faint paths, constellations and dark tonal fields from the existing inset palette. One amber path draws with reading progress. It connects the story visually and never represents a real generation or publication. The closing invitation contains three concentric rings that settle with scroll, clipped behind the content. These layers require no additional bitmap or canvas.

The illustrative Site is the local raised object, with a soft shadow (`0 20px 48px rgba(0, 0, 0, 0.4)`). The enclosing address bar and light page establish its boundary. This does not create a new shadow system for other homepage sections.

## Shapes

Primary actions and starter controls use the modest recurring radii recorded in the frontmatter. The revision and example-entry actions are underlined text controls. The illustrative Site alone has a clipped outer radius (12px). Tables, benefits, and disclosures have thin rules and no outer card shell. The small beta marker is round. Icons use the existing Lucide stroke vocabulary rather than text glyph substitutes.

## Components

### Actions

Primary and secondary actions share a minimum height (48px), medium-size type, and a 12px content gap. The light primary action has a neutral hover fill. The secondary action remains text with an underline-like bottom border that brightens on hover. Links retain their native destinations; the visual style does not imply a form submission.

Interactive links, buttons, and disclosure summaries inside the homepage use an amber focus-visible outline (3px) with a 5px offset. Content controls reserve 84px of scroll space for the sticky bar; controls inside the bar use zero scroll margin. Touch feedback uses the amber family and `touch-action: manipulation` preserves normal pan/zoom behavior. Color-state transitions last 160ms; spatial feedback uses `cubic-bezier(0.16, 1, 0.3, 1)`. Primary actions compress slightly on press, and arrows advance two pixels on fine-pointer hover. Reduced-motion preferences and the per-tab pause control remove transitions, animation and smooth scrolling while retaining immediate selected, hover, focus and disclosure states. Device reduced motion takes precedence and updates live. The single pause control lives in the sticky navigation, uses a 44px target, and never moves the primary actions or resets reading position.

### Illustrative Site and starter controls

The figure has a visible illustrative label, a request above the sheet, and a separate address bar with a first-draft or revised label. The light content panel uses the preview voice, thin internal rules, and the intrinsic sizing described in Layout. The address and content can wrap.

Three native buttons select Landing page, Portfolio, or Event page in equal columns with a 6px gap and a minimum height of 44px. A decorative inset selection with a light border slides between buttons over 280ms; hover brightens a button's border and text. Selection remains exposed through `aria-pressed`. Choosing a starter returns it to its first draft. The active result enters over 360ms with an 18px horizontal movement in the direction of selection; returning to the first draft reverses that movement. A thin amber line accompanies the explicit Revised label. The existing live region remains mounted inside the intrinsic sizing grid. Rapid selection replaces the result animation immediately. Keep the visible example identity and the controls' group label; these are ordinary pressed buttons, not a tab widget.

Below the sheet, a separate pressed button toggles “See a revision” and “Back to first draft.” The request and displayed result change together; the active result uses a polite, atomic live region. Both this control and “Use this idea” have a minimum height of 44px. They use underlined text with amber hover states.

“Use this idea” opens the selected first or revised brief as an editable, unsent draft in Sites. Existing unsent work takes precedence. The Sites sign-in step retains that destination through `/login?next=…`. Keep the explanatory caption adjacent to the action; choosing an example does not generate or publish a Site.

### Discovery links

The named discovery section presents a native list of three full-row links: Explore the work (`/explore`), Find your Stars (`/stars`), and Keep what inspires you (`/collections`). The introduction states that exploring needs no subscription. The Collections row discloses “Saved in this browser.” Keep that persistence qualifier adjacent to its destination; discovery is not a $0 subscription tier.

Row titles reuse the title role (20px, weight 500); secondary copy is 15px with 1.65 leading, and the browser note is 13px with 1.6 leading. Light text and muted descriptions sit directly on the dark ground with thin dividers and no card shell. Each row has a decorative trailing arrow. Hover turns the title and arrow amber; fine-pointer hover moves the arrow 4px. Native links retain the shared 3px amber keyboard outline and 5px offset, and reduced motion removes transition movement.

Below the rows, a separate note explains that private creation has its own plans and usage limits. The understated “View creation plans” link leads to `/pricing`; it does not subscribe or charge the visitor. The discovery section uses `#discover`, while the hidden legacy `#pricing` anchor retains existing incoming fragment links at the same section. Both targets reserve 84px for the sticky navigation.

### FAQ disclosures

Six native `details` and `summary` pairs supply the open state and keyboard behavior. Their conceptual topics belong to the surface brief. Summaries have a minimum height of 66px, balanced spacing, and a trailing plus icon. The icon rotates 45 degrees when open with a 200ms ease transition; answers enter over 200ms with four pixels of movement. Hover changes summary text to amber; the same visible focus treatment as other homepage controls remains available. Answers stay in the document beneath each summary with comfortable leading. Native disclosure behavior works without JavaScript.

### Reading motion and local navigation

Below the hero, an opaque sticky section navigation links to Releases (`#stream`), About (`#possibilities`), Discover (`#discover`) and FAQ (`#faq`). Its minimum height is 60px (56px on mobile), with a small amber underline for the current section and native anchor destinations. Discovery reserves 84px above its target. A synchronized, named pause/resume button remains reachable in the bar, and the Private creation action links to `/images/create` on desktop. The shared product header remains separate and unchanged. On mobile, all four section links and the 44px motion control fit one row; the additional Private creation action is omitted. The hero's mobile top padding is 68px for a calm first viewport.

The discovery links and creation note enter as one complete block using the existing 18px, 760ms arrival; there is no row cascade. The internal arrival name remains `plan` for compatibility and does not describe a public offer. Device reduced motion, pause, native anchor arrival, and focus or pointer interaction settle the content immediately through the existing reading-motion behavior. The remaining detailed entrance record below is historical where it refers to a pricing block.

The benefit rows share a thin connected track with amber nodes. The track and constellation paths ease between scroll samples over 240ms; closing orbital rings use 300ms. This connects describing, revising, sharing and the next section without changing native scrolling.

Story entrances share a gentle upward direction and `cubic-bezier(0.22, 1, 0.36, 1)` deceleration. Introductions travel 18px over 720ms; benefit rows 14px over 660ms; the complete pricing block 18px over 760ms; FAQ rows 8px over 520ms; closing copy 16px over 720ms; and its action 10px over 560ms. Initial opacity is 0.76–0.86, preserving the reading hierarchy throughout. Mobile travel is reduced by 25%. Elements arriving together in a section overlap with 65ms desktop or 45ms mobile spacing, capped at 160ms. A 48px viewport approach margin starts the arrival before it becomes a visible interruption. No word-by-word text choreography or pricing-row cascade is used. No whole-page fade, scroll hijacking or scroll snapping is used. All content starts visible; failed client bundles or missing observers leave the story readable after the framework's inline stream completion. Fully disabling JavaScript still leaves the existing framework loading shell; this refinement does not change that route-level limitation. Each element enters once per mount. Already-visible content at setup/resume, native anchor destinations and focused or pointer-interacted sections stay immediately settled; section interactions cancel pending sibling motion. Fast scrolling beyond an active target cancels it, and returning to a section does not replay its entrance. Hidden documents, pause and reduced motion cancel active arrivals. Listeners, observers, pending input frames and finite animations are cleaned up on unmount. See [navigation guidance](../../../docs/NATURAL_NAVIGATION_AND_OMNISEARCH.md) for the runtime contract and local verification command.

### Shared navigation and footer

The homepage uses the existing navigation and footer components. Their local product order belongs to the surface brief. This scoped record does not redefine the shared shell or prescribe ordering on other routes.

## Do's and Don'ts

### Do:

- **Do** preserve the dark GALX ground, image-independent hero, and Inter page voice.
- **Do** make the first viewport explain the creation loop before asking visitors to choose create or explore.
- **Do** keep the light illustrative Site distinct from GALX interface typography.
- **Do** use light primary actions, thin dividers, and small amber interaction details within this homepage.
- **Do** preserve native list, link, button, and disclosure semantics with visible keyboard focus.
- **Do** retain full-row discovery targets, wrapping copy, the browser-local saving disclosure, and introduction-first mobile stacking.
- **Do** keep example actions stationary across every starter and revision at the current width.

### Don't:

- **Don't** promote the illustrative Site's Georgia headings into GALX display or navigation styles.
- **Don't** turn this local homepage treatment into a replacement for the shared operator design system.
- **Don't** use remote showcase images, fake editor controls, or decorative states that imply a completed generation.
- **Don't** replace the illustrative label or pressed-state semantics with appearance alone.
- **Don't** present public discovery as a priced subscription tier or imply that browser-local saves synchronize across devices.
- **Don't** expose hidden sizing copies to assistive technology or silently replace an unsent draft.
