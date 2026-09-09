import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

export interface InvalidCredentialStore {
  load(): Map<string, string>;
  save(entries: ReadonlyMap<string, string>): void;
}

/** Host-private rejection evidence, fenced by credential revision; contains no tokens. */
export class FileInvalidCredentialStore implements InvalidCredentialStore {
  constructor(private readonly filename: string) {}
  load(): Map<string, string> {
    let raw: string;
    try { raw = fs.readFileSync(this.filename, 'utf8'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return new Map(); throw error; }
    if (raw.length > 1024 * 1024) throw new Error('Invalid credential rejection journal');
    const data = JSON.parse(raw);
    if (data?.version !== 1 || !Array.isArray(data.entries) || data.entries.length > 2048
      || data.entries.some((entry: unknown) => !Array.isArray(entry) || entry.length !== 2
        || typeof entry[0] !== 'string' || !entry[0] || entry[0].length > 256
        || typeof entry[1] !== 'string' || !/^[a-f0-9]{64}$/.test(entry[1]))) throw new Error('Invalid credential rejection journal');
    const entries = new Map<string, string>(data.entries);
    if (entries.size !== data.entries.length) throw new Error('Duplicate credential rejection journal entry');
    return entries;
  }
  save(entries: ReadonlyMap<string, string>): void {
    const temporary = `${this.filename}.${randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temporary, JSON.stringify({ version: 1, entries: [...entries] }), { flag: 'wx', mode: 0o600, flush: true });
      fs.renameSync(temporary, this.filename);
    } finally {
      try { fs.unlinkSync(temporary); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    }
  }
}
