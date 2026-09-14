import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// launchd remains the sole restart authority. The guardian never restarts children.
const namespace = process.env.RELAY_FEDERATION_NAMESPACE || 'vnext-canary';
if (!/^[a-z0-9-]{1,32}$/.test(namespace)) throw new Error('Invalid federation namespace');
const scripts = path.dirname(fileURLToPath(import.meta.url));
const child = spawn(process.env.RELAY_SUPERVISOR_PYTHON || 'python3', [
  path.join(scripts, 'relay-controller-supervisor.py'),
  path.resolve('.relay', `federation-${namespace}`), '--', process.execPath,
  '--import', 'tsx', path.join(scripts, 'relay-federation-controller.ts'),
], { stdio: 'inherit' });
for (const signal of ['SIGTERM', 'SIGINT'] as const) process.once(signal, () => { child.kill(signal); });
child.once('error', () => { console.error('Federation supervisor could not start; verify Python 3 and local filesystem support'); process.exitCode = 1; });
child.once('exit', (code) => { process.exitCode = code ?? 1; });
