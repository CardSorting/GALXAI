import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { canonicalRequestUrl } from '../src/lib/security/request-origin';

const mac = { GALX_REQUEST_ORIGIN_MODE: 'mac-loopback-v1', GALX_SELF_HOST_AUTHORITY: '0.0.0.0:3000', NEXT_PUBLIC_APP_URL: 'https://galx.ai', GALX_CONNECT_ORIGIN: 'https://galx.ai', GALX_NOVA_RESOURCE: 'https://nova.galx.ai' };
const request = (headers: Record<string, string> = {}, url = 'http://0.0.0.0:3000/v1/inference?a=1') => new NextRequest(url, { headers: { Host: 'nova.galx.ai', ...headers } });

test('direct deployment authority and exact loopback ports ignore all header origin claims', () => {
  for (const url of ['https://nova.galx.ai/v1/inference', 'http://127.0.0.1:4400/callback', 'http://[::1]:444/callback']) {
    assert.equal(canonicalRequestUrl(request({ Host: 'wrong.invalid', 'X-Forwarded-Host': 'nova.galx.ai', 'X-Forwarded-Proto': 'https' }, url), {}).href, url);
  }
});
test('private listener resolves only configured identities and preserves path/query', () => {
  assert.equal(canonicalRequestUrl(request(), mac).href, 'https://nova.galx.ai/v1/inference?a=1');
  assert.equal(canonicalRequestUrl(request({ Host: 'GALX.AI' }), mac).origin, 'https://galx.ai');
  assert.equal(canonicalRequestUrl(request({}, 'https://0.0.0.0:3000//untrusted.invalid/path'), mac).host, 'nova.galx.ai');
});
test('forwarded metadata and browser Origin never choose canonical identity', () => {
  for (const headers of [ { 'X-Forwarded-Host': 'wrong.invalid' }, { 'X-Forwarded-Proto': 'http' }, { Forwarded: 'host=wrong.invalid;proto=http' }, { Origin: 'https://wrong.invalid' } ]) {
    assert.equal(canonicalRequestUrl(request(headers), mac).origin, 'https://nova.galx.ai');
  }
});
test('wrong hosts, exact ports, loopback aliases and spoofed proxy authority fail closed', () => {
  for (const host of ['wrong.invalid', 'nova.galx.ai:3000', 'nova.galx.ai:443', 'nova.galx.ai.', 'nova.galx.ai.evil.invalid', 'nova.galx.ai, galx.ai', '127.0.0.1:3000', 'localhost:3000', '0.0.0.0:3000']) {
    assert.throws(() => canonicalRequestUrl(request({ Host: host, 'X-Forwarded-Host': 'nova.galx.ai', 'X-Forwarded-Proto': 'https' }), mac));
  }
  for (const url of ['http://127.0.0.1:3000/v1/inference', 'http://0.0.0.0:3001/v1/inference', 'https://untrusted.invalid/v1/inference']) assert.throws(() => canonicalRequestUrl(request({}, url), mac));
});
test('untrusted metadata cannot enable the deployment policy; invalid configuration cannot fall back', () => {
  assert.equal(canonicalRequestUrl(request({ 'GALX_REQUEST_ORIGIN_MODE': 'mac-loopback-v1' }), {}).origin, 'http://0.0.0.0:3000');
  for (const env of [{ ...mac, GALX_REQUEST_ORIGIN_MODE: 'other' }, { ...mac, GALX_SELF_HOST_AUTHORITY: '' }, { ...mac, GALX_NOVA_RESOURCE: '' }, { ...mac, GALX_NOVA_RESOURCE: 'http://nova.galx.ai' }, { ...mac, GALX_NOVA_RESOURCE: 'https://nova.galx.ai/extra' }]) assert.throws(() => canonicalRequestUrl(request(), env));
});
