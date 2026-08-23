#!/usr/bin/env node

/**
 * GALXAI Zero-Hesitation Developer CLI
 * Run models, estimate tokens, list models, resolve aliases, and test gateway latency in 0ms.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const cliTsPath = resolve(__dirname, '../src/cli/index.ts');

const child = spawn(
  process.execPath,
  ['--import', 'tsx', cliTsPath, ...process.argv.slice(2)],
  { stdio: 'inherit' }
);

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
