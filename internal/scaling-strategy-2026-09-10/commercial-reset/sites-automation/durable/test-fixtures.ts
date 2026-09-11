import { gzipSync } from 'node:zlib';
import { renderBrief } from '../workflow';
import { staticManifest } from './artifacts';
import { WORKFLOW_VERSION, type DraftRequest, type Job } from './contracts';

export const request: DraftRequest = { schemaVersion: 1, template: WORKFLOW_VERSION,
  brief: 'Write a short fictional studio onboarding portal.', requestedModel: 'fixture-model' };
export const brief = { schema_version: 1 as const, title: 'Studio portal', summary: 'Synthetic content',
  sections: [{ heading: 'Kickoff', body: 'Confirm the scope.' }] };
export interface Entry { name: string; body?: string; type?: string; link?: string; }
/** Minimal USTAR writer for deterministic, offline adversarial fixtures only. */
export function tar(entries: Entry[]) {
  const blocks: Buffer[] = [];
  for (const entry of entries) {
    const header = Buffer.alloc(512);
    const body = Buffer.from(entry.body ?? '');
    const octal = (value: number, offset: number, size: number) => header.write(value.toString(8).padStart(size - 1, '0') + '\0', offset, size, 'ascii');
    header.write(entry.name, 0, 100); octal(entry.type === '5' ? 0o755 : 0o644, 100, 8);
    octal(0, 108, 8); octal(0, 116, 8); octal(body.length, 124, 12); octal(0, 136, 12);
    header.fill(32, 148, 156); header.write(entry.type ?? '0', 156, 1);
    header.write(entry.link ?? '', 157, 100); header.write('ustar\0', 257, 6); header.write('00', 263, 2);
    const checksum = header.reduce((sum, value) => sum + value, 0);
    header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148, 8);
    blocks.push(header, body, Buffer.alloc((512 - body.length % 512) % 512));
  }
  blocks.push(Buffer.alloc(1024)); return gzipSync(Buffer.concat(blocks));
}
export function entries(job: Job): Entry[] {
  return [ { name: 'dist/', type: '5' }, { name: 'dist/index.html', body: renderBrief(job.brief!) },
    { name: 'dist/.openai/', type: '5' }, { name: 'dist/.openai/hosting.json', body: JSON.stringify(staticManifest(job)) } ];
}
export function archive(job: Job) { return tar(entries(job)); }
export function paxEntry(key: string, value: string): Entry {
  const suffix = ` ${key}=${value}\n`;
  let length = Buffer.byteLength(suffix) + 1;
  while (Buffer.byteLength(String(length) + suffix) !== length) length = Buffer.byteLength(String(length) + suffix);
  return { name: 'PaxHeader', type: 'x', body: String(length) + suffix };
}
