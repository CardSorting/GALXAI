import fs from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readRelayJson } from '../../relay/federation-http-policy.js';

/** Used by the host CLI. Administrator credentials never enter a URL or browser storage. */
export async function openRelayMonitor(port: number, options: {
  directory?: string; adminKey?: string; transport?: typeof fetch; open?: (url: string) => Promise<void>;
  destination?: 'monitor' | 'desktops';
} = {}): Promise<void> {
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error('Invalid monitor port');
  let key = options.adminKey ?? process.env.RELAY_ADMIN_API_KEYS?.split(',').map(k => k.trim()).find(Boolean);
  if (!key) {
    try { key = parseEnv(fs.readFileSync(path.join(options.directory ?? process.cwd(), '.env.local'), 'utf8'))
      .RELAY_ADMIN_API_KEYS?.split(',').map(k => k.trim()).find(Boolean); }
    catch { /* Report setup requirements without printing local environment values. */ }
  }
  if (!key) throw new Error('Open the monitor from the configured relay project on the host computer.');
  const base = `http://127.0.0.1:${port}`;
  const destination = options.destination === 'desktops' ? 'desktops' : 'monitor';
  const page = destination === 'desktops' ? '/desktops' : '/federation';
  let ticket: unknown;
  try {
    const response = await (options.transport ?? fetch)(`${base}/api/${destination}/access`, { method: 'POST',
      headers: { Authorization: `Bearer ${key}` }, redirect: 'error', signal: AbortSignal.timeout(8000) });
    if (!response.ok) { await response.body?.cancel(); throw new Error('Access unavailable'); }
    ticket = (await readRelayJson(response, 1024)).ticket;
  } catch { throw new Error('Could not connect to the monitor. Check that the relay service is running and up to date.'); }
  if (typeof ticket !== 'string' || !/^[a-f0-9]{64}$/.test(ticket)) throw new Error('The monitor returned an invalid sign-in link.');
  const url = `${base}${page}?connect=1#login=${ticket}`;
  try {
    if (options.open) await options.open(url);
    else await promisify(execFile)(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { timeout: 10000 });
  } catch { throw new Error('Could not open your browser. Run relay open again from your desktop session.'); }
  console.log(`${destination === 'desktops' ? 'Relay Desktops' : 'Monitor'} opened: ${base}${page}`);
}
