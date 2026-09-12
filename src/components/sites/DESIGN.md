---
name: GALX Sites workspace
description: A compact dark authoring workspace with a clearly bounded page preview.
colors:
  background: "#07080d"
  panel: "#0d101c"
  surface-hover: "#14192d"
  foreground: "#f3f4f6"
  foreground-muted: "#9ca3af"
  border: "rgba(255,255,255,.08)"
  primary: "#4f46e5"
  primary-hover: "#4338ca"
  primary-text: "#fff"
  focus: "#a5b4fc"
  focus-border: "#818cf8"
  accent-foreground: "#c7d2fe"
  live: "#6ee7b7"
  preview-paper: "#f6f5f0"
  preview-ink: "#182923"
  preview-secondary-ink: "#41574c"
  preview-rule: "#d9ddd4"
typography:
  title:
    fontFamily: "var(--font-inter), sans-serif"
    fontSize: "20px"
    fontWeight: 600
    letterSpacing: "-.02em"
  welcome:
    fontFamily: "var(--font-inter), sans-serif"
    fontSize: "24px"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-.025em"
  body:
    fontFamily: "var(--font-inter), sans-serif"
    fontSize: "13px"
    lineHeight: 1.8
  introduction:
    fontFamily: "var(--font-inter), sans-serif"
    fontSize: "14px"
    lineHeight: 1.75
  label:
    fontFamily: "var(--font-inter), sans-serif"
    fontSize: "12px"
    fontWeight: 500
  preview-display:
    fontFamily: "Georgia, serif"
    fontSize: "clamp(38px,6vw,76px)"
    fontWeight: 400
    lineHeight: 1.06
    letterSpacing: "-.04em"
  preview-title:
    fontFamily: "Georgia, serif"
    fontSize: "27px"
    fontWeight: 400
    lineHeight: 1.2
  preview-body:
    fontFamily: "system-ui, sans-serif"
    fontSize: "15px"
    lineHeight: 1.8
rounded:
  control: "6px"
  surface: "8px"
  composer: "10px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-text}"
    rounded: "{rounded.control}"
    padding: "9px 13px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.primary-text}"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "7px 12px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-hover}"
    textColor: "{colors.foreground}"
  button-text:
    textColor: "{colors.foreground-muted}"
  composer:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.composer}"
    padding: "14px 12px 10px"
  message-user:
    backgroundColor: "{colors.surface-hover}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.surface}"
    padding: "13px 15px"
  preview:
    backgroundColor: "{colors.preview-paper}"
    textColor: "{colors.preview-ink}"
    rounded: "{rounded.surface}"
---

# Design System: GALX Sites workspace

## Overview

**Creative North Star: "The GALX workspace and its page canvas"**

This is a scoped extension of the incumbent [GALXAI design system](../../../DESIGN.md). Its authority is limited to the Sites component family, the `/sites` routes, and their linked [page preview renderer](../../lib/sites/site-preview.ts). The existing application navigation and global identity retain their own design authority.

The interface uses compact dark panels, clear text, restrained indigo actions and thin separators. A warm light page canvas gives the authored content a separate reading surface. This material distinction is already built; it does not establish a new palette for other GALX screens.

**Key Characteristics:**

- Compact dark controls with visible indigo interaction states.
- Conversation and authored page remain visually distinct.
- Serif page headings sit inside the preview; workspace headings use Inter.
- Loading, saved, unavailable and publication feedback remain readable in either mobile panel.

## Colors

The workspace inherits GALX's obsidian and indigo family. The preview uses paper and green ink for the page itself.

### Primary

- **Action indigo** and **deep action indigo** distinguish enabled primary actions and their hover state.
- **Light indigo** provides focus rings, carets and the selected navigation underline. **Border indigo** marks the focused composer; **pale indigo** marks hovered starter prompts and in-progress text. These are intentional tonal variants of the incumbent accent, confined to interaction states.

### Secondary

- **Live mint** appears only with the written Live state. Color supplements the status label.

### Neutral

- **Obsidian background**, **navy panel** and **navy hover surface** separate the work area, conversation and selected or hovered controls.
- **Near-white foreground**, **muted foreground** and the **translucent white border** supply the normal text and separator hierarchy.
- **Preview paper**, **green ink**, **secondary green ink** and **pale green rule** belong to the authored page, preview empty states and miniature page thumbnails. They are intentional local materials, not replacements for workspace surfaces.

### Named Rules

**The Canvas Boundary Rule.** Paper and green ink identify authored content; workspace controls remain in the incumbent dark palette.

**The Labeled State Rule.** Color never carries draft, live, pending or error meaning without readable text.

## Typography

**Workspace Font:** Inter through the existing application font variable, with sans-serif fallback.

**Preview Font:** Georgia for the currently implemented page headings, with serif fallback; the page's supporting text uses the platform sans-serif stack. This describes the bounded page template, not a new GALX display identity.

### Hierarchy

- **Title:** The compact Sites heading anchors the workspace.
- **Welcome:** Medium-weight introductory text uses a larger size on small screens (26px); it remains part of the conversation panel.
- **Body and introduction:** Conversation messages use a relaxed line height at compact sizes. The introductory copy has a constrained measure (32ch on desktop, 38ch on mobile).
- **Label:** Navigation and actions use the small label role. Primary actions increase weight to 600.
- **Preview display and title:** The page uses fluid serif display type and repeated serif section titles. Long titles wrap; the display heading uses balanced wrapping and the recorded tracking floor.
- **Preview body:** Repeated section paragraphs use the page's sans-serif body role. The lead paragraph is larger (18px, reducing to 16px below 500px).

**The Two Voices Rule.** Inter belongs to the authoring controls; the serif hierarchy belongs to the authored page.

## Layout

The desktop surface places conversation on the left and preview on the right, under the existing application navigation and a Sites heading (64px). The standard left column is fixed (380px); the right column consumes the remaining width with no minimum-content overflow. At widths up to 1000px, the conversation narrows (330px); at 1600px and above it widens (420px).

At widths up to 760px, Chat and Preview become explicit view switches above a single visible panel. The heading reduces to 58px. The same draft and conversation remain selected across both views. New Site returns to Chat and focuses the composer. Workspace feedback sits above both mobile panels so publication errors remain visible from Preview.

The conversation scrolls independently above a bottom composer. Preview toolbars remain outside the page canvas. Repeated workspace insets follow the recorded spacing family, with tighter mobile padding. Desktop and phone preview controls inspect the same page; phone preview is capped at 390px. The device toggles are hidden on narrow screens.

Within the authored page, content is centered with a maximum width (1100px), proportional horizontal padding (7%), and repeated two-column sections. At 500px and below, horizontal padding becomes 24px and each section stacks into one column. This page-template layout has no authority over other customer content or GALX routes.

## Elevation & Depth

Dark interface surfaces use tonal separation and thin borders. The page canvas alone receives a soft, downward shadow (`0 8px 24px rgba(0,0,0,.25)`) to separate it from the workbench. Preview chrome is a muted dark strip above the light page. There is no blur treatment within this workspace.

The preview has a short opacity transition (0.2s, ease-out); in-progress feedback uses a rotating vector spinner (1.2s, linear). Reduced-motion preference disables workspace animation and transitions.

**The Quiet Depth Rule.** Use borders and tone for interface grouping; reserve the soft canvas shadow for the page preview.

## Shapes

Controls use gently curved corners; user messages and the preview share the surface radius. The composer has a slightly larger radius to form one continuous input region. Preview corners reduce to the control radius on mobile.

Lists, starter prompts and navigation use open rows with thin separators rather than individually raised cards. Lucide vectors share the normal workspace icon size (16px) and stroke weight (1.7); larger identity marks are local exceptions.

## Components

### Buttons

Primary buttons pair white text with action indigo and deepen on hover. Secondary buttons use a panel fill and thin border, moving to the hover surface. Text actions begin muted and brighten on hover. Controls use visible keyboard focus (2px outline, 3px offset); disabled buttons reduce opacity and show a disabled cursor. Primary and secondary buttons have a minimum height of 36px.

### Navigation

Chat and My Sites share a quiet row, with pale indigo underlining the current view. Mobile Chat and Preview switches use the same selected-state language. Desktop device buttons use a tonal selected surface and accessible pressed state. Navigation labels remain text with accompanying vector icons.

### Composer and fields

The composer groups a multiline prompt and its action into one dark container. A stronger neutral border becomes indigo on focus within. Prompt text remains compact with generous line height; the send action contains the current price when available. Text fields for search, naming and publication use the same dark fill and foreground hierarchy.

### Conversation and library

User messages use a tonal inset surface; assistant messages sit directly on the panel. Both identify their author in text and allow long words to wrap. Starter choices and saved Sites are separated rows. The library uses compact paper thumbnails, a readable title, written status and date; search and archived filtering remain distinct controls.

### Preview and feedback

The preview presents its document state and publication action above a dark address strip and light page. The illustrative preview is labeled until a real draft exists. A saved draft exposes written save/privacy feedback below the canvas.

Direct navigation to a saved Site shows loading or unavailable content in both conversation and preview until that Site is resolved; it does not show the example as though it were the saved page. Publication exposes its public audience in a separate panel. Shared errors and confirmations appear above Chat and Preview and provide dismissal, with refresh available for errors.

## Do's and Don'ts

### Do:

- **Do** preserve the existing GALX shell and indigo controls around the page canvas.
- **Do** keep authored-page paper and green ink inside the preview and its related content representations.
- **Do** preserve the left-conversation/right-preview arrangement on desktop and explicit panel switching on mobile.
- **Do** pair statuses with text, keep feedback visible in both mobile views, and distinguish loading from example content.
- **Do** preserve visible focus and reduced-motion behavior.

### Don't:

- **Don't** turn the page template's serif typography or light palette into global workspace defaults.
- **Don't** treat a preview, saved draft or queued address as evidence that a page is publicly live.
- **Don't** add decorative kickers, glyph icons or hard block shadows to this workspace.
- **Don't** generalize local palette differences into detector exclusions for unrelated files.
