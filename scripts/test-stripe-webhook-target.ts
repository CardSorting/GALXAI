import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stripeWebhookProvisioningOrigin as origin } from './lib/stripe-webhook-target';

test('test provisioning refuses known production receivers including equivalent host spellings', () => {
  for (const host of ['galx.ai', 'GALX.AI', 'galx.ai.', 'api.galx.ai', 'www.galx.ai']) {
    assert.throws(() => origin(`https://${host}`, 'test'));
  }
});

test('provisioning refuses gateway/redirect hosts in both modes and never falls back to production', () => {
  for (const mode of ['test', 'live'] as const) {
    for (const value of ['', 'invalid', 'http://localhost:3000', 'https://api.galx.ai',
      'https://API.GALX.AI.', 'https://www.galx.ai', 'https://user:pass@test.example',
      'https://test.example:8443', 'https://test.example/api', 'https://test.example?x=1',
      'https://test.example#fragment']) assert.throws(() => origin(value, mode));
  }
});

test('explicit application origins retain mode separation', () => {
  assert.equal(origin('https://galx.ai/', 'live'), 'https://galx.ai');
  assert.equal(origin('https://billing-test.example/', 'test'), 'https://billing-test.example');
});
