/** Prepare an authenticated encrypted recovery artifact; never uploads or deletes. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createCipheriv,createDecipheriv,hkdfSync,randomBytes,createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const state='.data/postgres-cutover',read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const phase=await read(state+'/premium-cutover.json');assert.equal(phase.phase,'verified-local');
const recovery=await read('.data/local-postgres/premium/restore-rehearsal.json');assert.equal(recovery.result,'pass');
const runtime=await read(state+'/web-runtime.secret.json');
assert(runtime.GALX_VAULT_KEY_V1,'Existing externally retained recovery key material is required.');
const directory=state+'/retirement';await fs.mkdir(directory,{recursive:true,mode:0o700});
const file=path.join(directory,'premium-2026-10-17.galxbackup');
try{await fs.access(file);throw Error('Retirement archive already exists; retain its original identity.');}catch(error){if(error.code!=='ENOENT')throw error;}
const backup=path.join('.data/local-postgres/premium/backups',recovery.backup),plain=await fs.readFile(backup);
const sha=value=>createHash('sha256').update(value).digest('hex');
const salt=randomBytes(32),iv=randomBytes(12);
const key=Buffer.from(hkdfSync('sha256',Buffer.from(runtime.GALX_VAULT_KEY_V1),salt,Buffer.from('galx-postgres-offdevice-backup-v1'),32));
const metadata={version:1,algorithm:'aes-256-gcm',kdf:'hkdf-sha256',purpose:'galx-postgres-offdevice-backup-v1',salt:salt.toString('base64'),iv:iv.toString('base64'),database:'galx_relay_premium',sourceBackup:recovery.backup,plainSha256:sha(plain)};
const aad=Buffer.from(JSON.stringify(metadata)),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(aad);
const encrypted=Buffer.concat([cipher.update(plain),cipher.final()]),tag=cipher.getAuthTag();
const envelope=Buffer.concat([Buffer.from(JSON.stringify({...metadata,tag:tag.toString('base64')})+'\n'),encrypted]);
// Reconstruct from the serialized artifact, including its metadata and tag.
const split=envelope.indexOf(10),header=JSON.parse(envelope.subarray(0,split)),{tag:storedTag,...storedMetadata}=header;
const decrypt=createDecipheriv('aes-256-gcm',key,Buffer.from(header.iv,'base64'));decrypt.setAAD(Buffer.from(JSON.stringify(storedMetadata)));decrypt.setAuthTag(Buffer.from(storedTag,'base64'));
const restored=Buffer.concat([decrypt.update(envelope.subarray(split+1)),decrypt.final()]);assert.equal(sha(restored),metadata.plainSha256);
const corrupted=Buffer.from(envelope.subarray(split+1));corrupted[0]^=1;
const rejected=createDecipheriv('aes-256-gcm',key,iv);rejected.setAAD(aad);rejected.setAuthTag(tag);assert.throws(()=>{rejected.update(corrupted);rejected.final();});
await fs.writeFile(file,envelope,{mode:0o600});await fs.chmod(file,0o600);key.fill(0);restored.fill(0);plain.fill(0);
const result={observedAt:new Date().toISOString(),project:'prgjcyokylzcsqrjmkaa',database:'galx_relay_premium',encryptedArtifact:file,encryptedSha256:sha(envelope),bytes:envelope.length,backupRestoreRehearsal:recovery,localDecryptionHash:'match',tamperRejected:true,keyRecovery:'Uses the unchanged production v1 vault seed retained in the current external production configuration. No new key exists only on this Mac.',uploaded:false,offDeviceRecoveryVerified:false,hostedDeletionAuthorized:false,hostedProjectDeleted:false};
await fs.writeFile(path.join(directory,'premium-retirement-review.json'),JSON.stringify(result,null,2),{mode:0o600});
console.log(JSON.stringify({encrypted:true,bytes:result.bytes,localDecryptionHash:'match',tamperRejected:true,uploaded:false,hostedProjectDeleted:false}));
