/** Private cutover preparation. No DNS, source database or active-client changes. */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes, createHmac } from 'node:crypto';
import pg from 'pg';
import { loadAccountEmailEnvironment } from './lib/account-email.mjs';
import { accountProviderEnvironment } from './lib/account-providers.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const state = path.join(root, '.data/postgres-cutover');
const pgHome = path.join(root, '.data/local-postgres');
const exec = promisify(execFile);
const read = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const write = async (file, value) => { await fs.writeFile(file, value, { mode: 0o600 }); await fs.chmod(file, 0o600); };
const quote = value => "'" + value.replaceAll("'", "''") + "'";
async function run(command, args, extra = {}) {
  try { return (await exec(command, args, { cwd: root, timeout: 120000, maxBuffer: 1024 * 1024, ...extra })).stdout; }
  catch (error) { await write(path.join(state, 'last-stage-error.log'), `${error.stderr || ''}\n${error.stdout || ''}`); throw Error('Staging failed; inspect the private last-stage-error.log.'); }
}
const bool = value => String(Boolean(value));
function jwt(secret, role) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const body = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ iss: 'galx-account', role, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + 10*365*86400 })}`;
  return body + '.' + createHmac('sha256', secret).update(body).digest('base64url');
}
async function tls(name) {
  const dir = path.join(pgHome, name), cert = path.join(dir, 'server.crt'), key = path.join(dir, 'server.key');
  try { await fs.access(cert); await fs.access(key); }
  catch {
    await run('/opt/homebrew/opt/openssl@3/bin/openssl', ['req','-x509','-newkey','rsa:3072','-nodes','-keyout',key,'-out',cert,'-days','365',
      '-subj',`/CN=galx-postgres-${name}.internal`, '-addext',`subjectAltName=DNS:host.docker.internal,DNS:galx-postgres-${name}.internal,DNS:localhost,IP:127.0.0.1`,
      '-addext','basicConstraints=critical,CA:TRUE','-addext','keyUsage=critical,digitalSignature,keyEncipherment,keyCertSign']);
    await fs.chmod(key, 0o600); await fs.chmod(cert, 0o600);
  }
  const config = path.join(dir, 'cluster/postgresql.conf');
  const text = await fs.readFile(config, 'utf8');
  if (!text.includes('# GALX local TLS transport')) await fs.appendFile(config,
    `\n# GALX local TLS transport\nssl = on\nssl_min_protocol_version = 'TLSv1.2'\nssl_cert_file = ${quote(cert)}\nssl_key_file = ${quote(key)}\n`);
  await run('/opt/homebrew/opt/postgresql@17/bin/pg_ctl', ['-D',path.join(dir,'cluster'),'reload']);
  return fs.readFile(cert, 'utf8');
}
async function prepare() {
  await fs.mkdir(state, { recursive: true, mode: 0o700 }); await fs.chmod(state, 0o700);
  const phaseFile=path.join(state,'phase.json');
  let phase;try{phase=await read(phaseFile);}catch(error){if(error.code!=='ENOENT')throw error;}
  if(phase&&phase.state!=='preparation')throw Error('Local Auth is no longer an uncoupled preparation copy.');
  if(!phase)await write(phaseFile,JSON.stringify({state:'preparation',createdAt:new Date().toISOString(),publicTraffic:false},null,2));
  const auth = await read(path.join(state, 'hosted-central-auth.secret.json'));
  const cert = await tls('central'); await tls('premium');
  const credentialFile = path.join(pgHome, 'central/credentials.secret.json');
  const credentials = await read(credentialFile);
  const client = new pg.Client({ host:path.join(pgHome,'central/socket'),port:55432,user:os.userInfo().username,database:'galxai' });
  await client.connect();
  try {
    await client.query('BEGIN');
    for (const role of ['supabase_auth_admin','authenticator']) {
      credentials[role] ||= randomBytes(36).toString('base64url');
      await client.query(`ALTER ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD ${quote(credentials[role])}`);
      await client.query(`GRANT CONNECT ON DATABASE galxai TO ${role}`);
    }
    await client.query('ALTER ROLE supabase_auth_admin IN DATABASE galxai SET search_path=auth,extensions,pg_catalog');
    await client.query('COMMIT');
  } finally { await client.end(); }
  await write(credentialFile, JSON.stringify(credentials,null,2));
  const hba = path.join(pgHome,'central/cluster/pg_hba.conf');
  let hbaText = await fs.readFile(hba,'utf8');
  if (!hbaText.includes('# GALX account services')) {
    const lines = '# GALX account services\nhostssl galxai supabase_auth_admin 127.0.0.1/32 scram-sha-256\nhostssl galxai authenticator 127.0.0.1/32 scram-sha-256\n';
    hbaText = hbaText.replace('local all all reject',lines+'local all all reject'); await write(hba,hbaText);
    await run('/opt/homebrew/opt/postgresql@17/bin/pg_ctl',['-D',path.join(pgHome,'central/cluster'),'reload']);
  }
  const secretFile = path.join(state,'account-authority.secret.json');
  let secrets;
  try { secrets = await read(secretFile); }
  catch(error) { if(error.code!=='ENOENT')throw error;secrets={ jwtSecret:randomBytes(48).toString('base64url'),publishableKey:'sb_publishable_'+randomBytes(32).toString('base64url') }; }
  secrets.anonToken ||= jwt(secrets.jwtSecret,'anon'); secrets.serviceToken ||= jwt(secrets.jwtSecret,'service_role');
  await write(secretFile,JSON.stringify(secrets,null,2));
  await write(path.join(state,'database-ca.crt'),cert);
  const databaseUrl = role => `postgresql://${role}:${credentials[role]}@host.docker.internal:55432/galxai?sslmode=verify-full&sslrootcert=/run/secrets/database-ca.crt`;
  const authEnvironment = {
    GOTRUE_API_HOST:'0.0.0.0',GOTRUE_API_PORT:'9999',API_EXTERNAL_URL:'https://galx.ai/auth/v1',
    GOTRUE_DB_DRIVER:'postgres',GOTRUE_DB_DATABASE_URL:databaseUrl('supabase_auth_admin'),GOTRUE_DB_NAMESPACE:'auth',
    GOTRUE_SITE_URL:'https://galx.ai',GOTRUE_URI_ALLOW_LIST:'https://galx.ai/auth/callback,https://galx.ai/auth/callback?*,https://www.galx.ai/auth/callback,https://www.galx.ai/auth/callback?*',
    GOTRUE_JWT_SECRET:secrets.jwtSecret,GOTRUE_JWT_ISSUER:'https://galx.ai/auth/v1',GOTRUE_JWT_AUD:'authenticated',GOTRUE_JWT_DEFAULT_GROUP_NAME:'authenticated',GOTRUE_JWT_ADMIN_ROLES:'service_role',GOTRUE_JWT_EXP:String(auth.jwt_exp||3600),
    GOTRUE_DISABLE_SIGNUP:bool(auth.disable_signup),GOTRUE_EXTERNAL_EMAIL_ENABLED:bool(auth.external_email_enabled),GOTRUE_EXTERNAL_ANONYMOUS_USERS_ENABLED:'false',
    GOTRUE_MAILER_AUTOCONFIRM:bool(auth.mailer_autoconfirm),GOTRUE_MAILER_SECURE_EMAIL_CHANGE_ENABLED:bool(auth.mailer_secure_email_change_enabled),
    GOTRUE_SECURITY_REFRESH_TOKEN_ROTATION_ENABLED:'true',GOTRUE_SECURITY_REFRESH_TOKEN_REUSE_INTERVAL:'10',
    GOTRUE_PASSWORD_MIN_LENGTH:String(Math.max(6,auth.password_min_length||6)),GOTRUE_PASSWORD_REQUIRED_CHARACTERS:auth.password_required_characters||'',
    GOTRUE_SECURITY_MANUAL_LINKING_ENABLED:bool(auth.security_manual_linking_enabled),
    GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD:bool(auth.security_update_password_require_current_password),
    GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION:bool(auth.security_update_password_require_reauthentication),
    GOTRUE_SESSIONS_SINGLE_PER_USER:bool(auth.sessions_single_per_user),
    GOTRUE_RATE_LIMIT_EMAIL_SENT:String(auth.rate_limit_email_sent||2),
    GOTRUE_RATE_LIMIT_OTP:String(auth.rate_limit_otp||30),
    GOTRUE_RATE_LIMIT_TOKEN_REFRESH:String(auth.rate_limit_token_refresh||150),GOTRUE_RATE_LIMIT_VERIFY:String(auth.rate_limit_verify||30),
    GOTRUE_EXTERNAL_GITHUB_ENABLED:bool(auth.external_github_enabled),GOTRUE_EXTERNAL_GITHUB_CLIENT_ID:auth.external_github_client_id||'',GOTRUE_EXTERNAL_GITHUB_SECRET:auth.external_github_secret||'',GOTRUE_EXTERNAL_GITHUB_REDIRECT_URI:'https://galx.ai/auth/v1/callback',
    GOTRUE_EXTERNAL_GOOGLE_ENABLED:bool(auth.external_google_enabled),GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID:auth.external_google_client_id||'',GOTRUE_EXTERNAL_GOOGLE_SECRET:auth.external_google_secret||'',GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI:'https://galx.ai/auth/v1/callback',
    GOTRUE_MAILER_URLPATHS_CONFIRMATION:'/auth/v1/verify',GOTRUE_MAILER_URLPATHS_RECOVERY:'/auth/v1/verify',GOTRUE_MAILER_URLPATHS_INVITE:'/auth/v1/verify',GOTRUE_MAILER_URLPATHS_EMAIL_CHANGE:'/auth/v1/verify',
    GOTRUE_SMTP_ADMIN_EMAIL:auth.smtp_admin_email||'accounts@galx.ai',GOTRUE_SMTP_SENDER_NAME:'GALX',
    GOTRUE_LOG_LEVEL:'warn',GOTRUE_TRACING_ENABLED:'false',
  };
  // Hosted zero means "unlimited"; GoTrue's optional duration fields reject
  // an explicitly configured zero. Preserve unlimited by leaving them unset.
  for(const [suffix,field]of [['TIMEBOX','sessions_timebox'],['INACTIVITY_TIMEOUT','sessions_inactivity_timeout']])if(auth[field]>0)authEnvironment['GOTRUE_SESSIONS_'+suffix]=String(auth[field])+'s';
  // Delivery must be supplied explicitly. Never replace verification with autoconfirm.
  for(const [suffix,field]of [['HOST','smtp_host'],['PORT','smtp_port'],['USER','smtp_user'],['PASS','smtp_pass']]) if(auth[field]) authEnvironment['GOTRUE_SMTP_'+suffix]=String(auth[field]);
  Object.assign(authEnvironment,await loadAccountEmailEnvironment(path.join(state,'account-email.secret.json')));
  Object.assign(authEnvironment,await accountProviderEnvironment(state,auth,{requireAll:true}));
  await write(path.join(state,'auth-environment.secret.json'),JSON.stringify(authEnvironment,null,2));
  const environmentFile = Object.entries(authEnvironment).map(([key,value])=>{
    if(/[\r\n]/.test(value))throw Error('Unexpected multiline Auth setting.');return `${key}=${value}`;
  }).join('\n')+'\n';
  await write(path.join(state,'auth.secret.env'),environmentFile);
  const restEnvironment = {PGRST_DB_URI:databaseUrl('authenticator'),PGRST_DB_SCHEMAS:'public',PGRST_DB_ANON_ROLE:'anon',PGRST_DB_EXTRA_SEARCH_PATH:'public, extensions',PGRST_DB_CONFIG:'false',PGRST_DB_MAX_ROWS:'1000',PGRST_DB_POOL:'10',PGRST_JWT_SECRET:secrets.jwtSecret,PGRST_JWT_AUD:'authenticated',PGRST_SERVER_PORT:'3000',PGRST_LOG_LEVEL:'warn',PGRST_OPENAPI_MODE:'disabled'};
  await write(path.join(state,'rest.secret.env'),Object.entries(restEnvironment).map(([k,v])=>`${k}=${v}`).join('\n')+'\n');
  await write(path.join(state,'account-gateway.secret.json'),JSON.stringify({authOrigin:'http://127.0.0.1:55111',restOrigin:'http://127.0.0.1:55112',publishableKey:secrets.publishableKey,anonToken:secrets.anonToken,serviceToken:secrets.serviceToken},null,2));
  await write(path.join(state,'public-build-inputs.secret.json'),JSON.stringify({NEXT_PUBLIC_ACCOUNT_API_URL:'https://galx.ai',NEXT_PUBLIC_ACCOUNT_PUBLISHABLE_KEY:secrets.publishableKey},null,2));
  console.log(JSON.stringify({prepared:true,databaseTls:true,authVersion:'2.197.0',sourceWrites:false,liveClientsChanged:false,emailDeliveryConfigured:!!authEnvironment.GOTRUE_SMTP_HOST,googleEnabled:!!auth.external_google_enabled,githubEnabled:!!auth.external_github_enabled}));
}
async function start(replace=false,final=false,providerRefresh=false) {
  const phase=await read(path.join(state,'phase.json'));
  if(final){
    const cutover=await read(path.join(state,'central-cutover.json'));
    if(phase.state!=='central-local-authority'||cutover.phase!==(providerRefresh?'local-running':'activation-started')||!cutover.sourceHashVerified||!cutover.guardsRemoved)throw Error('Final start requires the fenced, verified central copy and explicit local-authority activation.');
  }else if(phase.state!=='preparation')throw Error('This command only manages the uncoupled local preparation copy.');
  for(const [kind,image,port,targetPort]of [
    ['auth','supabase/gotrue@sha256:1736a63078f5922b198c4cbe50f80ab9a2d3b54fe8b7b6cfb2e9dc5dbbc12c6b',55111,9999],
    ['rest','postgrest/postgrest@sha256:c7cd7e265a85b05248abf53f4473fcec7e327c282d0bd0cf60f1551996d09fcf',55112,3000],
  ]) {
    if(providerRefresh&&kind!=='auth')continue;
    const name='galx-local-account-'+kind;
    let existing;try{existing=JSON.parse((await exec('docker',['inspect',name])).stdout)[0];}catch{}
    if(existing){
      if(!replace)throw Error('Account-service container already exists; inspect it before changing it.');
      const expected=JSON.parse((await exec('docker',['image','inspect',image])).stdout)[0].Id;
      if(existing.Image!==expected||existing.Config.Labels?.['ai.galx.account-services']!=='local-postgres-v1')throw Error('Existing account-service ownership or image differs.');
      await run('docker',['stop','--time','30',name]);
      await run('docker',['rename',name,name+'-previous-'+Date.now()]);
    }
    await run('docker',['run','--detach','--name',name,'--restart','unless-stopped','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','256m','--pids-limit','128',
      '--publish',`127.0.0.1:${port}:${targetPort}`,'--env-file',path.join(state,kind+'.secret.env'),
      '--mount',`type=bind,src=${path.join(state,'database-ca.crt')},dst=/run/secrets/database-ca.crt,readonly`,
      '--tmpfs','/tmp:rw,noexec,nosuid,nodev,size=16m','--log-opt','max-size=10m','--log-opt','max-file=3',
      '--label','ai.galx.account-services=local-postgres-v1',image]);
    console.log(`${kind}: private staged service started.`);
  }
}
async function refreshProviders(){
  if((await read(path.join(state,'phase.json'))).state!=='central-local-authority')throw Error('Provider refresh is only for the active local authority.');
  const source=await read(path.join(state,'hosted-central-auth.secret.json')),changes=await accountProviderEnvironment(state,source);
  if(!Object.keys(changes).length)throw Error('No usable existing provider credential is available.');
  const environment=await read(path.join(state,'auth-environment.secret.json'));
  const selected=Object.keys(changes).filter(name=>environment[name]!==changes[name]);if(!selected.length)throw Error('No provider credential change is pending.');
  const before=path.join(state,'auth-environment-before-provider-refresh-'+Date.now()+'.secret.json');await write(before,JSON.stringify(environment,null,2));
  Object.assign(environment,changes);await write(path.join(state,'auth-environment.secret.json'),JSON.stringify(environment,null,2));
  await write(path.join(state,'auth.secret.env'),Object.entries(environment).map(([name,value])=>{if(/[\r\n]/.test(value))throw Error('Unexpected multiline Auth setting.');return name+'='+value;}).join('\n')+'\n');
  await start(true,true,true);
  await write(path.join(state,'provider-credential-refresh.json'),JSON.stringify({observedAt:new Date().toISOString(),existingClientIdsPreserved:true,changedSettingNames:selected,otherSettingsPreserved:true,previousConfiguration:before},null,2));
  console.log('Existing provider credential material refreshed; client IDs, callbacks, permissions, JWT, verification and SMTP policy preserved.');
}
async function gateway() {
  const label='ai.galx.account-api',filename=path.join(os.homedir(),'Library/LaunchAgents',label+'.plist');
  const config=path.join(state,'account-gateway.secret.json');
  const escape=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const args=['/opt/homebrew/bin/node',path.join(root,'scripts/local-account-gateway.mjs'),config];
  const plist=`<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict><key>Label</key><string>${label}</string><key>ProgramArguments</key><array>${args.map(a=>'<string>'+escape(a)+'</string>').join('')}</array><key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>10</integer><key>StandardOutPath</key><string>${escape(path.join(state,'account-gateway.log'))}</string><key>StandardErrorPath</key><string>${escape(path.join(state,'account-gateway.log'))}</string></dict></plist>`;
  let existing;try{existing=await fs.readFile(filename,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
  if(existing&&existing!==plist)throw Error('Existing gateway service definition differs.');
  if(!existing){await write(filename,plist);await run('/bin/launchctl',['bootstrap',`gui/${os.userInfo().uid}`,filename]);}
  console.log('Private loopback account gateway service installed.');
}
try { if(process.argv[2]==='prepare')await prepare();else if(process.argv[2]==='start')await start();else if(process.argv[2]==='replace')await start(true);else if(process.argv[2]==='start-final')await start(true,true);else if(process.argv[2]==='refresh-providers')await refreshProviders();else if(process.argv[2]==='gateway')await gateway();else throw Error('Use prepare, start, replace, start-final, refresh-providers or gateway.'); }
catch(error){console.error(error.message);process.exitCode=1;}
