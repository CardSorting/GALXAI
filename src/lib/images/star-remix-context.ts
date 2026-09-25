import { executePostgresQuery } from '@/lib/db/postgres';

export interface PublicStarRemixContext {
  prompt: string;
}

type QueryResult = { rows: Array<{ prompt?: unknown }> } | null;
type Query = (sql: string, params?: unknown[]) => Promise<QueryResult>;

/** Resolve a public Star source privately; only the work ID crosses the client boundary. */
export async function loadPublicStarRemixContext(
  workId: unknown,
  query: Query = executePostgresQuery,
): Promise<PublicStarRemixContext | null> {
  if (typeof workId !== 'string' || !/^[A-Za-z0-9_.-]{1,200}$/.test(workId)) return null;
  const result = await query(`
    SELECT prompt
    FROM public.community_star_profile_creations
    WHERE id = $1 AND participant_kind = 'star'
    LIMIT 1
  `, [workId]);
  const prompt = result?.rows[0]?.prompt;
  return typeof prompt === 'string' && prompt.trim() && prompt.length <= 4_000
    ? { prompt: prompt.trim() }
    : null;
}
