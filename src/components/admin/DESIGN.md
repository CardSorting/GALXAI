---
name: GALX Preview Administration
description: Familiar staff workflows within the established GALX visual system
colors:
  background: "#07080d"
  surface: "#0d101c"
  surface-hover: "#14192d"
  surface-control: "#121628"
  foreground: "#f3f4f6"
  foreground-muted: "#9ca3af"
  foreground-secondary: "#d4d4d8"
  action: "#4f46e5"
  focus: "#6366f1"
  border: "rgba(255, 255, 255, 0.08)"
  border-control: "#71717a"
  success: "#34d399"
  waiting: "#fbbf24"
  danger: "#f43f5e"
typography:
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.875rem"
    lineHeight: 1.5
  heading:
    fontSize: "1.5rem"
    fontWeight: 600
  metadata:
    fontSize: "0.8125rem"
  caption:
    fontSize: "0.75rem"
rounded:
  badge: "6px"
  control: "8px"
  panel: "12px"
spacing:
  compact: "8px"
  control: "12px"
  field: "16px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "#fff"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-secondary:
    backgroundColor: "{colors.surface-control}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
---

# Design System: GALX Preview Administration

## Overview

This scoped record describes `PreviewAdminWorkspace.tsx` and `preview-admin.module.css` after the 2026-09-12 finish review. It extends [the root design system](../../../DESIGN.md) for staff workflows. The user chose familiar patterns from established applications; the implementation retains GALX's Inter typography, dark surfaces, restrained indigo and Lucide icons.

The surface is compact and task-focused: native controls, readable records and explicit consequences. Route strategy, roles and review evidence live in [the admin surface brief](../../../.impeccable/surfaces/src-app-admin-page-tsx.md).

## Colors

Indigo distinguishes the primary action, keyboard focus and current request. The action uses the established deeper indigo; focus uses the brighter indigo. Near-black page, dark panels and slightly lighter hover surfaces provide structure. Foreground, secondary and muted text establish a readable hierarchy.

Semantic colors supplement text: amber for waiting, emerald for approved or resolved, and rose for paused, expired and error treatments. Controls use stronger borders than panel dividers. Destructive actions retain light text on a dark fill with a rose border.

**The Named State Rule.** Every status keeps its readable text label; color never carries the state alone.

## Typography

Inter inherits from the application body; buttons and fields inherit the workspace font. The body and metadata scales are recorded above. Semibold headings distinguish the page, request email and section titles, with the request email at 1.25rem and section titles at 1rem. Labels use medium weight; action buttons and record titles use semibold. Dates and supporting account details stay compact. Long emails and prose wrap; request previews clamp to keep the inbox scannable.

## Layout

At widths above 1100px, a sticky staff rail sits beside the workspace, and the inbox/detail region uses two columns. Each pane scrolls independently, with a viewport-relative maximum height and a 540px minimum; short desktop viewports can also scroll the document. Inbox pagination remains visible at the pane bottom.

At widths up to 1100px, the request region displays either inbox or selected detail. Back and next controls remain explicit. At widths up to 680px, the staff rail becomes horizontal navigation, the account block is hidden, filters fill the width, and search occupies a separate row. Detail content flows with the document. Feedback, activity and staff views use a single bounded content panel.

Fields and related actions use tight spacing; separators and larger section gaps distinguish the project, decision, feedback and history. Text containers and flex rows permit wrapping. Public navigation and footer are absent from this staff workspace.

## Elevation & Depth

Panels are flat: tonal differences and crisp borders establish grouping. Selected requests add an inset indigo outline. The admin workspace does not add ambient panel shadows or backdrop blur. This describes the scoped build, rather than changing the root system's depth vocabulary.

## Shapes

Controls use modest rounded corners; containing panels use the larger panel radius. Status badges are compact rounded rectangles. Divider lines organize inbox rows and detail sections without separate nested cards for every record.

## Components

Buttons and native form fields have a minimum height of 44px. Visible keyboard focus uses a 2px indigo outline with a 3px offset; inbox-row focus is inset to remain visible inside clipped panels. Secondary and destructive buttons brighten their background on hover; primary buttons darken. Disabled buttons dim and show an unavailable cursor.

Native selects handle filters, decisions, expiry and roles. Textareas keep vertical resize and visible labels. Review and staff editors remain inline; the decision form names the affected account and immediate effect beside the submit action. Success uses a live status message, failures use an alert with a reload action, and a conflict retains the decision note while current records are refreshed.

At phone widths, form control text is 16px to preserve normal focus behavior in Safari. Decision notes remain in memory per request during workspace refresh and inbox navigation; a successful decision or loss of account access clears the corresponding draft. Drafts do not persist across a browser reload.

Navigation combines Lucide icons with visible labels and marks the active view. Inbox rows are full-width buttons with a selected state. Opening a request moves focus to its heading. A keyboard skip link reaches the workspace. Activity entries show readable subjects and event labels; dates, actors and state changes form the supporting line.

## Do's and Don'ts

- **Do** preserve the inherited palette, Inter and native control behavior.
- **Do** keep selected, loading, empty, success, conflict, read-only and lost-access states understandable.
- **Do** keep notes and action consequences close to the relevant control.
- **Don't** introduce a new visual identity, decorative artwork or ornamental motion into this task-focused surface.
- **Don't** treat fixture counts, capture dimensions or the review verdict as runtime guarantees.

Not canonized: one-off spacing, fixture content and broad deployment or performance claims are not reusable design rules. The scoped pass leaves the root design system and its sidecar unchanged.
