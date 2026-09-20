# Recover Stripe webhook delivery

<!-- docs-scope: current-guide -->

## Purpose and trigger

Use for a Stripe failed-delivery alert or missing billing update. Owner: billing maintainer. Establish the affected account, mode, endpoint and existing event before changing configuration. The [current state](../../post-mortem/CURRENT_STATE.md) links dated acceptance; [September 15 diagnosis](../../post-mortem/incidents/2026/2026-09-15-stripe-test-webhook/README.md) records the separate test-account incident.

## Authority and prerequisites

Read the alert's account ID and URL, then confirm the authenticated account with `stripe whoami --format json`. The CLI profile can differ from the application's configured account. Inspect endpoint IDs, URLs, `livemode`, status and subscriptions without printing keys, signing secrets or customer payloads. Preserve the original event IDs and receipt history.

The active public billing path is the Image Studio subscription catalog (GALX
Pro, Creator, Studio, and MAX): subscription creation, updates and deletion,
invoice payment events, and the rest of the shared event allowlist. Readiness
also verifies the unique restricted customer portal: invoice history,
payment-method updates and period-end cancellation enabled; subscription changes
disabled. All four plans use the same one-account capability boundary; plan
names and prices do not grant unsupported seats, quotas, video, editing, or
workspace features. Private developer access is no longer a Stripe checkout
product. Its credential, allocation, metering, and revocation lifecycle is
administered in `/admin` and must not be inferred from a subscription event.

The application owns `/api/stripe/webhook` and `/api/internal/credits/stripe`. Its receiver verifies the unmodified body signature and requires the event's mode to match the configured key. `api.galx.ai` is not a billing receiver; `www.galx.ai` redirects. The production application origin is `https://galx.ai`. Test payments require an isolated test application, credentials and database, or local Stripe CLI forwarding to an isolated receiver.

## Procedure

1. List endpoints in the confirmed account and mode. Inspect failed-event metadata and Stripe's delivery-attempt result. A reproduced HTTP rejection is current evidence; it does not substitute for historical delivery logs.
2. Probe the exact URL without a signature. The application returns 400; 401 from the API host means the request did not reach billing. Check signature configuration only after establishing the correct receiver and payment mode. Never bypass API authentication or webhook signature/mode validation to obtain a 2xx response.
3. For an obsolete test endpoint, disable the exact endpoint with `stripe webhook_endpoints update <endpoint-id> -d disabled=true`, then read its state back. Retain its history. Disabling stops delivery attempts; it does not fulfill pending test events. If test fulfillment is required, first prepare the isolated receiver, install its matching signing secret privately, and verify the same account and mode before updating the endpoint and resending original events.
4. For a required live endpoint, use the application origin, matching signing secrets and the events in [the subscription allowlist](../../src/lib/billing/webhookEvents.ts). Preview existing subscription changes with `node --env-file=.env.local --import tsx scripts/sync-billing-webhooks.ts`; use `--apply` only after the compatible receiver is available. Do not run the master catalog provisioner as an incident-repair shortcut.
5. Verify configuration with `node --env-file=.env.local --import tsx scripts/verify-stripe-readiness.ts https://galx.ai`. Inspect event delivery state in the same live account. Replaying a real event can change billing state: inspect its durable receipt and reuse the existing event, rather than creating a new payment to test transport.

## Stop conditions

Stop dependent changes when account/mode ownership is uncertain, the signature does not verify, a required isolated receiver is absent, or fulfillment state is unknown. A test event must never enter the live ledger. Empty recent event history does not prove successful settlement. A 2xx response must follow durable processing or an explicitly ignored event under the receiver contract.

## Recovery and rollback

Retain endpoint IDs, event subscriptions, URL and prior status in private allowlisted evidence. Re-enable a disabled test endpoint only after an isolated receiver is verified; restoring a known failing production target reintroduces the incident. Do not delete receipts, rewrite ledger history or rotate unrelated live credentials. Apply application rollback only with the compatible durable billing schema.

The retired catalog provisioner and product seeder are guards; they cannot
recreate prepaid Developer or compute-pack objects. Pro provisioning must use
the existing live-authority, webhook, portal, and policy preflights. Private
developer access is provisioned through the existing admin control plane, not
through Stripe. This runbook does not authorize a live provisioning action.

## Verification and evidence

Run `npm run test:stripe` for the current Image Studio catalog and
retired-Developer billing boundary and
`npm run test:billing:lifecycle` for provider-state, portal, DTO, URL and
signature/mode/body checks. Run `npm run test:developer-preview` for the
independent reviewed-access boundary. Run
`node scripts/verify-billing-ux.mjs /private/tmp/galx-billing-audit-<validation-directory>`
with a production build made by `scripts/build-ci.mjs` without dotenv or live
credentials. The browser runner uses a synthetic Auth transport, blocks
external requests, checks desktop/mobile/200% text, all six billing
destinations, historical return compatibility, account-credit read-only
behavior and stops its local server. See [billing page contracts](../reference/billing-pages.md)
for navigation, state and release details. Never deploy that synthetic build.
For application changes, run the production build and compiled private-boundary
scan; perform live rendered/asset checks before making a live-site cleanliness
claim. Record provider state readback separately from local source tests and
any successful signed-event acceptance. Keep failed attempts, remaining test
fulfillment, settlement limits and prevention actions in the private incident
journal/register.
