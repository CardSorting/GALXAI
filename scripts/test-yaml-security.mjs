import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
// Exercise the parser actually resolved by the affected consumer, including
// nested copies; a top-level package check alone could miss a vulnerable copy.
const consumerRequire = createRequire(require.resolve('@eslint/eslintrc'));
const yaml = consumerRequire('js-yaml');
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));

test('all locked js-yaml copies and the installed consumer resolve to the reviewed patch', () => {
  assert.equal(manifest.overrides['js-yaml@^4.0.0'], '4.3.2');
  const copies = Object.entries(lock.packages).filter(([location]) => /(?:^|\/)node_modules\/js-yaml$/.test(location));
  assert(copies.length > 0, 'Expected the ESLint YAML dependency in the lockfile');
  for (const [location, entry] of copies) {
    assert.equal(entry.version, '4.3.2', `Unreviewed YAML version at ${location}`);
    assert.equal(entry.resolved, 'https://registry.npmjs.org/js-yaml/-/js-yaml-4.3.2.tgz');
    assert.equal(entry.integrity, 'sha512-SFNOvSJ+Dgf/9An904Yx+CgSlIPCkIpao4qo51lpee25TIRejdH3rhR4EZMGoNx3/TP3O+wzWuiTFl4sqbltzA==');
  }
  assert.equal(consumerRequire('js-yaml/package.json').version, '4.3.2');
});

test('empty mappings consume the merge budget (GHSA-2883-xcg3-v3hh)', () => {
  // Tiny, deterministic regression fixture: never run the advisory's large CPU
  // exhaustion example against a potentially vulnerable parser.
  const source = 'empty: &empty [{}, {}, {}]\nmerged:\n  <<: *empty\n';
  assert.throws(() => yaml.load(source, { maxTotalMergeKeys: 2 }), /maxTotalMergeKeys/);
});

test('the default merge budget rejects excessive empty sources', () => {
  // Small individual sequences exercise the cumulative budget independently
  // of the additional oversized-sequence guard introduced by the patch.
  const source = `empty: &empty [${Array(100).fill('{}').join(',')}]\n${
    Array.from({ length: 101 }, (_, index) => `merged${index}: { <<: *empty }`).join('\n')
  }\n`;
  assert.throws(() => yaml.load(source), /maxTotalMergeKeys/);
});

test('normal configuration mappings and merge override semantics remain compatible', () => {
  const source = 'defaults: &defaults\n  retries: 2\n  enabled: true\nworker:\n  <<: *defaults\n  retries: 1\n';
  assert.deepEqual(yaml.load(source), {
    defaults: { retries: 2, enabled: true }, worker: { retries: 1, enabled: true },
  });
});
