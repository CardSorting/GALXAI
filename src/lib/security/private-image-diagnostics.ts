/** Private diagnostics retain failure category, status and call sites without copying payloads. */
export function logImageFailure(requestId: string, error: unknown): void {
  if (!(error instanceof Error)) {
    console.error('[image request failed]', { requestId, category: 'unknown_error' });
    return;
  }
  const failure = error as Error & { status?: number; reason?: string };
  // Provider messages can quote arbitrary user secrets. Never log them or the stack's message line.
  // Operational events separately retain model, attempt, timing and capacity information.
  const category = /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(error.name) ? error.name : 'Error';
  const frames = String(error.stack || '').split('\n').filter(line => /^\s+at [^\r\n]+:\d+:\d+\)?$/.test(line))
    .slice(0, 20).map(line => line.replace(/(?:https?:\/\/)[^\s)]+/g, '[remote frame]'));
  console.error('[image request failed]', { requestId, category,
    ...(Number.isInteger(failure.status) ? { status: failure.status } : {}), frames });
}
