import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { controllerCommandCleanupUnproven, controllerOperationEvent } from './controller-progress.js';
import { randomUUID } from 'node:crypto';

export class DockerCommandError extends Error {
  constructor(readonly code: 'docker_command_failed' | 'docker_command_timeout' | 'docker_command_output_limit' | 'docker_command_cleanup_unproven') {
    super(code); // No command arguments, subprocess stderr or environment in diagnostics.
  }
}

/** A deadline ends the actual CLI, then verifies exit and pipe closure.
 * Descendants share the controller's supervised process group. Unproven cleanup
 * asks its guardian to contain that entire group before allowing replacement.
 * Docker-daemon mutations can outlive the CLI; the driver separately journals those.
 */
export function runDockerCommand(args: string[], options: { env?: NodeJS.ProcessEnv; timeoutMs: number; terminationGraceMs?: number; maxBytes?: number }): Promise<string> {
  if (process.platform !== 'darwin' && process.platform !== 'linux') return Promise.reject(new DockerCommandError('docker_command_cleanup_unproven'));
  const grace = options.terminationGraceMs ?? 500;
  const maxBytes = options.maxBytes ?? 4 * 1024 * 1024;
  if (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs < 1 || !Number.isSafeInteger(grace) || grace < 1) throw new Error('Invalid Docker command budget');
  const guardText = process.env.GALX_CONTROLLER_GUARD_FD;
  const guard = guardText === undefined ? undefined : Number(guardText);
  if (guard !== undefined && (!Number.isSafeInteger(guard) || guard < 3 || !fs.fstatSync(guard).isFile())) throw new DockerCommandError('docker_command_cleanup_unproven');
  return new Promise((resolve, reject) => {
    const operationId = randomUUID(), stage = `docker_${args[0]}`;
    controllerOperationEvent('operation_start', operationId, stage, options.timeoutMs);
    const child = spawn('docker', args, { detached: false, env: options.env ?? process.env,
      stdio: guard === undefined ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe', guard] });
    const pid = child.pid;
    let bytes = 0, exited = false, closed = false, exitCode: number | null = null;
    const stdout: Buffer[] = [];
    let reason: DockerCommandError['code'] | undefined, signalledAt = 0, killedAt = 0, settled = false;
    const signal = (value: NodeJS.Signals) => {
      if (!pid || exited) return; // Never signal a PID already reaped by Node.
      try { child.kill(value); }
      catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ESRCH') reason = 'docker_command_cleanup_unproven'; }
    };
    const finish = (proven: boolean) => {
      if (settled) return; settled = true; clearTimeout(deadline); clearInterval(poll);
      if (!proven) {
        reason = 'docker_command_cleanup_unproven';
        controllerCommandCleanupUnproven();
        child.stdout?.destroy(); child.stderr?.destroy(); child.unref();
      }
      if (proven) controllerOperationEvent('operation_end', operationId, stage, options.timeoutMs);
      if (reason || exitCode !== 0) reject(new DockerCommandError(reason ?? 'docker_command_failed')); else resolve(Buffer.concat(stdout).toString('utf8').trim());
    };
    const terminate = (code: DockerCommandError['code']) => {
      reason ??= code;
      if (!signalledAt) { signalledAt = performance.now(); signal('SIGTERM'); }
    };
    const check = () => {
      if (exited && closed) return finish(true);
      // An exited parent with live descendants/held pipes is not completed cleanup.
      if (exited && !signalledAt) terminate('docker_command_cleanup_unproven');
      if (signalledAt && performance.now() - signalledAt >= grace && !killedAt) { killedAt = performance.now(); signal('SIGKILL'); }
      if (killedAt && performance.now() - killedAt >= 1500) finish(false);
    };
    const collect = (chunk: Buffer, output: boolean) => { bytes += chunk.length; if (bytes > maxBytes) terminate('docker_command_output_limit'); else if (output) stdout.push(Buffer.from(chunk)); };
    child.stdout?.on('data', chunk => collect(chunk, true)); child.stderr?.on('data', chunk => collect(chunk, false));
    child.once('error', () => { reason ??= 'docker_command_failed'; if (!pid) { exited = closed = true; finish(true); } else terminate(reason); });
    child.once('exit', code => { exited = true; exitCode = code; });
    child.once('close', () => { closed = true; check(); });
    const deadline = setTimeout(() => terminate('docker_command_timeout'), options.timeoutMs);
    const poll = setInterval(check, 25);
  });
}
