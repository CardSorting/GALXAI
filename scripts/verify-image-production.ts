import fs from 'node:fs';
import assert from 'node:assert/strict';
import sharp from 'sharp';
process.loadEnvFile('.env.local');
const origin='https://galx.ai';
const headers={authorization:`Bearer ${process.env.GALX_API_KEY}`,'content-type':'application/json'};
const forbiddenHeaders=['x-vercel-id','x-matched-path','x-edge-fastpath','server-timing','x-galx-shard-id','x-galx-request-id'];
const verifyHeaders=(response:Response)=>{for(const name of forbiddenHeaders)assert.equal(response.headers.get(name),null,name);};
const library=await fetch(`${origin}/api/images/library?limit=1&sort=oldest`,{headers,signal:AbortSignal.timeout(30000)});
console.log(JSON.stringify({libraryStatus:library.status}));
if(library.ok){
 const data=await library.json(); const record=data.records?.[0];
 if(record?.publicUrl){
  const url=new URL(record.publicUrl);assert.equal(url.host,'galx.ai');assert.match(url.pathname,/^\/v1\/images\/assets\//);
  const image=await fetch(url,{signal:AbortSignal.timeout(30000)});verifyHeaders(image);
  const bytes=Buffer.from(await image.arrayBuffer());assert.equal(image.status,200);
  const metadata=await sharp(bytes).metadata();for(const key of ['exif','xmp','iptc','comments'])assert.equal((metadata as any)[key],undefined);
  console.log(JSON.stringify({historicalAuthenticatedDownload:'passed',contentType:image.headers.get('content-type')}));
 }else console.log('No historical image in verification account library.');
}
const response=await fetch(`${origin}/v1/images/generations`,{method:'POST',headers,body:JSON.stringify({model:'openai-gpt-image-latest',prompt:'A simple blue circle on a plain white background. No text.',n:1}),signal:AbortSignal.timeout(180000)});
verifyHeaders(response);
const bytes=Buffer.from(await response.arrayBuffer());
if(!response.ok){const error=JSON.parse(bytes.toString());console.log(JSON.stringify({generationStatus:response.status,publicCode:error.error?.code}));assert.fail('Live generation did not succeed');}
assert.match(response.headers.get('content-type')||'',/^image\/(png|jpeg|webp)$/);
const metadata=await sharp(bytes).metadata();for(const key of ['exif','xmp','iptc','comments'])assert.equal((metadata as any)[key],undefined);
fs.writeFileSync('/tmp/galx-production-verification-image',bytes,{mode:0o600});
console.log(JSON.stringify({generationStatus:response.status,contentType:response.headers.get('content-type'),bytes:bytes.length,metadataRemoved:true}));
