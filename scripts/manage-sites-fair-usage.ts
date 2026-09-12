/** Private operator tool; never accepts browser claims or guesses production limits. */
import { readFile } from 'node:fs/promises';
import { getPostgresPool } from '../src/lib/db/postgres';
import { readFairLimits } from '../src/lib/sites/fair-policy';
const pool=getPostgresPool();if(!pool)throw new Error('Database unavailable');
try{
  const [action,file,...extra]=process.argv.slice(2);
  if(extra.length)throw new Error('Unexpected arguments');
  if(action==='--status'&&!file){
    const row=(await pool.query('SELECT mode,pool_id,revision,limits IS NOT NULL AS configured,cardinality(paid_price_ids) AS paid_prices FROM private.galx_sites_fair_policy WHERE singleton')).rows[0];
    console.log(JSON.stringify(row));
  }else if(action==='--disable'&&!file){
    await pool.query("UPDATE private.galx_sites_fair_policy SET mode='disabled',revision=revision+1,updated_at=now() WHERE singleton");
    console.log('New Sites admission disabled; existing records retained.');
  }else if(action==='--configure'&&file){
    const input=JSON.parse(await readFile(file,'utf8'));
    if(!input||Object.keys(input).sort().join()!=='limits,mode,paid_price_ids,pool_id'||input.mode!=='enforce'||
      !/^[a-zA-Z0-9_.:-]{1,120}$/.test(input.pool_id)||/test|fixture|shadow/i.test(input.pool_id)||
      !Array.isArray(input.paid_price_ids)||!input.paid_price_ids.length||input.paid_price_ids.length>100||input.paid_price_ids.some((id:unknown)=>typeof id!=='string'||!/^price_[a-zA-Z0-9]+$/.test(id)))throw new Error('Provide an explicit production pool, paid Stripe price IDs, limits and enforce mode.');
    const limits=readFairLimits(input.limits);
    const fixture=JSON.parse(await readFile(new URL('../GALX_Fair_Usage_Test_Fixture.json',import.meta.url),'utf8'));
    if(Object.keys(fixture.policy).every(key=>(limits as any)[key]===fixture.policy[key]))throw new Error('Synthetic fixture limits cannot activate production.');
    const db=await pool.connect();try{
      await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='2s'; SET LOCAL statement_timeout='5s'");
      const current=(await db.query('SELECT limits FROM private.galx_sites_fair_policy WHERE singleton FOR UPDATE')).rows[0];
      if(current?.limits&&current.limits.allowance_window_seconds!==limits.allowance_window_seconds)throw new Error('Window duration is immutable once configured; changing it needs an explicit allowance migration.');
      await db.query(`UPDATE private.galx_sites_fair_policy SET mode=$1,pool_id=$2,limits=$3,paid_price_ids=$4,revision=revision+1,updated_at=now() WHERE singleton`,[input.mode,input.pool_id,limits,input.paid_price_ids]);
      // A policy change invalidates old refreshes; it cannot revive a cooled pool.
      await db.query(`UPDATE private.galx_sites_fair_pools SET revision=revision+1,snapshot=NULL,refresh_token=NULL,refresh_until=NULL`);
      await db.query('COMMIT');console.log('Configured shared Sites policy. Existing reservations and flow history were preserved.');
    }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
  }else throw new Error('Use --status, --disable, or --configure /absolute/path/to/private-policy.json');
}finally{await pool.end();}
