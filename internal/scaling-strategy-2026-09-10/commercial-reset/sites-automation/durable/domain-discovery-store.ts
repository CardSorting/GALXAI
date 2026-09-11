import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { identifier, requireThat } from './contracts';
import { privateDirectory, privateFile, requireSupportedSQLite, SQLITE_VERSION, type Database } from './storage';

export interface DiscoveryIdentity { origin: string; username: string; connectionId: string; accountUserId: string; includeExisting: boolean; }
export interface DiscoveryJob { projectId: string; leaseId: string; }
/** Per-customer durable discovery cursor and retry queue. No credentials are stored. */
export class DomainDiscoveryStore {
  private readonly db: Database;
  constructor(directory: string, identity: DiscoveryIdentity, private readonly clock = Date.now) {
    requireSupportedSQLite(SQLITE_VERSION);
    identifier(identity.connectionId); identifier(identity.accountUserId);
    const root = privateDirectory(directory), filename = path.join(root, 'site-addresses.sqlite');
    privateFile(filename);
    for (const suffix of ['-wal', '-shm', '-journal']) {
      try { fs.lstatSync(filename + suffix); privateFile(filename + suffix); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    }
    const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as {
      DatabaseSync: new (filename: string, options: { allowExtension: boolean }) => Database;
    };
    this.db = new DatabaseSync(filename, { allowExtension: false });
    try {
      this.db.exec('PRAGMA busy_timeout=5000; PRAGMA trusted_schema=OFF;');
      const app = this.db.prepare('PRAGMA application_id').get()?.application_id;
      requireThat(app === 1195461716 || (app === 0 && this.db.prepare("SELECT name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'").all().length === 0), 'foreign_state_database');
      requireThat([0, 1].includes(Number(this.db.prepare('PRAGMA user_version').get()?.user_version)), 'unsupported_store_version');
      requireThat(this.db.prepare('PRAGMA quick_check').get()?.quick_check === 'ok', 'state_corrupt');
      this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA fullfsync=ON; PRAGMA checkpoint_fullfsync=ON;');
      requireThat(this.db.prepare('PRAGMA journal_mode').get()?.journal_mode === 'wal' &&
        this.db.prepare('PRAGMA synchronous').get()?.synchronous === 2, 'durability_mode_unavailable');
      this.tx(() => {
        this.db.exec(`CREATE TABLE IF NOT EXISTS enrollment (
          singleton INTEGER PRIMARY KEY CHECK(singleton=1), identity TEXT NOT NULL, initialized INTEGER NOT NULL DEFAULT 0
        ) STRICT;
        CREATE TABLE IF NOT EXISTS addresses (
          project_id TEXT PRIMARY KEY, state TEXT NOT NULL CHECK(state IN ('ignored','pending','active')),
          next_check INTEGER NOT NULL DEFAULT 0, attempts INTEGER NOT NULL DEFAULT 0,
          lease_id TEXT, lease_until INTEGER NOT NULL DEFAULT 0
        ) STRICT;
        CREATE INDEX IF NOT EXISTS addresses_due ON addresses(next_check,project_id) WHERE state='pending';
        PRAGMA application_id=1195461716; PRAGMA user_version=1;`);
        const serialized = JSON.stringify(identity);
        const old = this.db.prepare('SELECT identity FROM enrollment WHERE singleton=1').get();
        requireThat(!old || old.identity === serialized, 'sites_connection_mismatch');
        this.db.prepare('INSERT OR IGNORE INTO enrollment(singleton,identity) VALUES(1,?)').run(serialized);
      });
    } catch (error) { this.db.close(); throw error; }
  }
  private tx<T>(run: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = run(); this.db.exec('COMMIT'); return result; }
    catch (error) { try { this.db.exec('ROLLBACK'); } catch { /* Original error is retained. */ } throw error; }
  }
  /** Only complete, validated pagination can establish the initial baseline. */
  discover(projectIds: string[]): void {
    requireThat(projectIds.length <= 1000 && new Set(projectIds).size === projectIds.length, 'sites_inventory_invalid');
    projectIds.forEach(identifier);
    this.tx(() => {
      const enrollment = this.db.prepare('SELECT identity,initialized FROM enrollment WHERE singleton=1').get()!;
      const included = enrollment.initialized === 1 || JSON.parse(String(enrollment.identity)).includeExisting === true;
      for (const projectId of projectIds) this.db.prepare('INSERT OR IGNORE INTO addresses(project_id,state) VALUES(?,?)')
        .run(projectId, included ? 'pending' : 'ignored');
      this.db.prepare('UPDATE enrollment SET initialized=1 WHERE singleton=1').run();
    });
  }
  claim(): DiscoveryJob | null {
    return this.tx(() => {
      const now = this.clock();
      const row = this.db.prepare("SELECT project_id FROM addresses WHERE state='pending' AND next_check<=? AND lease_until<=? ORDER BY next_check,project_id LIMIT 1").get(now, now);
      if (!row) return null;
      const leaseId = randomUUID(), projectId = String(row.project_id);
      this.db.prepare('UPDATE addresses SET lease_id=?,lease_until=?,attempts=MIN(attempts+1,30) WHERE project_id=?')
        .run(leaseId, now + 300000, projectId);
      return { projectId, leaseId };
    });
  }
  finish(job: DiscoveryJob, active: boolean): void {
    this.tx(() => {
      const now = this.clock();
      const row = this.db.prepare('SELECT attempts FROM addresses WHERE project_id=? AND lease_id=? AND lease_until>?').get(job.projectId, job.leaseId, now);
      requireThat(row, 'lease_lost');
      const delay = Math.min(900000, 30000 * 2 ** Math.min(5, Number(row.attempts) - 1));
      this.db.prepare('UPDATE addresses SET state=?,next_check=?,lease_id=NULL,lease_until=0 WHERE project_id=? AND lease_id=?')
        .run(active ? 'active' : 'pending', now + delay, job.projectId, job.leaseId);
    });
  }
  close() { this.db.close(); }
}
