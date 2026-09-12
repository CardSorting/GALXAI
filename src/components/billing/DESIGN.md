---
name: GALX Billing — local Pro extension
description: The existing Billing plan section and its relationship to the Pricing Pro row.
colors:
  canvas: "#090b10"
  foreground: "#f4f4f5"
  body: "#d4d4d8"
  muted: "#a1a1aa"
  action-fill: "rgba(99, 102, 241, 0.2)"
  action-text: "#e0e7ff"
  action-border: "rgba(129, 140, 248, 0.4)"
  link: "#a5b4fc"
  divider: "rgba(255, 255, 255, 0.1)"
  control-border: "rgba(255, 255, 255, 0.15)"
  control-hover: "rgba(255, 255, 255, 0.05)"
typography:
  headline:
    fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: "2.25rem"
    letterSpacing: "-0.025em"
  headline-wide:
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: "2.5rem"
    letterSpacing: "-0.025em"
  title:
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: "1.75rem"
  body:
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.5rem"
  introduction:
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.75rem"
  control:
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.25rem"
rounded:
  control: "0.375rem"
spacing:
  compact: "0.5rem"
  control-gap: "0.75rem"
  standard: "1rem"
  action-gap: "1.25rem"
  section-inset: "1.5rem"
  section-gap: "2rem"
components:
  plan-primary:
    backgroundColor: "{colors.action-fill}"
    textColor: "{colors.action-text}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0.625rem 1rem"
  plan-secondary:
    textColor: "{colors.foreground}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0.625rem 1rem"
  pricing-primary:
    backgroundColor: "{colors.action-fill}"
    textColor: "{colors.action-text}"
    rounded: "{rounded.control}"
    padding: "0.625rem 1rem"
  section-link:
    textColor: "{colors.link}"
    typography: "{typography.control}"
---

# Design System: GALX Billing — local Pro extension

## Overview

**Creative North Star: "Established Billing and Pricing"**

This is a local record for `PlanPanel.tsx`, its placement in `BillingClient.tsx`, and the Billing page shell. The related Pro row is rendered by `src/components/pricing/PricingClient.tsx` through `src/app/pricing/page.tsx`. It extends the existing dark, compact account interface with restrained indigo actions and flat divided sections. It establishes no new product identity or global design rules.

The plan section makes terms, current access, and the next action readable in that order. Pricing presents the offer; Billing establishes the account's current status. The surrounding wallet remains a separate section. Product terms remain authoritative in the root `PRODUCT.md` and existing public plan data; this record captures how the interface presents them.

**Key Characteristics:**

- Dark canvas, neutral text, and restrained indigo controls.
- Flat sections and plan rows divided by fine rules.
- Available offer and current paid status expressed separately.
- Wrapping navigation and actions retain reading order on narrow screens.

## Colors

The local palette is a near-black canvas with cool neutral text and a small indigo accent vocabulary, extracted from the implemented utilities rather than the broader root palette.

### Primary

- **Soft indigo wash** (`action-fill`) and **pale indigo text** (`action-text`) identify the plan's forward action and Pricing's Choose Pro link.
- **Indigo outline** (`action-border`) bounds those controls without adding glow.
- **Quiet indigo** (`link`) identifies section links and the plan controls' keyboard-focus outline.

### Neutral

- **Near-black canvas** (`canvas`) is shared by Billing and Pricing.
- **Bright neutral** (`foreground`) carries headings and secondary controls; **soft neutral** (`body`) carries plan inclusion and unpaid-status text.
- **Muted neutral** (`muted`) carries supporting terms and loading or unconfirmed status.
- **Fine divider** (`divider`) separates sections and plan rows. **Control outline** (`control-border`) and **subtle hover wash** (`control-hover`) distinguish secondary actions.

Success and error messages use the existing emerald and red status treatments with explicit text. Color never supplies the entire status.

## Typography

The extension inherits Inter through the existing document font variable and fallback stack. There is no local display face. Semibold page and section headings establish hierarchy above regular body copy and sentence-case controls.

- **Page heading:** use `headline`, changing to `headline-wide` at the small breakpoint.
- **Section heading:** use `title` for Your plan and the adjacent Billing sections.
- **Introduction:** use `introduction` below the page title.
- **Body:** use `body` for plan terms and explanations; brief status lines use the control line height.
- **Controls and section navigation:** use `control`. The existing Pricing action uses medium weight (500).

Pricing's Pro name uses a smaller semibold heading (1.125rem with 1.75rem line height); its price is a semibold, tabular-number value (1.5rem with 2rem line height). These remain row-specific roles, not a new global type scale.

## Layout

Billing and Pricing share a centered, full-width main container capped at 64rem. Horizontal padding progresses from 1rem to 1.5rem at 640px and 2rem at 1024px. The main content begins with 2rem top padding and ends with 4rem bottom padding.

The page header ends with a divider. Its section navigation wraps with a 1.25rem gap. Billing places the plan section first, ahead of account details, Balance, Transactions, and Invoices and payments. Each major Billing section follows the established 2rem rhythm. Section anchors reserve 6rem of scroll clearance.

Within Your plan, the heading and Refresh plan control share a wrapping row with a 1rem gap. Supporting copy stays in normal document flow; the inclusion explanation is capped at 42rem. Actions follow status, wrap with a 0.75rem gap, and retain content-width controls. On narrow screens the refresh control and actions move onto further lines without changing their order.

Pricing's Pro row uses the same flat treatment as its neighboring plans. Below 640px it stacks name and price, inclusion details, and Choose Pro. At 640px it becomes three columns (`1fr 1.4fr 11rem`) with a 1.5rem gap and the action aligned to the end. It links directly to `/billing#plan`.

## Elevation & Depth

The local plan section and Pricing row use no shadows, blur, floating cards, or decorative depth. Spacing, thin dividers, and the low-opacity action fill supply separation. This describes these Billing and Pricing surfaces only; other GALX surfaces retain their own design records.

**The Flat Sections Rule.** Keep this extension in the existing document flow, separated by rules rather than an elevated plan card.

## Shapes

Plan controls reuse the modest `control` corner radius with a thin border (1px). The plan section and Pricing row have no rounded outer shell. Underlined text links remain text links; no new badges or decorative containers are introduced by this extension.

## Components

### Plan controls

The forward action is a restrained filled control; refresh and management are outlined controls. All plan controls share the same padding and radius. Billing's plan controls use the subtle neutral hover wash; Pricing's Choose Pro link strengthens its indigo fill on hover. Preserve the existing indigo keyboard-focus outline. Disabled buttons are visibly dimmed (opacity 0.5) and show the disabled cursor; an in-flight action displays Opening… and prevents repeated actions. These controls introduce no local motion or transform.

### Your plan

**The Offer and Status Rule.** An available plan's name and price must not imply that the account already has paid access; show current status separately before the action.

The offer line says Available plan unless paid access is confirmed. It presents GALX Pro at $20/month for one account. Supporting lines explain Sites inclusion with fair usage, no per-update charge, separate API and image usage, monthly renewal, and cancellation through the paid period. Keep those terms near the action and use the existing public plan source for the amount.

| State | Visible treatment and action |
| --- | --- |
| Checking | A textual status announces Checking your plan…; plan actions are disabled while loading. |
| Paid access confirmed | A success status says the paid plan is active and Sites is included; Open Sites replaces checkout. |
| No active paid plan | Neutral status explicitly says there is no active paid plan for Sites; checkout is enabled only when available. |
| Access unconfirmed | Muted text asks the user to refresh before starting an update; it does not claim paid access. |
| Status request failed | An inline alert supplies recovery guidance. Checkout stays disabled; Manage subscription becomes available after loading ends so a failed status check does not remove the cancellation route. |
| Action failed | An inline alert stays in the section with the controls available for the appropriate retry. |

Manage subscription is shown when a payment profile is known, or when no status could be loaded. A successfully loaded status without a payment profile omits it. Paid access alone does not prove that a payment profile is available. Preserve the loading and busy guards and the cancellation route on status failure.

The section is labelled by its heading. Progress and access messages use status semantics; actionable errors use alert semantics. Preserve visible text as well as color.

### Pricing relationship

Pricing describes an available Pro offer with one included seat, Sites creation and publishing under fair usage, and separate API and image billing. Choose Pro opens the Billing plan anchor, where account status determines the next action. Keep it within the established divided plan list; it is not a current-plan badge or an account-status summary.

### Existing Billing context

The Your plan anchor precedes Balance, Transactions, and Invoices and payments. Wallet top-ups, balance figures, transaction filters, and payment settings retain their own existing controls and behavior. Plan status must not be inferred from a wallet balance. Customer-facing transaction descriptions remain generic; private operational records are not interface content.

## Do's and Don'ts

### Do:

- **Do** retain the shared Billing and Pricing canvas, type hierarchy, dividers, and restrained indigo controls.
- **Do** distinguish the available Pro offer from confirmed paid status before presenting the next action.
- **Do** keep renewal, cancellation, inclusion, and separate usage terms readable beside the plan controls.
- **Do** let navigation and actions wrap while preserving their reading and keyboard order.
- **Do** preserve subscription management after a status failure and base known management availability on the payment profile.
- **Do** keep the wallet visually and conceptually separate from plan access.

### Don't:

- **Don't** turn this local extension into a new global identity, card system, or Sites design rule.
- **Don't** represent an available offer, wallet credit, or uncertain status as an active paid plan.
- **Don't** replace explicit status and error text with color alone.
- **Don't** copy account identifiers, actual balances, private ledger records, or review screenshots into design examples or public content.
