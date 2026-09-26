---
name: GALX Orbit — local patron panel
description: A scoped extension of the existing dark profile and billing interface.
colors:
  foreground: "#f4f4f5"
  status: "#e4e4e7"
  body: "#d4d4d8"
  divider: "rgba(255, 255, 255, 0.1)"
  control-border: "rgba(255, 255, 255, 0.15)"
  control-hover: "rgba(255, 255, 255, 0.05)"
  focus: "#a5b4fc"
  error: "#fca5a5"
typography:
  title:
    fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: "1.75rem"
  body:
    fontSize: "0.875rem"
    lineHeight: "1.5rem"
  control:
    fontSize: "0.875rem"
    lineHeight: "1.25rem"
rounded:
  control: "0.375rem"
spacing:
  action-gap: "0.75rem"
  works-gap: "1.5rem"
  section-inset: "2rem"
components:
  orbit-control:
    textColor: "{colors.foreground}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0.5rem 1rem"
---

# Design System: GALX Orbit — local patron panel

## Overview

**Creative North Star: "The established GALX dark world"**

This private record covers [OrbitPanel.tsx](OrbitPanel.tsx) within Star profiles and Billing. Preserve the incumbent sans-serif, dark zinc, quiet indigo focus, and divided sections. The panel explains a relationship to one Star and makes account state readable without creating a new visual identity. The [surface brief](../../../.impeccable/surfaces/src-components-community-orbitpanel-tsx.md) owns product strategy and dated review scope.

## Colors

Bright neutral carries controls, softer neutral carries terms, and pale indigo identifies keyboard focus. Fine neutral borders divide the section and outline controls. Error text uses the error tone with an explicit alert; test mode uses the existing amber warning treatment with explanatory text. Color never replaces a state label.

## Typography

Inherit the application Inter stack. The semibold section title precedes a regular 1rem price line and compact body terms. Patron Works use a smaller semibold heading (1.125rem); captions retain the body size. Keep dates and subscription state in readable sentences.

## Layout

The panel remains in document flow, with 2.5rem vertical margins and the section inset between top and bottom dividers. Body terms cap at 42rem. Actions wrap with the action gap and preserve source order. Patron Works start below a 2rem gap; their grid uses one column, two from 640px, and three from 1024px, separated by the works gap. Images preserve intrinsic proportions at full column width.

## Elevation & Depth

No panel shadow, blur, or floating overlay. Fine rules and vertical spacing define the section; cancellation confirmation expands inline.

## Shapes

Controls and image corners use the modest control radius. Controls have thin borders and a minimum 44px height. The outer section has no rounded card shell.

## Components

### Status and actions

Keep the title, monthly terms, scope explanation, status, and actions in that order. Signed-out visitors receive a sign-in link retaining the profile destination. Loading, unavailable, processing, and payment-attention states use plain explanatory text. Active and ending states name the patron relationship and supplied date explicitly in UTC. Management and cancellation appear only when status permits them; refresh remains distinct. Busy controls are disabled and dimmed; hover adds a neutral wash and focus uses a 2px indigo outline.

### Cancellation

Cancel renewal reveals an inline explanation that current paid access continues to the period end, followed by Confirm cancellation and Keep my Orbit. Only explicit confirmation submits cancellation. Completion is announced with `role="status"`; errors use `role="alert"`. Do not imply immediate access removal or a refund.

### Patron Works

Active and ending states show the patron gallery. Each figure links its image to the work artifact, uses the title as alternative text, and keeps a visible caption. Protected thumbnails use their authenticated artifact URL directly in an image element; do not send these URLs through a public image optimizer or shared public cache. Empty galleries explain that no patron Works are available and direct attention to the public archive below. Public work and following remain free.

## Do's and Don'ts

- **Do** preserve the existing dark world, wrapping 44px controls, explicit state text, and inline confirmation.
- **Do** keep Orbit independent from Foundry and the public archive.
- **Don't** turn availability into a purchase promise or a subscription into creative control.
- **Don't** treat local fixture screenshots as evidence of real-account payment or deployed acceptance.
