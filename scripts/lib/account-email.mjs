/** Private Resend SMTP configuration for the separately staged account service. */
import fs from 'node:fs/promises';
import os from 'node:os';
export function accountEmailEnvironment(value){
  const allowed=new Set(['provider','host','port','user','password','sender','senderName','domainId']);
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!allowed.has(k))||value.provider!=='resend'||value.host!=='smtp.resend.com'||value.port!==465||value.user!=='resend'||value.sender!=='accounts@galx.ai'||value.senderName!=='GALX'||typeof value.password!=='string'||!/^re_[A-Za-z0-9_-]{20,200}$/.test(value.password)||typeof value.domainId!=='string'||!/^[-a-f0-9]{36}$/.test(value.domainId))throw Error('Invalid private account-email configuration.');
  return {GOTRUE_SMTP_HOST:value.host,GOTRUE_SMTP_PORT:String(value.port),GOTRUE_SMTP_USER:value.user,GOTRUE_SMTP_PASS:value.password,GOTRUE_SMTP_ADMIN_EMAIL:value.sender,GOTRUE_SMTP_SENDER_NAME:value.senderName,GOTRUE_SMTP_LOGGING_ENABLED:'false'};
}
export async function loadAccountEmailEnvironment(file){
  let stat;try{stat=await fs.lstat(file);}catch(error){if(error.code==='ENOENT')return {};throw error;}
  if(!stat.isFile()||stat.isSymbolicLink()||stat.uid!==os.userInfo().uid||(stat.mode&0o077))throw Error('Account-email credentials must be an owner-only regular file.');
  return accountEmailEnvironment(JSON.parse(await fs.readFile(file,'utf8')));
}
