# Checkout tax omitted

<!-- docs-scope: operational-record -->

September 26, 2026; SEV-3; contained; responder Codex.

The owner reported Stripe Tax showing 4/4 recent Checkout sessions without tax. Read-only inspection of the configured live account found exactly four sessions over the preceding 30 days, all expired and unpaid: two one-off payments and two subscriptions. Automatic tax was disabled on all four; none was open or eligible for an in-place correction. No missing tax on a completed payment was established.

Current tax settings are active, with one active US registration and default code `txcd_10103000`, with behavior inferred by currency. These observations supersede older zero-registration findings as current configuration evidence. No registration, tax default, price, customer or payment was modified.

The local Orbit and shared Foundry session writers now request automatic tax, require billing-address collection, and update the existing customer's address. Retired one-off sales and the live recurring launch gate stay closed. A rolling historical warning can remain even after deployment. Do not recreate expired sessions or charge customers to remove it.

Recovery follows the [commercial tax procedure](../../../../docs/maintainers/ORBIT_FOUNDRY.md#checkout-tax) and [incident triage](../../../runbooks/triage.md). Provider fixtures exercise both creation calls and allowlisted responses; existing Orbit tests exercise ownership, mode, unpaid-state and origin rejection. Production build and documentation results are retained in the linked release evidence.

ACT-038 tracks deployment and isolated provider acceptance. Local source changes do not establish hosted tax collection; no test credential or paid provider E2E was available. Rollback reverts only session tax/address fields and preserves launch gates and history.
