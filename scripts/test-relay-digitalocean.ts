import assert from 'node:assert/strict';
import test from 'node:test';
import { validateDigitalOceanInput } from './verify-relay-digitalocean.js';

const digest = (letter = 'a') => `sha256:${letter.repeat(64)}`;
const input = () => ({
  provider: 'digitalocean', region: 'sfo3', profile: 'one-desktop',
  host: { ssh: 'operator@relay.example', addresses: ['203.0.113.10', '10.20.0.5'] },
  origins: { central: 'https://central-relay.example.com', premium: 'https://premium-relay.example.com' },
  imageDigests: { central: digest('a'), 'premium-runtime': digest('b'), 'premium-monitor': digest('c'), desktop: digest('d'), caddy: digest('e') },
  imageRefs: { central: `galxai-relay-central@${digest('a')}`, 'premium-runtime': `galxai-relay-premium@${digest('b')}`, 'premium-monitor': `galxai-monitor-premium@${digest('c')}`, desktop: `galxai-shard-desktop@${digest('d')}`, caddy: `caddy:2.11.4-alpine@${digest('e')}` },
});

test('DigitalOcean host input selects the one-desktop Premium contract', () => {
  const parsed = validateDigitalOceanInput(input());
  assert.deepEqual(parsed.capacity, { profile: 'one-desktop', maxDesktops: 1, maxRunning: 1 });
  assert.equal(parsed.origins.central, 'https://central-relay.example.com');
});

test('DigitalOcean host input rejects region, transport and capacity drift', () => {
  assert.throws(() => validateDigitalOceanInput({ ...input(), region: 'nyc3' }), /sfo3/);
  assert.throws(() => validateDigitalOceanInput({ ...input(), origins: { ...input().origins, premium: 'http://premium-relay.example.com' } }), /HTTPS/);
  assert.throws(() => validateDigitalOceanInput({ ...input(), desktopLimits: { maxDesktops: 12, maxRunning: 3 } }), /does not match/);
  assert.throws(() => validateDigitalOceanInput({ ...input(), imageDigests: { ...input().imageDigests, caddy: 'sha256:not-a-digest' } }), /caddy/);
  assert.throws(() => validateDigitalOceanInput({ ...input(), imageRefs: { ...input().imageRefs, caddy: `caddy:2.11.4-alpine@${digest('a')}` } }), /image reference/);
});
