/** Isolated DOM integration: no system clipboard, printing or external network. */
import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

test('essay actions copy only the canonical URL, recover from denied access and fence navigation races', async () => {
  const compiled = await build({
    entryPoints: ['src/components/exhibitions/EssayActions.tsx'], bundle: true, write: false,
    platform: 'node', format: 'cjs', packages: 'external', jsx: 'automatic',
    plugins: [{ name: 'css-fixture', setup(builder) {
      builder.onLoad({ filter: /\.module\.css$/ }, () => ({ contents: 'export default {}', loader: 'js' }));
    } }],
  });
  const module = { exports: {} as { EssayActions: React.ComponentType<{ canonicalUrl: string }> } };
  new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
  const { EssayActions } = module.exports;
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/essay?private=sentinel#position', pretendToBeVisual: true });
  const replacements = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { configurable: true, value });
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(document.getElementById('root')!);
  const first = 'https://galx.ai/editorials/reading-the-trace';
  const second = 'https://galx.ai/editorials/what-an-object-can-ask';
  const calls: string[] = [];
  const writes: { resolve: () => void; reject: (error: Error) => void }[] = [];
  const clipboard = { writeText(url: string) { calls.push(url); return new Promise<void>((resolve, reject) => writes.push({ resolve, reject })); } };
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard });
  let printed = 0;
  window.print = () => { printed++; };
  const button = (text: string) => [...document.querySelectorAll('button')].find(item => item.textContent === text)!;
  const render = async (canonicalUrl: string) => { await act(async () => root.render(React.createElement(React.StrictMode, null, React.createElement(EssayActions, { canonicalUrl })))); };
  try {
    await render(first);
    assert.equal(calls.length, 0); assert.equal(printed, 0);
    await act(async () => { button('Copy link').click(); button('Copy link').click(); });
    assert.deepEqual(calls, [first]); assert.equal(button('Copying…').disabled, true);
    await act(async () => { writes[0].resolve(); });
    assert.equal(document.querySelector('[role="status"]')?.textContent, 'Essay link copied.');
    await act(async () => { button('Print').click(); });
    assert.equal(printed, 1);

    await act(async () => { button('Link copied').click(); });
    await act(async () => { writes[1].reject(new Error('PRIVATE_SENTINEL')); });
    const input = document.querySelector('input')!;
    assert.equal(input.value, first); assert.equal(document.activeElement, input);
    assert.equal(input.selectionStart, 0); assert.equal(input.selectionEnd, first.length);
    assert.doesNotMatch(document.body.textContent!, /PRIVATE_SENTINEL|private=|#position/);

    await render(second);
    assert.equal(document.querySelector('input'), null);
    await act(async () => { button('Copy link').click(); });
    const obsolete = writes[2];
    await render(first);
    await act(async () => { button('Copy link').click(); });
    await act(async () => { obsolete.resolve(); });
    assert.equal(button('Copying…').disabled, true, 'a late old copy cannot settle the current action');
    await act(async () => { writes[3].resolve(); });
    assert.equal(button('Link copied').disabled, false);

    await render(second);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    await act(async () => { button('Copy link').click(); });
    assert.equal(document.querySelector('input')?.value, second, 'unsupported clipboard retains a selectable canonical address');
    assert.equal(printed, 1, 'no automatic print or fallback side effect');
  } finally {
    await act(async () => root.unmount());
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    dom.window.close();
  }
});
