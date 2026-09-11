/** Offline child-process fault injection. No connector or model credentials. */
import fs from 'node:fs';
import path from 'node:path';
import { JobStore } from './storage';
import { DEFAULT_POLICY } from './contracts';

const [directory, jobId, mode] = process.argv.slice(2);
if (!directory || !jobId || !['before-dispatch', 'after-dispatch', 'contend'].includes(mode)) process.exit(2);
const store = new JobStore(directory, 'owner-a', DEFAULT_POLICY, () => 1000);
try {
  const lease = store.acquire(jobId, `child-${process.pid}`);
  store.beginGeneration(jobId, lease);
  if (mode === 'contend') {
    console.log('acquired'); store.close();
  } else {
    if (mode === 'after-dispatch') {
      const fd = fs.openSync(path.join(directory, 'external-effect.fixture'), 'wx', 0o600);
      fs.writeSync(fd, 'synthetic-dispatch'); fs.fsyncSync(fd); fs.closeSync(fd);
    }
    // No graceful close: verify SQLite's committed intent survives process death.
    process.kill(process.pid, 'SIGKILL');
  }
} catch { console.log('blocked'); store.close(); }
