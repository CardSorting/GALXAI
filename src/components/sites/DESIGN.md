---
name: GALX Sites workspace
description: A compact dark workspace for continuing Site conversations, reviewing page content, preserving project notes, and comparing saved versions.
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
  panel-title:
    fontFamily: "var(--font-inter), sans-serif"
    fontSize: "20px"
    fontWeight: 500
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
  content-heading:
    fontFamily: "var(--font-inter), sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.5
  content-body:
    fontFamily: "var(--font-inter), sans-serif"
    fontSize: "14px"
    lineHeight: 1.85
  mobile-field:
    fontFamily: "var(--font-inter), sans-serif"
    fontSize: "16px"
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
  compact: "5px"
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
  mode:
    textColor: "{colors.foreground-muted}"
    rounded: "{rounded.compact}"
    padding: "7px 10px"
  mode-selected:
    backgroundColor: "{colors.surface-hover}"
    textColor: "{colors.foreground}"
  context-notes:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "12px"
  version-row:
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "16px 12px"
  version-row-selected:
    backgroundColor: "{colors.surface-hover}"
    textColor: "{colors.foreground}"
  canvas-tab:
    textColor: "{colors.foreground-muted}"
    padding: "10px 12px"
  canvas-tab-selected:
    textColor: "{colors.foreground}"
  content-section:
    textColor: "{colors.foreground}"
    padding: "28px 0"
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
- Continuing conversations, page-content review, project notes and version comparison share one quiet panel system.
- Serif page headings sit inside the preview; workspace headings use Inter.
- Loading, saved, reconnecting, unavailable and publication feedback remain readable in either mobile panel.

## Colors

The workspace inherits GALX's obsidian and indigo family. The preview uses paper and green ink for the page itself.

### Primary

- **Action indigo** and **deep action indigo** distinguish enabled primary actions and their hover state.
- **Light indigo** provides focus rings, carets and the selected navigation underline. **Border indigo** marks the focused composer; **pale indigo** marks hovered starter prompts, version links and in-progress text. These are intentional tonal variants of the incumbent accent, confined to interaction states.

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
- **Panel title:** Context, History and Page content use a lighter heading at the same size as the Sites title, preserving hierarchy without adding another display scale.
- **Welcome:** Medium-weight introductory text uses a larger size on small screens (26px); it remains part of the conversation panel.
- **Body and introduction:** Conversation messages use a relaxed line height at compact sizes. The introductory copy has a constrained measure (32ch on desktop, 38ch on mobile).
- **Label:** Navigation and actions use the small label role. Primary actions increase weight to 600.
- **Conversation detail:** Reply status, mode guidance, summary guidance and version metadata remain readable at 12px. Conversation and version lists use tabular numerals for stable dates and version numbers.
- **Content heading and body:** The dark Page content reader uses Inter for both section titles and complete paragraphs. Paragraphs retain line breaks, wrap long words and stop at a readable measure (72ch). Mobile paragraphs increase to 16px with a line height of 1.75.
- **Mobile field:** Prompt, notes, search, naming and publication inputs share the larger mobile field role to keep editing readable without focus zoom.
- **Preview display and title:** The page uses fluid serif display type and repeated serif section titles. Long titles wrap; the display heading uses balanced wrapping and the recorded tracking floor.
- **Preview body:** Repeated section paragraphs use the page's sans-serif body role. The lead paragraph is larger (18px, reducing to 16px below 500px).

**The Two Voices Rule.** Inter belongs to the authoring controls; the serif hierarchy belongs to the authored page.

## Layout

The desktop surface places conversation on the left and preview on the right, under the existing application navigation and a Sites heading (64px). The standard left column is fixed (380px); the right column consumes the remaining width with no minimum-content overflow. At widths up to 1000px, the conversation narrows (330px); at 1600px and above it widens (420px).

At widths up to 760px, Chat and Preview become explicit view switches above a single visible panel. The heading reduces to 58px. The same draft and conversation remain selected across both views. New Site returns to Chat and focuses the composer. Workspace feedback sits above both mobile panels so publication errors remain visible from Preview.

The conversation scrolls independently above a bottom composer. Context and History occupy the conversation column as independently scrolling panels with a shared inset (24px). Preview toolbars and historical-version feedback remain outside the page canvas. Repeated workspace insets follow the recorded spacing family, with tighter mobile padding. Desktop and phone preview controls inspect the same page; phone preview is capped at 390px. The device toggles are hidden on narrow screens.

The right panel adds a Page view row for Preview, Page content and Download. Page content occupies that same panel as an independently scrolling dark reader, with a section outline above separated content rows. The reader uses a desktop inset (28px 32px 40px), reduces to 24px at the compact breakpoint, and uses 24px 20px 32px on mobile. Historical comparison places the selected version beside the current draft in equal columns (24px gap), stacking the two labeled texts on mobile. The outline also becomes a single column on mobile; section actions sit below their headings.

On mobile, core actions and mode controls have a minimum touch height (44px), with square send and icon controls at the same size. The composer respects the bottom safe area. Panel tabs retain a minimum height (48px), and their icons disappear to preserve readable labels. Historical-version feedback stacks its explanation and actions. On desktop viewports at most 740px high, the workspace reduces its minimum panel height (540px), composer insets (12px) and prompt minimum height (56px); the extra keyboard-hint line is hidden. Mobile retains a minimum panel height (560px), so short screens can scroll the page rather than collapse its contents.

Page view controls have a minimum height of 44px, increasing to 48px on mobile. Mobile outline links and message actions retain 44px targets. Connection notices span the workspace above both panels and wrap on mobile.

Within the authored page, content is centered with a maximum width (1100px), proportional horizontal padding (7%), and repeated two-column sections. An On this page navigation wraps introduction and section links above the page heading. At 500px and below, main content horizontal padding becomes 24px and each section stacks into one column. This page-template layout has no authority over other customer content or GALX routes.

## Elevation & Depth

Dark interface surfaces use tonal separation and thin borders. The page canvas alone receives a soft, downward shadow (`0 8px 24px rgba(0,0,0,.25)`) to separate it from the workbench. Preview chrome is a muted dark strip above the light page. There is no blur treatment within this workspace.

The preview has a short opacity transition (0.2s, ease-out); in-progress feedback uses a rotating vector spinner (1.2s, linear). Reduced-motion preference disables workspace animation and transitions.

**The Quiet Depth Rule.** Use borders and tone for interface grouping; reserve the soft canvas shadow for the page preview.

## Shapes

Controls use gently curved corners; mode buttons, icon controls and conversation version links use the compact radius. User messages and the preview share the surface radius. The composer has a slightly larger radius to form one continuous input region. Preview corners reduce to the control radius on mobile.

Lists, starter prompts and navigation use open rows with thin separators rather than individually raised cards. Lucide vectors share the normal workspace icon size (16px) and stroke weight (1.7); larger identity marks are local exceptions.

## Components

### Buttons

Primary buttons pair white text with action indigo and deepen on hover. Secondary buttons use a panel fill and thin border, moving to the hover surface. Text actions begin muted and brighten on hover. Controls use visible keyboard focus (2px outline, 3px offset); disabled buttons reduce opacity and show a disabled cursor. Primary and secondary buttons have a minimum desktop height of 36px, increasing with the mobile touch targets described in Layout.

### Navigation

Chat and My Sites share a quiet row; a selected Site adds Context and History. The available views distribute across the panel width, with light indigo underlining the current view. Icons accompany the labels on wide desktops and disappear at 1000px and below. Mobile Chat and Preview switches use the same selected-state language. Desktop device buttons use a tonal selected surface and accessible pressed state. The two mobile navigation rows distinguish the visible workspace panel from the conversation tools within Chat.

The Page view row stays within the right panel, including within mobile Preview. Preview and Page content use labeled pressed states and the same light-indigo underline; Download sits at the opposite edge. When an earlier version is selected, Page content becomes Content and changes.

### Composer and fields

The composer groups a multiline prompt, Build/Discuss mode buttons and a send action into one dark container. A stronger neutral border becomes indigo on focus within. The selected mode uses a tonal fill and an accessible pressed state. Build applies the request to the current draft; Discuss explores ideas without changing it. The accompanying guidance and placeholder explain the selected mode. Enter sends, Shift + Enter adds a line, and text composition does not trigger a premature send. The send action has the accessible name “Send message” and shows no generation price.

Each Site retains its unsent message and selected mode within the browser session. Starting a Site carries forward any next-message draft and mode already entered while the first reply is pending. A rejected first submission returns to the composer when it would not overwrite newer text. The prompt remains editable during a reply so the next message can be prepared; sending waits until the current reply is resolved. Historical previews show a return-to-current action before further chat can be sent.

Section edits, Continue in Build and Edit and resend prepare an editable request in Chat. They preserve an existing unsent message and explain that it must be sent or cleared first. With an empty composer, the prepared text receives focus; sending remains an explicit action.

Below the composer, concise copy explains paid-plan inclusion and fair usage. Ineligible accounts get a View plans link; temporary unavailability preserves the draft and explains how to retry. Text fields for search, naming and publication use the same dark fill and foreground hierarchy.

### Conversation and library

User messages use a tonal inset surface; assistant messages sit directly on the panel and display the actual reply for that turn. Both identify their author in text and allow long words to wrap. Pending and incomplete replies carry written status; replies associated with saved content offer a version link. The conversation is a keyboard-focusable log with polite announcements.

Message actions wrap beneath each reply. Completed Discuss replies offer Continue in Build, which places the reply into the composer as a direction to update the page and selects Build. Failed user messages offer Edit and resend with their original mode. Messages that are no longer pending offer Copy; success and clipboard unavailability receive shared feedback. Historical or archived pages disable actions that prepare an update.

First visits and empty Sites start at the top with the welcome visible. New Site resets this orientation and clears stale unread indicators and earlier-history scroll anchors. The composer stays fixed below the independently scrolling conversation.

Bottom-following applies only to an existing conversation or pending reply. New replies follow the bottom only while the reader is already near it. Reading earlier content preserves the scroll position and reveals a Latest message action above the composer when new content arrives. Loading earlier messages preserves the reading position; a separate earlier-conversation view offers Return to latest. These controls keep continuing conversations usable without forcing the reader away from older text.

Starter choices and saved Sites are separated rows. The library uses compact paper thumbnails, a readable title, written status and date; search and archived filtering remain distinct controls.

### Context

Context pairs an editable Project notes field with a separate Conversation summary below a thin divider. Notes use the established dark field, visible label and Save notes action. Privacy and persistence guidance sits directly below the field; text that is too long receives an adjacent explanation. Notes remain until edited. The rolling summary describes decisions and open questions, with guidance that it updates after each reply and can be corrected in chat or through the project notes. Long notes and summaries wrap within the panel.

Unfinished notes remain associated with the account and Site in the current tab, with an Unsaved edits label beside Save notes. If saved notes change elsewhere while local edits are present, the field preserves those edits and shows a conflict explanation between thin rules. Review saved notes reveals the saved text. Use saved notes replaces the local draft; Keep my edits preserves the local text for an explicit subsequent save. Saving stays disabled until that choice is made. A save finishing while the user continues typing preserves the newer text as unsaved work.

### Page content

The Page content reader exposes the complete introduction and every section as dark workspace text. An outline links directly to each part, and a Back to introduction action closes the page. Edit in chat prepares a section-specific Build request without submitting it. The rendered page has its own On this page anchors for navigating the same content.

Content and changes begins with an expanded comparison summary. It names how many parts differ, or states that the saved version matches the current draft. Each changed introduction or section shows its full selected-version and current-draft text under separate labels; absent parts have explicit missing-content labels. The complete saved page remains readable below the comparison. Changing the displayed version resets the reader's scroll and comparison disclosure state so another version's position is not carried into the new comparison.

### History

History presents saved versions as full-width, keyboard-focusable button rows separated by thin rules. Each row has a version number, written current/published/saved state, date and readable description. Hovered and selected rows use the incumbent tonal fill. Discussion alone does not create a version. Earlier versions have an explicit loading action and readable loading or empty feedback.

Selecting a row or conversation version link previews that checkpoint and labels it above and below the canvas. Mobile switches to Preview to show the selection. Restore this version first opens Content and changes and changes the inline banner into a confirmation, bringing the comparison into view before restoration. Confirm restore saves the content as a new draft version and leaves the published page unchanged. Selecting another version clears the prior restore confirmation. Back to current draft exits the historical preview. Download exports the displayed checkpoint with a version-specific filename, so the selected preview and exported page agree.

**The Draft Continuity Rule.** Preserve the selected Site's unsent message, mode and reading position when replies or view changes do not require replacing them. First visits and empty Sites show the welcome at the top; New Site resets that orientation and clears stale unread indicators and earlier-history scroll anchors. Only an existing conversation or pending reply follows the bottom, subject to the reader's position.

**The Version Clarity Rule.** Label historical previews explicitly, expose their comparison with the current draft before restore, keep a visible path back, and confirm restoration as a new draft before applying it.

**The Editable Handoff Rule.** Chat starters and reused messages prepare editable text for an explicit send. Preserve an existing unsent message, and require a clear choice before replacing conflicting notes.

### Preview and feedback

The preview presents its document state and publication action above a dark address strip and light page. The illustrative preview is labeled until a real draft exists. A saved draft exposes written save/privacy feedback below the canvas.

Direct navigation to a saved Site shows loading or unavailable content in both conversation and preview until that Site is resolved; it does not show the example as though it were the saved page. Publication exposes its public audience in a separate panel. Shared errors and confirmations appear above Chat and Preview and provide dismissal, with refresh available for errors.

Offline feedback says drafting can continue while sending waits for reconnection. Reconnecting feedback says saved progress is being checked and offers Check again. Returning to the workspace or regaining connectivity refreshes saved work without replacing unsent messages or conflicting note drafts. An uncertain reply first shows Checking your reply; a confirmed completed reply appears in the conversation. If its outcome remains unconfirmed, the error asks the user to refresh and check progress before trying again. Connection status never implies that an unconfirmed reply completed.

## Do's and Don'ts

### Do:

- **Do** preserve the existing GALX shell and indigo controls around the page canvas.
- **Do** keep authored-page paper and green ink inside the preview and its related content representations.
- **Do** preserve the left-conversation/right-preview arrangement on desktop and explicit panel switching on mobile.
- **Do** retain per-Site drafts and modes, respect the reader's scroll position, and offer a visible return to the latest message.
- **Do** start empty Sites at the top with the welcome visible and reset that orientation on New Site, keeping the composer below the conversation.
- **Do** distinguish editable project notes, the rolling conversation summary and saved page versions with clear labels.
- **Do** keep Page content and version comparisons in the right panel, with an outline and full readable text on mobile.
- **Do** preserve unsent text when preparing section edits or Discuss-to-Build handoffs, and resolve changed notes with explicit choices.
- **Do** match historical preview labels and downloads to the selected version, and explain that restore creates a new draft while publication stays unchanged.
- **Do** pair statuses with text, keep feedback visible in both mobile views, and distinguish loading from example content.
- **Do** distinguish offline drafting, reconnecting and an unconfirmed reply, with a visible progress check before retrying.
- **Do** preserve visible focus, keyboard access to conversation and history, mobile touch targets and reduced-motion behavior.

### Don't:

- **Don't** turn the page template's serif typography or light palette into global workspace defaults.
- **Don't** treat a preview, saved draft or queued address as evidence that a page is publicly live.
- **Don't** use a generic completion message in place of the actual turn reply or imply that Discuss changes the draft.
- **Don't** submit a prepared handoff automatically, overwrite conflicting notes silently, or present reconnection as confirmed reply completion.
- **Don't** add decorative kickers, glyph icons or hard block shadows to this workspace.
- **Don't** generalize local palette differences into detector exclusions for unrelated files.
