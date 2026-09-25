import { chmod, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getPostgresPool, closePostgresPool } from '../src/lib/db/postgres';
import { BrocPracticeRepository } from '../BROC/store';
import { GalxR2AssetAdapter } from '../src/workers/cloudflare/GalxR2AssetAdapter';
import { sanitizeImageArtifact } from '../src/lib/security/image-artifact';

const command = process.argv[2] || 'help';
const args = process.argv.slice(3);
const repository = new BrocPracticeRepository();

function option(name: string): string | undefined {
  const value = args.find((arg) => arg.startsWith(`--${name}=`));
  return value?.slice(name.length + 3);
}

function printHelp(): void {
  process.stdout.write([
    'Internal Star candidate review',
    '  npm run stars:review -- list [--limit=48]',
    '  npm run stars:review -- preview <attempt-id>',
    '  npm run stars:review -- select <attempt-id> --assets=id[,id] --reviewer=name --rationale=text',
    '  npm run stars:review -- withhold <attempt-id> --reviewer=name --rationale=text',
    '',
    'Preview writes re-encoded images to a private temporary directory. Selection publishes only the named candidate assets.',
  ].join('\n') + '\n');
}

function requiredOption(name: string): string {
  const value = option(name)?.trim();
  if (!value) throw new Error(`missing_${name}`);
  return value;
}

async function main(): Promise<void> {
  if (command === 'help' || command === '--help') {
    printHelp();
    return;
  }
  const pool = getPostgresPool();
  if (!pool) throw new Error('review_store_unavailable');

  if (command === 'list') {
    const rawLimit = Number(option('limit') || 48);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(Math.trunc(rawLimit), 100)) : 48;
    const candidates = await repository.listCandidateReviews(pool, limit);
    process.stdout.write(`${JSON.stringify({ count: candidates.length, candidates }, null, 2)}\n`);
    return;
  }

  const attemptId = args[0];
  if (!attemptId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(attemptId)) {
    throw new Error('invalid_attempt_id');
  }

  if (command === 'preview') {
    const result = await pool.query<{
      handle: string;
      asset_ids: string[];
      id: string;
      r2_key: string;
    }>(`
      SELECT star.handle, attempt.asset_ids, library.id, library.r2_key
      FROM private.galx_star_generation_attempts AS attempt
      JOIN private.galx_autonomous_actors AS actor ON actor.actor_id = attempt.actor_id
      JOIN private.galx_star_profiles AS star ON star.actor_id = actor.actor_id
      JOIN private.galx_star_practice_events AS candidate
        ON candidate.attempt_id = attempt.attempt_id
       AND candidate.actor_id = attempt.actor_id
       AND candidate.event_type = 'candidate'
      JOIN public.user_image_library AS library
        ON library.id = ANY(attempt.asset_ids)
       AND library.user_id = actor.account_id
       AND library.status = 'completed'
       AND library.work_class = 'star_published'
       AND library.metadata->>'requestId' = attempt.generation_id
      WHERE attempt.attempt_id = $1::uuid AND attempt.state = 'completed'
      ORDER BY library.id
    `, [attemptId]);
    if (!result.rows.length) throw new Error('candidate_unavailable');
    const expectedAssetIds = Array.isArray(result.rows[0].asset_ids) ? result.rows[0].asset_ids : [];
    if (expectedAssetIds.length !== result.rows.length ||
      new Set(result.rows.map((asset) => asset.id)).size !== expectedAssetIds.length) {
      throw new Error('candidate_asset_set_incomplete');
    }
    const directory = await mkdtemp(join(tmpdir(), `galx-star-review-${attemptId.slice(0, 8)}-`));
    await chmod(directory, 0o700);
    const files: string[] = [];
    const adapter = GalxR2AssetAdapter.getInstance();
    for (const [index, asset] of result.rows.entries()) {
      if (!/^[A-Za-z0-9_-]{1,160}$/.test(asset.id) || typeof asset.r2_key !== 'string' || !asset.r2_key.startsWith('published/')) {
        throw new Error('candidate_asset_unavailable');
      }
      const artifact = await sanitizeImageArtifact(await adapter.getAssetBuffer(asset.r2_key));
      const extension = artifact.contentType === 'image/webp' ? 'webp'
        : artifact.contentType === 'image/jpeg' ? 'jpg' : 'png';
      const path = join(directory, `work-${index + 1}.${extension}`);
      await writeFile(path, artifact.bytes, { mode: 0o600, flag: 'wx' });
      files.push(path);
    }
    process.stdout.write(`${JSON.stringify({ attemptId, star: result.rows[0].handle, files, cleanupDirectory: directory }, null, 2)}\n`);
    return;
  }

  if (command === 'select' || command === 'withhold') {
    const selectedAssetIds = command === 'select'
      ? (requiredOption('assets').split(',').map((id) => id.trim()).filter(Boolean))
      : [];
    const decision = await repository.recordCandidateDecision(
      pool,
      attemptId,
      selectedAssetIds,
      requiredOption('rationale'),
      requiredOption('reviewer'),
    );
    process.stdout.write(`${JSON.stringify({ attemptId, ...decision }, null, 2)}\n`);
    return;
  }

  printHelp();
  throw new Error('unsupported_command');
}

main()
  .catch(() => {
    process.stderr.write('Star candidate review did not complete. Check the command and private store, then retry.\n');
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePostgresPool();
  });
