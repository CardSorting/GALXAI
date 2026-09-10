# Signup credit allowance

New email and OAuth accounts receive **$5 in wallet credit after their email is confirmed**. The allowance is recorded as **Welcome credit** in billing and is spendable through the existing debit path. Email confirmation never requires a client credit claim or a payment card.

This is a private operational document. Do not copy the implementation details below into public documentation or product copy.

## Authority and accounting

Migration `20260910071450_signup_credit_allowance.sql` captures eligibility when `auth.users` is inserted. It does not backfill existing accounts, enroll anonymous users, or enroll accounts created while the offer is disabled. Accounts without an email are excluded. Email/OAuth confirmation is trusted only from the protected Auth row, never from user metadata. The hosted Auth service was checked on September 10, 2026 and returned `mailer_autoconfirm: false`; local Auth configuration now requires confirmation as well.

The private policy starts enabled at $5. An enrollment snapshots its amount, so subsequent policy changes do not change an existing signup's promise. Confirmation locks that enrollment, serializes claims for the normalized verified email, locks the wallet, credits the balance, records a hashed ledger entry, and settles the receipt in the same transaction. A failed write rolls the whole transaction back, including Auth confirmation. A retry can complete the award once.

Receipts retain a SHA-256 digest of the trimmed, lowercase verified email and survive account deletion. Unique user and email constraints prevent another allowance for the same account or verified address. Settled receipts cannot be updated or deleted. These are abuse-control records with sensitive identity associations; they must remain private and be included in the organization's retention policy. This does not prevent a person from controlling multiple different verified email addresses.

The policy and receipts use forced RLS and revoke access from `anon`, `authenticated`, and `service_role`. The private trigger function is not a client-callable RPC. Its authority is the Auth insert/update event; signup does not yet have an authenticated `auth.uid()`. No client-supplied amount, role, paid status, request ID, or metadata influences the award.

The production rehearsal caught the existing ledger helpers excluding the `extensions` schema where hosted pgcrypto is installed. This migration fixes their trusted search paths, preserving their bodies and execution privileges. The local fixture now mirrors that extension placement, and production verification exercises both the writer and hash verifier. The paired rollback restores the previous helper paths.

The credit uses the existing `match_grant` ledger category with the description `Welcome credit`. The private metadata category is `signup_credit`. Billing returns its existing allowlisted fields, without receipt digests or ledger internals. Deposited totals, deposit verification, payment debt accounting, and existing first-deposit promotional terms remain independent. Creating an API key does not create another wallet allowance.

## Signup and key access

The signup page reads the current public offer from `GET /api/auth/signup-offer`, whose entire success contract is `{ enabled, amountUsd }`. The endpoint has no write method, accepts no grant parameters, does not cache responses, and returns a generic 503 on storage/configuration failure. The page omits the promotional claim if it cannot load the policy; account registration can continue.

Registration now returns real Auth failures and waits for email confirmation when there is no real session. It no longer manufactures a user, token, or successful login on an error. The confirmation screen supports resend with a cooldown, changing email, and returning to the original in-app destination. Auth redirects reject external destinations, backslashes, encoded protocol-relative paths, and control characters. Callback errors omit provider diagnostics and ignore an untrusted forwarded host.

API-key management requires a verified account session and exact ownership. A supplied user ID cannot establish identity. Paid key limits come from the stored wallet's deposit state. Welcome credits do not masquerade as deposits. Key creation/update requires successful authoritative persistence. Responses do not advertise the old fictional $30 key grant or expose internal pool identifiers. Those internal record fields are retained for compatibility, without creating a new financial grant.

## Activation and configuration

Migration `20260910071450` was applied to production on September 10, 2026 after a transaction-only production rehearsal. Future environments should apply it before deploying the application with `node --env-file-if-exists=.env.local --import tsx scripts/push-migrations-direct.ts --version 20260910071450`. Do not push the entire local Auth configuration over hosted settings. Keep hosted email confirmation enabled, including before a future environment is activated.

Server operators can inspect or change future offers using the existing database credentials:

```sh
npm run signup-credit -- status
npm run signup-credit -- amount 5
npm run signup-credit -- disable
npm run signup-credit -- enable
```

Amounts must be USD cents between $0.01 and $1,000. Disabling pauses new enrollments and honors existing pending enrollments. Reapplying the migration preserves policy changes and all receipts. The paired down migration stops all future awards, including pending confirmations, while preserving balances, policy, receipts, and ledger entries. Re-enabling does not retroactively enroll accounts created during rollback.

## Verification

- `npm run db:verify`: 92 paired migrations, no fatal findings or warnings. The verifier was corrected to recognize private qualified table names and explicitly empty function search paths.
- `npm run db:test -- --billing`: 26 isolated payment integration checks passed.
- `npm run test:signup-credit:db`: 20 scenario groups, including 30 simultaneous confirmations, 12 concurrent claims for one email, unverified/anonymous exclusion, hostile metadata, restricted Auth insertion, role denials, immutable receipts, policy changes, spending, atomic failures, migration reapplication, rollback, and balance preservation.
- Signup/HTTP/authorization regression tests pass, including strict key-cache visibility after durable writes. The final production build and targeted ESLint pass. Six desktop/mobile signup states have no Axe findings or horizontal overflow; confirmation, resend, changing email, error recovery, dynamic/disabled/unavailable offers, and return-to-studio behavior are covered. Browser authentication is intercepted; no real signup, email, generation, or payment is sent.
- Rendered `/auth/signup` HTML and its 20 browser scripts contain no new private policy, receipt, grant-function, or identity-digest fields. Real local HTTP checks reject unauthenticated key access and sanitize callback errors/redirects. These are scoped local checks, not a whole-site or live-clean claim.
- Hosted security advisors reported no errors and one existing warning: leaked-password protection is disabled. SQL and permissions are tested against disposable local PostgreSQL and the production database using rolled-back fixtures.

Reproduction commands:

```sh
node --import tsx --test scripts/test-signup-credit.ts scripts/test-signup-key-security.ts scripts/test-image-public-http.ts scripts/test-public-information-boundary.ts scripts/test-auth-identity-boundary.ts
npm run test:signup-credit:db
node --env-file-if-exists=.env.local --import tsx scripts/verify-signup-credit-storage.ts
npm run db:verify
npm run db:test -- --billing
npm run build
```

Local database tests use only `127.0.0.1:55439`, the `seats_test` role, and disposable databases/schemas. They never use the production `DATABASE_URL`. Browser screenshots and Axe results are under the ignored `.impeccable/review/signup/` directory.
