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

test('build diagnostics cannot become public static artifacts', () => {
  const f = fixture();
  try {
    const diagnostics = path.join(f.output, 'static/_next/__private');
    fs.mkdirSync(diagnostics, { recursive: true });
    fs.writeFileSync(path.join(diagnostics, 'trace'), 'PRIVATE_SOURCE_PATH_AND_TIMINGS');
    fs.writeFileSync(path.join(f.output, 'static/approved.js'), 'PUBLIC_APPLICATION_BYTES');
    const result = retainHostedOutput(f.root);
    assert(!fs.existsSync(diagnostics));
    assert.equal(result.excludedDiagnostics.length, 1);
    assert.equal(result.excludedDiagnostics[0].path, 'static/_next/__private/trace');
    const manifest = fs.readFileSync(path.join(f.root, 'artifact-manifest.json'), 'utf8');
    assert(!manifest.includes('__private'));
    assert.equal(fs.readFileSync(path.join(f.output, 'static/approved.js'), 'utf8'), 'PUBLIC_APPLICATION_BYTES');
    assert.equal(result.applicationPayloadBytesChanged, 0);
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
