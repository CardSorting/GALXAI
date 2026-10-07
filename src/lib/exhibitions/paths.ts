/** Exact authored destinations; siblings and drafts remain private. */
export const PUBLIC_PROGRAMME_PATHS = [
  '/exhibitions', '/editorials',
  '/exhibitions/instruments-for-the-impossible',
  '/exhibitions/things-that-hold-time',
  '/editorials/what-an-object-can-ask',
  '/editorials/reading-the-trace',
] as const;
const programmePaths = new Set<string>(PUBLIC_PROGRAMME_PATHS);
export function isPublicProgrammePath(pathname: string) { return programmePaths.has(pathname); }
