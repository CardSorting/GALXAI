/**
 * @file src/core/relay/GalxRelayWatchdog.ts
 * @description Autonomous Self-Healing Health Watchdog & Memory Leak Sentry.
 * Continuously monitors local relay vitals, detects deadlocks/leaks, and triggers self-healing.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { exec } from 'node:child_process';
import { GalxRelaySupervisor, RelayHealthData } from './GalxRelaySupervisor.js';

export interface WatchdogConfig {
  port?: number;
  intervalMs?: number;
  maxConsecutiveFailures?: number;
  memoryWarningThresholdMb?: number;
  memoryRestartThresholdMb?: number;
  enableNotifications?: boolean;
}

export class GalxRelayWatchdog {
  private readonly port: number;
  private readonly intervalMs: number;
  private readonly maxConsecutiveFailures: number;
  private readonly memoryWarningThresholdMb: number;
  private readonly memoryRestartThresholdMb: number;
  private readonly enableNotifications: boolean;

  private timer: NodeJS.Timeout | null = null;
  private consecutiveFailures = 0;
  private consecutiveHighMemory = 0;
  private isRunning = false;
  private logPath: string;

  constructor(config: WatchdogConfig = {}) {
    this.port = config.port || 3001;
    this.intervalMs = config.intervalMs || 15000;
    this.maxConsecutiveFailures = config.maxConsecutiveFailures || 3;
    this.memoryWarningThresholdMb = config.memoryWarningThresholdMb || 1024;
    this.memoryRestartThresholdMb = config.memoryRestartThresholdMb || 1536;
    this.enableNotifications = config.enableNotifications ?? true;

    const stateDir = path.resolve(process.cwd(), '.relay');
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }
    this.logPath = path.join(stateDir, 'watchdog.log');
  }

  /**
   * Starts the continuous watchdog sentry loop.
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.log(`[Watchdog] Sentry armed. Polling every ${this.intervalMs}ms on port ${this.port}`);

    this.timer = setInterval(() => {
      this.poll().catch((err) => {
        this.log(`[Watchdog] Poll error: ${err.message}`);
      });
    }, this.intervalMs);

    // Initial immediate probe
    this.poll().catch(() => {});
  }

  /**
   * Stops the watchdog sentry.
   */
  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    this.log(`[Watchdog] Sentry disarmed.`);
  }

  /**
   * Runs a single health probe iteration and applies recovery rules.
   */
  public async poll(): Promise<{ healthy: boolean; status?: RelayHealthData }> {
    const probe = await GalxRelaySupervisor.getHealth(this.port, 2000);

    if (!probe.ok || !probe.data) {
      this.consecutiveFailures++;
      this.log(`[Watchdog] Probe failure #${this.consecutiveFailures} (RTT: ${probe.rttMs}ms)`);

      if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
        this.notify('Relay Down', `Port ${this.port} unresponsive after ${this.consecutiveFailures} checks. Auto-restarting...`);
        this.log(`[Watchdog] Triggering auto-healing restart after ${this.consecutiveFailures} failures`);
        await this.triggerAutoHeal();
      }

      return { healthy: false };
    }

    // Healthy probe
    const data = probe.data;
    if (this.consecutiveFailures > 0) {
      this.log(`[Watchdog] Relay recovered! (RTT: ${probe.rttMs}ms, uptime: ${data.uptimeSec}s)`);
      this.notify('Relay Restored', `Local relay is healthy on port ${this.port} (${probe.rttMs}ms)`);
      this.consecutiveFailures = 0;
    }

    // Memory Leak Fence
    const rssMb = data.memory.rssMb;
    if (rssMb > this.memoryRestartThresholdMb) {
      this.consecutiveHighMemory++;
      this.log(`[Watchdog] Critical Memory: ${rssMb}MB > ${this.memoryRestartThresholdMb}MB (count: ${this.consecutiveHighMemory})`);

      if (this.consecutiveHighMemory >= 3) {
        this.notify('Relay Memory Leak', `Memory reached ${rssMb}MB. Restarting to prevent OS OOM kill.`);
        this.log(`[Watchdog] Auto-restarting relay due to persistent high memory (${rssMb}MB)`);
        await this.triggerAutoHeal();
        this.consecutiveHighMemory = 0;
      }
    } else if (rssMb > this.memoryWarningThresholdMb) {
      this.log(`[Watchdog] Warning: Elevated memory usage: ${rssMb}MB`);
      this.consecutiveHighMemory = 0;
    } else {
      this.consecutiveHighMemory = 0;
    }

    return { healthy: true, status: data };
  }

  /**
   * Triggers an automated restart to recover from crash or resource exhaustion.
   */
  private async triggerAutoHeal(): Promise<void> {
    try {
      this.log(`[Watchdog] Restarting relay daemon...`);
      const status = await GalxRelaySupervisor.restart({ port: this.port });
      if (status.isOnline) {
        this.consecutiveFailures = 0;
        this.log(`[Watchdog] Auto-healing successful. New PID: ${status.pid}`);
        this.notify('Relay Auto-Healed', `Relay successfully recovered with PID ${status.pid}`);
      } else {
        this.log(`[Watchdog] Auto-healing restart attempt failed: ${status.error}`);
      }
    } catch (err: any) {
      this.log(`[Watchdog] Auto-healing exception: ${err.message}`);
    }
  }

  /**
   * Dispatches native macOS desktop notifications via osascript.
   */
  private notify(title: string, message: string): void {
    if (!this.enableNotifications || process.platform !== 'darwin') return;
    try {
      const sanitizedTitle = title.replace(/"/g, '\\"');
      const sanitizedMsg = message.replace(/"/g, '\\"');
      exec(`osascript -e 'display notification "${sanitizedMsg}" with title "GALXAI Relay: ${sanitizedTitle}"'`);
    } catch {}
  }

  /**
   * Appends structured timestamped logs to .relay/watchdog.log.
   */
  private log(message: string): void {
    const ts = new Date().toISOString();
    const line = `[${ts}] ${message}\n`;
    try {
      fs.appendFileSync(this.logPath, line, 'utf-8');
    } catch {}
  }
}
