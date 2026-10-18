/** Verify implicit-TLS SMTP authentication without sending a message. */
import tls from 'node:tls';
import fs from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { loadAccountEmailEnvironment } from './lib/account-email.mjs';
const state='.data/postgres-cutover';let socket;
try{
  const config=await loadAccountEmailEnvironment(state+'/account-email.secret.json');
  if(!config.GOTRUE_SMTP_HOST)throw Error('Account email is not configured.');
  socket=tls.connect({host:config.GOTRUE_SMTP_HOST,port:465,servername:config.GOTRUE_SMTP_HOST,rejectUnauthorized:true,minVersion:'TLSv1.2'});
  socket.setTimeout(15000,()=>socket.destroy(Error('SMTP deadline exceeded.')));
  await new Promise((resolve,reject)=>{socket.once('secureConnect',resolve);socket.once('error',reject);});
  if(!socket.authorized)throw Error('SMTP certificate was not accepted.');
  const iterator=createInterface({input:socket,crlfDelay:Infinity})[Symbol.asyncIterator]();
  const status=async expected=>{
    for(let n=0;n<40;n++){const {value,done}=await iterator.next();if(done||typeof value!=='string'||value.length>2048)throw Error('Invalid SMTP response.');if(/^\d{3} /.test(value)){if(Number(value.slice(0,3))!==expected)throw Error('SMTP authentication or protocol rejected.');return;}}
    throw Error('SMTP response bound exceeded.');
  };
  await status(220);socket.write('EHLO galx.ai\r\n');await status(250);
  socket.write('AUTH PLAIN '+Buffer.from('\0'+config.GOTRUE_SMTP_USER+'\0'+config.GOTRUE_SMTP_PASS).toString('base64')+'\r\n');await status(235);
  socket.write('QUIT\r\n');await status(221);socket.end();
  const receipt={observedAt:new Date().toISOString(),provider:'Resend',host:'smtp.resend.com',port:465,verifiedTls:true,authenticated:true,messagesSent:0};
  await fs.writeFile(state+'/account-email-transport.json',JSON.stringify(receipt,null,2),{mode:0o600});console.log(JSON.stringify(receipt));
}catch(error){socket?.destroy();await fs.writeFile(state+'/email-transport-error.json',JSON.stringify({observedAt:new Date().toISOString(),message:String(error.message).slice(0,200)}),{mode:0o600});console.error('Account-email transport verification failed; no message was sent.');process.exitCode=1;}
