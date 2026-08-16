import {spawnSync} from 'node:child_process';
import fs from 'node:fs';import path from 'node:path';
const repo=path.resolve(import.meta.dirname,'../../..');
const checks=[
 ['bibliography',['run','research:jove:bibliography']],
 ['anonymity',['run','research:jove:anonymity']],
 ['contract_receipt',['run','research:jove:receipt']],
 ['reproduction_bundle',['run','research:jove:reproduction-bundle']],
 ['artifact',['run','research:jove:audit']],
 ['tests',['run','research:jove:test']],
 ['privacy',['run','research:jove:privacy']],
 ['synthetic_isolation',['run','research:jove:synthetic-audit']]
];
const results=[];
for(const [name,args] of checks){const r=spawnSync('npm',args,{cwd:repo,encoding:'utf8'});results.push({name,ok:r.status===0,status:r.status,stdout:r.stdout.trim(),stderr:r.stderr.trim()})}
const latexFiles=['main-v5','main-v5-zh','supplement'];
for(const name of latexFiles){const log=path.join(repo,'docs/jove-core/paper',`${name}.log`);const text=fs.existsSync(log)?fs.readFileSync(log,'utf8'):'';const bad=/LaTeX Error|undefined citations|Citation .* undefined|Overfull \\hbox|Undefined control sequence/.test(text);results.push({name:`latex_${name}`,ok:!!text&&!bad,status:!!text&&!bad?0:1,stderr:!text?'missing log':bad?'forbidden warning/error in log':''})}
const freeze=spawnSync('npm',['run','research:jove:freeze-verify'],{cwd:repo,encoding:'utf8'});results.push({name:'analysis_freeze',ok:freeze.status===0,status:freeze.status,stdout:freeze.stdout.trim(),stderr:freeze.stderr.trim(),expected_to_fail_before_freeze:true});
const gate=spawnSync('npm',['run','research:jove:submission-gate'],{cwd:repo,encoding:'utf8'});results.push({name:'submission_gate',ok:gate.status===0,status:gate.status,stdout:gate.stdout.trim(),stderr:gate.stderr.trim(),expected_to_fail_before_real_results:true});
const softChecks=new Set(['submission_gate','analysis_freeze']);
const report={generated_at:new Date().toISOString(),checks:results,all_non_submission_checks_pass:results.filter(x=>!softChecks.has(x.name)).every(x=>x.ok),analysis_freeze_status:freeze.status,submission_ready:results.every(x=>x.ok)};
const out=path.join(repo,'docs/jove-core/reproduction/preflight-report.json');fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({all_non_submission_checks_pass:report.all_non_submission_checks_pass,submission_ready:report.submission_ready,report:path.relative(repo,out),analysis_freeze_status:freeze.status,submission_gate_status:gate.status},null,2));
if(!report.all_non_submission_checks_pass)process.exit(1);
