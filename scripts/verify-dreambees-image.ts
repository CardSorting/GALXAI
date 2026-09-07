import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root = process.env.DREAMBEES_ROOT;
if (!root) throw Error('Set DREAMBEES_ROOT and load its server environment. This command performs one paid image request.');
const {createGatewayClient,generateGatewayImage} = await import(pathToFileURL(path.resolve(root, 'src/lib/studio/gateway.ts')).href);
const {pngBytes} = await import(pathToFileURL(path.resolve(root, 'src/lib/studio/image-download.ts')).href);
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const key=process.env.GALX_API_KEY||process.env.GALXAI_API_KEY;
if(!key)throw Error('Missing DreamBees credential');
const started=Date.now();let status:number|undefined,requestId:string|null=null;
try {
const client=createGatewayClient(key,async(input,init)=>{const r=await fetch(input,init);status=r.status;requestId=r.headers.get('x-request-id');return r;});
const output=await generateGatewayImage(client,'A small blue ceramic bee on a plain cream background. One original artwork, no lettering.');
const image=output.data?.[0];if(!image?.b64_json)throw Error('Missing inline image');
const bytes=pngBytes(Buffer.from(image.b64_json,'base64'));
if (process.env.DREAMBEES_IMAGE_OUTPUT) writeFileSync(process.env.DREAMBEES_IMAGE_OUTPUT,bytes,{mode:0o600});
console.log(JSON.stringify({verified:true,status,requestId,execution:(output as any).execution,elapsedMs:Date.now()-started,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}));
}catch(e:any){console.log(JSON.stringify({verified:false,status:e.status||status,requestId,code:e.code||e.error?.code,elapsedMs:Date.now()-started}));process.exitCode=1;}
