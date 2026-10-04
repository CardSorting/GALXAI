import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

/** Vercel's local default maps dependencies back into the build workspace.
 * Retain those exact bytes inside the package without rebuilding application
 * code. The map is packaging metadata; runtime paths remain unchanged. */
export function retainHostedOutput(buildDirectory) {
  const build = fs.realpathSync(path.resolve(buildDirectory)), app = path.join(build, 'app');
  const output = path.join(app, '.vercel/output');
  const sha = bytes => createHash('sha256').update(bytes).digest('hex');
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(item => item.isDirectory() ? walk(path.join(dir, item.name)) : [path.join(dir, item.name)]);
  const configs = walk(path.join(output, 'functions')).filter(name => name.endsWith('/.vc-config.json'));
  const shared = path.join(output, 'shared'); fs.mkdirSync(shared, { recursive: true });
  let references = 0;
  for (const name of configs) {
    const config = JSON.parse(fs.readFileSync(name));
    for (const [runtimePath, reference] of Object.entries(config.filePathMap || {})) {
      const original = fs.realpathSync(path.resolve(app, reference));
      if (!original.startsWith(build + path.sep)) throw new Error('Undeclared external package input');
      const bytes = fs.readFileSync(original), digest = sha(bytes), retained = path.join(shared, digest);
      if (!fs.existsSync(retained)) { fs.writeFileSync(retained, bytes); fs.chmodSync(retained, fs.statSync(original).mode & 0o777); }
      if (sha(fs.readFileSync(retained)) !== digest) throw new Error('Retained payload mismatch');
      config.filePathMap[runtimePath] = '.vercel/output/shared/' + digest; references++;
    }
    fs.writeFileSync(name, JSON.stringify(config, null, 2) + '\n');
  }
  const manifest = {};
  for (const name of walk(output).sort()) {
    if (fs.lstatSync(name).isSymbolicLink()) {
      // The Next builder shares functions through relative directory aliases.
      // Retain only aliases whose resolved payload is inside this artifact.
      const target = fs.readlinkSync(name);
      if (path.isAbsolute(target) || !fs.realpathSync(name).startsWith(output + path.sep)) throw new Error('Hosted alias escapes the artifact');
      manifest[path.relative(app, name)] = { symlink: target, sha256: sha('symlink\0' + target) };
    } else manifest[path.relative(app, name)] = sha(fs.readFileSync(name));
  }
  fs.writeFileSync(path.join(build, 'artifact-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  execFileSync('tar', ['-czf', path.join(build, 'hosted-candidate.tgz'), '-C', app, '.vercel/output']);
  const record = { at: new Date().toISOString(), format: 'Vercel Build Output API', functions: configs.length, mappedReferences: references, retainedPayloads: fs.readdirSync(shared).length, files: Object.keys(manifest).length, manifestSha256: sha(JSON.stringify(manifest)), archiveSha256: sha(fs.readFileSync(path.join(build, 'hosted-candidate.tgz'))), archiveBytes: fs.statSync(path.join(build, 'hosted-candidate.tgz')).size, applicationPayloadBytesChanged: 0, workspaceDependencies: false, deployed: false };
  fs.writeFileSync(path.join(build, 'artifact.json'), JSON.stringify(record, null, 2) + '\n');
  return record;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) console.log(JSON.stringify(retainHostedOutput(process.argv[2]), null, 2));
