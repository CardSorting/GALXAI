import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

if (process.platform !== 'darwin') throw Error('This installer uses macOS launchd. Use your host supervisor on other platforms.');
const root = process.cwd();
const namespace = process.env.RELAY_FEDERATION_NAMESPACE || 'production';
const port = Number(process.env.RELAY_FEDERATION_PORT || 3001);
if (!/^[a-z0-9-]{1,32}$/.test(namespace) || !Number.isSafeInteger(port) || port < 1 || port > 65535) throw Error('Invalid service namespace or port');
const label = `com.galxai.federation.${namespace}`;
const directory = path.join(root,'.relay',`federation-${namespace}`);
fs.mkdirSync(directory,{recursive:true,mode:0o700});
const escape = (value:string) => value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const env: Record<string,string> = { NODE_ENV:'production', PATH:'/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
  RELAY_FEDERATION_NAMESPACE:namespace, RELAY_FEDERATION_PORT:String(port),
  RELAY_FEDERATION_IMAGE:process.env.RELAY_FEDERATION_IMAGE || 'galxai-relay:vnext',
  RELAY_CODEX_IMAGE_TOOL_ALIAS:process.env.RELAY_CODEX_IMAGE_TOOL_ALIAS === 'true' ? 'true' : 'false' };
env.RELAY_SITES_OUTPUT_LIMIT_FORWARDING = process.env.RELAY_SITES_OUTPUT_LIMIT_FORWARDING === 'true' ? 'true' : 'false';
const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${label}</string>
<key>ProgramArguments</key><array>${[process.execPath,`--env-file=${path.join(root,'.env.local')}`,'--import','tsx',path.join(root,'scripts/run-relay-federation.ts')].map(v=>`<string>${escape(v)}</string>`).join('')}</array>
<key>WorkingDirectory</key><string>${escape(root)}</string>
<key>EnvironmentVariables</key><dict>${Object.entries(env).map(([k,v])=>`<key>${k}</key><string>${escape(v)}</string>`).join('')}</dict>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>10</integer>
<key>ExitTimeOut</key><integer>180</integer>
<key>StandardOutPath</key><string>${escape(path.join(directory,'stdout.log'))}</string>
<key>StandardErrorPath</key><string>${escape(path.join(directory,'stderr.log'))}</string>
</dict></plist>`;
const target = process.argv.includes('--install') ? path.join(os.homedir(),'Library','LaunchAgents',`${label}.plist`) : path.join(directory,`${label}.plist`);
if (process.argv.includes('--install') && fs.existsSync(target)) throw Error('Service already installed. Stop and review the existing service before replacing it.');
fs.writeFileSync(target,plist,{mode:0o600});
execFileSync('/usr/bin/plutil',['-lint',target],{stdio:'inherit'});
if (process.argv.includes('--install')) execFileSync('/bin/launchctl',['bootstrap',`gui/${process.getuid!()}`,target],{stdio:'inherit'});
console.log(JSON.stringify({label,plist:target,installed:process.argv.includes('--install'),port,compatibilityAlias:env.RELAY_CODEX_IMAGE_TOOL_ALIAS==='true'}));
