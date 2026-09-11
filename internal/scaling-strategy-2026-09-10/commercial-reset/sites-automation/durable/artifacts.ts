import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { renderBrief } from '../workflow';
import { digest, JobError, requireThat, WORKFLOW_VERSION, type Artifact, type Job } from './contracts';
import { privateDirectory } from './storage';

export function staticManifest(job: Job) {
  return { ...(job.target ? { project_id: job.target.projectId } : {}), static: { directory: 'dist' } };
}
function safeRead(filename: string, maxBytes: number): Buffer {
  const fd = fs.openSync(filename, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const stat = fs.fstatSync(fd);
    requireThat(stat.isFile() && stat.nlink === 1 && stat.size <= maxBytes, 'unsafe_artifact');
    const content = fs.readFileSync(fd);
    requireThat(content.length <= maxBytes, 'artifact_too_large');
    return content;
  } finally { fs.closeSync(fd); }
}
function syncDirectory(directory: string) {
  const fd = fs.openSync(directory, fs.constants.O_RDONLY);
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
export function atomicWrite(directory: string, filename: string, content: string | Buffer): void {
  requireThat(/^[a-zA-Z0-9_.-]+$/.test(filename), 'unsafe_filename');
  const temporary = path.join(directory, randomUUID() + '.tmp');
  const fd = fs.openSync(temporary, 'wx', 0o600);
  try { fs.writeFileSync(fd, content); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
  try { fs.renameSync(temporary, path.join(directory, filename)); syncDirectory(directory); }
  finally { try { fs.unlinkSync(temporary); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; } }
}
export class ArtifactStore {
  readonly root: string;
  constructor(directory: string) { this.root = privateDirectory(directory); }
  private filename(hash: string) {
    requireThat(/^[0-9a-f]{64}$/.test(hash), 'invalid_digest');
    return path.join(this.root, hash + '.tar.gz');
  }
  check(archive: Buffer, job: Job): Artifact {
    requireThat(job.brief && archive.length <= 128000 && job.request.template === WORKFLOW_VERSION, 'invalid_artifact');
    const html = renderBrief(job.brief);
    try {
      const output = execFileSync('python3', [fileURLToPath(new URL('./archive-check.py', import.meta.url))], {
        input: JSON.stringify({ archive: archive.toString('base64'), html, manifest: staticManifest(job) }),
        encoding: 'utf8', maxBuffer: 4000, timeout: 10_000,
        env: { PATH: process.env.PATH, LANG: 'C.UTF-8' }, stdio: ['pipe', 'pipe', 'pipe'],
      });
      const verified = JSON.parse(output);
      requireThat(verified.hash === digest(archive) && verified.htmlHash === digest(html) && verified.bytes === archive.length, 'artifact_verification_failed');
      return { hash: verified.hash, bytes: archive.length, htmlHash: verified.htmlHash, template: WORKFLOW_VERSION };
    } catch { throw new JobError('artifact_verification_failed'); }
  }
  put(archive: Buffer, job: Job): Artifact {
    requireThat(job.brief && archive.length <= 128000, 'invalid_artifact');
    try {
      const result = JSON.parse(execFileSync('python3', [fileURLToPath(new URL('./archive-check.py', import.meta.url))], {
        input: JSON.stringify({ archive: archive.toString('base64'), html: renderBrief(job.brief), manifest: staticManifest(job), normalize: true }),
        encoding: 'utf8', maxBuffer: 200000, timeout: 10_000,
        env: { PATH: process.env.PATH, LANG: 'C.UTF-8' }, stdio: ['pipe', 'pipe', 'pipe'],
      }));
      requireThat(typeof result.archive === 'string', 'artifact_verification_failed');
      archive = Buffer.from(result.archive, 'base64');
    } catch { throw new JobError('artifact_verification_failed'); }
    const artifact = this.check(archive, job);
    const filename = this.filename(artifact.hash);
    if (fs.existsSync(filename)) requireThat(digest(safeRead(filename, 128000)) === artifact.hash, 'artifact_corrupt');
    else atomicWrite(this.root, path.basename(filename), archive);
    requireThat(digest(safeRead(filename, 128000)) === artifact.hash, 'artifact_corrupt');
    return artifact;
  }
  read(job: Job): Buffer {
    requireThat(job.artifact, 'artifact_missing');
    let archive: Buffer;
    try { archive = safeRead(this.filename(job.artifact.hash), 128000); }
    catch { throw new JobError('artifact_unavailable'); }
    const checked = this.check(archive, job);
    requireThat(checked.hash === job.artifact.hash && checked.bytes === job.artifact.bytes &&
      checked.htmlHash === job.artifact.htmlHash && checked.template === job.artifact.template, 'artifact_corrupt');
    return archive;
  }
  prepareWorkspace(job: Job, stagingRoot: string): string {
    requireThat(job.brief && job.request.template === WORKFLOW_VERSION, 'content_missing');
    const parent = privateDirectory(stagingRoot);
    // A unique workspace for every packaging attempt; no writes into a prior run.
    const workspace = fs.mkdtempSync(path.join(parent, 'package-'));
    const dist = privateDirectory(path.join(workspace, 'dist'));
    const config = privateDirectory(path.join(workspace, '.openai'));
    atomicWrite(dist, 'index.html', renderBrief(job.brief));
    atomicWrite(config, 'hosting.json', JSON.stringify(staticManifest(job)) + '\n');
    syncDirectory(workspace); syncDirectory(parent);
    return workspace;
  }
}
