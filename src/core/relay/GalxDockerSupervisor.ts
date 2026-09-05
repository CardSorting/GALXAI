/**
 * @file src/core/relay/GalxDockerSupervisor.ts
 * @description Docker Lifecycle Supervisor for the GALXAI Zenith Local Relay.
 * Provides isolated container execution, strict loopback binding (127.0.0.1),
 * polite-neighbor resource limits (512MB RAM, 1.0 CPU), and zero foreign process collisions.
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';
import { GalxRelaySupervisor } from './GalxRelaySupervisor.js';

const execAsync = promisify(exec);

export interface DockerRelayStatus {
  isDockerAvailable: boolean;
  isContainerRunning: boolean;
  containerId?: string;
  image?: string;
  statusText?: string;
  port?: number;
  healthOk?: boolean;
  rttMs?: number;
  error?: string;
}

export class GalxDockerSupervisor {
  private static composeFile = path.resolve(process.cwd(), 'docker-compose.relay.yml');
  private static dockerfile = path.resolve(process.cwd(), 'Dockerfile.relay');

  /**
   * Checks if Docker CLI is installed and the Docker daemon is responding.
   */
  public static async isDockerAvailable(): Promise<boolean> {
    try {
      await execAsync('docker version', { timeout: 4000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Inspects the running status of the galxai-relay container.
   */
  public static async getStatus(): Promise<DockerRelayStatus> {
    const isAvail = await this.isDockerAvailable();
    if (!isAvail) {
      return {
        isDockerAvailable: false,
        isContainerRunning: false,
        error: 'Docker CLI or daemon is not reachable. Ensure Docker Desktop is running.',
      };
    }

    try {
      const { stdout } = await execAsync(
        'docker ps --filter "name=galxai-relay" --format "{{.ID}}|{{.Image}}|{{.Status}}|{{.Ports}}"',
        { timeout: 4000 }
      );

      const line = stdout.trim();
      if (!line) {
        return {
          isDockerAvailable: true,
          isContainerRunning: false,
        };
      }

      const [id, image, statusText, ports] = line.split('|');

      // Extract bound host port (e.g. 127.0.0.1:3001->3001/tcp)
      let port = 3001;
      const portMatch = ports?.match(/127\.0\.0\.1:(\d+)->/);
      if (portMatch) {
        port = parseInt(portMatch[1], 10);
      }

      // Check wire health
      const start = Date.now();
      const health = await GalxRelaySupervisor.getHealth(port, 2000);
      const rttMs = Date.now() - start;

      return {
        isDockerAvailable: true,
        isContainerRunning: true,
        containerId: id,
        image,
        statusText,
        port,
        healthOk: health.ok,
        rttMs,
      };
    } catch (err: any) {
      return {
        isDockerAvailable: true,
        isContainerRunning: false,
        error: err.message,
      };
    }
  }

  /**
   * Builds the Docker image locally using the optimized multi-stage Dockerfile.relay.
   */
  public static async build(): Promise<{ success: boolean; output: string }> {
    try {
      console.log(`[GalxDockerSupervisor] Building Docker image galxai-relay:latest...`);
      const { stdout, stderr } = await execAsync(
        `docker compose -f "${this.composeFile}" build`,
        { timeout: 180000 }
      );
      return { success: true, output: stdout || stderr };
    } catch (err: any) {
      return { success: false, output: err.message };
    }
  }

  /**
   * Starts the isolated Docker container with strict loopback and foreign process safeguards.
   */
  public static async up(options: { port?: number; forceBuild?: boolean } = {}): Promise<DockerRelayStatus> {
    const isAvail = await this.isDockerAvailable();
    if (!isAvail) {
      throw new Error('Docker daemon is not reachable. Please start Docker Desktop.');
    }

    let targetPort = options.port || 3001;

    // Check if the container is already running and healthy
    const currentStatus = await this.getStatus();
    if (currentStatus.isContainerRunning && currentStatus.healthOk && (!options.port || options.port === currentStatus.port) && !options.forceBuild) {
      console.log(`[GalxDockerSupervisor] Relay container is already running and healthy on port ${currentStatus.port}.`);
      GalxRelaySupervisor.recordActivePort(currentStatus.port || 3001);
      return currentStatus;
    }

    // Foreign Process Safeguard
    const inspection = await GalxRelaySupervisor.inspectProcessOnPort(targetPort);
    if (inspection.inUse && inspection.isForeign) {
      console.warn(
        `\x1b[33m▲ [GalxDockerSupervisor] Port ${targetPort} is in use by foreign dev process (PID ${inspection.pid}: ${inspection.command}).\x1b[0m`
      );
      console.warn(`\x1b[33m▲ Safeguard triggered: NEVER terminating foreign project. Negotiating alternative loopback port...\x1b[0m`);

      targetPort = await GalxRelaySupervisor.findNextAvailablePort(targetPort + 10, 10);
      console.log(`\x1b[32m✔ [GalxDockerSupervisor] Safe isolated port allocated: ${targetPort}\x1b[0m`);
    } else if (inspection.inUse && inspection.isRelay) {
      // If host relay is already running on port 3001, stop the host instance gracefully to migrate to container
      console.log(`[GalxDockerSupervisor] Host relay currently online on ${targetPort}. Gracefully stopping host PM2/daemon...`);
      await GalxRelaySupervisor.stop();
      await new Promise((r) => setTimeout(r, 1000));
    }

    // Record chosen port so OpenAIAdapter dynamically connects without manual env edits
    GalxRelaySupervisor.recordActivePort(targetPort);

    // Launch Docker container with GALXAI_RELAY_PORT
    const buildFlag = options.forceBuild ? '--build ' : '';
    const cmd = `GALXAI_RELAY_PORT=${targetPort} docker compose -f "${this.composeFile}" up ${buildFlag}-d`;

    console.log(`[GalxDockerSupervisor] Executing: ${cmd}`);
    await execAsync(cmd, { env: { ...process.env, GALXAI_RELAY_PORT: String(targetPort) } });

    // Await healthy wire probe (up to 15s)
    console.log(`[GalxDockerSupervisor] Awaiting container wire readiness on http://127.0.0.1:${targetPort}/health...`);
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      const probe = await GalxRelaySupervisor.getHealth(targetPort, 1000);
      if (probe.ok) {
        console.log(`\x1b[32m✔ [GalxDockerSupervisor] Docker Relay is HEALTHY on http://127.0.0.1:${targetPort}\x1b[0m`);
        return this.getStatus();
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    throw new Error(`Docker Relay did not respond to /health on port ${targetPort} within 15 seconds.`);
  }

  /**
   * Stops and removes the Docker relay container.
   */
  public static async down(): Promise<{ success: boolean; output: string }> {
    try {
      const { stdout, stderr } = await execAsync(
        `docker compose -f "${this.composeFile}" down`,
        { timeout: 30000 }
      );
      return { success: true, output: stdout || stderr };
    } catch (err: any) {
      return { success: false, output: err.message };
    }
  }

  /**
   * Retrieves container logs.
   */
  public static async logs(tail = 50): Promise<string> {
    try {
      const { stdout, stderr } = await execAsync(
        `docker compose -f "${this.composeFile}" logs --tail ${tail}`,
        { timeout: 10000 }
      );
      return stdout || stderr;
    } catch (err: any) {
      return `Failed to fetch logs: ${err.message}`;
    }
  }

  /**
   * Opens the webapp control plane in the user's default browser on macOS.
   */
  public static async openDashboard(port?: number): Promise<void> {
    const resolvedPort = port || GalxRelaySupervisor.getActivePort() || 3001;
    const url = `http://127.0.0.1:${resolvedPort}`;
    console.log(`[GalxDockerSupervisor] Opening WebApp Control Plane: ${url}`);
    try {
      await execAsync(`open "${url}"`);
    } catch (err: any) {
      console.warn(`Could not open browser automatically: ${err.message}`);
    }
  }
}
