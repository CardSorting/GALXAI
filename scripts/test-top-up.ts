import assert from 'node:assert/strict';
import { checkoutReturnPath, depositAmount, hostedPaymentUrl } from '../src/lib/billing/payment';
assert.equal(checkoutReturnPath('keys'), '/keys/top-up');
for (const value of ['billing', undefined, null, 'https://evil.test', '//evil.test', '/keys/top-up', {}]) assert.equal(checkoutReturnPath(value), '/billing');
assert.equal(depositAmount('25.50'), 25.5);
assert.throws(() => depositAmount(0));
assert.throws(() => hostedPaymentUrl('https://checkout.stripe.com.evil.test', 'checkout.stripe.com'));
console.log('Top-up checks passed: fixed return destinations and shared payment validation.');
