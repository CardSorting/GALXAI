---
name: GALX public reading surfaces
description: A scoped help-center extension of the established dark GALX world.
colors:
  page-ground: "#07090e"
  header-ground: "#07080d"
  foreground: "#f3f4f6"
  reading-muted: "#b4b9c7"
  reading-line: "rgba(255,255,255,.14)"
  surface: "#0d101c"
  primary: "#4f46e5"
  primary-hover: "#4338ca"
  action-foreground: "#fff"
  focus: "#a5b4fc"
  link-hover: "#c7d2fe"
  field-border: "#62697c"
  filter-hover: "#14192d"
  filter-selected: "#252347"
  filter-selected-border: "#818cf8"
  filter-selected-text: "#e0e7ff"
typography:
  display:
    fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "clamp(2.25rem, 4.5vw, 3.75rem)"
    fontWeight: 650
    lineHeight: 1.08
    letterSpacing: "-.035em"
  headline:
    fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "clamp(1.5rem, 2.5vw, 1.875rem)"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-.02em"
  title:
    fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.85
  label:
    fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: ".875rem"
    fontWeight: 400
  action:
    fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
rounded:
  focus: "4px"
  control: "8px"
  plan: "12px"
spacing:
  small: "8px"
  compact: "12px"
  control: "16px"
  mobile-gutter: "20px"
  row: "24px"
  gutter: "32px"
  reading-section: "44px"
  narrow-section: "48px"
  column-gap: "64px"
  section: "72px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.action-foreground}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  text-link:
    textColor: "{colors.foreground}"
  search-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "6px 16px"
  topic-filter:
    textColor: "{colors.reading-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  topic-filter-selected:
    backgroundColor: "{colors.filter-selected}"
    textColor: "{colors.filter-selected-text}"
  guide-row:
    textColor: "{colors.foreground}"
    padding: "24px 0"
  chapter-navigation:
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
  faq-disclosure:
    textColor: "{colors.foreground}"
  plan-card:
    backgroundColor: "rgba(13,16,28,.58)"
    textColor: "{colors.foreground}"
    rounded: "{rounded.plan}"
    padding: "24px"
---

# Design System: GALX public reading surfaces

## Overview

**Creative North Star: "The established GALX dark world"**

This scoped maintainer record describes the implemented Pricing, FAQ, knowledge-base index, and eight guides that use [ReadingPage.tsx](ReadingPage.tsx), [KnowledgeSearch.tsx](KnowledgeSearch.tsx), and [public-content.module.css](public-content.module.css). It extends the [shared design authority](../../../DESIGN.md) and the [homepage's incumbent visual language](../home/DESIGN.md). The [surface brief](../../../.impeccable/surfaces/src-app-knowledge-base-page-tsx.md) owns the page strategy. This record and its adjacent [sidecar](DESIGN.json) are private design artifacts, never runtime content.

The dark ground and Inter voice remain familiar while generous leading, visible labels, thin rules, and quiet chapter navigation make sustained reading comfortable. Indigo identifies actions and interaction states. The shared ambient background remains behind the content; the component family adds no imagery or decorative animation.

**Key Characteristics:**

- Dark continuous surfaces with brighter muted reading text.
- Inter headings, measured article widths, and generous body leading.
- Indigo actions and explicit focus, selection, and recovery states.
- Divided guide rows, native disclosures, and a chapter rail that stacks on mobile.

## Colors

Cool dark neutrals carry the reading hierarchy; the indigo family marks interaction.

### Primary

- **Indigo action** (`primary`, `primary-hover`, `action-foreground`): filled primary links and recovery buttons use white text, with a deeper hover fill.
- **Pale indigo feedback** (`focus`, `link-hover`): focus outlines, the search caret, inclusion checks, example labels, and link hover feedback.
- **Selected topic** (`filter-selected`, `filter-selected-border`, `filter-selected-text`): a dark indigo fill, brighter border, and pale text reinforce the pressed topic button.

### Neutral

- **Page and header grounds** (`page-ground`, `header-ground`): the body utility supplies the page ground; the shared header uses the background custom property. The page component itself is transparent.
- **Reading ink** (`foreground`, `reading-muted`): headings and controls use the light foreground; paragraphs, descriptions, labels, and supporting terms use the brighter muted tone extracted for these reading pages.
- **Inset surface** (`surface`): search field and example request background; the Foundry offer uses a translucent variant recorded in its component token.
- **Separation** (`reading-line`, `field-border`): thin dividers organize content; the search field has a stronger visible boundary.
- **Topic hover** (`filter-hover`): a small tonal lift on unselected topic buttons.

**The Indigo Interaction Rule.** Keep these reading surfaces' indigo primary actions and focus treatments scoped to this component family; the homepage's light actions and amber details retain their own authority.

## Typography

**Display Font:** Inter, with the shared application sans-serif fallback stack.
**Body Font:** Inter, with the same shared stack.

**Character:** Closely tracked, medium-to-semibold headings establish hierarchy above relaxed body text. No new serif or monospaced role is introduced. The frontmatter records the recurring roles rather than every one-off size.

### Hierarchy

- **Display** (weight 650, line height 1.08): the responsive page heading; ordinary pages cap its measure at 19ch and guide introductions at 22ch.
- **Headline** (weight 600, line height 1.25): section titles and article chapters, using the responsive frontmatter scale.
- **Title** (weight 600, line height 1.5): guide names and smaller content headings.
- **Body** (regular, line height 1.85): article paragraphs, ordered steps, example text, and FAQ answers. Articles cap their measure at 72ch.
- **Label** (regular, .875rem): search labels, topic buttons, and chapter links. Breadcrumbs, chapter captions, and plan terms use .8125rem; guide categories use .75rem.
- **Action** (weight 600, 1rem): primary actions. Underlined secondary links remain regular weight.

Introductions use 1.125rem with 1.75 leading and a 58ch maximum, reducing to 1rem on narrow screens. Guide descriptions use 1rem with 1.65 leading and a 70ch maximum, reducing to .875rem on mobile. FAQ summaries use 1rem, weight 500, and 1.6 leading. Orbit and Foundry price figures use 1.5rem, weight 600, tabular numerals, and −.02em tracking; their billing units use a smaller regular label. Headings balance; introductions and article paragraphs use pretty wrapping.

**The Reading Measure Rule.** Preserve the 72ch article maximum and generous paragraph leading when adding guides to this family.

## Layout

The centered reading container has a maximum width of 1160px and padding of 32px 32px 88px. Breadcrumbs precede the introduction with a 44px lower margin. Major supporting sections use a 72px top gap. Guide rows separate content with 24px vertical padding and a 24px gap before their arrow. Support follows a top rule, 64px outer gap, and 32px inner padding.

Pricing leads with an introduction capped at 760px, followed by a divided free-discovery row, separate Orbit and Foundry sections, allowance guidance, and related reading. The discovery row wraps its copy and exploration link with a 24px by 40px gap. Foundry currently occupies one track of the existing three-column offer grid, which becomes a single column at 900px; do not fabricate additional offers to fill it. Article and FAQ layouts use a 220px chapter rail, a flexible content column, and a 64px gap. The rail is sticky 28px from the viewport top; chapter anchor targets reserve the same scroll margin. The search field caps its width at 720px. Topics wrap in a row with 8px gaps. Result headings and counts wrap while keeping their source order.

At 900px and below, reading gaps reduce to 32px and the chapter rail narrows to 180px. At 680px and below, the page uses 20px side gutters and 64px bottom padding. Pricing introduction links stack and its bottom padding reduces to 32px. Reading columns stack with a 32px gap. The chapter rail becomes a static full-width list above the article, gains a lower divider, and hides its redundant return link. Breadcrumbs remain available and wrap. The Foundry offer retains 24px padding; section gaps become 48px and article section gaps become 36px. FAQ answers use the full content width.

The shared header becomes a single row at 1100px. Below that point, the brand and account action sit above a horizontally scrollable navigation row; keyboard focus brings an overflowed link into view. It does not automatically scroll the active label into view. The public reading routes have no workspace bottom navigation. Preserve normal document scrolling and native anchor destinations.

## Elevation & Depth

The local component family uses no shadows, blur, or lifted hover effects. A dark inset fill distinguishes the plan, search field, and example; thin rules divide lists and disclosures. The shared application shell retains its faint grid and blurred indigo, amber, and emerald background fields. Those ambient layers belong to the shared shell, not a new reading-page token system.

**The Flat Reading Rule.** Use the existing inset fill and thin dividers for local depth; keep guide rows and FAQ sections directly on the page ground.

## Shapes

Controls and example requests use the modest control radius; the single pricing plan uses the larger plan radius. Divided guide rows and disclosures have no enclosing card shell. The search input is transparent inside its bordered field. Topic filters are rounded rectangular buttons rather than pills. Icons use the existing Lucide stroke vocabulary and remain decorative when adjacent text names the action.

## Components

### Actions

Primary links and recovery buttons are centered inline-flex controls with a 10px icon gap and a minimum height of 48px. Their recurring color, padding, and radius live in the frontmatter. Hover changes only the fill over 160ms ease. Secondary links retain an underline with a 5px offset, an 8px icon gap, and a minimum height of 44px.

All local links, buttons, inputs, and summaries have a pale indigo focus-visible outline (2px), a 4px offset, and the focus radius. The search field provides its own focus-within outline with a 3px offset; its input suppresses the duplicate outline. Reduced motion disables local transitions and smooth scrolling while keeping immediate focus and state feedback.

Pricing currently uses exploration, VANTA profile, and private-workspace status links. It does not render a purchase action while new subscriptions are unavailable. Preserve the distinction between navigation, account review, and an explicit subscription checkout.

### Search and topic filters

The search field has a visible associated label, a 20px decorative search icon, and a 44px input height. A conditional clear button has a 44px square minimum target and an accessible name. Input is limited to 160 characters. Typing updates the local authored-guide results; category selection and search terms combine. Escape clears the query while retaining the chosen topic. Clear search preserves the topic and restores input focus; the empty-state recovery clears both and restores focus.

Four native topic buttons expose the chosen category through `aria-pressed`. Default, hover, and selected styles remain visibly distinct. The result heading changes with the query or selected topic. A polite, atomic status announces the guide count and filter context. Matching uses all query words against the authored guide text; it is not a network search or a search over private maintainer documents.

The empty state retains the list's top divider, a direct “No guides found” heading, recovery guidance, and the primary “Clear search and filters” action. No loading, network-error, or disabled search state is implemented in this local filter.

### Guide rows and articles

A semantic list holds full-row links with a title, description, optional category label, and trailing arrow. Hover changes the title to pale indigo and advances the arrow 4px over 160ms ease; keyboard users receive the full focus outline. Related guides reuse the same rows below the article.

Article sections have named anchor targets, paragraphs, optional ordered steps, and optional inset example requests. The “Example request” caption describes the quoted content; it is not a general eyebrow style. Ordered lists keep their decimal markers and text gutters. Article actions lead to Sites or plan review, followed by related reading and a separate contact-support link.

### Breadcrumbs and chapter navigation

Breadcrumbs use a named navigation landmark, an ordered list, decorative chevrons, and `aria-current="page"` on the final item. Link targets remain at least 44px high. Chapter links use ordinary anchors with a 44px minimum height, 10px vertical padding, and an underlined pale-indigo hover state. They do not implement a scroll-spy selection state. The desktop return link is separated by a rule; the mobile layout follows the stacking behavior above.

The shared main navigation keeps its own stylesheet, active underline, pending feedback, and account-loading placeholder. Its links expose current-page state, and its focus outline uses the shared primary variable with an inset offset. This local record does not replace the shared header's tokens.

### FAQ disclosures

Native `details` and `summary` pairs provide disclosure semantics and keyboard behavior. Summaries have 22px vertical padding, a 24px content gap, and an 18px plus icon. Opening rotates the icon 45 degrees over 160ms ease. Hover changes summary text to pale indigo. Answers have 24px bottom padding, comfortable leading, and a related-guide link; their desktop right inset disappears on mobile. Each disclosure can open independently, with no custom accordion script or invented single-open constraint.

### Plan and support containers

Free discovery has a divided row with an exploration link and browser-local collection note, not a $0 plan card. Orbit uses an open section with its $10 USD per Star per month price, scope, unavailable status, and VANTA profile link. Foundry uses the bordered offer container with its $200 USD monthly price, published allowance or explicit unavailable allowance, features, and terms in normal document order. The text status badge is not an action. Foundry excludes Orbit and Sites; new Sites subscriptions are closed. New Orbit and Foundry subscriptions remain unavailable pending tax readiness. Offer values come from public product sources, not duplicated visual constants.

The September 26, 2026 finish review accepted local Orbit and Foundry pricing captures at 1440px and 390px in `.impeccable/review/discovery-refinement/`. This is dated local visual evidence; it does not establish deployment or account-payment acceptance. No new assets were generated.

Support uses a divided, wrapping row with a heading, short paragraph, and underlined mail link. It opens the visitor's mail application and provides no form-submission or delivery-success state.

## Do's and Don'ts

### Do:

- **Do** preserve Inter, the dark page ground, brighter muted reading text, and scoped indigo interaction states.
- **Do** reuse the 72ch article measure, thin guide dividers, and mobile chapter-list stacking.
- **Do** retain native links, disclosures, ordered steps, visible labels, and keyboard focus.
- **Do** keep query clearing distinct from clearing both search and topic filters, with focus restored to the search field.
- **Do** derive plan copy and guide content from the explicit public sources while keeping this maintainer record private.

### Don't:

- **Don't** import the homepage's illustrative serif headings or amber action treatment into these reading components.
- **Don't** turn guide rows and FAQ sections into additional raised cards.
- **Don't** replace pressed-topic semantics, result announcements, or empty-state recovery with appearance alone.
- **Don't** hide the mobile chapter links or replace normal page scrolling with a workspace navigation pattern.
- **Don't** treat source presence or review captures as evidence of deployment, indexing, field performance, or real-account acceptance.
