/** Select the active local authority for developer commands; retain the original source privately. */
import fs from 'node:fs/promises';
import { parseEnv } from 'node:util';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const state='.data/postgres-cutover',file='.env.local',sourceFile=state+'/central-source.secret.env';
const phase=JSON.parse(await fs.readFile(state+'/phase.json','utf8'));assert.equal(phase.state,'central-local-authority');
const original=await fs.readFile(file,'utf8'),env=parseEnv(original),source=new URL(env.DATABASE_URL);
assert(source.hostname.endsWith('.pooler.supabase.com')&&decodeURIComponent(source.username).endsWith('.mazhcjisettrzbqhorvp'));
await fs.writeFile(sourceFile,original,{mode:0o600,flag:'wx'});
const credentials=JSON.parse(await fs.readFile('.data/local-postgres/central/credentials.secret.json','utf8')),account=JSON.parse(await fs.readFile(state+'/account-authority.secret.json','utf8'));
const selected={DATABASE_URL:`postgresql://postgres:${encodeURIComponent(credentials.postgres)}@127.0.0.1:55432/galxai`,POSTGRES_SSL_MODE:'verify-full',POSTGRES_CA_CERT:(await fs.readFile('.data/local-postgres/central/server.crt','utf8')).trim(),GALX_DATABASE_DEPLOYMENT:'native-postgres-v1',ACCOUNT_API_INTERNAL_URL:'http://127.0.0.1:55110',ACCOUNT_API_SERVICE_KEY:account.serviceToken,NEXT_PUBLIC_ACCOUNT_API_URL:'https://galx.ai',NEXT_PUBLIC_ACCOUNT_PUBLISHABLE_KEY:account.publishableKey};
const retired=new Set(['SUPABASE_URL','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_ANON_KEY','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_PUBLISHABLE_KEY','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SECRET_KEY','SUPABASE_DB_SSL_MODE','SUPABASE_DB_CA_CERT',...Object.keys(selected)]);
const retained=original.split('\n').filter(line=>!retired.has(line.match(/^(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/)?.[1]));
const result=retained.join('\n').trimEnd()+'\n\n# Active native account/database authority; original hosted source retained privately.\n'+Object.entries(selected).map(([name,value])=>name+'='+JSON.stringify(value)).join('\n')+'\n';
const check=parseEnv(result);assert.equal(new URL(check.DATABASE_URL).hostname,'127.0.0.1');assert.equal(check.NEXT_PUBLIC_ACCOUNT_API_URL,'https://galx.ai');assert(!check.SUPABASE_URL&&!check.NEXT_PUBLIC_SUPABASE_URL);
await fs.writeFile(file,result,{mode:0o600});await fs.chmod(file,0o600);
const sha=value=>createHash('sha256').update(value).digest('hex');await fs.writeFile(state+'/development-authority.json',JSON.stringify({observedAt:new Date().toISOString(),beforeSha256:sha(original),afterSha256:sha(result),originalSourceRetained:true,nativeDatabaseTls:true,localAccountAuthority:true,legacyTransportAliasesRemoved:true,unrelatedEnvironmentRetained:true},null,2),{mode:0o600});console.log('Developer environment now selects the active native database and account API; the original hosted source is retained privately.');
