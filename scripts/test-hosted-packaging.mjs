import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { retainHostedOutput } from './retain-hosted-output.mjs';

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'galx-hosted-package-'));
  const app = path.join(root, 'app'), output = path.join(app, '.vercel/output'), fn = path.join(output, 'functions/nova.func');
  fs.mkdirSync(fn, { recursive: true }); fs.mkdirSync(path.join(app, 'node_modules/example'), { recursive: true });
  fs.writeFileSync(path.join(app, 'node_modules/example/index.js'), 'module.exports = "declared payload";');
  fs.writeFileSync(path.join(app, '.env.local'), 'NEVER_PACKAGE_THIS_AMBIENT_SECRET');
  fs.writeFileSync(path.join(fn, '.vc-config.json'), JSON.stringify({ runtime: 'nodejs22.x', handler: 'handler.js', filePathMap: { 'node_modules/example/index.js': 'node_modules/example/index.js' } }));
  fs.writeFileSync(path.join(fn, 'handler.js'), 'module.exports = require("example");');
  return { root, app, output, fn };
}

test('retained output preserves selected bytes and internal aliases without ambient workspace files', () => {
  const f = fixture();
  try {
    fs.symlinkSync('nova.func', path.join(f.output, 'functions/alias.func'));
    const result = retainHostedOutput(f.root);
    assert.equal(result.retainedPayloads, 1); assert.equal(result.applicationPayloadBytesChanged, 0);
    const config = JSON.parse(fs.readFileSync(path.join(f.fn, '.vc-config.json')));
    const retained = path.resolve(f.app, config.filePathMap['node_modules/example/index.js']);
    assert(retained.startsWith(f.output + path.sep));
    assert.equal(fs.readFileSync(retained, 'utf8'), fs.readFileSync(path.join(f.app, 'node_modules/example/index.js'), 'utf8'));
    assert(!fs.readFileSync(path.join(f.root, 'artifact-manifest.json'), 'utf8').includes('.env.local'));
    assert.equal(JSON.parse(fs.readFileSync(path.join(f.root, 'artifact-manifest.json')))['.vercel/output/functions/alias.func'].symlink, 'nova.func');
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
});

test('function aliases cannot escape the retained artifact', () => {
  const f = fixture();
  try {
    fs.symlinkSync('../../../node_modules/example', path.join(f.output, 'functions/escape.func'));
    assert.throws(() => retainHostedOutput(f.root), /alias escapes/);
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
});

test('undeclared dependencies outside the isolated build are rejected', () => {
  const f = fixture(), outside = fs.mkdtempSync(path.join(os.tmpdir(), 'galx-hosted-outside-'));
  try {
    fs.writeFileSync(path.join(outside, 'secret.js'), 'PRIVATE_SIBLING');
    fs.writeFileSync(path.join(f.fn, '.vc-config.json'), JSON.stringify({ filePathMap: { 'secret.js': path.join(outside, 'secret.js') } }));
    assert.throws(() => retainHostedOutput(f.root), /Undeclared external/);
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); fs.rmSync(outside, { recursive: true, force: true }); }
});
