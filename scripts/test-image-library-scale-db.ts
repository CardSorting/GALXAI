import './lib/require-isolated-integration-env';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { ImageLibraryRepository } from '../src/lib/supabase/repositories/ImageLibraryRepository';
import { BroccoliImageLibraryBuffer } from '../src/core/broccolidb/BroccoliImageLibraryBuffer';
import { InvalidImageLibraryQuery, encodeLibraryCursor, libraryScope } from '../src/lib/images/library-cursor';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 8 });
globalThis.__galx_pg_pool = pool;
const owner = randomUUID(), other = randomUUID();
const repo = ImageLibraryRepository.getInstance();
const options = { includeSummary: false, limit: 36, sort: 'newest' as const };
let checks = 0;
try {
  const migration = readFileSync(new URL('../supabase/migrations/20260913071757_image_library_bounded_pages.sql', import.meta.url), 'utf8');
  await pool.query(migration); await pool.query(migration); checks++;
  await pool.query(`INSERT INTO public.user_image_library
    (id,user_id,session_id,prompt,model,public_url,r2_key,sha256,created_at,is_favorite)
    SELECT 'scale-' || lpad(n::text,6,'0'),$1,CASE WHEN n <= 10000 THEN 'traverse' ELSE 'default' END,
      'Image ' || n || ' ' || repeat('long prompt ',100),'image','','fixture/' || n,repeat('a',64),
      '2026-09-01T00:00:00Z'::timestamptz + (n / 3) * interval '1 microsecond',n % 10 = 0
    FROM generate_series(1,50000) AS n`, [owner]);
  await pool.query(`INSERT INTO public.user_image_library (id,user_id,prompt,model,public_url,r2_key,sha256)
    VALUES ('foreign',$1,'foreign','image','','fixture/foreign',repeat('b',64))`, [other]);
  await pool.query('ANALYZE public.user_image_library');
  const first = await repo.getLibrary(owner, options);
  assert.equal(first.records.length, 36); assert.equal(first.totalCount, null); assert.equal(first.stats, null);
  assert(first.records.every(row => row.userId === owner && row.prompt.length <= 300));
  assert.equal(first.previousCursor, null); assert(first.nextCursor); checks++;
  const empty = await repo.getLibrary(owner, { ...options, cursor: encodeLibraryCursor({ createdAt: '2020-01-01T00:00:00Z', id: 'missing', scope: libraryScope(owner, options) }) });
  assert.equal(empty.records.length, 0); assert(empty.previousCursor, 'empty later pages retain a path back'); checks++;
  const second = await repo.getLibrary(owner, { ...options, cursor: first.nextCursor! });
  assert.equal(new Set([...first.records, ...second.records].map(row => row.id)).size, 72);
  const back = await repo.getLibrary(owner, { ...options, cursor: second.previousCursor! });
  assert.deepEqual(back.records.map(row => row.id), first.records.map(row => row.id)); checks++;
  await assert.rejects(repo.getLibrary(other, { ...options, cursor: first.nextCursor! }), InvalidImageLibraryQuery);
  await assert.rejects(repo.getLibrary(owner, { ...options, isFavorite: true, cursor: first.nextCursor! }), InvalidImageLibraryQuery); checks++;
  for (const sort of ['newest', 'oldest'] as const) {
    const ids = new Set<string>(); let cursor: string | undefined;
    do {
      const page = await repo.getLibrary(owner, { ...options, sort, sessionId: 'traverse', limit: 100, cursor });
      for (const row of page.records) { assert(!ids.has(row.id), `duplicate ${row.id}`); ids.add(row.id); }
      cursor = page.nextCursor || undefined;
    } while (cursor);
    assert.equal(ids.size, 10000, `${sort}: every tied and microsecond timestamp traversed`); checks++;
  }
  const favorites = await repo.getLibrary(owner, { ...options, isFavorite: true });
  assert(favorites.records.every(row => row.isFavorite)); checks++;
  const search = await repo.getLibrary(owner, { ...options, search: 'Image 49999 ' });
  assert.equal(search.records[0]?.id, 'scale-049999');
  assert.equal((await repo.getLibrary(owner, { ...options, search: "' OR 1=1 --" })).records.length, 0); checks++;
  const old = await repo.getAsset(owner, 'scale-000001');
  assert(old && old.prompt.length > 300, 'older assets load their full prompt directly');
  assert.equal(await repo.getAsset(other, old.id), null); checks++;
  await pool.query('DELETE FROM public.user_image_library WHERE id=$1', [old.id]);
  assert.equal(await repo.getAsset(owner, old.id), null, 'warm metadata cannot authorize a deleted image'); checks++;
  const signature = 'public.fn_page_user_image_library(text,integer,timestamp with time zone,text,text,text,boolean,text,text,boolean)';
  for (const role of ['anon','authenticated']) {
    const result = await pool.query('SELECT has_function_privilege($1,$2,\'execute\') AS allowed', [role,signature]);
    assert.equal(result.rows[0].allowed, false); checks++;
  }
  const result = await pool.query('SELECT has_function_privilege(\'service_role\',$1,\'execute\') AS allowed', [signature]);
  assert.equal(result.rows[0].allowed, true); checks++;
  const explain = await pool.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT id,created_at FROM public.user_image_library
    WHERE user_id=$1 AND status='completed' AND (created_at,id) < ('2026-09-01T00:00:00.000500Z','scale-001500')
    ORDER BY created_at DESC,id DESC LIMIT 37`, [owner]);
  const plan = JSON.stringify(explain.rows[0]['QUERY PLAN']);
  assert.match(plan, /idx_image_library_completed_page/); assert.doesNotMatch(plan, /Seq Scan|Sort Method/); checks++;
  const times: Record<string, number[]> = { legacy: [], compact: [] };
  for (let iteration = 0; iteration < 5; iteration++) for (const [kind, fn] of [['legacy','fn_query_user_image_library'],['compact','fn_page_user_image_library']]) {
    const start = performance.now();
    await pool.query(`SELECT public.${fn}($1,36)`, [owner]);
    times[kind].push(performance.now() - start);
  }
  const buffer = BroccoliImageLibraryBuffer.getInstance() as any;
  assert(buffer.queryPageCache.size <= 128); assert(buffer.queryPageCache.retainedBytes <= 8 * 1024 * 1024); checks++;
  await pool.query(readFileSync(new URL('../supabase/rollbacks/20260913071757_image_library_bounded_pages.down.sql', import.meta.url), 'utf8'));
  assert.equal((await pool.query(`SELECT count(*)::int AS count FROM public.user_image_library WHERE user_id=$1`, [owner])).rows[0].count, 49999);
  await pool.query(migration); checks++;
  const median = (values: number[]) => [...values].sort((a,b) => a-b)[Math.floor(values.length/2)];
  console.log(JSON.stringify({ checks, fixtureRows: 50001, fullyTraversedPerSort: 10000,
    queryMillisecondsMedianOf5: { legacy: median(times.legacy), compact: median(times.compact) },
    deepPagePlan: explain.rows[0]['QUERY PLAN'], cachedPages: buffer.queryPageCache.size, cachedPageBytes: buffer.queryPageCache.retainedBytes }, null, 2));
} finally { await pool.end(); globalThis.__galx_pg_pool = undefined; }
