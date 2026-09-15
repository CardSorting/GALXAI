import { readFile } from 'node:fs/promises';
const [pool,file,role='operator']=process.argv.slice(2);
if(!['premium','standard'].includes(pool)||!file||!['operator','viewer'].includes(role))throw Error('Usage: open-pool-monitor.ts premium|standard /private/path/monitor.json [operator|viewer]');
const config=JSON.parse(await readFile(file,'utf8'));if(config.pool!==pool)throw Error('Monitor configuration pool mismatch.');
const origin=`http://127.0.0.1:${pool==='premium'?13311:13312}`;
const response=await fetch(origin+'/session/ticket',{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${config[role+'Token']}`}});
if(!response.ok)throw Error('Monitor sign-in is unavailable. Check its central connection.');
const data=await response.json();
console.log(`${origin}/#ticket=${encodeURIComponent(data.ticket)}&role=${role}`);
