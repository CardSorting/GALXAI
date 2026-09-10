# Signup

Mode: Operate. Preserve the incumbent dark auth surface and keep account creation focused.

The page shows the currently available welcome-credit amount, explains email verification and the one-allowance-per-verified-email condition, and requires no payment card. Missing or disabled offer data does not prevent registration and does not leave a stale promotional claim visible. The global marketing footer and navigation/share docks are hidden on this route.

Inputs have explicit labels and autocomplete. Password validation requires eight characters and a matching confirmation. Only a real authenticated session proceeds to the original in-app destination. Pending verification replaces the form with a focused heading, the submitted email, resend feedback and a cooldown based on elapsed time, a way to change email, and a sign-in link. Public errors provide recovery without provider diagnostics. A provider failure cannot fabricate a successful local account.

Six production-preview states were checked at 1440px and 390px: offer, confirmation, and signup failure. All six have zero Axe findings and no horizontal overflow. Browser fixtures also covered dynamic/disabled/unavailable offers, resend, changing email, real-session completion, and return to `/images`. Screenshots and results are in `.impeccable/review/signup/`. Test authentication is intercepted; these checks do not send email or create real accounts.

The allowance's implementation and activation instructions are in the private [operations note](../../docs/operations/signup-credit.md). This surface brief does not establish certification claims or a global design rule.
