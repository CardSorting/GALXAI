/**
 * @file src/core/relay/GalxLaunchAgent.ts
 * @description macOS Native LaunchAgent (launchd) Service Generator.
 * Provides Homebrew Services-style zero-terminal background persistence across reboots.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';
import { GalxRelaySupervisor } from './GalxRelaySupervisor.js';

export class GalxLaunchAgent {
  private static readonly SERVICE_NAME = 'com.galxai.relay';
  private static readonly LAUNCH_AGENTS_DIR = path.join(os.homedir(), 'Library', 'LaunchAgents');
  private static readonly PLIST_PATH = path.join(GalxLaunchAgent.LAUNCH_AGENTS_DIR, `${GalxLaunchAgent.SERVICE_NAME}.plist`);

  /**
   * Generates the launchd XML plist definition.
   */
  public static generatePlistContent(): string {
    const resolved = GalxRelaySupervisor.resolveRelayServerPath();
    const tsxBin = path.join(resolved.cwd, 'node_modules', '.bin', 'tsx');
    const logDir = path.join(os.homedir(), '.lumi', 'logs');

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const stdoutLog = path.join(logDir, 'relay.log');
    const stderrLog = path.join(logDir, 'relay.err');

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${GalxLaunchAgent.SERVICE_NAME}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${tsxBin}</string>
        <string>${resolved.serverScript}</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${resolved.cwd}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>
    <key>StandardOutPath</key>
    <string>${stdoutLog}</string>
    <key>StandardErrorPath</key>
    <string>${stderrLog}</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key>
        <string>production</string>
        <key>PORT</key>
        <string>3001</string>
        <key>HOST</key>
        <string>0.0.0.0</string>
    </dict>
</dict>
</plist>
`;
  }

  /**
   * Installs and activates the LaunchAgent on macOS.
   */
  public static install(): { plistPath: string; loaded: boolean } {
    if (process.platform !== 'darwin') {
      throw new Error('LaunchAgent is only supported on macOS');
    }

    if (!fs.existsSync(GalxLaunchAgent.LAUNCH_AGENTS_DIR)) {
      fs.mkdirSync(GalxLaunchAgent.LAUNCH_AGENTS_DIR, { recursive: true });
    }

    const content = GalxLaunchAgent.generatePlistContent();
    fs.writeFileSync(GalxLaunchAgent.PLIST_PATH, content, 'utf-8');

    let loaded = false;
    try {
      execSync(`launchctl unload ${GalxLaunchAgent.PLIST_PATH} 2>/dev/null || true`);
      execSync(`launchctl load ${GalxLaunchAgent.PLIST_PATH}`);
      loaded = true;
    } catch (err: any) {
      console.warn(`[GalxLaunchAgent] launchctl load warning: ${err.message}`);
    }

    return { plistPath: GalxLaunchAgent.PLIST_PATH, loaded };
  }

  /**
   * Uninstalls and removes the LaunchAgent.
   */
  public static uninstall(): boolean {
    if (process.platform !== 'darwin') return false;

    try {
      if (fs.existsSync(GalxLaunchAgent.PLIST_PATH)) {
        execSync(`launchctl unload ${GalxLaunchAgent.PLIST_PATH} 2>/dev/null || true`);
        fs.unlinkSync(GalxLaunchAgent.PLIST_PATH);
        return true;
      }
    } catch {}
    return false;
  }

  /**
   * Queries launchctl status for com.galxai.relay.
   */
  public static status(): { isInstalled: boolean; isLoaded: boolean; pid?: number } {
    const isInstalled = fs.existsSync(GalxLaunchAgent.PLIST_PATH);
    if (!isInstalled || process.platform !== 'darwin') {
      return { isInstalled, isLoaded: false };
    }

    try {
      const output = execSync(`launchctl list | grep ${GalxLaunchAgent.SERVICE_NAME} || true`, {
        encoding: 'utf-8',
      });
      if (output.trim()) {
        const parts = output.trim().split(/\s+/);
        const pid = parseInt(parts[0], 10);
        return { isInstalled: true, isLoaded: true, pid: isNaN(pid) ? undefined : pid };
      }
    } catch {}

    return { isInstalled: true, isLoaded: false };
  }
}
