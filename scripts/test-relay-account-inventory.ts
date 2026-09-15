import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertCentralAccountDatabase, decodeRelayPoolInventory } from '../src/lib/supabase/repositories/RelayAccountInventoryRepository';
test('central inventory rejects missing, unrelated and relay-project databases', () => {
  for (const url of [undefined, '', 'postgres://postgres@localhost/test', 'postgres://postgres@db.prgjcyokylzcsqrjmkaa.supabase.co/postgres', 'postgres://postgres.enbtzuxkguehtnrhuvlu@aws-0-us-west-2.pooler.supabase.com/postgres', 'https://db.mazhcjisettrzbqhorvp.supabase.co/postgres', 'postgres://postgres@db.mazhcjisettrzbqhorvp.supabase.co.attacker.test/postgres']) assert.throws(() => assertCentralAccountDatabase(url));
  assert.doesNotThrow(() => assertCentralAccountDatabase('postgres://postgres@db.mazhcjisettrzbqhorvp.supabase.co/postgres'));
  assert.doesNotThrow(() => assertCentralAccountDatabase('postgres://postgres.mazhcjisettrzbqhorvp@aws-0-us-west-2.pooler.supabase.com/postgres'));
});
test('central inventory allowlists DTOs and rejects incomplete or conflicting policy', () => {
  const rows = [{id:'premium',account_class:'paid',workloads:['text','sites','images'],registration_enabled:false,installations:0,assignments:0,saved_registrations:0}, {id:'standard',account_class:'free',workloads:['text'],registration_enabled:false,installations:0,assignments:0,saved_registrations:0}];
  assert.equal(JSON.stringify(decodeRelayPoolInventory(rows.map(row => ({...row, credential:'private-sentinel'})))).includes('private-sentinel'),false);
  assert.throws(() => decodeRelayPoolInventory([])); assert.throws(() => decodeRelayPoolInventory([rows[0],rows[0]]));
  assert.throws(() => decodeRelayPoolInventory([rows[0], {...rows[1],workloads:['text','images']}]));
  assert.throws(() => decodeRelayPoolInventory([rows[0], {...rows[1],assignments:-1}]));
});
