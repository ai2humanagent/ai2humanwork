import fs from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const errors=[];
const syntheticMetrics=JSON.parse(fs.readFileSync(path.join(root,"synthetic","metrics.json"),"utf8"));
if (!syntheticMetrics.synthetic) errors.push("synthetic metrics are not marked synthetic");
for (const forbidden of ["confirmatory/labels.jsonl","experiments/outputs.jsonl","results/metrics.json"]) {
  if (fs.existsSync(path.join(root,forbidden))) errors.push(`synthetic dry run polluted formal path: ${forbidden}`);
}
const rehearsalDirectory=path.join(root,'rehearsal');
if(fs.existsSync(rehearsalDirectory)){
  for(const filename of fs.readdirSync(rehearsalDirectory).filter(x=>x.endsWith('.jsonl'))){
    const rows=fs.readFileSync(path.join(rehearsalDirectory,filename),'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
    if(filename==='cases.jsonl' && rows.some(row=>row.synthetic!==true||row.study_phase!=='rehearsal'||!String(row.case_id).startsWith('rehearsal_'))) errors.push(`${filename}: rehearsal case lacks isolated synthetic namespace`);
  }
}
const readme=fs.readFileSync(path.join(root,"synthetic","README.md"),"utf8");
if (!/SYNTHETIC DRY RUN ONLY/.test(readme)) errors.push("synthetic warning missing");
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log("Synthetic isolation audit passed.");
