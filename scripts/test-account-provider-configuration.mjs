import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { accountProviderEnvironment } from './lib/account-providers.mjs';
async function fixture(callback){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'galx-provider-'));try{await callback(dir);}finally{await fs.rm(dir,{recursive:true,force:true});}}
const source={external_google_enabled:true,external_google_client_id:'existing.apps.googleusercontent.com',external_google_secret:'a'.repeat(64),external_github_enabled:true,external_github_client_id:'existing-github',external_github_secret:'b'.repeat(64)};
test('management fingerprints never become credentials; required providers fail closed',()=>fixture(async dir=>{
 const environmentFile=path.join(dir,'env');await fs.writeFile(environmentFile,'');
 assert.deepEqual(await accountProviderEnvironment(dir,source,{environmentFile}),{});
 await assert.rejects(accountProviderEnvironment(dir,source,{environmentFile,requireAll:true}),error=>error.message.includes('real credential')&&!error.message.includes(source.external_google_secret));
}));
test('only secrets for exact existing identities are selected',()=>fixture(async dir=>{
 const environmentFile=path.join(dir,'env'),github='c'.repeat(40),google='GOCSPX-'+'d'.repeat(28);
 await fs.writeFile(environmentFile,'GITHUB_CLIENT_ID=existing-github\nGITHUB_CLIENT_SECRET='+github+'\nGOOGLE_CLIENT_ID=other.apps.googleusercontent.com\nGOOGLE_CLIENT_SECRET=unrelated_credential_value\n');
 await fs.writeFile(path.join(dir,'google-client.secret.json'),JSON.stringify({provider:'google',clientId:source.external_google_client_id,secret:google}),{mode:0o600});
 assert.deepEqual(await accountProviderEnvironment(dir,source,{environmentFile,requireAll:true}),{GOTRUE_EXTERNAL_GOOGLE_SECRET:google,GOTRUE_EXTERNAL_GITHUB_SECRET:github});
}));
test('public files, symlinks, identity drift and injected provider values are rejected',()=>fixture(async dir=>{
 const environmentFile=path.join(dir,'env'),file=path.join(dir,'google-client.secret.json');await fs.writeFile(environmentFile,'');
 await fs.writeFile(file,JSON.stringify({provider:'google',clientId:source.external_google_client_id,secret:'GOCSPX-'+'d'.repeat(28)}),{mode:0o644});
 await assert.rejects(accountProviderEnvironment(dir,source,{environmentFile}),/private/);await fs.chmod(file,0o600);
 await fs.writeFile(file,JSON.stringify({provider:'google',clientId:'other.apps.googleusercontent.com',secret:'GOCSPX-'+'d'.repeat(28)}));await assert.rejects(accountProviderEnvironment(dir,source,{environmentFile}),/does not match/);
 await fs.unlink(file);await fs.symlink(environmentFile,file);await assert.rejects(accountProviderEnvironment(dir,source,{environmentFile}),/private/);
 await fs.unlink(file);await fs.writeFile(file,JSON.stringify({provider:'google',clientId:source.external_google_client_id,secret:'GOCSPX-\nINJECTED=credential_value'}),{mode:0o600});await assert.rejects(accountProviderEnvironment(dir,source,{environmentFile}),/does not match/);
}));
