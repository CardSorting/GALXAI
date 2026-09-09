/**
 * @file src/cli/commands/relay-monitor.ts
 * @description Interactive Terminal HUD & Live Health Monitor for GALXAI Local Relay.
 * Mirrors Vite, Next.js, and PM2 Monit developer dashboard patterns with hotkeys.
 */

import readline from 'node:readline';
import { openRelayMonitor } from '../../core/relay/open-monitor.js';
import { GalxRelaySupervisor, RelayStatus } from '../../core/relay/GalxRelaySupervisor.js';
import { GalxTunnelSupervisor } from '../../core/relay/GalxTunnelSupervisor.js';

export async function runRelayMonitor(): Promise<void> {
  let isRunning = true;
  let bannerMessage = '';
  let bannerTimeout: NodeJS.Timeout | null = null;

  const setBanner = (msg: string, durationMs = 3000) => {
    bannerMessage = msg;
    if (bannerTimeout) clearTimeout(bannerTimeout);
    bannerTimeout = setTimeout(() => {
      bannerMessage = '';
    }, durationMs);
  };

  const renderGauge = (val: number, max: number, width = 14): string => {
    const ratio = Math.min(Math.max(val / max, 0), 1);
    const filled = Math.round(ratio * width);
    const empty = width - filled;
    let color = '\x1b[32m'; // Green
    if (ratio > 0.75) color = '\x1b[31m'; // Red
    else if (ratio > 0.5) color = '\x1b[33m'; // Yellow

    return `${color}[${'█'.repeat(filled)}${'░'.repeat(empty)}]\x1b[0m`;
  };

  const drawScreen = async () => {
    if (!isRunning) return;
    const status = await GalxRelaySupervisor.getStatus();
    const tunnel = GalxTunnelSupervisor.getTunnelState();

    // Clear and home
    process.stdout.write('\x1b[2J\x1b[H');

    const lines: string[] = [];
    lines.push(`\x1b[1m\x1b[36m╔═══════════════════════════════════════════════════════════════════════════════════╗\x1b[0m`);
    lines.push(`\x1b[1m\x1b[36m║           🌌 GALXAI LOCAL INFERENCE RELAY MONITOR & HEALTH HUD (v2.6.0)           ║\x1b[0m`);
    lines.push(`\x1b[1m\x1b[36m╚═══════════════════════════════════════════════════════════════════════════════════╝\x1b[0m`);

    // Banner message if present
    if (bannerMessage) {
      lines.push(`  \x1b[1m\x1b[33m⚡ ${bannerMessage}\x1b[0m\n`);
    } else {
      lines.push('');
    }

    // Status Pill & Core Indicators
    let statusPill = '\x1b[41m\x1b[37m OFFLINE \x1b[0m';
    if (status.isOnline) {
      statusPill = `\x1b[42m\x1b[30m ONLINE (${status.rttMs}ms) \x1b[0m`;
    }

    lines.push(`  \x1b[1mStatus:\x1b[0m     ${statusPill}  \x1b[1mPort:\x1b[0m ${status.port}  \x1b[1mPID:\x1b[0m ${status.pid || 'N/A'}  \x1b[1mEngine:\x1b[0m ${status.mode.toUpperCase()}`);
    if (status.uptimeSec !== undefined) {
      const mins = Math.floor(status.uptimeSec / 60);
      const secs = status.uptimeSec % 60;
      lines.push(`  \x1b[1mUptime:\x1b[0m     ${mins}m ${secs}s`);
    }

    lines.push(`\x1b[90m───────────────────────────────────────────────────────────────────────────────────\x1b[0m`);

    // Memory Gauges
    if (status.memory) {
      const rss = status.memory.rssMb;
      const heap = status.memory.heapUsedMb;
      const gauge = renderGauge(rss, 1024, 16);
      lines.push(`  \x1b[1mMemory (RSS):\x1b[0m ${gauge} ${rss} MB / 1024 MB  \x1b[1mHeap:\x1b[0m ${heap} MB`);
    } else {
      lines.push(`  \x1b[1mMemory:\x1b[0m       \x1b[90mUnavailable (relay offline)\x1b[0m`);
    }

    // Shard Fleet
    if (status.shards) {
      const s = status.shards;
      lines.push(
        `  \x1b[1mShard Fleet:\x1b[0m  \x1b[32m✔ ${s.active} Active\x1b[0m  │  \x1b[33m▲ ${s.cooldown} Cooldown\x1b[0m  │  \x1b[31m✖ ${s.exhausted} Exhausted\x1b[0m  (Total: ${s.total})`
      );
    } else {
      lines.push(`  \x1b[1mShard Fleet:\x1b[0m  \x1b[90mUnavailable\x1b[0m`);
    }

    // In-Flight Jobs
    if (status.jobs) {
      const j = status.jobs;
      lines.push(
        `  \x1b[1mJob Pipeline:\x1b[0m \x1b[36m⚡ ${j.active} In-Flight\x1b[0m  │  \x1b[32m✔ ${j.totalCompleted} Completed\x1b[0m  │  \x1b[90m${j.totalSubmitted} Submitted\x1b[0m`
      );
    } else {
      lines.push(`  \x1b[1mJob Pipeline:\x1b[0m \x1b[90mUnavailable\x1b[0m`);
    }

    // Cloudflare Tunnel Ingress
    lines.push(`\x1b[90m───────────────────────────────────────────────────────────────────────────────────\x1b[0m`);
    const activeTunnel = tunnel?.tunnelUrl || status.tunnelUrl;
    if (activeTunnel) {
      lines.push(`  \x1b[1mPublic Tunnel:\x1b[0m \x1b[32m${activeTunnel}\x1b[0m (Ingress Live)`);
    } else {
      lines.push(`  \x1b[1mPublic Tunnel:\x1b[0m \x1b[90mInactive (Run 'npx galxai relay tunnel' or press [l] to launch)\x1b[0m`);
    }

    lines.push(`\x1b[90m───────────────────────────────────────────────────────────────────────────────────\x1b[0m`);
    lines.push(`\x1b[1mHOTKEYS:\x1b[0m`);
    lines.push(
      `  [\x1b[36mr\x1b[0m] Restart Daemon   [\x1b[36mt\x1b[0m] Smoke Test Ping   [\x1b[36ml\x1b[0m] Start/Stop Tunnel   [\x1b[36mo\x1b[0m] Open Browser   [\x1b[36mq\x1b[0m] Quit`
    );
    lines.push(`\x1b[90m───────────────────────────────────────────────────────────────────────────────────\x1b[0m`);

    process.stdout.write(lines.join('\n') + '\n');
  };

  // Setup Keypress Hotkeys
  if (process.stdin.isTTY) {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    process.stdin.on('keypress', async (str, key) => {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        process.exit(0);
      }

      if (key.name === 'q') {
        cleanup();
        process.exit(0);
      }

      if (key.name === 'r') {
        setBanner('Restarting relay daemon...', 4000);
        drawScreen();
        await GalxRelaySupervisor.restart();
        setBanner('Relay restarted successfully!', 3000);
        drawScreen();
      }

      if (key.name === 't') {
        setBanner('Dispatching smoke test wire ping...', 3000);
        drawScreen();
        const testRes = await GalxRelaySupervisor.smokeTest();
        if (testRes.success) {
          setBanner(`Smoke test PASSED in ${testRes.rttMs}ms! Shards: ${testRes.health?.shards.active}`, 4000);
        } else {
          setBanner(`Smoke test FAILED: ${testRes.error}`, 5000);
        }
        drawScreen();
      }

      if (key.name === 'o') {
        try { await openRelayMonitor(GalxRelaySupervisor.getActivePort()); setBanner('Opened the HTML monitor', 2500); }
        catch (error) { setBanner(error instanceof Error ? error.message : 'Could not open the monitor', 5000); }
        drawScreen();
      }

      if (key.name === 'l') {
        const current = GalxTunnelSupervisor.getTunnelState();
        if (current && current.isAlive) {
          setBanner('Stopping Cloudflare tunnel...', 2000);
          drawScreen();
          await GalxTunnelSupervisor.stopTunnel();
          setBanner('Cloudflare tunnel stopped', 2500);
        } else {
          setBanner('Spawning Cloudflare tunnel (please wait ~5s)...', 6000);
          drawScreen();
          GalxTunnelSupervisor.startTunnel()
            .then((res) => {
              setBanner(`Tunnel active: ${res.tunnelUrl}`, 5000);
              drawScreen();
            })
            .catch((err) => {
              setBanner(`Tunnel failed: ${err.message}`, 5000);
              drawScreen();
            });
        }
        drawScreen();
      }

      if (key.name === 'c') {
        process.stdout.write('\x1b[2J\x1b[H');
        drawScreen();
      }
    });
  }

  const intervalTimer = setInterval(() => {
    drawScreen().catch(() => {});
  }, 1000);

  const cleanup = () => {
    isRunning = false;
    clearInterval(intervalTimer);
    if (bannerTimeout) clearTimeout(bannerTimeout);
    if (process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(false);
        process.stdin.pause();
      } catch {}
    }
    process.stdout.write('\x1b[?25h\n[Relay Monitor] Exited.\n');
  };

  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });

  // Initial draw
  await drawScreen();
}
