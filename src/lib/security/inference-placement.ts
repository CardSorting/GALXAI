/** Private deployment policy. Retired entry points never proxy or replay work. */
const retired = new Set([
  '/v1/inference', '/v1/chat/completions', '/v1/completions', '/v1/messages',
  '/v1/embeddings', '/api/chat', '/api/generate', '/api/run',
]);
export function retiredVercelInferencePath(pathname: string): boolean {
  // The legacy compute queue can dispatch model work during status reads as
  // well as submissions. Retire its HTTP control surface with its executor.
  return process.env.VERCEL === '1' && (retired.has(pathname.replace(/\/$/, '')) || /^\/api\/queues(?:\/|$)/.test(pathname));
}
