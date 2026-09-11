# Sources

All external sources below were accessed September 10, 2026. They are primary documentation unless marked otherwise. Undated documentation is a snapshot, not a promise of future terms. Prices and model availability must be checked again at procurement and launch. No external source establishes GALX's negotiated costs, supplier authorization, or live availability.

## S01

Cursor. [Spend limits](https://prod.cursor.com/help/account-and-billing/spend-limits). Undated documentation. Supports explicit on-demand limits, controls over who changes them, and the documented possibility of delayed enforcement. The unusual `prod.cursor.com` URL is on Cursor's domain and was the accessible current help page; the alternate `cursor.com/help/.../usage-and-limits` page did not resolve.

## S02

Cursor. [Pricing](https://cursor.com/pricing). Undated, live pricing page. Supports subscription packaging and differentiated individual/team plans. The separately indexed `docs.cursor.com/account/pricing` page contains September 2025 transition material; its historical allowance figures are not used as current prices in this report.

## S03

Poe. [Poe Purchases FAQs](https://help.poe.com/hc/en-us/articles/19945140063636-Poe-Purchases-FAQs). Help-center article. Supports subscription points and separately purchased add-on points. The article specifies a one-year lifetime for add-on points; this is a competitor term, not a recommended GALX expiration policy.

## S04

Hugging Face. [Inference Providers: Pricing and Billing](https://huggingface.co/docs/inference-providers/pricing). Undated documentation. Supports monthly credits, centralized consumption, pay-as-you-go, and a stated no-markup inference policy. It does not establish wholesale economics for GALX.

## S05

OpenRouter. [Provider Routing](https://openrouter.ai/docs/guides/routing/provider-selection). Undated documentation. Supports provider constraints, required-parameter matching and endpoint-level ZDR filtering. Defaults can accept unsupported parameters. Product behavior must be configured and tested; API compatibility alone does not enforce parity.

## S06

OpenRouter. [Model Fallbacks](https://openrouter.ai/docs/guides/routing/model-fallbacks). Undated documentation. Distinguishes model substitution from provider selection and documents charging by the model ultimately used. GALX's proposed customer-price contract deliberately requires advance authorization for a higher price.

## S07

OpenRouter. [Provider Logging](https://openrouter.ai/docs/guides/privacy/provider-logging). Undated documentation. Establishes that suppliers have different data policies. Its broad statement about retention routing is in tension with the explicit `zdr` parameter in S05. Use S05 for the specific parameter, verify selected endpoints and contractual scope, and do not equate training opt-out with no retention.

## S08

LiteLLM. [Router — Load Balancing](https://docs.litellm.ai/docs/routing). Undated project documentation. Reference for model groups, classified retries, cooldowns and shared routing state. This is a design comparison, not a recommendation to add another service immediately.

## S09

LiteLLM. [Budgets, Rate Limits](https://docs.litellm.ai/docs/proxy/users). Undated project documentation. Documents pre-request cost reservations, settlement, and stale-counter/fail-closed tradeoffs. It also identifies reservation limitations for some image/audio and batch paths. Adopting a gateway does not remove GALX's obligation to verify every paid capability.

## S10

Anthropic. [OpenAI SDK compatibility](https://platform.claude.com/docs/en/cli-sdks-libraries/libraries/openai-sdk). Undated Claude Platform documentation; redirected from `docs.anthropic.com/en/api/openai-sdk`. Describes an evaluation-oriented compatibility layer, unsupported/ignored fields, and the native API's fuller feature support. Supports a native production adapter for a Claude candidate.

## S11

Google. [OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai). Undated Gemini API documentation. Establishes an evaluation path for a Google candidate. It does not demonstrate parity with GALX tools, output schemas, usage accounting, or privacy requirements.

## S12

Cloudflare. [Fallbacks](https://developers.cloudflare.com/ai-gateway/configuration/fallbacks/). Page updated April 20, 2026. Documents provider/model fallback on errors or configured timeouts and a routing-step response header. Such diagnostic headers would stay private in GALX.

## S13

Cloudflare. [Unified Billing](https://developers.cloudflare.com/ai-gateway/features/unified-billing/). Page updated August 7, 2026. Documents prepaid credits, provider-rate pass-through, a 5% credit-purchase fee, and possible negative balances. This fee is included in procurement comparison, not assumed to apply to GALX's present service.

## S14

Google. [Site Reliability Engineering: Handling Overload](https://sre.google/sre-book/handling-overload/). SRE book chapter. Supports limiting both attempts per request and aggregate retry amplification, and preventing retries at multiple layers from multiplying work. Its example numbers are not universal defaults.

## S15

Google. [The Site Reliability Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/). Workbook chapter. Supports user-relevant service indicators, error budgets, and reliability-driven release decisions. Proposed GALX thresholds are explicitly management choices requiring measurement.

## S16

Amazon Web Services. [Retry behavior](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html). Current SDK reference. Supports retry classification, quotas and jitter. No AWS-specific timing constant is transplanted into GALX.

## S17

OpenAI. [Compare models](https://developers.openai.com/api/docs/models/compare). Current API reference. Confirmed the public text rates present in the local catalog: Sol $4/$20, Terra $2/$12 and Luna $0.20/$1.20 per million input/output tokens, with cached-input rates $0.40/$0.20/$0.02. These are public reference prices, not verified GALX supplier invoices or evidence of an arbitrary alias's execution identity.

## S18

Stripe. [Compare basic usage-based billing and Metronome](https://docs.stripe.com/billing/subscriptions/usage-based/compare-metronome). Current documentation, read through the Stripe documentation CLI. Supports retaining simple existing metering and evaluating Metronome for credits, complex rating and enterprise contracts; identifies Checkout integration limitations. No service was provisioned.

## S19

Google Cloud. [Provisioned Throughput](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/provisioned-throughput). Current documentation; old Vertex AI paths redirect to the current product documentation. Supports evaluating reserved capacity when demand and contract requirements justify commitment. No capacity or SLA for a GALX account was verified.

## Internal evidence

- Repository revision `4587642`, inspected September 10, 2026. File and line references are in [AUDIT.md](AUDIT.md). Source inspection proves the checked code paths, not deployment identity.
- [September 9 egress and recovery audit](../../docs/internal/EGRESS_RECOVERY_AUDIT_2026-09-09.md). Dated operational evidence; earlier fixes and remaining reconciliation boundaries are not independently re-certified here.
- [September 9 session verification](../../docs/maintainers/RELAY_SESSION_VERIFICATION_20260909.md). Dated component/deployment boundaries. Historical fleet counts are not used as current inventory.
- [Diagnostic observations](audit-observations.json), [probe source](audit-probes.mjs), and [asset scan](asset-scan.json). Synthetic local evidence; see [VERIFICATION.md](VERIFICATION.md).
- Stripe Directory searches for AI inference/provider capabilities returned Hugging Face among the candidates. The CLI reported unauthenticated, non-account-scoped results. Directory descriptions were discovery leads only; official documentation supports the comparison. No purchase, terms acceptance, external message or account provisioning occurred.

Supplier status-page percentages, market-share claims, third-party benchmark rankings and unverified discounts are deliberately absent. These would add apparent precision without establishing the decision at hand.
