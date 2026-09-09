import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

export interface ShardMaintenanceStore {
  load(): Map<string, number>;
  save(entries: ReadonlyMap<string, number>): void;
}

/** Local administrator intent only. No credentials or worker connection details. */
export class FileShardMaintenanceStore implements ShardMaintenanceStore {
  constructor(private readonly filename: string) {}
  load(): Map<string, number> {
    let raw: string;
    try { raw = fs.readFileSync(this.filename, 'utf8'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return new Map(); throw error; }
    if (raw.length > 1024 * 1024) throw new Error('Invalid maintenance journal');
    const data = JSON.parse(raw);
    if (data?.version !== 1 || !Array.isArray(data.entries) || data.entries.length > 2048 || data.entries.some((row: unknown) =>
      !Array.isArray(row) || row.length !== 2 || typeof row[0] !== 'string' || !/^[\w.:-]{1,128}$/.test(row[0]) || !Number.isSafeInteger(row[1]) || row[1] < 1)) throw new Error('Invalid maintenance journal');
    const result = new Map<string, number>(data.entries);
    if (result.size !== data.entries.length) throw new Error('Duplicate maintenance entry');
    return result;
  }
  save(entries: ReadonlyMap<string, number>): void {
    const temporary = `${this.filename}.${randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temporary, JSON.stringify({ version: 1, entries: [...entries] }), { flag: 'wx', mode: 0o600, flush: true });
      fs.renameSync(temporary, this.filename);
    } finally {
      try { fs.unlinkSync(temporary); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    }
  }
}
