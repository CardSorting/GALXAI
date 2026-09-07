/** Refresh the relay's memory-only registry projection. Never export plaintext credentials. */
import { pathToFileURL } from 'node:url';

export async function projectShardsToBroccoli(): Promise<number> {
  const relayUrl = process.env.VM_RELAY_URL || 'http://127.0.0.1:3001';
  const apiKey = process.env.RELAY_API_KEYS?.split(',')[0]?.trim();
  const response = await fetch(new URL('/api/shards/sync', relayUrl), {
    method: 'POST', headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Relay fleet sync failed (HTTP ${response.status})`);
  const result = await response.json();
  return result.enrolledCount;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  projectShardsToBroccoli().then(count => {
    console.log(`Synchronized ${count} unique shard accounts in relay memory.`);
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
