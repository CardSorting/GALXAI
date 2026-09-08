# Billing recovery release

<!-- docs-scope: operational-record -->
> **Reading scope:** Scoped operational procedure or dated incident evidence. Its component authority remains separate from federation lifecycle, capability routing, and admission recovery. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

## Production rollout completed — 2026-09-07 UTC

Live at **https://galx.ai**. Vercel deployment `dpl_DX5NNRcALssk1AuuqNh4ET9mWB3f` (`galxai-2rahqyxx5-cardsortings-projects.vercel.app`) was built from application commit `172c69f` and promoted successfully.

- Migration `20260906000001_billing_payment_recovery` applied: 86 migrations applied, none pending. Live wallet constraints and financial-function permissions passed verification.
- Corrected the production return origin from localhost to `https://galx.ai` and configured the live Stripe key and webhook signing credentials as sensitive Vercel environment variables.
- Enabled all eight previously missing event types on both billing routes. Both active endpoints now cover all 16 required billing events; live payments and the customer portal are enabled.
- Replaced both webhook endpoints and their signing credentials after finding a signing secret in a tracked generated manifest. Removed embedded signing strings from current source and changed provisioning to save credentials only in a protected, ignored environment file. Historical credentials are invalidated; both production routes reject the exposed credential (400) and accept replacement signatures (200). Superseded endpoints remain disabled for audit history.
- Active endpoint IDs: `we_1UCvKoIA2zQnWbn5HaBkRV3p` (`/api/stripe/webhook`) and `we_1UCvKpIA2zQnWbn5Pgb7tKbS` (`/api/internal/credits/stripe`). Provisioning skips disabled endpoints.
- Real unpaid checkout and customer-portal sessions were created successfully. Hosted Checkout rendered the expected $1 amount. Final expiration event `evt_1UCvPeIA2zQnWbn5pBWRjW9L` was processed in the production database, with **zero pending Stripe deliveries and zero ledger entries**. Synthetic Stripe customers were removed. No card details were submitted and no real charge was made.

## Future rollout procedure

Deploy the migration and app together. The migration is additive; the old app can run with the new column, but the new app requires it.

1. Apply `20260906000001_billing_payment_recovery` using the existing migration runner:
   `node --env-file-if-exists=.env.local --import tsx scripts/push-migrations-direct.ts --version 20260906000001`
2. Deploy the application with `NEXT_PUBLIC_APP_URL=https://galx.ai`, the matching Stripe secret key, webhook signing secrets, and `DATABASE_URL`. The new Stripe client pins API `2026-07-29.dahlia`.
3. Preview missing event subscriptions with `node --env-file-if-exists=.env.local --import tsx scripts/sync-billing-webhooks.ts`; add `--apply` to update the two existing billing endpoints. This preserves their URLs, secrets, and existing subscriptions. Do this after deploying the new receiver: the old receiver does not implement these events safely.
4. Run `node --env-file-if-exists=.env.local --import tsx scripts/verify-stripe-readiness.ts https://galx.ai` and `node --env-file-if-exists=.env.local --import tsx scripts/verify-payment-authority.ts`.
5. In an isolated Stripe sandbox, complete a hosted checkout with its configured test payment methods; confirm the balance and invoice, resend its webhook, issue partial refunds, and verify the account activity. Do not send sandbox events to the live endpoint: the receiver rejects mismatched modes. A production smoke payment requires an explicitly authorized payment method and amount.

## Verified in this change

The isolated PostgreSQL suite uses the repository table definitions and applies the new migration. It covers concurrent/retried checkout creation, provider success followed by database failure, ownership and amount mismatches, unpaid sessions, concurrent duplicate webhook delivery, transaction rollback, invoice ordering, partial/cumulative refunds, spent-credit debt, dispute withdrawal/reinstatement, and recovery of legacy failed event receipts. Signature tests cover tampering, timestamp expiry, oversized bodies, and live/test mode mismatch. Browser tests cover account gates, quote/amount selection, retry persistence, confirmation polling, balance refresh, unavailable/error states, and desktop/mobile layouts.

The migration passed a rolled-back dry run before application, then production schema checks after application. Existing financial RPCs were checked read-only: neither `anon` nor `authenticated` can execute them. Ledger mutation protection remains active.

Final verification: 26 isolated payment checks, webhook boundary tests, account billing tests, TypeScript, scoped ESLint, and local/Vercel production builds passed. Desktop/mobile browser checks also passed against the deployed interface using isolated API fixtures; real unauthenticated and cross-origin request rejection was verified. Pending confirmation hides additional checkout attempts, and balance refresh preserves the selected amount. The optional relay import warning was fixed.

Patched Next.js, Sharp, and PostCSS dependencies. Both local npm audit and Vercel installation reported **zero known vulnerabilities**. The current tracked-source scan found no live Stripe API keys or signing secrets. Successful payment settlement, refunds, and disputes are covered by the isolated PostgreSQL suite; the live probe intentionally verifies hosted session creation and real webhook transport without charging money.

## Operational behavior

- Stored checkout terms and customer ownership are authoritative. New attempts are limited to five per account per ten minutes. Retries reuse one idempotency key and frozen provider parameters for up to 90 minutes.
- Webhook credit, ledger entry, checkout state, and event receipt commit together. Failures return 503 for Stripe to retry. The account-owned return page can recover a delayed webhook using a fresh Stripe API read and the same fulfillment function; refreshes never mint credit directly.
- Refund totals include only successful refunds. A later bank failure restores the corresponding credit; stale events cannot deduct it again. Refund/dispute adjustments are capped at the original payment and reverse its actual credited amount proportionally. Funds reinstatement does not restore already-refunded money. See [Stripe's refund lifecycle](https://docs.stripe.com/refunds).
- Credit consumed before a refund becomes `payment_debt_usd`. Spendable balance stays zero; the next top-up offsets debt first. A database constraint prevents simultaneous spendable credit and debt.
- Old simulated checkout, fake wallet deposit, browser unlock, and fake auto-reload flows are retired. Automatic top-ups return 410.
- Legacy duplicate payment mappings fail closed for manual reconciliation. Existing historical financial discrepancies are not silently rewritten.

Rollback the app first. The paired migration rollback refuses to discard outstanding payment debt; settle it before removing the column. Do not erase ledger transactions to make rollback pass.
