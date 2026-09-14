import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export interface DockerMutation { id: string; shardId: string; action: 'run' | 'stop' | 'rm'; target: string; generation: string; startedAt: number; }
export class DockerMutationError extends Error {
  constructor(readonly code: 'docker_mutation_uncertain' | 'docker_journal_unavailable') { super(code); }
}

/** Single-controller private write-ahead evidence. No credentials or subprocess output.
 * Missing resources do not establish that an uncertain create was never accepted.
 */
export class DockerMutationJournal {
  private entries = new Map<string, DockerMutation>();
  constructor(private readonly filename?: string) {
    if (!filename) return;
    try {
      this.directory();
      let stat: fs.Stats;
      try { stat = fs.lstatSync(filename); }
      catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT' || fs.existsSync(this.marker())) throw e;
        this.createEmpty();
        this.initialize();
        return;
      }
      if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || (stat.mode & 0o077) || stat.size > 1024 * 1024 || stat.uid !== process.getuid?.()) throw new Error();
      const value = JSON.parse(fs.readFileSync(filename, 'utf8'));
      if (value.version !== 1 || !Array.isArray(value.entries) || value.entries.length > 2048) throw new Error();
      for (const row of value.entries) {
        if (!row || typeof row !== 'object' || !/^[a-f0-9-]{36}$/.test(row.id) || !['run', 'stop', 'rm'].includes(row.action)
          || typeof row.shardId !== 'string' || !row.shardId || row.shardId.length > 256 || this.entries.has(row.shardId)
          || typeof row.target !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(row.target)
          || typeof row.generation !== 'string' || !row.generation || row.generation.length > 256 || !Number.isSafeInteger(row.startedAt)) throw new Error();
        this.entries.set(row.shardId, { id: row.id, shardId: row.shardId, action: row.action, target: row.target, generation: row.generation, startedAt: row.startedAt });
      }
      this.initialize();
    } catch { throw new DockerMutationError('docker_journal_unavailable'); }
  }
  private marker() { return `${this.filename!}.initialized`; }
  private createEmpty() {
    const body = JSON.stringify({ version: 1, entries: [] });
    const temporary = `${this.filename}.${randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temporary, body, { mode: 0o600, flag: 'wx', flush: true });
      fs.renameSync(temporary, this.filename!);
      const fd = fs.openSync(path.dirname(this.filename!), fs.constants.O_RDONLY);
      try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    } finally { try { fs.unlinkSync(temporary); } catch { /* Preserve the journal if cleanup itself is unavailable. */ } }
  }
  private directory() {
    const stat = fs.lstatSync(path.dirname(this.filename!));
    if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077) || stat.uid !== process.getuid?.()) throw new Error();
  }
  private initialize() {
    const marker = this.marker(), expected = 'galx-docker-journal-v1\n';
    try { fs.writeFileSync(marker, expected, { mode: 0o600, flag: 'wx', flush: true }); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const stat = fs.lstatSync(marker);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || (stat.mode & 0o077) || stat.uid !== process.getuid?.()
        || stat.size !== Buffer.byteLength(expected) || fs.readFileSync(marker, 'utf8') !== expected) throw new Error();
    }
    const fd = fs.openSync(path.dirname(this.filename!), fs.constants.O_RDONLY);
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  }
  private save(next: Map<string, DockerMutation>) {
    if (this.filename) {
      const temporary = `${this.filename}.${randomUUID()}.tmp`;
      try {
        this.directory();
        this.initialize();
        fs.writeFileSync(temporary, JSON.stringify({ version: 1, entries: [...next.values()] }), { mode: 0o600, flag: 'wx', flush: true });
        fs.renameSync(temporary, this.filename);
        const fd = fs.openSync(path.dirname(this.filename), fs.constants.O_RDONLY);
        try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
      } catch { throw new DockerMutationError('docker_journal_unavailable'); }
      finally { try { fs.unlinkSync(temporary); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') { /* Retain evidence; never erase the authoritative journal. */ } } }
    }
    this.entries = next;
  }
  pending() { return [...this.entries.values()]; }
  has(shardId: string) { return this.entries.has(shardId); }
  assertClear(shardId: string) { if (this.has(shardId)) throw new DockerMutationError('docker_mutation_uncertain'); }
  begin(value: Omit<DockerMutation, 'id' | 'startedAt'>) {
    this.assertClear(value.shardId);
    if (this.entries.size >= 2048) throw new DockerMutationError('docker_journal_unavailable');
    const entry = { ...value, id: randomUUID(), startedAt: Date.now() };
    this.save(new Map(this.entries).set(entry.shardId, entry)); return entry;
  }
  complete(entry: DockerMutation) {
    if (this.entries.get(entry.shardId)?.id !== entry.id) throw new DockerMutationError('docker_mutation_uncertain');
    const next = new Map(this.entries); next.delete(entry.shardId); this.save(next);
  }
}
