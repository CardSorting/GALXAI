/** Private server cache. PostgreSQL ownership and snapshot checks always precede a lookup. */
import { createHash } from 'node:crypto';
import { BroccoliDbTable } from '../../core/broccolidb/broccolidb-table';

interface Entry { payload: string; bytes: number; expiresAt: number; touched: number; }
export class SitesContextCache {
  private readonly table = new BroccoliDbTable<Entry>('galx_sites_context_l1');
  private usedBytes = 0;
  constructor(private readonly now = Date.now, private readonly maxEntries = 128, private readonly maxBytes = 4 * 1024 * 1024, private readonly ttlMs = 60000) {}
  key(snapshot: {user_id:string;id:string;revision:number;turn_count?:number;context_start_turn?:number;operation_id:string|null;updated_at:Date}, kind:string, query='') {
    return createHash('sha256').update(JSON.stringify([snapshot.user_id,snapshot.id,snapshot.revision,snapshot.turn_count || 0,
      snapshot.context_start_turn || 0,snapshot.operation_id,snapshot.updated_at.toISOString(),kind,query])).digest('hex');
  }
  get<T>(key:string):T|undefined {
    const entry=this.table.get(key);if(!entry)return;
    if(entry.expiresAt<=this.now()){this.remove(key,entry);return;}
    this.table.put(key,{...entry,touched:this.now()});
    // Serialized payloads prevent nested objects from mutating another request's snapshot.
    return JSON.parse(entry.payload) as T;
  }
  put(key:string,value:unknown) {
    const payload=JSON.stringify(value),bytes=Buffer.byteLength(payload);if(bytes>this.maxBytes || this.maxEntries<1)return;
    const old=this.table.get(key);if(old)this.remove(key,old);
    // Keep metadata separately bounded too; no expiry timers or durable side effects.
    for(const id of this.keys){const entry=this.table.get(id);if(entry && entry.expiresAt<=this.now())this.remove(id,entry);}
    while(this.table.count()>=this.maxEntries || this.usedBytes+bytes>this.maxBytes){
      let oldest:string|undefined,age=Infinity;
      for(const id of this.keys){const entry=this.table.get(id);if(entry && entry.touched<age){oldest=id;age=entry.touched;}}
      if(!oldest)break;this.remove(oldest,this.table.get(oldest)!);
    }
    this.table.put(key,{payload,bytes,expiresAt:this.now()+this.ttlMs,touched:this.now()});this.keys.add(key);this.usedBytes+=bytes;
  }
  private readonly keys=new Set<string>();
  private remove(key:string,entry:Entry){this.table.delete(key);this.keys.delete(key);this.usedBytes-=entry.bytes;}
  clear(){this.table.clear();this.keys.clear();this.usedBytes=0;}
}
export const sitesContextCache=new SitesContextCache();

const STOP=new Set('a an and are as at be been but by can change could do for from have how i if in into is it its just make me my of on or our page please site so some than that the their them then there these they this to update use want was we what when which with would you your'.split(' '));
/** Literal, bounded lexical terms; user input never supplies SQL or tsquery syntax. */
export function recallQuery(brief:string) {
  return [...new Set((brief.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]{2,64}/gu) || []).filter(word=>!STOP.has(word)))].slice(0,12).join(' OR ');
}
