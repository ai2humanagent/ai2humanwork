import {spawnSync} from 'node:child_process';import fs from 'node:fs';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');const effects=[[0.25,0.10],[0.25,0.15],[0.20,0.12]];const rhos=[0.1,0.25,0.5];const rows=[];
for(const [baseline,treatment] of effects)for(const rho of rhos){const r=spawnSync(process.execPath,[path.join(root,'scripts/power-paired-cluster.mjs'),`--baseline=${baseline}`,`--treatment=${treatment}`,`--rho=${rho}`,'--sims=1200','--power=0.8','--min_clusters=30'],{encoding:'utf8'});let parsed=null;try{parsed=JSON.parse(r.stdout)}catch{}rows.push({baseline,treatment,rho,recommended_base_cases:parsed?.recommended_base_cases??null,estimated_power:parsed?.estimated_power??null,status:r.status})}
const out={generated_at:new Date().toISOString(),planning_only:true,scenarios:rows,warning:'Replace with pilot-derived assumptions before freezing confirmatory size.'};
const file=path.join(root,'reproduction/power-sensitivity.json');fs.writeFileSync(file,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
