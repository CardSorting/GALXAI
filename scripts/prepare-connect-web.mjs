import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

// Preserve the observed Media release while adding only the accepted shared
// authorization boundary. No runtime configuration or deployment is performed.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [revision,destination]=process.argv.slice(2);
if(process.argv.length!==4||!/^[a-f0-9]{40}$/.test(revision||'')||!destination)throw Error('Usage: node scripts/prepare-connect-web.mjs <observed-serving-revision> <new-worktree>');
const target=path.resolve(destination);
if(fs.existsSync(target))throw Error('Source destination must not exist');
execFileSync('git',['worktree','add','--detach',target,revision],{cwd:root,stdio:'pipe'});
const paths=[
  'src/app/connect','src/app/api/connect','src/app/oauth','src/app/.well-known/oauth-authorization-server',
  'src/components/connect','src/lib/connect','src/lib/nova/contract.ts',
  'src/lib/supabase/repositories/ConnectRepository.ts',
  'src/lib/security/request-origin.ts','src/lib/security/inference-placement.ts',
  'src/lib/security/developer-access.ts','src/lib/security/preview-policy.ts','src/lib/security/preview-middleware.ts',
  'src/lib/auth/session-http.ts','src/app/auth/callback/route.ts','src/utils/supabase/middleware.ts',
  'src/components/auth/AuthSessionContent.tsx','src/middleware.ts',
];
const overlay={};
function copy(relative){
  const from=path.join(root,relative),to=path.join(target,relative),stat=fs.lstatSync(from);
  if(stat.isDirectory()){for(const name of fs.readdirSync(from).sort())copy(path.join(relative,name));return;}
  if(!stat.isFile())throw Error('Overlay contains a nonregular source');
  const bytes=fs.readFileSync(from);fs.mkdirSync(path.dirname(to),{recursive:true});fs.writeFileSync(to,bytes);
  overlay[relative]=createHash('sha256').update(bytes).digest('hex');
}
paths.forEach(copy);
for(const denied of ['src/app/v1/inference','src/app/.well-known/oauth-protected-resource'])if(fs.existsSync(path.join(target,denied)))throw Error('Serving base contains Nova execution; explicit retirement review required');
const record={version:1,at:new Date().toISOString(),baseRevision:revision,overlay,mediaSourcePreserved:true,novaInferenceRouteAbsent:true,legacyInference:'Vercel placement denies exact retired paths before even operator authorization',deployed:false};
fs.writeFileSync(path.join(target,'.galx-connect-source.json'),JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({status:'SOURCE PREPARED',baseRevision:revision,overlayFiles:Object.keys(overlay).length,worktree:target,deployed:false}));
