/** Preview by default. Transfers only billing credentials through stdin, never logs values. */
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
const env = parseEnv(readFileSync('.env.local','utf8'));
const secretKey = env.STRIPE_SECRET_KEY || '';
if (!/^(sk|rk)_live_[A-Za-z0-9]+$/.test(secretKey)) throw new Error('A valid live Stripe key is required');
const secrets = [...new Set(['STRIPE_WEBHOOK_SECRET','STRIPE_WEBHOOK_SECRET_PRODUCTION','STRIPE_CREDITS_WEBHOOK_SECRET','STRIPE_WEBHOOK_SECRET_LIVE']
  .flatMap(name => (env[name] || '').split(',')).map(value => value.trim()).filter(value => /^whsec_[A-Za-z0-9]+$/.test(value) && !/placeholder/i.test(value)))];
if (!secrets.length) throw new Error('Webhook signing secrets are required');
for (const [name,value,sensitive] of [['NEXT_PUBLIC_APP_URL','https://galx.ai',false],['STRIPE_SECRET_KEY',secretKey,true],['STRIPE_WEBHOOK_SECRET',secrets.join(','),true]] as const) {
  if (!process.argv.includes('--apply')) { console.log(`Would configure ${name} for production`); continue; }
  const result = spawnSync('vercel',['env','add',name,'production','--force',...(sensitive?['--sensitive']:[])],{input:value,encoding:'utf8',timeout:60000});
  if (result.status !== 0) throw new Error(`Could not configure ${name}; Vercel exited ${result.status}`);
  console.log(`Configured ${name} for production`);
}
