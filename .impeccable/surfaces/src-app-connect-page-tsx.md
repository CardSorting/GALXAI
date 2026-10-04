---
version: 1
slug: "src-app-connect-page-tsx"
primary_target: "src/app/connect/page.tsx"
related_targets: ["src/components/connect/ConnectPanel.tsx","src/components/connect/connect.module.css","src/app/connect/consent/page.tsx","route:/connect","route:/connect/consent"]
---

# GALX Connect

Mode: Operate. Scope: application consent and connection management for an existing GALX account. The task is to authorize a chosen tool to use account inference access without requiring media participation. Product and access authority remains in [PRODUCT.md](../../PRODUCT.md).

This surface extends the existing AuthEntryShell: a narrow single column, dark ground, established auth typography, cyan links, full-width primary and secondary buttons, and quiet supporting copy. Desktop centers the content; mobile starts it below the header. Application names and account text wrap. No new visual identity, comp, imagery, or global design rules were introduced.

The ready consent view leads with the chosen application and signed-in account, then explains inference permission, content processing, excluded library/payment/publishing rights, and the data-handling link before Allow access and Cancel. The decisive moment is an explicit permission choice with a visible route back to connection management. Missing entitlement remains a notice: the account can still consent, with requests dependent on later access.

Management leads with account access status and a list of applications, each with permission, connection date, and a disconnect action. Confirmed disconnection removes the entry and announces that new tasks are blocked while work already started may finish. Copy keeps disconnection distinct from stopping a task or ending a pass. Failed disconnection retains the entry and offers retry; the empty state points back to a supported application's Connect with GALX action.

Loading, signed-out, expired/invalid request, consent failure, pending decisions, and unavailable data have explicit status or recovery states. Changing accounts unmounts the prior account's view. Tokens and operational diagnostics never render. Disconnect buttons preserve the visible action in their accessible name and append the application name as hidden context.

Evidence, October 3, 2026: [local fixture results](../review/connect/results.json) record 14 state/viewport checks at 1440px and 390px with zero Axe violations. Consent and management captures are `../review/connect/{consent,connections}-{1440,390}.png`. The final finish-review verdict was `ship` at F1 scope after the disconnect label-in-name correction. These are isolated compiled-preview fixtures with synthetic intercepted account/API data. The feature remains disabled by default; activation and hosted acceptance remain outstanding. Dated release evidence belongs in [current state](../../post-mortem/CURRENT_STATE.md).
