/**
 * @file src/core/relay/GalxTunnelSupervisor.ts
 * @description Cloudflare Tunnel Sidecar Orchestrator.
 * Mirrors Stripe CLI (`stripe listen`) and Ngrok patterns for local-to-edge ingress.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawn, ChildProcess, execSync } from 'node:child_process';

export interface TunnelState {
  tunnelUrl?: string;
  pid?: number;
  localPort: number;
  startedAt: string;
  isAlive: boolean;
}

export interface TunnelOptions {
  localPort?: number;
  syncEnvLocal?: boolean;
  timeoutMs?: number;
}

export class GalxTunnelSupervisor {
  private static readonly STATE_DIR = path.resolve(process.cwd(), '.relay');
  private static readonly TUNNEL_STATE_FILE = path.join(GalxTunnelSupervisor.STATE_DIR, 'tunnel.json');
  private static readonly ENV_LOCAL_PATH = path.resolve(process.cwd(), '.env.local');

  private static activeProcess: ChildProcess | null = null;

  /**
   * Discovers the cloudflared executable path.
   */
  public static resolveCloudflaredPath(): string {
    const candidates = [
      '/opt/homebrew/bin/cloudflared',
      '/usr/local/bin/cloudflared',
      'cloudflared',
    ];

    for (const c of candidates) {
      try {
        execSync(`which ${c}`, { stdio: 'ignore' });
        return c;
      } catch {}
    }

    throw new Error(
      `cloudflared is not installed or not in PATH. Install with: brew install cloudflared`
    );
  }

  /**
   * Starts a Cloudflare Tunnel for the local relay and captures the public URL.
   */
  public static async startTunnel(options: TunnelOptions = {}): Promise<TunnelState> {
    const port = options.localPort || 3001;
    const timeout = options.timeoutMs || 20000;
    const bin = GalxTunnelSupervisor.resolveCloudflaredPath();

    if (!fs.existsSync(GalxTunnelSupervisor.STATE_DIR)) {
      fs.mkdirSync(GalxTunnelSupervisor.STATE_DIR, { recursive: true });
    }

    // Stop existing tunnel if already running
    await GalxTunnelSupervisor.stopTunnel();

    return new Promise((resolve, reject) => {
      const child = spawn(bin, ['tunnel', '--url', `http://localhost:${port}`], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      GalxTunnelSupervisor.activeProcess = child;
      let urlFound = false;
      let tunnelUrl = '';

      const timer = setTimeout(() => {
        if (!urlFound) {
          child.kill('SIGKILL');
          reject(new Error(`Timed out waiting for Cloudflare Tunnel URL after ${timeout}ms`));
        }
      }, timeout);

      const handleOutput = (data: Buffer) => {
        const text = data.toString('utf-8');
        // Match Cloudflare Quick Tunnel URL: https://<hash>.trycloudflare.com
        const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (match && !urlFound) {
          urlFound = true;
          clearTimeout(timer);
          tunnelUrl = match[0];

          const state: TunnelState = {
            tunnelUrl,
            pid: child.pid,
            localPort: port,
            startedAt: new Date().toISOString(),
            isAlive: true,
          };

          fs.writeFileSync(
            GalxTunnelSupervisor.TUNNEL_STATE_FILE,
            JSON.stringify(state, null, 2),
            'utf-8'
          );

          if (options.syncEnvLocal !== false) {
            GalxTunnelSupervisor.syncEnvLocal(tunnelUrl);
          }

          resolve(state);
        }
      };

      child.stdout.on('data', handleOutput);
      child.stderr.on('data', handleOutput);

      child.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });

      child.on('exit', (code) => {
        clearTimeout(timer);
        GalxTunnelSupervisor.activeProcess = null;
        try {
          if (fs.existsSync(GalxTunnelSupervisor.TUNNEL_STATE_FILE)) {
            fs.unlinkSync(GalxTunnelSupervisor.TUNNEL_STATE_FILE);
          }
        } catch {}
        if (!urlFound) {
          reject(new Error(`cloudflared exited prematurely with code ${code}`));
        }
      });
    });
  }

  /**
   * Injects the active tunnel URL into .env.local as VM_RELAY_URL.
   */
  public static syncEnvLocal(tunnelUrl: string): void {
    try {
      if (!fs.existsSync(GalxTunnelSupervisor.ENV_LOCAL_PATH)) return;

      let content = fs.readFileSync(GalxTunnelSupervisor.ENV_LOCAL_PATH, 'utf-8');
      if (/^VM_RELAY_URL=.*$/m.test(content)) {
        content = content.replace(/^VM_RELAY_URL=.*$/m, `VM_RELAY_URL=${tunnelUrl}`);
      } else {
        content += `\nVM_RELAY_URL=${tunnelUrl}\n`;
      }
      fs.writeFileSync(GalxTunnelSupervisor.ENV_LOCAL_PATH, content, 'utf-8');
      console.log(`[GalxTunnel] Updated .env.local with VM_RELAY_URL=${tunnelUrl}`);
    } catch (err: any) {
      console.warn(`[GalxTunnel] Could not sync .env.local: ${err.message}`);
    }
  }

  /**
   * Retrieves the current tunnel state if active.
   */
  public static getTunnelState(): TunnelState | null {
    try {
      if (fs.existsSync(GalxTunnelSupervisor.TUNNEL_STATE_FILE)) {
        const state = JSON.parse(fs.readFileSync(GalxTunnelSupervisor.TUNNEL_STATE_FILE, 'utf-8')) as TunnelState;
        if (state.pid) {
          try {
            process.kill(state.pid, 0); // Check if process is still alive
            state.isAlive = true;
            return state;
          } catch {
            state.isAlive = false;
            return state;
          }
        }
      }
    } catch {}
    return null;
  }

  /**
   * Tests public round-trip reachability to the active tunnel endpoint.
   */
  public static async testTunnelReachability(tunnelUrl: string): Promise<{ ok: boolean; rttMs: number; status?: number }> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${tunnelUrl.replace(/\/+$/, '')}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      return { ok: res.ok, rttMs: Date.now() - start, status: res.status };
    } catch {
      return { ok: false, rttMs: Date.now() - start };
    }
  }

  /**
   * Stops the active tunnel process cleanly.
   */
  public static async stopTunnel(): Promise<boolean> {
    let stopped = false;
    if (GalxTunnelSupervisor.activeProcess) {
      try {
        GalxTunnelSupervisor.activeProcess.kill('SIGTERM');
        stopped = true;
      } catch {}
      GalxTunnelSupervisor.activeProcess = null;
    }

    const savedState = GalxTunnelSupervisor.getTunnelState();
    if (savedState && savedState.pid) {
      try {
        process.kill(savedState.pid, 'SIGTERM');
        stopped = true;
      } catch {}
    }

    try {
      if (fs.existsSync(GalxTunnelSupervisor.TUNNEL_STATE_FILE)) {
        fs.unlinkSync(GalxTunnelSupervisor.TUNNEL_STATE_FILE);
      }
    } catch {}

    return stopped;
  }
}
