import fs from 'node:fs';
const file=process.argv[2]||'docs/jove-core/ratings/pilot-blinded-packet.jsonl';
if(!fs.existsSync(file)){console.error(`Missing blinded packet: ${file}`);process.exit(2)}
const forbiddenKeys=/(verdict|decision|settlement|tx_hash|wallet|email|participant|mutation|gold|expected|product_task_id|receipt_id)/i;
const errors=[];const seen=new Set();
for(const [i,line] of fs.readFileSync(file,'utf8').split(/\r?\n/).filter(Boolean).entries()){
 let row;try{row=JSON.parse(line)}catch{errors.push(`line ${i+1}: invalid JSON`);continue}
 if(seen.has(row.case_id))errors.push(`line ${i+1}: duplicate case_id`);seen.add(row.case_id);
 const walk=(v,p=[])=>{if(Array.isArray(v))return v.forEach((x,j)=>walk(x,[...p,j]));if(!v||typeof v!=='object')return;for(const[k,x]of Object.entries(v)){if(forbiddenKeys.test(k))errors.push(`line ${i+1}: forbidden key ${[...p,k].join('.')}`);walk(x,[...p,k])}};walk(row);
 if(!row.request||!row.proof_policy||!row.evidence)errors.push(`line ${i+1}: incomplete review packet`);
}
if(errors.length){console.error(`Blinded packet audit failed (${errors.length}):`);errors.forEach(e=>console.error(`- ${e}`));process.exit(1)}
console.log(`Blinded packet audit passed: ${seen.size} unique cases.`);
