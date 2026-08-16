import fs from 'node:fs';import path from 'node:path';import Ajv from 'ajv';
const root=path.resolve(import.meta.dirname,'..');const input=process.argv[2]||path.join(root,'ratings','pilot-ratings.jsonl');
if(!fs.existsSync(input)){console.error(`Missing ratings: ${input}`);process.exit(2)}
const schema=JSON.parse(fs.readFileSync(path.join(root,'schema','rating.schema.json'),'utf8'));delete schema.$schema;
const ajv=new Ajv({allErrors:true,unknownFormats:'ignore'});const validate=ajv.compile(schema);const errors=[];const pairs=new Set();
for(const [i,line] of fs.readFileSync(input,'utf8').split(/\r?\n/).filter(Boolean).entries()){
 let row;try{row=JSON.parse(line)}catch{errors.push(`line ${i+1}: invalid JSON`);continue}
 if(!validate(row))for(const e of validate.errors||[])errors.push(`line ${i+1}: ${e.dataPath||'/'} ${e.message}`);
 const pair=`${row.case_id}|${row.rater_id}`;if(pairs.has(pair))errors.push(`line ${i+1}: duplicate case/rater ${pair}`);pairs.add(pair);
 if(row.outcome==='supported'&&row.sufficiency!=='sufficient')errors.push(`line ${i+1}: supported requires sufficient`);
 if(row.confidence<0.5)errors.push(`line ${i+1}: confidence below rubric floor 0.5`);
}
if(errors.length){console.error(`Rating validation failed (${errors.length}):`);errors.forEach(e=>console.error(`- ${e}`));process.exit(1)}
console.log(`Rating validation passed: ${pairs.size} unique case/rater pairs.`);
