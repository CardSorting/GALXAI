/** Private operator command. Defaults to a reviewable preview, never enables by default. */
import { readFileSync } from 'node:fs';
import { getPostgresPool } from '../src/lib/db/postgres';
import { changeFreePolicy } from '../src/lib/billing/free-generation-policy';
const args=process.argv.slice(2);
if(args.length===1 && args[0]==='--help') {
  console.log('Usage: npm run free:policy -- --status | --file <change.json> [--apply]\nWithout --apply, validates and previews the exact revision-checked change. See docs/maintainers/FREE_GENERATION_QUOTA.md.');
}else{
  const pool=getPostgresPool();
  try {
    if(!pool)throw new Error('Database unavailable');
    if(args.length===1 && args[0]==='--status') {
      console.log(JSON.stringify((await pool.query(`SELECT kind,enabled,revision,valid_until,max_outstanding,
        max_hour_units,max_day_units,max_total_units,admitted_units,updated_at
        FROM private.galx_free_generation_policy ORDER BY kind`)).rows,null,2));
    }else{
      if(![2,3].includes(args.length) || args[0]!=='--file' || (args.length===3 && args[2]!=='--apply'))throw new Error('Use --help');
      console.log(JSON.stringify(await changeFreePolicy(pool,JSON.parse(readFileSync(args[1],'utf8')),args[2]==='--apply'),null,2));
    }
  }catch {console.error('Free policy change was not confirmed. Verify configuration and current revision before retrying.');process.exitCode=1;}
  finally{await pool?.end();}
}
