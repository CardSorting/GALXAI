import fs from 'node:fs/promises';
import { parseEnv } from 'node:util';
/** Existing, exact client identities only; never mistake management fingerprints for credentials. */
export async function accountProviderEnvironment(state,source,{requireAll=false,environmentFile='.env.local'}={}){
 const env=parseEnv(await fs.readFile(environmentFile,'utf8')),result={};
 for(const provider of ['google','github']){
  const id=source['external_'+provider+'_client_id'];let secret;
  if(env[provider.toUpperCase()+'_CLIENT_ID']===id)secret=env[provider.toUpperCase()+'_CLIENT_SECRET'];
  if(provider==='google'){
   const file=state+'/google-client.secret.json';
   try{
    const stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.mode&0o077||stat.uid!==process.getuid())throw Error('Provider credential file must be private and owned by the operator.');
    const saved=JSON.parse(await fs.readFile(file,'utf8'));
    if(saved.provider!=='google'||saved.clientId!==id||typeof saved.secret!=='string'||!/^GOCSPX-[A-Za-z0-9_-]{20,100}$/.test(saved.secret))throw Error('Provider credential does not match the existing Google client.');secret=saved.secret;
   }catch(error){if(error.code!=='ENOENT')throw error;}
  }
  if(!secret){const exported=source['external_'+provider+'_secret'];if(exported&&!/^[a-f0-9]{64}$/i.test(exported))secret=exported;}
  if(!secret||secret===source['external_'+provider+'_secret']&&/^[a-f0-9]{64}$/i.test(secret)){
   if(requireAll&&source['external_'+provider+'_enabled'])throw Error('A real credential is required for the existing '+provider+' client; the management fingerprint cannot authenticate.');continue;
  }
  if(/[\r\n]/.test(secret)||secret.length>256||secret.length<20)throw Error('Invalid provider credential format.');
  if(provider==='google'&&!/^GOCSPX-[A-Za-z0-9_-]{20,100}$/.test(secret)||provider==='github'&&!/^[a-f0-9]{40}$/i.test(secret))throw Error('The retained '+provider+' credential has an unexpected format.');
  result['GOTRUE_EXTERNAL_'+provider.toUpperCase()+'_SECRET']=secret;
 }
 return result;
}
