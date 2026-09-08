import fs from 'node:fs';
process.loadEnvFile('.env.local');
const { GalxUnifiedR2StorageManager } = await import('../src/core/storage/GalxUnifiedR2StorageManager');
const storage = GalxUnifiedR2StorageManager.getInstance();
const objects: any[] = []; let continuationToken: string | undefined;
do {
 const page = await storage.listObjects({ bucket:'images', maxKeys:1000, continuationToken });
 objects.push(...page.objects); continuationToken=page.nextContinuationToken;
 if (!page.isTruncated) break;
} while (continuationToken && objects.length < 20000);
fs.writeFileSync('/tmp/galx-image-origin-objects.json',JSON.stringify(objects),{mode:0o600});
const counts: Record<string,number>={}; for(const o of objects){ const prefix=o.key.split('/')[0];counts[prefix]=(counts[prefix]||0)+1; }
const image=objects.find(o=>o.key.startsWith('users/')&&/\.(png|jpg|jpeg|webp)$/.test(o.key));
if(image){
 const url=new URL(image.key,storage.resolveBucket('images').publicDomain+'/').toString();
 const r=await fetch(url);const bytes=Buffer.from(await r.arrayBuffer());
 fs.writeFileSync('/tmp/galx-historical-image',bytes,{mode:0o600});
 fs.writeFileSync('/tmp/galx-historical-image-review.json',JSON.stringify({key:image.key,url,status:r.status,headerNames:[...r.headers.keys()]}),{mode:0o600});
 const sharp=(await import('sharp')).default;let metadata:any={};try{metadata=await sharp(bytes).metadata()}catch{}
 console.log(JSON.stringify({historicalImageStatus:r.status,headerNames:[...r.headers.keys()],imageMetadataFields:Object.keys(metadata).filter(k=>['exif','xmp','iptc','comments','icc'].includes(k))}));
}
console.log(JSON.stringify({objects:objects.length,prefixCounts:counts,truncated:!!continuationToken}));
process.exit(0);
