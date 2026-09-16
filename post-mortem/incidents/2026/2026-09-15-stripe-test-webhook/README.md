# Separate test-account Stripe webhook failure

<!-- docs-scope: operational-record -->

## Impact and scope

INC-20260915-STRIPE, SEV-3, billing, responder Codex. The owner reported six failed test-mode deliveries beginning September 12 at 04:29:54 UTC. Diagnosis on September 15 found four test events awaiting delivery on the separate reported account. No live billing failure was established.

## Evidence and cause

[Read-only diagnosis](diagnosis.json) records the exact endpoint and account identities. The API-host URL rejects unsigned Stripe-shaped POSTs with HTTP 401. The application receiver is reachable with HTTP 400 for a missing signature; its source verifies the signature and refuses test/live mode mismatch. The production account is different and has two enabled application endpoints, complete required subscriptions, and zero pending deliveries among its three events since the reported failure.

The current rejection is reproduced; Stripe delivery-attempt logs were not inspected. Merely changing the test endpoint URL to the live application would preserve a mode mismatch and cannot establish isolated test fulfillment.

## Containment and recovery

The owner was offered endpoint retirement or isolated test delivery. No separate isolated receiver was identified. Under the requested repair, the exact test endpoint was disabled through the approved Stripe operation. The [provider update and independent readback](endpoint-retirement.json) confirm disabled status with the original URL, subscriptions and history retained. Both live endpoints remain enabled and pass configuration readiness. Pending test events were not fulfilled or replayed; no payment, database or application deployment changed.

## Verification and limits

Provider metadata and unsigned HTTP were checked without initiating a payment or changing a ledger. Six subsequent live HTTP checks across both billing paths reject missing signatures, invalid signatures and signed test-mode payloads with allowlisted 400 responses and no injected diagnostic echo. Local route tests cover the same authorization/mode boundary and oversized bodies; billing DTO tests reject private/unexpected fields. Three provisioning guard tests and the production build pass. Live completed payments, refunds and isolated test fulfillment were not exercised. [Final verification](verification.json) records documentation and compiled-boundary results separately.

## Prevention and closure

FM-DEPLOY-002 applies: valid source does not imply matching target configuration. ACT-023 adds an explicit HTTPS-origin preflight before any master-provisioner writes; it rejects API/redirect hosts, the known live application host in test mode and the old implicit production fallback. [The current recovery runbook](../../../../docs/runbooks/stripe-webhook-delivery.md) describes matching account/mode/receiver, retirement and isolated test recovery. Custom hosts still require an operator isolation check. The incident is resolved by endpoint retirement, not by successful test-event fulfillment. The prevention source is local; no hosted runtime change is required for this operator script.
