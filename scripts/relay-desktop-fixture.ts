import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { DockerDesktopDriver, desktopId, type DesktopDriver } from '../src/relay/desktop-manager.js';
import { saveDesktopJournal } from '../src/relay/desktop-journal.js';

/** Test resources have a fresh namespace and a durable list of accepted create IDs. */
export class DesktopTestRun {
  readonly namespace: string;
  readonly directory: string;
  readonly driver: DesktopDriver;
  private ids = new Set<string>();
  private closed = false;
  private readonly delegate: DesktopDriver;
  constructor(readonly run = randomBytes(8).toString('hex'), root = path.resolve('.relay/desktop-tests'), factory: (namespace: string) => DesktopDriver = namespace => new DockerDesktopDriver(namespace)) {
    if (!/^[a-f0-9]{16}$/.test(run)) throw new Error('Invalid test run');
    this.namespace = 'test-' + run; this.directory = path.join(root, run);
    fs.mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    const manifest = path.join(this.directory, 'resources.json');
    if (fs.existsSync(manifest)) {
      if (!fs.lstatSync(manifest).isFile()) throw new Error('Invalid test manifest');
      const saved = JSON.parse(fs.readFileSync(manifest, 'utf8'));
      if (saved.namespace !== this.namespace || !Array.isArray(saved.ids) || saved.ids.length > 32 || !saved.ids.every(desktopId)) throw new Error('Invalid test manifest');
      this.ids = new Set(saved.ids);
    }
    this.delegate = factory(this.namespace);
    this.driver = new Proxy(this.delegate, { get: (target, key) => {
      if (key === 'create') return async (id: string) => {
        if (this.closed || !desktopId(id) || this.ids.size >= 32 && !this.ids.has(id)) throw new Error('Test run unavailable');
        this.ids.add(id); this.save(); await target.create(id);
      };
      const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value;
    } });
    this.save();
  }
  private save() { saveDesktopJournal(path.join(this.directory, 'resources.json'), { namespace: this.namespace, ids: [...this.ids] }); }
  async close() {
    this.closed = true;
    let failed = false;
    for (const id of [...this.ids]) {
      try { await this.delegate.destroy(id); this.ids.delete(id); this.save(); }
      catch { failed = true; }
    }
    if (failed) throw new Error(`Test cleanup incomplete. Retry: npx tsx scripts/relay-desktop-fixture.ts --cleanup ${this.run}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.argv.length !== 4 || process.argv[2] !== '--cleanup') throw new Error('Use --cleanup followed by a test run ID.');
  const run = new DesktopTestRun(process.argv[3]); await run.close(); console.log('Test resources removed; production namespaces are never selected.');
}
