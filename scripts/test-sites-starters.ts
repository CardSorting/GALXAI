import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveSiteStarter, SITE_STARTERS } from '../src/lib/sites/starters';

test('starter links carry only a known idea and an optional authored refinement', () => {
  for (const starter of SITE_STARTERS) {
    const selection = resolveSiteStarter(starter.id);
    assert.equal(selection?.brief, starter.brief);
    assert.equal(selection?.href, `/sites?starter=${starter.id}`);
    const refined = resolveSiteStarter(starter.id, '1');
    assert.equal(refined?.brief, `${starter.brief} ${starter.refinement}`);
    assert.equal(refined?.href, `/sites?starter=${starter.id}&refine=1`);
    assert(new TextEncoder().encode(refined?.brief).length < 2000);
  }
});

test('unknown, repeated, and hostile entry parameters cannot become starter content or destinations', () => {
  for (const input of [undefined, null, {}, ['product'], ['product', 'event'], '__proto__', 'constructor', 'https://example.com', '<script>alert(1)</script>']) {
    assert.equal(resolveSiteStarter(input), undefined);
  }
  for (const refinement of [['1'], 'https://example.com', '<script>', 'true', true]) {
    assert.equal(resolveSiteStarter('product', refinement)?.brief, SITE_STARTERS[0].brief);
    assert.equal(resolveSiteStarter('product', refinement)?.href, '/sites?starter=product');
  }
});
