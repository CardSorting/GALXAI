---
name: GALX Billing — local account workspace
description: The six Billing pages and their relationship to the Pricing Pro row.
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

# Design System: GALX Billing — local account workspace

## Overview

**Creative North Star: "Established Billing and Pricing"**

This is a local record for the shared `BillingWorkspace.tsx` shell, account state in `BillingProvider.tsx`, the six destinations rendered by `BillingClient.tsx`, and their plan and credit controls. The related Pro row is rendered by `src/components/pricing/PricingClient.tsx` through `src/app/pricing/page.tsx`. It extends the existing dark, compact account interface with restrained indigo actions and flat divided sections. It establishes no new product identity or global design rules.

Overview summarizes plan access and any existing account credit, then links to each billing task. The Plan page makes current access, terms, and the next action readable; Credits is a read-only account-credit and history surface. Pricing presents the offer; Billing establishes the account's current status. Product terms remain authoritative in the root `PRODUCT.md` and existing public plan data; this record captures how the interface presents them.

**Key Characteristics:**

- Dark canvas, neutral text, and restrained indigo controls.
- Flat sections and plan rows divided by fine rules.
- Available offer and current paid status expressed separately.
- Separate billing destinations within one persistent navigation and account context.
- Wrapping navigation and actions retain reading order on narrow screens.

## Colors

The local palette is a near-black canvas with cool neutral text and a small indigo accent vocabulary, extracted from the implemented utilities rather than the broader root palette.

### Primary

- **Soft indigo wash** (`action-fill`) and **pale indigo text** (`action-text`) identify the plan's forward action and Pricing's Choose Pro link.
- **Indigo outline** (`action-border`) bounds those controls without adding glow.
- **Quiet indigo** (`link`) identifies task links and the plan controls' keyboard-focus outline. Active Billing navigation uses pale indigo text over a subtle neutral wash.

### Neutral

- **Near-black canvas** (`canvas`) is shared by Billing and Pricing.
- **Bright neutral** (`foreground`) carries headings and secondary controls; **soft neutral** (`body`) carries plan inclusion and unpaid-status text.
- **Muted neutral** (`muted`) carries supporting terms and loading or unconfirmed status.
- **Fine divider** (`divider`) separates sections and plan rows. **Control outline** (`control-border`) and **subtle hover wash** (`control-hover`) distinguish secondary actions.

Success and error messages use the existing emerald and red status treatments with explicit text. Amber identifies payment attention and stale-filter notices. Color never supplies the entire status.

## Typography

The extension inherits Inter through the existing document font variable and fallback stack. There is no local display face. Semibold page and section headings establish hierarchy above regular body copy and sentence-case controls.

- **Billing page heading:** use `headline` at all widths. Allow words to break when necessary so narrow screens and enlarged text stay within the content column.
- **Pricing page heading:** use `headline`, changing to `headline-wide` at the small breakpoint.
- **Section heading:** use `title` for plan, account-credit and task sections.
- **Introduction:** use `introduction` below the page title.
- **Body:** use `body` for plan terms and explanations; brief status lines use the control line height.
- **Controls and task links:** use `control`. Billing navigation uses the same size with a 1.5rem line height, and medium weight (500) for the active page. Pricing and wallet primary actions also use medium weight (500).

Pricing's Pro name uses a smaller semibold heading (1.125rem with 1.75rem line height); its price is a semibold, tabular-number value (1.5rem with 2rem line height). These remain row-specific roles, not a new global type scale.

## Layout

Billing uses a centered, full-width shell capped at 80rem beneath the existing product header. Horizontal padding progresses from 1rem to 1.5rem at 640px and 2rem at 1024px. The shell has 2rem top padding and 6rem bottom padding. At 768px, its grid uses an 11rem navigation rail and a flexible content column with a 2.5rem gap. The content column has a 56rem maximum width and can shrink without overflowing.

Below 768px, the six navigation links wrap above the content with a 0.25rem gap, a bottom divider and 1.25rem bottom padding. Navigation and content have a 1.75rem gap. Preserve link order and keep every destination exposed. A Billing breadcrumb precedes the page header; its heading, short description and bottom divider identify the current task. Account context and task content follow with 1.5rem top padding and a 1.75rem vertical rhythm. The account email can break across lines.

Within the full Plan page, the status heading and Refresh plan control share a wrapping row with a 1rem gap. Supporting copy stays in normal document flow and is capped at 42rem. Actions follow status and terms, wrap with a 0.75rem gap, and retain content-width controls. On narrow screens refresh and actions move onto further lines without changing their order. The compact Overview plan summary has a 0.75rem heading/action gap and a bottom divider; it links to Plan instead of repeating the full offer and management controls.

Credit figures stack below 400px, use two columns from 400px, and expand to three columns on the full Credits page from 1024px. Transactions use a divided list below 640px and a horizontally scrollable table above it. Invoice rows, amounts and actions wrap at narrow widths and enlarged text sizes.

Pricing retains its separate centered 64rem container, 2rem top padding and 4rem bottom padding. Its section navigation wraps with a 1.25rem gap, and its section anchors retain 6rem scroll clearance. The Pro row uses the same flat treatment as its neighboring plans. Below 640px it stacks name and price, inclusion details, and Choose Pro. At 640px it becomes three columns (`1fr 1.4fr 11rem`) with a 1.5rem gap and the action aligned to the end. It links directly to `/billing/plan`.

## Elevation & Depth

The Billing workspace, local plan section and Pricing row use no shadows, blur, floating cards, or decorative depth. Spacing, thin dividers, and the low-opacity navigation and action fills supply separation. This describes these Billing and Pricing surfaces only; other GALX surfaces retain their own design records.

**The Flat Sections Rule.** Keep this extension in the existing document flow, separated by rules rather than an elevated plan card.

## Shapes

Controls, inputs and navigation links reuse the modest `control` corner radius; form and action controls have a thin border (1px). The plan section and Pricing row have no rounded outer shell. The desktop transaction table retains its existing rounded border (0.5rem). Underlined task links remain text links; active navigation uses a filled link rather than a badge.

## Components

### Plan controls

The forward action is a restrained filled control; refresh and management are outlined controls. All plan controls share the same padding and radius. Billing's plan controls use the subtle neutral hover wash; Pricing's Choose Pro link strengthens its indigo fill on hover. Preserve the existing indigo keyboard-focus outline. Disabled buttons are visibly dimmed (opacity 0.5) and show the disabled cursor; an in-flight action names the operation (Opening checkout or Opening billing) and prevents repeated actions. These controls introduce no local motion or transform.

### Billing navigation and task pages

Native links support direct entry, browser history and visible keyboard focus. The active link uses `aria-current="page"`, medium weight, pale indigo text and a neutral wash. Inactive links use muted text, with a subtle hover wash and brighter text. Links have a minimum 44px height. A separate breadcrumb identifies Billing and the current page.

| Destination | Canonical address | Content and main action |
| --- | --- | --- |
| Overview | `/billing` | Compact plan status, existing account-credit summary and task links. Refresh checks both the plan and credit summaries. |
| Plan | `/billing/plan` | Full access, subscription and renewal details; choose or manage Pro as account status permits. |
| Credits | `/billing/credits` | Existing account-credit figures and history; private API access is not a public billing plan. |
| Transactions | `/billing/transactions` | Transaction filter, loaded rows, pagination and Export loaded rows. |
| Invoices | `/billing/invoices` | Recent invoice rows, individual invoice links and hosted invoice history. |
| Payment settings | `/billing/payment-methods` | Hosted payment-method management and links to Plan and Invoices. |

Previously issued checkout return URLs and saved Billing section anchors resolve to the relevant canonical page. Pending return destinations remain reachable from navigation; they do not establish payment success. Use the canonical destination registry in navigation, search and new interfaces. Credits remains available for existing account-credit records and historical payment reconciliation; it is not a private API usage ledger. Private API access is administered separately for explicitly authorized cohorts and is not a public purchase path; saved legacy bookmarks resolve through middleware, with unsupported purchase plans returning to Pricing.

### Overview and full Plan

**The Offer and Status Rule.** An available offer, a subscription record and verified Pro access are separate facts. Only the server's access result controls the Open Sites action. A checkout return URL never proves payment.

Overview shows the plan name or Your plan, a short status, any supplied period/end date, and View plan or Review payment linking to Plan. Its Refresh action checks both account credit and the compact plan status; each summary can announce its own refresh or failure while keeping its last checked data.

The full Plan page uses a flat section with a wrapping heading/refresh row, a two-column detail list when space permits, then product terms and actions. Show the Pro offer at $10/month for one account when choosing a plan; preserve the existing commercial terms. Include the published Image Studio experience and fair-use boundaries near the action. Private API access is not a public subscription, does not appear as a public plan, and remains an administrator-controlled capability for approved cohorts. Display the current billing-period end or scheduled subscription end only when the server supplies it; complimentary access does not invent a renewal date. Dates are explicitly UTC. The following action states apply to the full Plan page; Overview routes to that page.

| State | Visible treatment and action |
| --- | --- |
| Initial check | Checking status; checkout disabled. Billing management remains reachable. |
| Refresh | Keep the previous plan in place, announce Refreshing, and reject obsolete responses. |
| Confirmed Pro access | Active access text and Open Sites. Paid-subscription details remain separate from access. |
| No subscription / ended subscription | Available offer and Choose Pro at the stated price, only when the server permits checkout. |
| Scheduled cancellation | Explicit subscription-end date and canceled-renewal copy; existing verified access can continue. |
| Payment required | A text warning and Review payment opens the restricted Stripe portal, including when an independent grant still provides Pro access. |
| Paused / processing / unconfirmed | State-specific explanation and billing management; no second subscription checkout. |
| Returned from checkout | Bounded read-only confirmation checks; no success claim from the URL and no automatic purchase replay. |
| Checkout closed | Resume checkout uses the retained request identity. |
| Status failure | Keep last checked details with an explicit stale-data notice; block new checkout and preserve management. |

Plan management, invoice history and payment settings use the restricted hosted billing portal. Customer payment updates, invoices and period-end cancellation are available; arbitrary plan/quantity changes stay disabled. An unavailable portal yields a recoverable error rather than a fallback to a broader configuration.

Controls have a minimum 44px height. Loading labels identify the actual action. Status uses polite announcements, errors use alerts, keyboard focus remains visible, and all actions wrap.

### Credits, transactions and account continuity

Credits is a read-only continuity surface for existing account balances, historical payment records and refunds. It does not offer preset amounts, custom amounts, quotes, automatic reload or private API usage billing. Historical return and payment status records remain visible without turning a URL or old payment into a new access grant.

The shared account layout retains the typed credit amount, transaction filter, last checked wallet data and pending-return context while moving among Billing pages. Refresh preserves that state; an account change clears it. Payment retry identity is retained separately from the typed draft. Do not promise that a page reload saves the draft, or replay a purchase automatically when revisiting a return URL.

Transactions identify the loaded filter when it differs from the selected filter. Export includes only loaded rows and stays disabled during loading, failure or a filter mismatch. Empty transaction and invoice states explain what will appear and link to the related task. Customer-facing transaction descriptions remain generic; private operational records are not interface content.

### Loading and recovery

The Billing shell and task identity remain visible while the account or page loads. Sign-in preserves the intended billing destination. An unavailable account offers Retry account; a page failure offers Try again and Billing overview. Keep errors short and actionable without implementation diagnostics.

On a billing read failure, retain last checked amounts with an explicit stale-data notice; keep account-credit history read-only. Plan failures likewise keep last checked plan details, block a duplicate checkout and preserve management. Hosted-payment errors remain next to the relevant action. Status and return parameters never substitute for verified account state.

### Pricing relationship

Pricing describes an available Pro offer with one included seat, Sites creation and publishing under fair usage, and separate API and image billing. Choose Pro opens `/billing/plan`, where account status determines the next action. Keep it within the established divided plan list; it is not a current-plan badge or an account-status summary. Plan status must not be inferred from a wallet balance.

## Do's and Don'ts

### Do:

- **Do** retain the shared Billing and Pricing canvas, type hierarchy, dividers, and restrained indigo controls.
- **Do** distinguish the available Pro offer from confirmed paid status before presenting the next action.
- **Do** keep renewal, cancellation, inclusion, and separate usage terms readable beside the plan controls.
- **Do** let navigation and actions wrap while preserving their reading and keyboard order.
- **Do** keep six canonical billing destinations and use Overview for concise summaries and task links.
- **Do** refresh both Overview summaries and preserve account drafts and filters during billing navigation.
- **Do** preserve subscription management after a status failure and base known management availability on the payment profile.
- **Do** keep historical account credit visually and conceptually separate from Pro plan access and administrator-controlled private access.

### Don't:

- **Don't** turn this local extension into a new global identity, card system, or Sites design rule.
- **Don't** represent an available offer, wallet credit, or uncertain status as an active paid plan.
- **Don't** replace explicit status and error text with color alone.
- **Don't** copy account identifiers, actual balances, private ledger records, or review screenshots into design examples or public content.
