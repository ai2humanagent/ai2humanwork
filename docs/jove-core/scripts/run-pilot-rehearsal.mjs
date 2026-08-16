import {spawnSync} from 'node:child_process';import path from 'node:path';
const repo=path.resolve(import.meta.dirname,'../../..');const node=process.execPath;
const steps=[
 ['generate',['docs/jove-core/scripts/generate-pilot-rehearsal.mjs']],
 ['blind audit',['docs/jove-core/scripts/audit-blinded-packet.mjs','docs/jove-core/rehearsal/blinded-packet.jsonl']],
 ['rating validation',['docs/jove-core/scripts/validate-ratings.mjs','docs/jove-core/rehearsal/ratings.jsonl']],
 ['rating summary',['docs/jove-core/scripts/summarize-ratings-jsonl.mjs','docs/jove-core/rehearsal/ratings.jsonl']]
];
const results=[];for(const [name,args] of steps){const r=spawnSync(node,args,{cwd:repo,encoding:'utf8'});results.push({name,ok:r.status===0,stdout:r.stdout.trim(),stderr:r.stderr.trim()});if(r.status!==0){console.error(JSON.stringify(results,null,2));process.exit(1)}}console.log(JSON.stringify({synthetic_rehearsal:true,results},null,2));
