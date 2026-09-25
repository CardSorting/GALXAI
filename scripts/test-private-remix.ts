import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generationBody, readSettings } from '../src/components/images/studio-contract';
import { buildPrivateRemixPrompt } from '../src/lib/images/request-service';
import { loadPublicStarRemixContext } from '../src/lib/images/star-remix-context';

test('private remix sends only a work reference from the browser and keeps its direction', () => {
  const body = generationBody({
    prompt: 'Change the scale and make the material feel more tactile.',
    ratio: '3:2',
    quality: 'standard',
    count: 1,
    remixWorkId: 'star-work-12',
  });
  assert.equal(body.source_work_id, 'star-work-12');
  assert.equal(body.prompt, 'Change the scale and make the material feel more tactile.');
  assert.equal('private_context' in body, false);
  assert.equal('sourceWorkId' in body, false);
  assert.equal('remixWorkId' in body, false);
  assert.equal(readSettings({ prompt: 'Direction', remixWorkId: '../invalid' }).remixWorkId, undefined);
});

test('server remix prompt composes private Star context without replacing patron direction', () => {
  const prompt = buildPrivateRemixPrompt('Change the scale.', 'A private Star production brief.');
  assert.match(prompt, /Create a distinct private work/);
  assert.match(prompt, /A private Star production brief/);
  assert.match(prompt, /Patron direction: Change the scale\./);
  assert.throws(() => buildPrivateRemixPrompt('Direction', ''), /private remix context/i);
});

test('private source context is server-resolved from an exhibited Star projection with a bound work ID', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const source = 'PRIVATE_STAR_PRODUCTION_CANARY';
  const context = await loadPublicStarRemixContext('star-work-12', async (sql, params = []) => {
    calls.push({ sql, params });
    return { rows: [{ prompt: source }] };
  });
  assert.deepEqual(context, { prompt: source });
  assert.deepEqual(calls[0]?.params, ['star-work-12']);
  assert.match(calls[0]?.sql || '', /FROM public\.community_star_profile_creations/);
  assert.equal(await loadPublicStarRemixContext('../private-work', async () => {
    throw new Error('invalid source ID must not query');
  }), null);

  const route = readFileSync(resolve('src/app/v1/images/generations/route.ts'), 'utf8');
  const lookup = route.indexOf('privateContext = (await loadPublicStarRemixContext');
  assert.ok(route.indexOf('resolveAuthIdentity(req)') < lookup);
  assert.ok(route.indexOf('resolveUserSeatTier(auth)') < lookup);
});
