import assert from 'node:assert/strict';
import { AGENT_SETUP, DOC_NAV, DOC_PAGES, docMarkdown } from '../src/lib/docs/content';
import { GET } from '../src/app/docs/agent-setup/route';
import { readFileSync } from 'node:fs';

const paths = new Set(DOC_NAV.map(item => item.href));
assert.equal(paths.size, 5);
for (const page of Object.values(DOC_PAGES)) {
  assert(paths.has(page.path as typeof DOC_NAV[number]['href']));
  const ids = page.sections.map(section => section.id);
  assert.equal(new Set(ids).size, ids.length);
  const markdown = docMarkdown(page);
  for (const section of page.sections) {
    assert(markdown.includes(section.title));
    for (const code of section.code || []) assert(markdown.includes(code.source));
    for (const link of section.links || []) {
      if (!link.href.startsWith('/docs') || link.href.startsWith('/docs/agent-setup')) continue;
      const [path, anchor] = link.href.split('#');
      const target = Object.values(DOC_PAGES).find(item => item.path === path);
      assert(target, `Missing documentation destination: ${link.href}`);
      if (anchor) assert(target.sections.some(item => item.id === anchor), `Missing section: ${link.href}`);
    }
  }
}
for (const route of ['streaming', 'function-calling', 'quickstart', 'sdks/python', 'errors']) {
  const source = readFileSync(`src/app/docs/${route}/page.tsx`, 'utf8');
  assert(source.includes('permanentRedirect('));
}
assert(AGENT_SETUP.includes('API base URL: https://galx.ai/v1'));
assert(AGENT_SETUP.includes('GALXAI_API_KEY'));
assert(!/galx_(live|test)_[a-z0-9]+/.test(AGENT_SETUP));
const response = GET(new Request('https://galx.ai/docs/agent-setup?download=1'));
assert.equal(response.headers.get('Content-Type'), 'text/markdown; charset=utf-8');
assert.match(response.headers.get('Content-Disposition') || '', /attachment/);
assert.equal(await response.text(), AGENT_SETUP);
console.log('Docs checks passed: canonical sections, complete Markdown, internal anchors, legacy redirects, secret-free agent download.');
