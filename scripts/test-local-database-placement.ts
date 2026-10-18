import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertProjectDatabase, PROJECTS } from '../src/relay/pool-protocol';
import { assertCentralAccountDatabase } from '../src/lib/supabase/repositories/RelayAccountInventoryRepository';
test('native placement keeps fixed central/execution hosts, roles, ports and database names',()=>{
  const central='postgresql://galx_control_service:fixture@host.docker.internal:55432/galxai';
  const premium='postgresql://galx_execution_service:fixture@galx-postgres-premium.internal:55433/galx_relay_premium';
  assert.doesNotThrow(()=>assertProjectDatabase(central,PROJECTS.central,'native-postgres-v1'));
  assert.doesNotThrow(()=>assertProjectDatabase(premium,PROJECTS.premium,'native-postgres-v1'));
  for(const [url,project]of [[central,PROJECTS.premium],[premium,PROJECTS.central]]as const)assert.throws(()=>assertProjectDatabase(url,project,'native-postgres-v1'));
  for(const value of [central.replace('55432','55433'),central.replace('/galxai','/postgres'),central.replace('galx_control_service','postgres'),central.replace('host.docker.internal','localhost'),central+'?host=remote.invalid',central+'#override',central.replace(':fixture@','@')])assert.throws(()=>assertProjectDatabase(value,PROJECTS.central,'native-postgres-v1'));
  assert.throws(()=>assertProjectDatabase(central,PROJECTS.central));
  assert.throws(()=>assertProjectDatabase(central,PROJECTS.central,'unknown'));
  assert.doesNotThrow(()=>assertProjectDatabase(`postgresql://galx_control_service.${PROJECTS.central}:fixture@aws-0-us-west-2.pooler.supabase.com:6543/postgres`,PROJECTS.central));
});
test('account inventory accepts an explicitly configured local central owner and rejects Premium or arbitrary loopback databases',()=>{
  const old=process.env.GALX_DATABASE_DEPLOYMENT;
  try{
    delete process.env.GALX_DATABASE_DEPLOYMENT;
    assert.throws(()=>assertCentralAccountDatabase('postgresql://postgres:fixture@127.0.0.1:55432/galxai'));
    process.env.GALX_DATABASE_DEPLOYMENT='native-postgres-v1';
    assert.doesNotThrow(()=>assertCentralAccountDatabase('postgresql://postgres:fixture@host.docker.internal:55432/galxai'));
    for(const url of ['postgresql://postgres:fixture@127.0.0.1:55433/galx_relay_premium','postgresql://postgres:fixture@127.0.0.1:55432/other','postgresql://galx_control_service:fixture@127.0.0.1:55432/galxai','postgresql://postgres:fixture@127.0.0.1:55432/galxai?host=remote.invalid'])assert.throws(()=>assertCentralAccountDatabase(url));
  }finally{if(old===undefined)delete process.env.GALX_DATABASE_DEPLOYMENT;else process.env.GALX_DATABASE_DEPLOYMENT=old;}
});
