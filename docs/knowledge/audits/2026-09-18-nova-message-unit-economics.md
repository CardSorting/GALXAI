<!-- docs-scope: operational-record -->

# Nova Developer message-unit economics audit — September 18, 2026

Status: superseded historical implementation record. This private evidence
documents the metered Developer Access activation that preceded the decision to
retire public Developer Access. It is retained for reconciliation and audit
history; it is not the current public contract. The current boundary is
documented in [Private developer access](../../operations/developer-preview.md)
and [Billing boundary](../../WALLET_AND_BILLING_STRATEGY.md).

## Historical decision boundary (superseded)

At the time of this audit, Nova Developer Access was modeled as a recurring
admission subscription and Developer API consumption was measured as one
completed message per successful request at $0.02/message. Those commercial
terms were superseded when public Developer Access was retired. The underlying
completed-message metering, reservation, accounting, and allocation machinery
remains retained for internal and explicitly authorized private use.

## Supplier benchmark

The internal benchmark used for margin protection is the current GPT-5.6 Luna supplier schedule: standard input $0.20 per million tokens, cached input $0.02 per million, cache writes $0.25 per million, and output $1.20 per million. Long-context and tool-call charges are separate supplier concerns and are not customer-facing units. Revalidate these figures before publishing a customer rate.

## Historical proposed contract shape

- Customer unit: one completed message, quantity `1`.
- Published launch rate: `$0.02` per message.
- Internal capacity guardrails: 16,000 input tokens and 4,000 output tokens per message.
- Internal reserve at the guardrail: $0.003 per message for infrastructure and retry risk.
- Worst-case benchmark supplier cost at the guardrail, without cache savings: $0.008 per message.
- Draft contribution before payment fees, support, tax, and fixed subscription allocation: $0.009 per message, or 45%.

The guardrails are supplier-risk controls, not a token pricing contract. If the product later supports larger context or tool-heavy requests, the message price must be re-underwritten or the capability separately constrained.

## Historical product-pattern analysis

- Twilio makes the billable unit explicit and presents usage as pay-as-you-go, while separating message, channel, and volume effects. Nova should keep the customer unit singular: one completed message, with capability limits handled separately rather than turning tokens into a second billable dimension.
- Vercel AI Gateway uses layered budgets at team, project, key, and user scope, with reset periods and pre-request rejection. Nova should add organization/key spend controls before launch, while keeping the public contract per-message.
- Anthropic and OpenAI use visible billing status, credit/payment failure behavior, and clear stop conditions. Nova should make activation state, current-cycle usage, next invoice timing, and limit behavior first-class UX states instead of hiding them in checkout copy.
- Stripe’s meter flow is an asynchronous event ledger. The outbox added here follows that pattern: durable event identity, deduplication, retryable delivery, and reconciliation before invoice acceptance.

These are product-pattern comparisons, not claims that Nova currently has those
providers’ billing behavior. They document the design inputs used for the
retired public meter; current private access uses the same operational ideas
without exposing supplier topology or token economics.

## Comparative meter audit

| Pattern | What customers understand | What GALX should borrow | What GALX should avoid |
| --- | --- | --- | --- |
| Twilio-style per-message | A visible unit, pay-as-you-go total, and volume scaling | Keep one customer unit and show the running quantity | Passing supplier variability through as multiple customer dimensions |
| Postmark/SendGrid-style message plans | A predictable monthly envelope with explicit overage behavior | Publish a clear monthly cap and the exact stop/overage rule | Leaving customers to infer whether a cap is hard, soft, or unlimited |
| Vercel AI Gateway budgets | Spend controls attached to a key/project/team and a clear limit response | Add key and organization caps, alerts, reset dates, and a deterministic limit error | Relying on an invoice-only surprise after a runaway loop |
| OpenAI/Anthropic API pricing | Token pricing is precise but requires cost literacy | Keep supplier tokens private as risk guardrails and expose a simpler message unit | Calling a fixed message “fair” without request-size limits |

### Historical audit verdict

The meter decision was approved as a live financial contract at the time of this
record. Per-message accounting was selected because the request envelope was
bounded and the user could see the rate, cap, and stop behavior. Public billing
and conversion recommendations below are historical and no longer authorize a
commercial launch.

The conversion tradeoff is explicit:

- A pure `$0.02/message` meter protects simplicity and preserves the no-token-selling promise.
- A `$50/month` access fee plus unknown usage creates commitment anxiety before the first successful request.
- A limited first-use path—either a short trial or a small approved message allowance—would reduce activation friction, but it is a separate commercial decision and must not be silently introduced as “included credits.”

Recommended follow-up experiment: keep the `$50/month` access subscription and `$0.02/message` live meter, then test a clearly labeled first-use allowance against no allowance with a fixed cohort. Measure checkout completion, first successful request, seven-day activation, and projected gross margin. Do not make the allowance permanent until the cohort data supports it.

## Historical owner recommendation

The commercial recommendation is now activated:

| Contract element | Recommended launch decision | Why it is the strongest default |
| --- | --- | --- |
| Customer unit | One completed message | Familiar like messaging/email APIs and easy to reconcile |
| Public rate | `$0.02/message` | Simple mental math, positive contribution at the 16k/4k envelope |
| Request envelope | 16k input / 4k output | Prevents a fixed message price from becoming an unbounded supplier liability |
| Billing timing | Aggregate in the monthly invoice | Avoids a payment interaction on every request |
| Failed work | No charge for rejected, failed, or duplicate work | Aligns the charge with a completed customer outcome |
| Default spend control | Hard monthly cap, with 50%/80%/100% alerts | Makes the worst-case bill knowable before a runaway loop |
| First-use conversion path | A separately labeled, time-boxed allowance or trial experiment | Reduces the $50-before-value objection without quietly turning access into credits |

The first-use path must be tested as a distinct offer. It should not be described
as an included balance, and it must have an explicit expiry, eligibility rule, and
stop condition. If the team does not want that experiment, the fallback is to keep
the access subscription and show the exact `$0.02/message` estimate before checkout;
conversion will likely be lower, but the economics and disclosure remain cleaner.

The hard-cap implementation is intentionally stricter than an invoice-only model.
The application should reserve the next message before dispatch, release the
reservation on failure, and reject a request when the reservation would cross the
customer's cap. A monthly summary should show quantity, rate, accrued amount,
cap, reset date, and the next invoice timing. The reservation and release controls
are live. The billing workspace now shows an authenticated message summary with
quantity, accrued/remaining dollars, cap progress, reset date, and durable in-app
threshold notices. Email delivery is not implied by the in-app notice.

## Historical activation and reconciliation sequence

The release gate required four contract decisions before Stripe usage activation: public per-message rate, request limits, failure/refund behavior, and spend controls. This mirrors the familiar “unit + budget + stop condition” pattern used by usage APIs, while keeping the subscription access Price independent from future consumption billing.

The intended execution sequence is:

1. Publish the customer contract and activation date.
2. Provision the Meter and metered Price idempotently.
3. Implement the hard-cap reservation path and delivery worker.
4. Run shadow reconciliation against the private message outbox.
5. Canary an approved cohort and compare completed-message rows to accepted meter events.
6. Monitor invoice previews, retries, caps, and failed-payment webhooks.

## Implementation recorded in this pass

1. Added a private, versioned economics policy using integer message semantics and deterministic micro-dollar calculations.
2. Added a private database outbox with a unique `(user_id, request_id, contract_version)` key so retries cannot create duplicate future meter events.
3. Enqueued the outbox record after the authoritative completed usage event. A later reconciler can replay missing outbox rows; the request path does not call Stripe.
4. Published `USAGE_PRICING.ratesPublished = true` and opened consumption behind the active subscription and reservation gate.
5. Preserved legacy token accounting for historical/provider reconciliation paths; it is not the Nova customer unit.
6. Reworked the usage page around familiar billing expectations: what counts, when usage appears, the published rate, cap behavior, and alert thresholds.

## Historical approval gates and closeout state

- The migrations are applied in production and verified: 132 applied, 0 pending, 0 remote-only.
- The application and worker changes are deployed together and smoke-tested.
- The live access Product and recurring Price are provisioned.
- The live usage Meter is `mtr_61VQZJTndERxmvhl941IA2zQnWbn5U7E` and the metered Price is `price_1UHBMCIA2zQnWbn5NtHPfCox`.
- The production application reserves and commits message units atomically; the Cloudflare worker delivers the private outbox to Stripe with idempotent identifiers and retries.
- The billing workspace exposes the current message summary and durable in-app 50%/80%/100% threshold notices. The summary is materialized on authenticated reads and does not require a real-customer canary.
- Remaining work is operational reconciliation and the optional first-use conversion experiment. Tax registration/configuration must be completed before collecting applicable tax.

No customer, subscription, payment, or consumption charge was created by this activation work.

## Dated release closeout evidence — September 18, 2026

- Production Supabase readback: 132 applied migrations, 0 pending, 0 remote-only.
- Vercel production deployment: `dpl_q1GLBjL5HpKRvNwshMsrpp19F5Fr`, status `Ready`, aliases verified on the canonical web domains.
- Cloudflare Worker production version: `9712cd56-aaad-40f5-b5bb-616899e15712`, custom API domain deployed.
- Public pricing smoke check: HTTP 200; page contains `$0.02/message`, `$25 cap`, and active-meter messaging.
- API boundary smoke check: unauthenticated `/v1/models` returns HTTP 401; no inference or usage event was created.
- The guarded provisioning script used the live key from `.env.local` and verified the live Meter and metered Price.

The earlier “no deployment performed” statement is superseded by this dated closeout evidence. The live Stripe access Product, recurring Price, Meter, and metered Price were provisioned through guarded idempotent scripts using the production key from `.env.local`; the readback confirmed zero customers, subscriptions, payments, and consumption charges at activation.
