/**
 * @file src/core/relay/GalxRelaySupervisor.ts
 * @description Zero-Collision, Anti-Fragile Process Supervisor & Port Authority.
 * Protects local development environments from port collisions, never kills foreign processes,
 * and anchors the relay on 127.0.0.1:3001 with extended keepalives.
 */

import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface RelayHealthData {
  status: string;
  service?: string;
  signature?: string;
  port?: number;
  host?: string;
  version: string;
  storageEngine: string;
  uptimeSec: number;
  shards: {
    total: number;
    active: number;
    exhausted: number;
    cooldown: number;
  };
  jobs: {
    active: number;
    totalSubmitted: number;
    totalCompleted: number;
    attachedDuplicates: number;
  };
  antiFragility: {
    totalUpstreamRetries: number;
    totalMidStreamFailoversWon: number;
    totalShardCooldownEjections: number;
    totalDeadPeerRecoveries: number;
    totalReasoningChunksReceived: number;
    totalHeartbeatAckMisses: number;
    totalOverlapReconciliationsWon: number;
    totalDownstreamFailoverKeepalivesSent: number;
    totalProactiveRateLimitCooldowns: number;
    totalBusEventsEmitted: number;
    totalSlowSubscriberDrains: number;
  };
  security: {
    authEnabled: boolean;
    rateGovernorActive: boolean;
    maxPayloadBytes: number;
  };
  broccolidb: {
    jobsTableCount: number;
    tokensTableCount: number;
    idempotencyTableCount: number;
  };
  memory: {
    rssMb: number;
    heapUsedMb: number;
  };
}

export interface RelayStatus {
  isOnline: boolean;
  port: number;
  pid?: number;
  mode: 'pm2' | 'daemon' | 'launchd' | 'unknown' | 'offline';
  rttMs?: number;
  uptimeSec?: number;
  version?: string;
  shards?: RelayHealthData['shards'];
  jobs?: RelayHealthData['jobs'];
  memory?: RelayHealthData['memory'];
  tunnelUrl?: string;
  isIsolatedPort?: boolean;
  error?: string;
}

export interface StartOptions {
  mode?: 'pm2' | 'daemon' | 'foreground';
  port?: number;
  forceKillCollisions?: boolean;
  waitTimeoutMs?: number;
}

export interface ProcessInspection {
  inUse: boolean;
  pid?: number;
  command?: string;
  isRelay: boolean;
  isForeign: boolean;
}

export class GalxRelaySupervisor {
  public static readonly DEFAULT_PORT = 3001;
  private static readonly RELAY_PM2_NAME = 'galxai-relay';
  private static readonly STATE_DIR = path.resolve(process.cwd(), '.relay');
  private static readonly PID_FILE = path.join(GalxRelaySupervisor.STATE_DIR, 'relay.pid');
  private static readonly PORT_FILE = path.join(GalxRelaySupervisor.STATE_DIR, 'relay-port.json');
  private static readonly TUNNEL_STATE_FILE = path.join(GalxRelaySupervisor.STATE_DIR, 'tunnel.json');

  /**
   * Retrieves the currently active relay port from state, or returns default 3001.
   */
  public static getActivePort(): number {
    try {
      if (fs.existsSync(GalxRelaySupervisor.PORT_FILE)) {
        const data = JSON.parse(fs.readFileSync(GalxRelaySupervisor.PORT_FILE, 'utf-8'));
        if (typeof data.port === 'number' && data.port > 0) {
          return data.port;
        }
      }
    } catch {}
    if (process.env.RELAY_PORT) {
      const p = parseInt(process.env.RELAY_PORT, 10);
      if (!isNaN(p)) return p;
    }
    return GalxRelaySupervisor.DEFAULT_PORT;
  }

  /**
   * Records the negotiated active port into state.
   */
  public static recordActivePort(port: number): void {
    try {
      if (!fs.existsSync(GalxRelaySupervisor.STATE_DIR)) {
        fs.mkdirSync(GalxRelaySupervisor.STATE_DIR, { recursive: true });
      }
      fs.writeFileSync(
        GalxRelaySupervisor.PORT_FILE,
        JSON.stringify({ port, updatedAt: new Date().toISOString() }, null, 2),
        'utf-8'
      );
    } catch {}
  }

  /**
   * Auto-discovers the filesystem path to the relay server entrypoint.
   */
  public static resolveRelayServerPath(): { serverScript: string; cwd: string; ecosystemPath?: string } {
    if (process.env.LUMI_RELAY_PATH && fs.existsSync(process.env.LUMI_RELAY_PATH)) {
      return {
        serverScript: process.env.LUMI_RELAY_PATH,
        cwd: path.dirname(path.dirname(process.env.LUMI_RELAY_PATH)),
      };
    }

    const candidateRoots = [
      process.cwd(),
      path.resolve(process.cwd(), '../LUMI-NEW'),
      '/Users/bozoegg/Desktop/LUMI-NEW',
      path.resolve(os.homedir(), 'Desktop/LUMI-NEW'),
    ];

    for (const root of candidateRoots) {
      const script = path.join(root, 'src', 'relay', 'relay-server.ts');
      if (fs.existsSync(script)) {
        const eco = path.join(root, 'ecosystem.config.cjs');
        return {
          serverScript: script,
          cwd: root,
          ecosystemPath: fs.existsSync(eco) ? eco : undefined,
        };
      }
    }

    throw new Error(
      `Could not locate LUMI-NEW relay-server.ts. Please set LUMI_RELAY_PATH environment variable.`
    );
  }

  /**
   * Senses if the given port is occupied, returning the PID and process command if found.
   */
  public static async checkPort(port = GalxRelaySupervisor.getActivePort()): Promise<{ inUse: boolean; pid?: number; command?: string }> {
    try {
      const { stdout } = await execAsync(`lsof -nP -iTCP:${port} -sTCP:LISTEN`);
      const lines = stdout.trim().split('\n');
      if (lines.length > 1) {
        const parts = lines[1].split(/\s+/);
        const command = parts[0];
        const pid = parseInt(parts[1], 10);
        return { inUse: true, pid, command };
      }
    } catch {
      // lsof exits with 1 when no matches are found
    }
    return { inUse: false };
  }

  /**
   * Forensically inspects the process on a port to differentiate between
   * our GALXAI relay and foreign development projects (e.g. DreamBees-Rooms, Next.js).
   */
  public static async inspectProcessOnPort(port = GalxRelaySupervisor.getActivePort()): Promise<ProcessInspection> {
    const check = await GalxRelaySupervisor.checkPort(port);
    if (!check.inUse || !check.pid) {
      return { inUse: false, isRelay: false, isForeign: false };
    }

    // 1. Health Probe Check: does it respond with the GALXAI signature?
    const health = await GalxRelaySupervisor.getHealth(port, 400);
    if (
      health.ok &&
      health.data &&
      (health.data.signature === 'galxai-zenith-relay' ||
        health.data.service === 'galxai-relay' ||
        health.data.storageEngine?.includes('BroccoliDB'))
    ) {
      return {
        inUse: true,
        pid: check.pid,
        command: check.command,
        isRelay: true,
        isForeign: false,
      };
    }

    // 2. Command Line Signature Check via `ps`
    try {
      const { stdout } = await execAsync(`ps -p ${check.pid} -o command=`);
      const fullCmd = stdout.trim();
      const isOurRelayCmd =
        fullCmd.includes('relay-server.ts') ||
        fullCmd.includes('relay.mjs') ||
        fullCmd.includes('galxai-relay') ||
        fullCmd.includes('LUMI-NEW/src/relay') ||
        fullCmd.includes('GALXAI/src/relay') ||
        (fullCmd.includes('docker-proxy') && fullCmd.includes('3001'));

      return {
        inUse: true,
        pid: check.pid,
        command: fullCmd,
        isRelay: isOurRelayCmd,
        isForeign: !isOurRelayCmd,
      };
    } catch {
      // Process could have exited or permissions issue; treat with caution
      return {
        inUse: true,
        pid: check.pid,
        command: check.command,
        isRelay: false,
        isForeign: true,
      };
    }
  }

  /**
   * Scans for the next unoccupied, collision-free local port starting from startPort.
   */
  public static async findNextAvailablePort(startPort = 3011, maxAttempts = 10): Promise<number> {
    for (let p = startPort; p < startPort + maxAttempts; p++) {
      const check = await GalxRelaySupervisor.checkPort(p);
      if (!check.inUse) {
        return p;
      }
    }
    return startPort;
  }

  /**
   * Probes the health endpoint on 127.0.0.1 with a strict timeout and returns health telemetry.
   */
  public static async getHealth(
    port = GalxRelaySupervisor.getActivePort(),
    timeoutMs = 1500
  ): Promise<{ data: RelayHealthData | null; rttMs: number; ok: boolean }> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(`http://127.0.0.1:${port}/health`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'galxai-relay-supervisor' },
      });
      clearTimeout(timer);

      const rttMs = Date.now() - start;
      if (res.ok) {
        const data = (await res.json()) as RelayHealthData;
        return { data, rttMs, ok: true };
      }
      return { data: null, rttMs, ok: false };
    } catch {
      return { data: null, rttMs: Date.now() - start, ok: false };
    }
  }

  /**
   * Inspects current PM2 status for galxai-relay.
   */
  public static async getPm2Status(): Promise<{ running: boolean; pid?: number; status?: string }> {
    try {
      const { stdout } = await execAsync(`npx pm2 jlist`);
      const list = JSON.parse(stdout);
      if (Array.isArray(list)) {
        const proc = list.find((p) => p.name === GalxRelaySupervisor.RELAY_PM2_NAME);
        if (proc && proc.pm2_env?.status === 'online') {
          return { running: true, pid: proc.pid, status: proc.pm2_env.status };
        }
      }
    } catch {}
    return { running: false };
  }

  /**
   * Reads the active Cloudflare tunnel URL if recorded.
   */
  public static getTunnelUrl(): string | undefined {
    try {
      if (fs.existsSync(GalxRelaySupervisor.TUNNEL_STATE_FILE)) {
        const content = JSON.parse(fs.readFileSync(GalxRelaySupervisor.TUNNEL_STATE_FILE, 'utf-8'));
        if (content.tunnelUrl && typeof content.tunnelUrl === 'string') {
          return content.tunnelUrl;
        }
      }
    } catch {}
    if (process.env.VM_RELAY_URL && !process.env.VM_RELAY_URL.includes('localhost') && !process.env.VM_RELAY_URL.includes('127.0.0.1')) {
      return process.env.VM_RELAY_URL;
    }
    return undefined;
  }

  /**
   * Returns a complete, unified status report for the local relay.
   */
  public static async getStatus(targetPort?: number): Promise<RelayStatus> {
    const port = targetPort || GalxRelaySupervisor.getActivePort();
    const inspection = await GalxRelaySupervisor.inspectProcessOnPort(port);
    const health = await GalxRelaySupervisor.getHealth(port, 1200);
    const pm2Status = await GalxRelaySupervisor.getPm2Status();
    const tunnelUrl = GalxRelaySupervisor.getTunnelUrl();

    let mode: RelayStatus['mode'] = 'offline';
    if (pm2Status.running) {
      mode = 'pm2';
    } else if (inspection.inUse && inspection.isRelay) {
      mode = 'daemon';
    }

    if (health.ok && health.data) {
      return {
        isOnline: true,
        port,
        pid: inspection.pid || pm2Status.pid,
        mode,
        rttMs: health.rttMs,
        uptimeSec: health.data.uptimeSec,
        version: health.data.version,
        shards: health.data.shards,
        jobs: health.data.jobs,
        memory: health.data.memory,
        tunnelUrl,
        isIsolatedPort: port !== GalxRelaySupervisor.DEFAULT_PORT,
      };
    }

    return {
      isOnline: false,
      port,
      pid: inspection.pid,
      mode: 'offline',
      tunnelUrl,
      isIsolatedPort: port !== GalxRelaySupervisor.DEFAULT_PORT,
      error: inspection.inUse
        ? inspection.isForeign
          ? `Port ${port} is occupied by another development project (PID ${inspection.pid}: ${inspection.command}). Preserved with zero collision.`
          : `Relay is on port ${port} (PID ${inspection.pid}), but health probe failed.`
        : `Relay is not running on port ${port}.`,
    };
  }

  /**
   * Ensures the relay is running. If not, lazily starts it in the background (Ollama Pattern).
   */
  public static async ensureRunning(options: StartOptions = {}): Promise<boolean> {
    const port = options.port || GalxRelaySupervisor.getActivePort();
    const initial = await GalxRelaySupervisor.getHealth(port, 300);
    if (initial.ok) {
      return true;
    }

    console.log(`[GalxRelay] Local relay offline on port ${port}. Auto-activating lazy daemon...`);
    const startRes = await GalxRelaySupervisor.start({
      ...options,
      port,
      mode: options.mode || 'pm2',
      waitTimeoutMs: options.waitTimeoutMs || 5000,
    });
    return startRes.isOnline;
  }

  /**
   * Starts the local relay with strict foreign process protection and anti-collision guarantees.
   */
  public static async start(options: StartOptions = {}): Promise<RelayStatus> {
    let port = options.port || GalxRelaySupervisor.getActivePort();
    const resolved = GalxRelaySupervisor.resolveRelayServerPath();
    const waitTimeout = options.waitTimeoutMs || 5000;

    if (!fs.existsSync(GalxRelaySupervisor.STATE_DIR)) {
      fs.mkdirSync(GalxRelaySupervisor.STATE_DIR, { recursive: true });
    }

    // 1. Check if already online and healthy
    const currentHealth = await GalxRelaySupervisor.getHealth(port, 500);
    if (currentHealth.ok) {
      return GalxRelaySupervisor.getStatus(port);
    }

    // 2. Strict Process Inspection: Safeguard foreign development projects!
    const inspection = await GalxRelaySupervisor.inspectProcessOnPort(port);
    if (inspection.inUse) {
      if (inspection.isForeign) {
        // FOREIGN PROCESS DETECTED: NEVER KILL IT!
        console.warn(
          `\n\x1b[33m[GalxRelay Safeguard] ⚠️ Port ${port} is occupied by another development project:\x1b[0m`
        );
        console.warn(`  PID:     ${inspection.pid}`);
        console.warn(`  Command: ${inspection.command}`);
        console.warn(`\x1b[32m[GalxRelay Safeguard] ✔ Preserving foreign process with zero collision.\x1b[0m`);

        // Find next safe port
        const safePort = await GalxRelaySupervisor.findNextAvailablePort(3011);
        console.log(`\x1b[36m[GalxRelay Anti-Collision] Negotiated isolated relay port: ${safePort}\x1b[0m\n`);
        port = safePort;
        GalxRelaySupervisor.recordActivePort(port);
      } else if (inspection.isRelay && inspection.pid) {
        // It is our own stale relay instance that is not responding to health probes
        console.log(`[GalxRelay] Recycling unresponsive local relay instance (PID ${inspection.pid})...`);
        try {
          process.kill(inspection.pid, 'SIGTERM');
          await new Promise((r) => setTimeout(r, 600));
        } catch {}
      }
    }

    const preferredMode = options.mode || (resolved.ecosystemPath ? 'pm2' : 'daemon');

    // 3. Execution: PM2 or Native Detached
    if (preferredMode === 'pm2' && resolved.ecosystemPath) {
      try {
        await execAsync(`npx pm2 start ${resolved.ecosystemPath}`, {
          cwd: resolved.cwd,
          env: {
            ...process.env,
            PORT: String(port),
            HOST: '127.0.0.1',
          },
        });
      } catch (err: any) {
        console.warn(`[GalxRelay] PM2 launch note: ${err.message}. Ensuring native daemon...`);
        await GalxRelaySupervisor.spawnNativeDaemon(resolved.serverScript, resolved.cwd, port);
      }
    } else if (preferredMode === 'foreground') {
      const child = spawn('npx', ['tsx', resolved.serverScript], {
        cwd: resolved.cwd,
        stdio: 'inherit',
        env: { ...process.env, PORT: String(port), HOST: '127.0.0.1' },
      });
      child.on('exit', (code) => {
        console.log(`[GalxRelay] Foreground relay exited with code ${code}`);
      });
    } else {
      await GalxRelaySupervisor.spawnNativeDaemon(resolved.serverScript, resolved.cwd, port);
    }

    // 4. Record the active port
    GalxRelaySupervisor.recordActivePort(port);

    // 5. Poll until /health responds 200 OK
    const deadline = Date.now() + waitTimeout;
    while (Date.now() < deadline) {
      const probe = await GalxRelaySupervisor.getHealth(port, 300);
      if (probe.ok) {
        break;
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    return GalxRelaySupervisor.getStatus(port);
  }

  /**
   * Spawns the relay as a native detached Node.js child process with bounded memory.
   */
  private static async spawnNativeDaemon(serverScript: string, cwd: string, port: number): Promise<void> {
    const preferredLogDir = process.env.GALX_RELAY_LOG_DIR || path.resolve(os.homedir(), '.lumi', 'logs');
    const workspaceLogDir = path.resolve(cwd, '.galxai', 'relay-logs');
    let logDir = preferredLogDir;
    try {
      fs.mkdirSync(logDir, { recursive: true });
      fs.accessSync(logDir, fs.constants.W_OK);
    } catch {
      logDir = workspaceLogDir;
      fs.mkdirSync(logDir, { recursive: true });
    }

    const outFd = fs.openSync(path.join(logDir, 'relay.log'), 'a');
    const errFd = fs.openSync(path.join(logDir, 'relay.err'), 'a');

    const child = spawn('npx', ['tsx', '--max-old-space-size=512', serverScript], {
      cwd,
      detached: true,
      stdio: ['ignore', outFd, errFd],
      env: {
        ...process.env,
        PORT: String(port),
        HOST: '127.0.0.1',
        NODE_ENV: 'production',
      },
    });

    child.unref();

    if (child.pid) {
      fs.writeFileSync(GalxRelaySupervisor.PID_FILE, String(child.pid), 'utf-8');
    }
  }

  /**
   * Stops the running relay daemon cleanly.
   * GUARANTEE: NEVER touches or terminates foreign processes.
   */
  public static async stop(targetPort?: number): Promise<boolean> {
    const port = targetPort || GalxRelaySupervisor.getActivePort();
    let stopped = false;

    // 1. Stop via PM2 if active and targeting active relay port
    if (port === GalxRelaySupervisor.getActivePort()) {
      const pm2Status = await GalxRelaySupervisor.getPm2Status();
      if (pm2Status.running) {
        try {
          await execAsync(`npx pm2 stop ${GalxRelaySupervisor.RELAY_PM2_NAME}`);
          stopped = true;
        } catch {}
      }
    }

    // 2. Terminate PID from pidfile ONLY if verified
    if (fs.existsSync(GalxRelaySupervisor.PID_FILE)) {
      try {
        const pid = parseInt(fs.readFileSync(GalxRelaySupervisor.PID_FILE, 'utf-8').trim(), 10);
        if (!isNaN(pid)) {
          const { stdout } = await execAsync(`ps -p ${pid} -o command=`).catch(() => ({ stdout: '' }));
          if (stdout.includes('relay-server') || stdout.includes('galxai')) {
            process.kill(pid, 'SIGTERM');
            stopped = true;
          }
        }
      } catch {}
      try {
        fs.unlinkSync(GalxRelaySupervisor.PID_FILE);
      } catch {}
    }

    // 3. Fallback: Check port and ONLY terminate if verified as our relay
    const inspection = await GalxRelaySupervisor.inspectProcessOnPort(port);
    if (inspection.inUse && inspection.isRelay && inspection.pid) {
      try {
        process.kill(inspection.pid, 'SIGTERM');
        await new Promise((r) => setTimeout(r, 400));
        stopped = true;
      } catch {}
    } else if (inspection.inUse && inspection.isForeign) {
      console.warn(`[GalxRelay Safeguard] Refused to stop PID ${inspection.pid} on port ${port} because it belongs to another development project.`);
    }

    return stopped;
  }

  /**
   * Restarts the relay process safely.
   */
  public static async restart(options: StartOptions = {}): Promise<RelayStatus> {
    const port = options.port || GalxRelaySupervisor.getActivePort();
    const pm2Status = await GalxRelaySupervisor.getPm2Status();

    if (pm2Status.running) {
      try {
        await execAsync(`npx pm2 restart ${GalxRelaySupervisor.RELAY_PM2_NAME}`);
        await new Promise((r) => setTimeout(r, 800));
        return GalxRelaySupervisor.getStatus(port);
      } catch {}
    }

    await GalxRelaySupervisor.stop(port);
    await new Promise((r) => setTimeout(r, 500));
    return GalxRelaySupervisor.start(options);
  }

  /**
   * Executes a smoke test wire verification against the active relay.
   */
  public static async smokeTest(targetPort?: number): Promise<{
    success: boolean;
    rttMs: number;
    health: RelayHealthData | null;
    error?: string;
  }> {
    const port = targetPort || GalxRelaySupervisor.getActivePort();
    const start = Date.now();
    const health = await GalxRelaySupervisor.getHealth(port, 2000);

    if (!health.ok || !health.data) {
      return {
        success: false,
        rttMs: Date.now() - start,
        health: null,
        error: `Relay is not reachable on port ${port}`,
      };
    }

    if (health.data.shards && health.data.shards.total === 0) {
      return {
        success: false,
        rttMs: health.rttMs,
        health: health.data,
        error: `Relay is online on port ${port} but has 0 enrolled shards. Check ~/.codex/auth.json or .galx-shards.json`,
      };
    }

    return {
      success: true,
      rttMs: health.rttMs,
      health: health.data,
    };
  }
}
