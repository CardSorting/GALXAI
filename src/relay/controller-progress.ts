import fs from 'node:fs';

type Stage = 'startup' | 'reconcile' | 'idle' | 'shutdown' | 'stopped';
let stage: Stage = 'startup';
let stageStartedAt = Date.now();
let progressFd: number | undefined;

export function controllerCommandCleanupUnproven(): void {
  if (progressFd === undefined) return;
  try { fs.writeSync(progressFd, JSON.stringify({ event: 'command_cleanup_unproven' }) + '\n'); }
  catch { process.exit(1); }
}

export function controllerOperationEvent(event: 'operation_start' | 'operation_end', id: string, stage: string, timeoutMs: number): void {
  if (progressFd === undefined) return;
  if (!/^[a-zA-Z0-9-]{1,64}$/.test(id) || !['docker_ps', 'docker_inspect', 'docker_run', 'docker_update', 'docker_stop', 'docker_rm'].includes(stage)) return;
  try { fs.writeSync(progressFd, JSON.stringify({ event, id, stage, timeoutMs }) + '\n'); }
  catch { process.exit(1); }
}

/** Private inherited pipe, never request data or HTTP diagnostics. */
export function controllerStage(next: Stage): void {
  if (next !== stage) { stage = next; stageStartedAt = Date.now(); }
  heartbeat();
}
function heartbeat(): void {
  if (progressFd === undefined) return;
  try { fs.writeSync(progressFd, JSON.stringify({ event: 'heartbeat', stage, stageStartedAt }) + '\n'); }
  catch { process.exit(1); } // Parent lost: end authority before a replacement may start.
}
export function startControllerProgress(): void {
  const guard = Number(process.env.GALX_CONTROLLER_GUARD_FD);
  const progress = Number(process.env.GALX_CONTROLLER_PROGRESS_FD);
  if (!Number.isInteger(guard) || guard < 3 || !Number.isInteger(progress) || progress < 3 || guard === progress) {
    throw new Error('Controller requires the local ownership supervisor');
  }
  if (!fs.fstatSync(guard).isFile() || !fs.fstatSync(progress).isFIFO()) throw new Error('Invalid inherited controller authority');
  progressFd = progress;
  heartbeat();
  setInterval(heartbeat, 1000).unref();
}
