# Commercial research source register

All sources were accessed September 10, 2026. Primary product documentation establishes published packaging and behavior, not GALX profitability, competitor profitability or independently measured customer outcomes. Currency, plan, billing cadence and scope must be rechecked before procurement or a public comparison.

| ID | Publisher and exact source | Date available | Use and qualification |
| --- | --- | --- | --- |
| R1 | Vercel, [AI Gateway Pricing](https://vercel.com/docs/ai-gateway/pricing) | Updated September 7, 2026 | Core pricing and separately charged capabilities. The current page supersedes older search snippets; “no markup” does not mean every associated feature is free. |
| R2 | Cloudflare, [AI Gateway Pricing](https://developers.cloudflare.com/ai-gateway/reference/pricing/) | Updated May 19, 2026 | Free core features, paid components and unified-billing fee. Published plan limits still apply. |
| R3 | OpenRouter, [Pricing](https://openrouter.ai/pricing) and [FAQ](https://openrouter.ai/docs/faq) | No stable publication date shown | Use the current pricing table for numeric fees; the FAQ extraction omitted dynamic numeric values. Older request-count BYOK allowances are not used. |
| R4 | Portkey, [Pricing](https://portkey.ai/pricing) | No stable publication date shown | Free evaluation versus Production and enterprise scope. Do not assign enterprise governance to the $49 plan without confirmation. |
| R5 | Helicone, [Pricing](https://www.helicone.ai/pricing) | No stable publication date shown | Current $79 Pro and $799 Team listing, both with usage charges. An older [official overview](https://docs.helicone.ai/getting-started/platform-overview) contains different comparison pricing; current pricing takes precedence. |
| R6 | Intercom, [Fin AI Agent outcomes](https://www.intercom.com/help/en/articles/8205718-fin-ai-agent-outcomes) | July 30, 2026 | Defines outcome types, prices and reversals. Generic “all Fin outcomes cost $0.99” descriptions miss qualification pricing and channel scope. |
| R7 | Zapier, [How pay-per-task billing works](https://help.zapier.com/hc/en-us/articles/15279018245901-How-pay-per-task-billing-works-in-Zapier) | Updated August 15, 2026 | Continuation ceiling and different default/permission behavior across customer cohorts. GALX's opt-in proposal is a recommendation, not Zapier's universal default. |
| R8 | n8n, [Plans and Pricing](https://n8n.io/pricing/) | No stable publication date shown | Execution-oriented value unit with project, concurrent-execution and history limits. No inference that all third-party model usage is included. |
| R9 | Shopify, [Types of charges on your Shopify bills](https://help.shopify.com/en/manual/your-account/manage-billing/billing-charges/types-of-charges) | No stable publication date shown | Distinguishes recurring, usage and one-time charges. Packaging analogy only; no recommendation for payment distribution. |

The Stripe Directory was used for initial service discovery. Directory results were leads, not pricing or production-readiness evidence. No service was provisioned and no purchase or external message was made.

## Local evidence

| Record | Scope |
| --- | --- |
| [PRODUCT.md](../../../PRODUCT.md) | Current product boundary, including explicitly restored image studio and limits on unsupported claims |
| [pricingData.ts](../../../src/lib/data/pricingData.ts), [pricingSummary.ts](../../../src/lib/data/pricingSummary.ts), [PricingClient](../../../src/components/pricing/PricingClient.tsx) | Defined offers versus projected current pricing surface |
| [SmallBusinessClient](../../../src/components/solutions/SmallBusinessClient.tsx), [EnterpriseSolutionClient](../../../src/components/solutions/EnterpriseSolutionClient.tsx) | Additional offer and enterprise claims |
| [Unit economics draft](../../../docs/investors/04_UNIT_ECONOMICS_CAC_LTV_PAYBACK.md) | Financial assumptions and margin construction requiring correction |
| [Commercial thesis draft](../../../docs/investors/08_COMMERCIAL_THESIS_AND_DISCOVERY_PLAYBOOK.md), [governance draft](../../../docs/investors/09_ENTERPRISE_SPEND_GOVERNANCE_AND_CONTROL_PLANE.md) | Earlier positioning and unsupported outcome assertions; both explicitly commercial drafts |
| [Technical audit](../AUDIT.md), [verification](../VERIFICATION.md) | Reproduced defects, existing passing safeguards and limits of prior checks |
| [Render observations](render-observations.json) | Additional checks of three isolated build artifacts; no live production observation |

All segment choices, proposed prices, cost assumptions, time budgets and go/no-go thresholds are analytical recommendations. No market-size estimate, customer-demand percentage, retention benchmark or supplier discount is asserted as a measured fact.
