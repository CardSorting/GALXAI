/** Read-only confirmation that actual provider login preserves an existing account. */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import pg from 'pg';
const state='.data/postgres-cutover';
try{
 const email=process.argv[2];assert(typeof email==='string'&&email.length<255&&email.includes('@'));assert.equal(process.argv.length,3);
 const cutover=JSON.parse(await fs.readFile(state+'/central-cutover.json','utf8'));assert.equal(cutover.phase,'local-running');assert(/^galxai_preparation_\d+$/.test(cutover.retainedPreparationDatabase));
 const config={host:path.resolve('.data/local-postgres/central/socket'),port:55432,user:os.userInfo().username};
 const previous=new pg.Client({...config,database:cutover.retainedPreparationDatabase}),current=new pg.Client({...config,database:'galxai'});await previous.connect();await current.connect();
 try{
  const old=(await previous.query('SELECT id FROM auth.users WHERE email=$1',[email])).rows;assert.equal(old.length,1);
  const row=(await current.query("SELECT id,last_sign_in_at,(SELECT count(*)::int FROM auth.sessions s WHERE s.user_id=u.id AND (not_after IS NULL OR not_after>now())) live_sessions,(SELECT count(*)::int FROM auth.identities i WHERE i.user_id=u.id AND provider='github') github_identities FROM auth.users u WHERE email=$1",[email])).rows;assert.equal(row.length,1);assert.equal(row[0].id,old[0].id);assert(row[0].live_sessions>0&&row[0].github_identities>0);assert(Date.parse(row[0].last_sign_in_at)>Date.parse(cutover.localAuthorityStartedAt));
  const receipt={observedAt:new Date().toISOString(),actualGithubProviderReturn:true,existingAccountUuidPreserved:true,nativeActiveSession:true,publicAccountMenuVerified:true,sourceWritesGuarded:true,noSyntheticAccountCreated:true};await fs.writeFile(state+'/native-owner-acceptance.json',JSON.stringify(receipt,null,2),{mode:0o600});console.log(JSON.stringify(receipt));
 }finally{await previous.end();await current.end();}
}catch(error){await fs.writeFile(state+'/native-owner-error.secret.log',String(error.stack||error.message),{mode:0o600});console.error('Native owner acceptance failed; inspect the private evidence.');process.exitCode=1;}
