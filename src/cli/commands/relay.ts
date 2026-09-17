/**
 * @file src/cli/commands/relay.ts
 * @description CLI Command Handler for GALXAI Local Relay Management.
 * Provides Supabase & Stripe CLI-style command interfaces for local relay lifecycle.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { GalxRelaySupervisor } from '../../core/relay/GalxRelaySupervisor.js';
import { GalxTunnelSupervisor } from '../../core/relay/GalxTunnelSupervisor.js';
import { GalxRelayWatchdog } from '../../core/relay/GalxRelayWatchdog.js';
import { GalxLaunchAgent } from '../../core/relay/GalxLaunchAgent.js';
import { GalxDockerSupervisor } from '../../core/relay/GalxDockerSupervisor.js';
import { runRelayMonitor } from './relay-monitor.js';
import { openRelayMonitor } from '../../core/relay/open-monitor.js';

export async function handleRelayCommand(args: string[]): Promise<void> {
  const subCommand = args[0] || 'status';

  switch (subCommand) {
    case 'start': {
      console.log(`\n\x1b[1m\x1b[36m🚀 Starting GALXAI Local Inference Relay...\x1b[0m\n`);
      const withTunnel = args.includes('--tunnel');
      const mode = args.includes('--daemon')
        ? 'daemon'
        : args.includes('--foreground')
        ? 'foreground'
        : 'pm2';

      const status = await GalxRelaySupervisor.start({ mode });
      if (status.isOnline) {
        console.log(`  \x1b[32m✔\x1b[0m Relay is ONLINE on port \x1b[1m${status.port}\x1b[0m (PID: ${status.pid}, Mode: ${status.mode})`);
        console.log(`  \x1b[32m✔\x1b[0m Health Endpoint: \x1b[36mhttp://localhost:${status.port}/health\x1b[0m (${status.rttMs}ms)`);
        if (status.shards) {
          console.log(`  \x1b[32m✔\x1b[0m Shards Enrolled: \x1b[1m${status.shards.active}\x1b[0m active (${status.shards.total} total)`);
        }

        if (withTunnel) {
          console.log(`\n  \x1b[36m🌐 Provisioning Cloudflare Tunnel ingress...\x1b[0m`);
          try {
            const tunnel = await GalxTunnelSupervisor.startTunnel();
            console.log(`  \x1b[32m✔\x1b[0m Cloudflare Tunnel Active: \x1b[1m\x1b[32m${tunnel.tunnelUrl}\x1b[0m`);
          } catch (err: any) {
            console.warn(`  \x1b[33m▲\x1b[0m Tunnel provisioning skipped: ${err.message}`);
          }
        }
        console.log(`\n  \x1b[90mTip: Run \x1b[36mnpx galxai relay monitor\x1b[90m to view live telemetry.\x1b[0m\n`);
      } else {
        console.error(`  \x1b[31m✖\x1b[0m Failed to start relay: ${status.error}`);
        process.exit(1);
      }
      break;
    }

    case 'stop': {
      console.log(`\n\x1b[1m\x1b[33m🛑 Stopping GALXAI Local Inference Relay...\x1b[0m\n`);
      await GalxTunnelSupervisor.stopTunnel();
      const stopped = await GalxRelaySupervisor.stop();
      if (stopped) {
        console.log(`  \x1b[32m✔\x1b[0m Relay process stopped successfully.\n`);
      } else {
        console.log(`  \x1b[33m▲\x1b[0m Relay was not running.\n`);
      }
      break;
    }

    case 'restart': {
      console.log(`\n\x1b[1m\x1b[36m🔄 Restarting GALXAI Local Inference Relay...\x1b[0m\n`);
      const status = await GalxRelaySupervisor.restart();
      if (status.isOnline) {
        console.log(`  \x1b[32m✔\x1b[0m Relay restarted successfully! (PID: ${status.pid}, RTT: ${status.rttMs}ms)\n`);
      } else {
        console.error(`  \x1b[31m✖\x1b[0m Restart failed: ${status.error}\n`);
        process.exit(1);
      }
      break;
    }

    case 'status': {
      const status = await GalxRelaySupervisor.getStatus();
      renderStatusBox(status);
      break;
    }

    case 'health': {
      const health = await GalxRelaySupervisor.getHealth(3001, 3000);
      if (health.ok && health.data) {
        console.log(JSON.stringify(health.data, null, 2));
      } else {
        console.error(JSON.stringify({ status: 'error', error: 'Relay is not reachable on port 3001' }, null, 2));
        process.exit(1);
      }
      break;
    }

    case 'monitor': {
      await runRelayMonitor();
      break;
    }

    case 'test': {
      console.log(`\n\x1b[1m\x1b[36m🧪 Running Smoke Test against Local Relay Wire...\x1b[0m\n`);
      const testRes = await GalxRelaySupervisor.smokeTest();
      if (testRes.success) {
        console.log(`  \x1b[32m✔\x1b[0m Relay wire verification \x1b[1mPASSED\x1b[0m in \x1b[1m${testRes.rttMs}ms\x1b[0m`);
        console.log(`  \x1b[32m✔\x1b[0m Version: ${testRes.health?.version ?? 'vnext'}`);
        console.log(`  \x1b[32m✔\x1b[0m Active Shards: ${testRes.health?.shards?.active ?? 'Active'}`);
        console.log(`  \x1b[32m✔\x1b[0m Storage Engine: ${testRes.health?.storageEngine ?? 'Federation'}\n`);
      } else {
        console.error(`  \x1b[31m✖\x1b[0m Smoke test \x1b[1mFAILED\x1b[0m: ${testRes.error}\n`);
        process.exit(1);
      }
      break;
    }

    case 'tunnel': {
      const action = args[1] || 'status';
      if (action === 'start') {
        console.log(`\n\x1b[1m\x1b[36m🌐 Establishing Cloudflare Tunnel Ingress...\x1b[0m\n`);
        try {
          const tunnel = await GalxTunnelSupervisor.startTunnel();
          console.log(`  \x1b[32m✔\x1b[0m Tunnel Connected: \x1b[1m\x1b[32${tunnel.tunnelUrl}\x1b[0m`);
          console.log(`  \x1b[32m✔\x1b[0m Testing public round-trip reachability...`);
          const test = await GalxTunnelSupervisor.testTunnelReachability(tunnel.tunnelUrl!);
          if (test.ok) {
            console.log(`  \x1b[32m✔\x1b[0m Public HTTPS Health Check \x1b[32mOK\x1b[0m (${test.rttMs}ms)\n`);
          } else {
            console.warn(`  \x1b[33m▲\x1b[0m Tunnel active, but external health check timed out.\n`);
          }
        } catch (err: any) {
          console.error(`  \x1b[31m✖\x1b[0m Failed to start tunnel: ${err.message}\n`);
          process.exit(1);
        }
      } else if (action === 'stop') {
        await GalxTunnelSupervisor.stopTunnel();
        console.log(`\n  \x1b[32m✔\x1b[0m Cloudflare tunnel stopped.\n`);
      } else {
        const state = GalxTunnelSupervisor.getTunnelState();
        if (state && state.isAlive && state.tunnelUrl) {
          console.log(`\n  \x1b[1mCloudflare Tunnel Status:\x1b[0m \x1b[32mACTIVE\x1b[0m`);
          console.log(`  URL:  \x1b[1m\x1b[36m${state.tunnelUrl}\x1b[0m`);
          console.log(`  PID:  ${state.pid}`);
          console.log(`  Port: ${state.localPort}\n`);
        } else {
          console.log(`\n  \x1b[1mCloudflare Tunnel Status:\x1b[0m \x1b[90mINACTIVE\x1b[0m (Run: \x1b[36mnpx galxai relay tunnel start\x1b[0m)\n`);
        }
      }
      break;
    }

    case 'service': {
      const action = args[1] || 'status';
      if (action === 'install') {
        try {
          const res = GalxLaunchAgent.install();
          console.log(`\n  \x1b[32m✔\x1b[0m Installed macOS LaunchAgent: \x1b[1m${res.plistPath}\x1b[0m`);
          console.log(`  \x1b[32m✔\x1b[0m Relay service registered to start automatically on login.\n`);
        } catch (err: any) {
          console.error(`  \x1b[31m✖\x1b[0m Service install failed: ${err.message}\n`);
        }
      } else if (action === 'uninstall') {
        const removed = GalxLaunchAgent.uninstall();
        console.log(`\n  ${removed ? '\x1b[32m✔\x1b[0m LaunchAgent removed.' : '\x1b[33m▲\x1b[0m LaunchAgent not found.'}\n`);
      } else {
        const s = GalxLaunchAgent.status();
        console.log(`\n  \x1b[1mmacOS LaunchAgent Service Status:\x1b[0m`);
        console.log(`  Installed: ${s.isInstalled ? '\x1b[32mYes\x1b[0m' : '\x1b[90mNo\x1b[0m'}`);
        console.log(`  Loaded:    ${s.isLoaded ? '\x1b[32mActive (PID: ' + s.pid + ')\x1b[0m' : '\x1b[90mInactive\x1b[0m'}\n`);
      }
      break;
    }

    case 'watchdog': {
      console.log(`\n\x1b[1m\x1b[36m🐕 Starting Local Relay Health Watchdog Sentry...\x1b[0m\n`);
      console.log(`  Monitoring http://localhost:3001/health every 15s. Press Ctrl+C to stop.`);
      const watchdog = new GalxRelayWatchdog();
      watchdog.start();
      break;
    }

    case 'logs': {
      const logFile = path.join(os.homedir(), '.lumi', 'logs', 'relay.log');
      if (fs.existsSync(logFile)) {
        const lines = fs.readFileSync(logFile, 'utf-8').trim().split('\n');
        const tail = lines.slice(-25).join('\n');
        console.log(`\n\x1b[1m--- Relay Logs (tail 25) ---\x1b[0m\n${tail}\n`);
      } else {
        console.log(`\n  \x1b[33m▲\x1b[0m No log file found at ${logFile}\n`);
      }
      break;
    }

    case 'docker': {
      const dockerAction = args[1] || 'status';
      switch (dockerAction) {
        case 'up': {
          console.log(`\n\x1b[1m\x1b[36m🐳 Starting Isolated GALXAI Relay Container...\x1b[0m\n`);
          const forceBuild = args.includes('--build');
          try {
            const status = await GalxDockerSupervisor.up({ forceBuild });
            console.log(`  \x1b[32m✔\x1b[0m Relay Container ONLINE on \x1b[1mhttp://127.0.0.1:${status.port}\x1b[0m`);
            console.log(`  \x1b[32m✔\x1b[0m Container ID: ${status.containerId?.slice(0, 12)} (${status.statusText})`);
            console.log(`  \x1b[32m✔\x1b[0m WebApp Control Plane: \x1b[36mhttp://127.0.0.1:${status.port}/\x1b[0m`);
            console.log(`  \x1b[32m✔\x1b[0m Resource Limits: 512MB RAM | 1.0 CPU (Polite Neighbor Protocol)`);
            console.log(`\n  \x1b[90mTip: Run \x1b[36mnpx galxai relay docker open\x1b[90m to view the dashboard in your browser.\x1b[0m\n`);
          } catch (err: any) {
            console.error(`  \x1b[31m✖\x1b[0m Failed to start Docker relay: ${err.message}\n`);
            process.exit(1);
          }
          break;
        }

        case 'down': {
          console.log(`\n\x1b[1m\x1b[33m🛑 Stopping GALXAI Relay Container...\x1b[0m\n`);
          const res = await GalxDockerSupervisor.down();
          if (res.success) {
            console.log(`  \x1b[32m✔\x1b[0m Relay container stopped and removed cleanly.\n`);
          } else {
            console.error(`  \x1b[31m✖\x1b[0m Error stopping container: ${res.output}\n`);
          }
          break;
        }

        case 'build': {
          console.log(`\n\x1b[1m\x1b[36m🔨 Building galxai-relay:latest standalone image...\x1b[0m\n`);
          const res = await GalxDockerSupervisor.build();
          if (res.success) {
            console.log(`  \x1b[32m✔\x1b[0m Image built successfully!\n`);
          } else {
            console.error(`  \x1b[31m✖\x1b[0m Build failed: ${res.output}\n`);
            process.exit(1);
          }
          break;
        }

        case 'logs': {
          const tail = parseInt(args[2] || '50', 10);
          console.log(`\n\x1b[1m--- Container Logs (tail ${tail}) ---\x1b[0m\n`);
          const logs = await GalxDockerSupervisor.logs(tail);
          console.log(logs);
          break;
        }

        case 'open': {
          const status = await GalxDockerSupervisor.getStatus();
          await GalxDockerSupervisor.openDashboard(status.port || 3001);
          break;
        }

        case 'status':
        default: {
          const s = await GalxDockerSupervisor.getStatus();
          console.log(`\n\x1b[1m\x1b[36m🐳 GALXAI Relay Container Status\x1b[0m`);
          console.log(`  Docker Daemon: ${s.isDockerAvailable ? '\x1b[32m● Available\x1b[0m' : '\x1b[31m● Offline\x1b[0m'}`);
          console.log(`  Container:     ${s.isContainerRunning ? '\x1b[32m● Running\x1b[0m (' + s.containerId?.slice(0, 12) + ')' : '\x1b[90m○ Stopped\x1b[0m'}`);
          if (s.isContainerRunning) {
            console.log(`  Host Port:     127.0.0.1:${s.port} (Strict Loopback Only)`);
            console.log(`  Wire Health:   ${s.healthOk ? '\x1b[32m● OK\x1b[0m (' + s.rttMs + 'ms)' : '\x1b[31m● Unresponsive\x1b[0m'}`);
            console.log(`  Dashboard URL: \x1b[36mhttp://127.0.0.1:${s.port}/\x1b[0m`);
          }
          console.log();
          break;
        }
      }
      break;
    }

    case 'desktops': {
      await openRelayMonitor(GalxRelaySupervisor.getActivePort(), { destination: 'desktops' });
      break;
    }
    case 'open':
    case 'dashboard': {
      const port = GalxRelaySupervisor.getActivePort();
      console.log(`\n\x1b[1m\x1b[36m🌐 Opening GALXAI Relay Control Plane WebApp...\x1b[0m\n`);
      await GalxDockerSupervisor.openDashboard(port);
      break;
    }

    default: {
      console.log(`
\x1b[1m\x1b[36m🌌 GALXAI Local Inference Relay Manager\x1b[0m

\x1b[1mUSAGE:\x1b[0m
  $ npx galxai relay start [--daemon | --tunnel]  Launch local relay daemon
  $ npx galxai relay stop                         Stop running relay daemon
  $ npx galxai relay restart                      Restart relay daemon cleanly
  $ npx galxai relay status                       Display boxed diagnostic status card
  $ npx galxai relay monitor                      Open live interactive ANSI terminal HUD
  $ npx galxai relay health                       Output full JSON health payload
  $ npx galxai relay test                         Run 2-second wire verification smoke test
  $ npx galxai relay open                         Open WebApp Control Plane in browser
  $ npx galxai relay desktops                     Open isolated Terminal and Chrome desktops
  $ npx galxai relay docker [up|down|build|status|logs|open]  Manage isolated Docker container
  $ npx galxai relay tunnel [start|stop|status]   Manage Cloudflare Tunnel public ingress
  $ npx galxai relay service [install|status]     Install as persistent macOS LaunchAgent
  $ npx galxai relay watchdog                     Run autonomous self-healing watchdog loop
  $ npx galxai relay logs                         View latest relay logs
      `);
      break;
    }
  }
}

/**
 * Renders a Supabase/Stripe CLI-style boxed status card.
 */
function renderStatusBox(status: any): void {
  const statusStr = status.isOnline
    ? `\x1b[32m● Online (PID: ${status.pid || 'N/A'})\x1b[0m`
    : `\x1b[31m● Offline\x1b[0m`;

  const healthUrl = `http://localhost:${status.port}/health` + (status.rttMs ? ` (${status.rttMs}ms)` : '');
  const shardsStr = status.shards
    ? `${status.shards.active} active / ${status.shards.cooldown} cooldown / ${status.shards.exhausted} exhausted`
    : 'N/A';
  const memStr = status.memory ? `${status.memory.rssMb} MB RSS / ${status.memory.heapUsedMb} MB Heap` : 'N/A';
  const tunnelStr = status.tunnelUrl ? `\x1b[32m${status.tunnelUrl}\x1b[0m` : '\x1b[90mNone (local only)\x1b[0m';

  console.log(`
\x1b[1m\x1b[36m┌──────────────────────────────────────────────────────────────────────────┐\x1b[0m
\x1b[1m\x1b[36m│ GALXAI Local Inference Relay & Persistent WebSocket Gateway (v2.6.0)     │\x1b[0m
\x1b[1m\x1b[36m├──────────────────────────┬───────────────────────────────────────────────┤\x1b[0m
│ Status                   │ ${pad(statusStr, 45)} │
│ Local Health Endpoint    │ ${pad(healthUrl, 45)} │
│ Metrics Endpoint         │ ${pad(`http://localhost:${status.port}/metrics`, 45)} │
│ Public Tunnel Ingress    │ ${pad(tunnelStr, 45)} │
│ Supervision Mode         │ ${pad(status.mode.toUpperCase(), 45)} │
│ Enrolled Shards          │ ${pad(shardsStr, 45)} │
│ Memory Usage             │ ${pad(memStr, 45)} │
\x1b[1m\x1b[36m└──────────────────────────┴───────────────────────────────────────────────┘\x1b[0m
`);
}

function pad(str: string, width: number): string {
  // Strip ANSI color codes for accurate visual length calculation
  const cleanLen = str.replace(/\x1b\[[0-9;]*m/g, '').length;
  const padding = Math.max(0, width - cleanLen);
  return str + ' '.repeat(padding);
}
