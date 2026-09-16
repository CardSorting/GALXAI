import assert from 'node:assert/strict';
import { checkoutReturnPath, depositAmount, hostedPaymentUrl } from '../src/lib/billing/payment';
for (const value of [undefined, null, '/billing/credits']) assert.equal(checkoutReturnPath(value), '/billing/credits');
for (const value of ['/keys/top-up', '/billing']) assert.equal(checkoutReturnPath(value), value);
for (const value of ['keys', 'billing', 'https://evil.test', '//evil.test', {}, '', '/billing/plan']) assert.throws(() => checkoutReturnPath(value));
assert.equal(depositAmount('25.50'), 25.5);
assert.throws(() => depositAmount(0));
assert.throws(() => hostedPaymentUrl('https://checkout.stripe.com.evil.test', 'checkout.stripe.com'));
console.log('Top-up checks passed: fixed return destinations and shared payment validation.');
