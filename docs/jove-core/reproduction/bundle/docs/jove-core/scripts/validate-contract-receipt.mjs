import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
const root=path.resolve(import.meta.dirname,'..');
const [contractPath=path.join(root,'fixtures/contract.valid.json'),receiptPath=path.join(root,'fixtures/receipt.valid.json')]=process.argv.slice(2);
const contract=JSON.parse(fs.readFileSync(contractPath,'utf8')); const receipt=JSON.parse(fs.readFileSync(receiptPath,'utf8'));
const errors=[];
const ajv=new Ajv({allErrors:true,unknownFormats:'ignore',schemaId:'auto'});
const compatible=(schema)=>{const copy=structuredClone(schema);delete copy.$schema;return copy};
for(const [name,value,schemaFile] of [['contract',contract,'verification-contract.schema.json'],['receipt',receipt,'verification-receipt.schema.json']]){
 const schema=compatible(JSON.parse(fs.readFileSync(path.join(root,'schema',schemaFile),'utf8')));
 const validate=ajv.compile(schema);
 if(!validate(value)) for(const issue of validate.errors||[]) errors.push(`${name} schema ${issue.dataPath||'/'} ${issue.message}`);
}
if(receipt.contract_id!==contract.contract_id) errors.push('contract_id mismatch');
if(receipt.contract_version!==contract.version) errors.push('contract_version mismatch');
if(receipt.task_id!==contract.binding?.task_id) errors.push('task_id mismatch');
if(!receipt.decision_id || receipt.transition?.decision_id!==receipt.decision_id) errors.push('transition is not bound to immutable decision_id');
if(receipt.verifier_state?.threshold_version!==contract.verifier?.threshold_version) errors.push('threshold_version mismatch');
const obligations=new Map((contract.proof_obligations||[]).map(o=>[o.obligation_id,o]));
const results=new Map((receipt.obligation_results||[]).map(o=>[o.obligation_id,o]));
for(const [id,o] of obligations){if(o.required&&!results.has(id)) errors.push(`missing required obligation result ${id}`)}
for(const id of results.keys()) if(!obligations.has(id)) errors.push(`undeclared obligation result ${id}`);
const states=[...results.values()].map(x=>x.state);
const allTrue=states.length>0&&states.every(x=>x==='true')&&[...obligations].filter(([,o])=>o.required).every(([id])=>results.get(id)?.state==='true');
const anyFalse=states.includes('false'); const anyUnknown=states.includes('unknown');
const expected=allTrue?'accept':anyFalse?'reject':'abstain';
if(receipt.decision!==expected) errors.push(`decision ${receipt.decision} violates three-valued semantics; expected ${expected}`);
const allowed=(contract.admissible_transitions||[]).includes(receipt.transition?.action);
if(receipt.transition?.eligible!== (receipt.decision==='accept'&&allowed)) errors.push('transition eligibility violates contract decision/allowlist');
if(receipt.decision==='accept' && (anyUnknown||anyFalse||receipt.verifier_state?.degraded)) errors.push('accept cannot contain failed/unknown/degraded state');
const maxArtifacts=contract.evidence_governance?.max_artifacts;
if(maxArtifacts && receipt.evidence_commitments.length>maxArtifacts) errors.push('evidence artifact budget exceeded');
if(errors.length){console.error(`Contract/receipt validation failed (${errors.length}):`);errors.forEach(e=>console.error(`- ${e}`));process.exit(1)}
console.log(`Contract/receipt validation passed: ${receipt.receipt_id}`);
