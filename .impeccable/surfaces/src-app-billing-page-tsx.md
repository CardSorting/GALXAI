---
version: 1
slug: "src-app-billing-page-tsx"
primary_target: "src/app/billing/page.tsx"
related_targets: ["src/app/billing/layout.tsx","src/components/billing/BillingWorkspace.tsx","src/components/billing/BillingProvider.tsx","src/components/billing/BillingClient.tsx","src/components/billing/PlanPanel.tsx","route:/billing/plan","route:/billing/credits","route:/billing/transactions","route:/billing/invoices","route:/billing/payment-methods"]
---

# Billing pages

Mode: Operate. The user requested separate billing pages and familiar paths comparable to established applications. Extend the existing dark, flat GALX billing design; no new visual identity, artwork or commercial terms.

Thesis: one billing task per address. Overview summarizes Foundry status and existing account credit, then points to Plan, Credits, Transactions, Invoices and Payment settings. Plan includes independent VANTA Orbit management below Foundry; historical Sites subscriptions retain their original terms and management. These are native links with active navigation, direct entry and browser history. A persistent desktop rail becomes a wrapping navigation on mobile. Headings and short descriptions identify each destination before the task controls.

First viewport: the existing GALX product header; left billing navigation at desktop; a content column with Billing breadcrumb, page title, task description and account context. The main action belongs to the page: review/manage a subscription, read existing credit, filter/export transactions, open an invoice, or open payment settings. New Orbit and Foundry subscriptions remain unavailable pending tax readiness; new Sites sales are closed. Overview has concise account summaries and task links rather than repeating every form. Motion is limited to ordinary state changes; nothing delays task entry.

Retained work: the shared layout owns account-scoped billing reads, the transaction filter and typed credit amount. Refresh or moving between pages preserves them; account changes clear them. Existing durable payment request identities survive retry. Pending receipt return links remain reachable through navigation. Reload preserves durable retries but does not promise draft storage. Unverified return parameters never grant access or confirm payment.

Compatibility: issued checkout URLs and old billing section anchors lead to the relevant canonical page. Server APIs retain owner authorization, allowlisted responses and restricted hosted payment management. Physical-device and live payment acceptance are separate from isolated browser fixtures.

Finish: inspect all six pages at desktop and phone widths, keyboard/navigation/empty/error states and 200% text. An independent finish reviewer audits the rendered evidence; record the final design from the implemented surface. No new imagery is needed.

September 26, 2026 scope: the independent reviewer accepted the Orbit/pricing extension. Billing was source-reviewed only in this pass; the isolated Orbit screenshots do not verify the rendered account shell or a real payment flow.
