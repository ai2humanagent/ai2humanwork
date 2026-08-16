import fs from 'node:fs';
const file=process.argv[2];if(!file||!fs.existsSync(file)){console.error('Usage: summarize-ratings-jsonl.mjs <ratings.jsonl>');process.exit(2)}
const rows=fs.readFileSync(file,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);const byCase=Map.groupBy(rows,r=>r.case_id);const labels=['supported','unsupported','insufficient_to_decide'];
let paired=0,agree=0;const matrix=Object.fromEntries(labels.map(a=>[a,Object.fromEntries(labels.map(b=>[b,0]))]));const disagreements=[];let confidenceSum=0;
for(const [caseId,rs] of byCase){if(rs.length!==2)continue;paired++;const [a,b]=rs.map(x=>x.outcome);matrix[a][b]++;if(a===b)agree++;else disagreements.push({case_id:caseId,outcomes:[a,b]});confidenceSum+=rs[0].confidence+rs[1].confidence}
const po=paired?agree/paired:null;const rowTotals=Object.fromEntries(labels.map(a=>[a,labels.reduce((s,b)=>s+matrix[a][b],0)]));const colTotals=Object.fromEntries(labels.map(b=>[b,labels.reduce((s,a)=>s+matrix[a][b],0)]));const pe=paired?labels.reduce((s,l)=>s+(rowTotals[l]/paired)*(colTotals[l]/paired),0):null;const kappa=paired&&pe!==1?(po-pe)/(1-pe):null;
console.log(JSON.stringify({ratings:rows.length,unique_cases:byCase.size,paired_cases:paired,exact_agreement:po,cohen_kappa:kappa,mean_confidence:paired?confidenceSum/(2*paired):null,confusion:matrix,disagreements},null,2));
