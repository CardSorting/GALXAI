# Orbit, Foundry, and public Star identity

<!-- docs-scope: current-guide -->

Private maintainer guide, September 26, 2026. This is not browser or customer documentation.
[ADR 0164](../adr/0164-orbit-foundry-public-identity.md) records the decision; delivery evidence is separate.

## Commercial boundaries

GALX is the institution, not a zero-dollar plan. Public discovery, following and saving remain independent of paid access. Orbit is $10 USD per Star per month for designated digital patron work. Foundry is $200 USD per month for the existing bounded private-creation capability. Neither includes the other. Neither includes Sites. Orbit never writes generation allowances, wallet balances, publishing authority or creative-direction controls.

New Sites sales and the legacy $15/$35/MAX/Pro/developer purchase paths are retired. Historical plan keys and financial records remain readable; their continued existence is not a sales offer. Foundry retains the existing private-creation `team-v1` allowance identity, not the old Sites/Pro product. Do not reactivate `scripts/activate-image-plan-catalog.ts`.

`scripts/orbit-commercial-catalog.ts` defaults to read-only `--inspect`. `--archive-legacy` checks subscriptions, schedules and open checkouts again before archiving allowlisted legacy prices and associated payment links. It never reprices a subscriber or deletes transactions. `--prepare-catalog` creates separate **inactive** Orbit VANTA and Foundry products/prices. It neither configures tax nor enables sales.

On September 26, the live account had zero subscriptions, schedules and open checkouts. Six obsolete prices were archived, no payment links required closing, no subscriptions were changed, and no financial history was deleted. The two replacement products/prices were prepared inactive. These catalog actions are complete; application rollout is separate.

## VANTA migration

The only approved rename is Veyra Sol → VANTA. The additive public-identity table references the existing actor. It does not update the original Star handle, account, actor, generation, practice, publication or follower records. Public projection helpers and views show `vanta` / `VANTA`; `/profile/veyrasol` permanently redirects to `/profile/vanta`. Query compatibility accepts the historical and public handle during rollout. Browser-local saved Works and follows normalize their handles while preserving saved IDs, timestamps and collections. Server following continues to use the historical key.

The roster uses the twelve persisted practice definitions; fabricated fallback Astra/Vesper/Kaelen profiles are not exposed as current Stars. Internal agent identities are unchanged. The other eleven naming suggestions require explicit review and are not migration inputs.

## Checkout and access authority

`commercial-launch.ts` rejects all live recurring checkout pending provider end-to-end release acceptance. Tax readiness was deferred by the owner on September 26 and is no longer a rollout prerequisite. No environment variable bypasses the payment acceptance gate. Test Orbit offers must also be explicitly enabled, have a verified $10 USD monthly licensed price attached to the exact Star, and have at least one designated patron work. Run payment testing only with an isolated test database and test Stripe credentials; Foundry retains the existing generation entitlement projection, which is not a general-purpose test/live sandbox separator.

Orbit checkout persists an account/Star/mode-bound attempt before contacting Stripe. A short advisory-lock transaction, unique open-attempt index, token-owned lease and durable idempotency key prevent duplicate local checkout creation. Uncertain aged requests stop for review; they do not silently create replacement purchases. Orbit customers are separate from legacy billing customers. Subscription reconciliation verifies the durable attempt, customer, Star, mode, quantity and price before recording a relationship.

Webhook snapshots and return URLs never grant access. Each protected artifact request verifies current paid subscription, invoice period, invoice payments and non-refunded, undisputed settled charges before cache access. Trial, incomplete, canceled, paused, past-due, unpaid, expired, revoked, wrong-owner, wrong-Star and wrong-mode relationships do not grant access. Provider errors fail closed. Cancellation changes future renewal only; paid access continues through the verified period. The account/Star-scoped API chooses the active relationship before historical canceled records. The browser never supplies a Stripe customer or subscription identifier.

The existing artifact and thumbnail endpoints continue to decode/re-encode stored images. The Orbit DTO contains only work ID, authored title, opaque artifact URLs and publication time. It never contains production prompts, storage paths, provider data or internal Star records. Billing responses are private/no-store with generic errors and POST origin checks. Database relationship/designation tables force RLS and deny direct anonymous, authenticated and service-role table access.

## Patron material

An operator can designate an existing completed private Star candidate in `private.galx_orbit_works` with an authored title and its exact existing actor. The database guard requires autonomous ownership and completed generation/attempt provenance; it rejects human-private assets and existing public Works. The read projection repeats these checks. No live work was designated in this implementation: institutional content selection remains required before an offer is enabled. Do not turn public exhibition into a paywall or invent patron benefits that are not delivered.

## Rollout and rollback

Migration `20260926081213_orbit_public_identity.sql` and the application changes are prepared locally, not applied/deployed. Deploy the alias-compatible application with all paid gates closed, apply the paired additive migration through the approved database procedure, then verify old-URL redirects, VANTA archive counts, follower/save continuity, account denials and artifact origins. Missing schema fails closed for Orbit and does not authorize a payment. No BROC, federation, generation or Sites infrastructure migration is included.

The down migration restores historical public projections only when checkout, subscription and patron-work tables are empty. Once durable relationships or designations exist, it refuses to drop them: use reviewed forward recovery. Disabling an offer is not revoking paid access. Never delete financial history for rollback.

## Tax readiness — deferred by owner

The inspected account and tax head office are US-based; payments are enabled, submitted account details have no currently-due requirements, and Stripe Tax settings report active. **There are zero active tax registrations.** The account default `txcd_99999999` is **General – Tangible Goods**, not a reviewed classification for these digital products. Existing price tax behavior is unspecified and the account default infers behavior from currency. None of these observations establishes legal tax readiness.

The owner's September 26 follow-up explicitly defers this work and removes it as a rollout prerequisite. Preserve the findings as unresolved information, not a launch prohibition or a compliance determination. Do not invent registrations, change tax settings, or claim automatic tax collection. Selling jurisdictions, registration obligations, digital-product classification and tax treatment remain matters for the accountable owner/advisor. Payment testing, delivered patron benefits and release acceptance remain separate requirements. This task did not change tax settings or create registrations.

## Verification and limits

Run `node --import tsx --test scripts/test-orbit.ts`, `npm run test:image:db`, `npm run test:image:security`, `npm run db:verify`, TypeScript and a production build. The disposable database suite exercises migration SQL, alias preservation, designation provenance, role denials, paid access, wrong account/mode denial and revocation with a provider fixture. Unit tests exercise payment evidence and period-end cancellation. Browser fixtures exercise cancellation/ending/unavailable states, not actual charges. Use `scripts/verify-orbit-ui.mjs` and `scripts/verify-discovery-ui.mjs` against a local production server; then run the existing HTTP public-boundary verifier.

No Stripe test key was available, so an actual provider checkout/webhook/renewal/portal end-to-end cycle remains an explicit launch test, not a claimed pass. The general `db:test` fixture's obsolete generic upload call was repaired on September 26: it now verifies that missing private storage fails closed, while `test-private-image-storage.ts` independently exercises successful sanitized private uploads with a synthetic transport. The complete general database suite passes 94 checks after replaying all 157 migrations in its disposable fixture. The two pre-existing clean-checkout incident documentation links remain unresolved by instruction. Local validation is not hosted acceptance or proof of live origin privacy.
