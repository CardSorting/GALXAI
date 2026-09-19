/**
 * Local pricing-strategy probe.
 *
 * The former script created a real unpaid Developer checkout and then expired
 * it. This probe must not create Stripe customers, sessions, portals, or
 * database records. Keep the legacy flags as safe compatibility aliases for
 * operators who still have the old command in a runbook.
 */
import assert from 'node:assert/strict';
import { createAccountCheckout } from '../src/lib/billing/checkout';
import { readTopUpQuote } from '../src/lib/billing/quote';
import { DEVELOPER_ACCESS } from '../src/lib/billing/pro-plan';

assert.equal(DEVELOPER_ACCESS.monthlyPriceUsd, 50);
assert.equal(DEVELOPER_ACCESS.interval, 'month');
assert.equal(DEVELOPER_ACCESS.checkoutEnabled, true);
assert.equal(DEVELOPER_ACCESS.automaticActivation, true);
assert.equal(DEVELOPER_ACCESS.includedUsageCreditsUsd, 0);

if (process.argv.includes('--create') || process.argv.includes('--expire')) {
  try {
    await createAccountCheckout(undefined as never, undefined as never, {
      userId: 'legacy-probe',
      email: 'legacy-probe@example.invalid',
      amount: 50,
      requestId: 'legacy-probe',
      origin: 'https://galx.ai',
    });
    assert.fail('The retired Developer checkout unexpectedly created a session');
  } catch (error) {
    assert.equal((error as { status?: number }).status, 410);
  }

  try {
    await readTopUpQuote(undefined as never, 'legacy-probe', 50);
    assert.fail('The retired Developer quote unexpectedly returned terms');
  } catch (error) {
    assert.equal((error as { status?: number }).status, 410);
  }

  console.log('Legacy live-checkout flags are safely retired: Nova subscription strategy checked without Stripe or database calls.');
} else {
  console.log('Nova Developer Access strategy is $50/month recurring with no included usage credits; no live Stripe action was performed.');
}
