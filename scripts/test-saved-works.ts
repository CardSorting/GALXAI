import test from 'node:test';
import assert from 'node:assert/strict';
import { exportSavedWorksJson, getSavedWorks } from '../src/lib/collections/saved-works';

class MemoryStorage {
  value: string | null = null;
  getItem(key: string) { return key === 'galx_saved_works' ? this.value : null; }
  setItem(key: string, value: string) { if (key === 'galx_saved_works') this.value = value; }
  removeItem(key: string) { if (key === 'galx_saved_works') this.value = null; }
}

test('saved Star work cache and export drop legacy prompts while preserving curation', () => {
  const storage = new MemoryStorage();
  const originalWindow = (globalThis as any).window;
  const originalLocalStorage = (globalThis as any).localStorage;
  (globalThis as any).window = { location: { origin: 'https://galx.ai' } };
  (globalThis as any).localStorage = storage;
  storage.value = JSON.stringify([{
    id: 'work-1',
    public_url: '/v1/images/assets/sealed-token',
    thumbnail_url: '/v1/images/assets/sealed-token/thumbnail',
    prompt: 'PRIVATE_STAR_PROMPT_CANARY',
    aspect_ratio: '3:2',
    author: { displayName: 'Sora Vale', handle: 'SoraVale', avatarUrl: 'https://galx.ai/avatar.png' },
    saved_at: '2026-09-25T12:00:00.000Z',
    board: 'favorites',
    model: 'internal-model-canary',
  }]);
  try {
    const works = getSavedWorks();
    assert.equal(works.length, 1);
    assert.equal(works[0].id, 'work-1');
    assert.equal(works[0].board, 'favorites');
    assert.equal(works[0].author.handle, 'soravale');
    assert.equal('prompt' in works[0], false);
    assert.doesNotMatch(storage.value || '', /PRIVATE_STAR_PROMPT_CANARY|internal-model-canary/);
    assert.doesNotMatch(exportSavedWorksJson(), /PRIVATE_STAR_PROMPT_CANARY|internal-model-canary/);
  } finally {
    if (originalWindow === undefined) delete (globalThis as any).window;
    else (globalThis as any).window = originalWindow;
    if (originalLocalStorage === undefined) delete (globalThis as any).localStorage;
    else (globalThis as any).localStorage = originalLocalStorage;
  }
});
