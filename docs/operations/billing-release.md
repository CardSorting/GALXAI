# Billing recovery release

Deploy the migration and app together. The migration is additive; the old app can run with the new column, but the new app requires it.

1. Apply `20260906000001_billing_payment_recovery` using the existing migration runner:
   `node --env-file-if-exists=.env.local --import tsx scripts/push-migrations-direct.ts --version 20260906000001`
2. Deploy the application with `NEXT_PUBLIC_APP_URL=https://galx.ai`, the matching Stripe secret key, webhook signing secrets, and `DATABASE_URL`. The new Stripe client pins API `2026-07-29.dahlia`.
3. Preview missing event subscriptions with `node --env-file-if-exists=.env.local --import tsx scripts/sync-billing-webhooks.ts`; add `--apply` to update the two existing billing endpoints. This preserves their URLs, secrets, and existing subscriptions. Do this after deploying the new receiver: the old receiver does not implement these events safely.
4. Run `node --env-file-if-exists=.env.local --import tsx scripts/verify-stripe-readiness.ts https://galx.ai` and `node --env-file-if-exists=.env.local --import tsx scripts/verify-payment-authority.ts`.
5. In an isolated Stripe sandbox, complete a hosted checkout with its configured test payment methods; confirm the balance and invoice, resend its webhook, issue partial refunds, and verify the account activity. Do not send sandbox events to the live endpoint: the receiver rejects mismatched modes. A production smoke payment requires an explicitly authorized payment method and amount.

## Verified in this change

The isolated PostgreSQL suite uses the repository table definitions and applies the new migration. It covers concurrent/retried checkout creation, provider success followed by database failure, ownership and amount mismatches, unpaid sessions, concurrent duplicate webhook delivery, transaction rollback, invoice ordering, partial/cumulative refunds, spent-credit debt, dispute withdrawal/reinstatement, and recovery of legacy failed event receipts. Signature tests cover tampering, timestamp expiry, oversized bodies, and live/test mode mismatch. Browser tests cover account gates, quote/amount selection, retry persistence, confirmation polling, balance refresh, unavailable/error states, and desktop/mobile layouts.

The migration passed a live-schema dry run inside a rolled-back transaction. Existing financial RPCs were checked read-only: neither `anon` nor `authenticated` can execute them. No live payment or persistent production schema change was made during verification.

Final verification: 26 isolated payment checks, webhook boundary tests, account billing tests, desktop/mobile browser checks, TypeScript, scoped ESLint, and the production build passed. The build still reports the pre-existing optional `GalxRelaySupervisor.js` import warning; static-generation database lookups were network-restricted in the sandbox. Database schema and permissions were verified separately with the approved connection. The production webhook preview identified eight missing event types on each existing billing endpoint; the sync script lists the exact additions without applying them by default.

## Operational behavior

- Stored checkout terms and customer ownership are authoritative. New attempts are limited to five per account per ten minutes. Retries reuse one idempotency key and frozen provider parameters for up to 90 minutes.
- Webhook credit, ledger entry, checkout state, and event receipt commit together. Failures return 503 for Stripe to retry. The account-owned return page can recover a delayed webhook using a fresh Stripe API read and the same fulfillment function; refreshes never mint credit directly.
- Refund totals include only successful refunds. A later bank failure restores the corresponding credit; stale events cannot deduct it again. Refund/dispute adjustments are capped at the original payment and reverse its actual credited amount proportionally. Funds reinstatement does not restore already-refunded money. See [Stripe's refund lifecycle](https://docs.stripe.com/refunds).
- Credit consumed before a refund becomes `payment_debt_usd`. Spendable balance stays zero; the next top-up offsets debt first. A database constraint prevents simultaneous spendable credit and debt.
- Old simulated checkout, fake wallet deposit, browser unlock, and fake auto-reload flows are retired. Automatic top-ups return 410.
- Legacy duplicate payment mappings fail closed for manual reconciliation. Existing historical financial discrepancies are not silently rewritten.

Rollback the app first. The paired migration rollback refuses to discard outstanding payment debt; settle it before removing the column. Do not erase ledger transactions to make rollback pass.
