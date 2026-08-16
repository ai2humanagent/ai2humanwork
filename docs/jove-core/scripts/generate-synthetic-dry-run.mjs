import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const output = path.join(root, "synthetic");
fs.mkdirSync(output, { recursive: true });
const classes = ["social_content", "account_configuration", "content_publication", "form_document_submission", "time_sensitive_digital_state", "cross_evidence_consistency"];
const variants = ["valid", "missing", "stale", "replay", "metadata_conflict", "benign_edit", "semantic_mismatch", "contradiction"];
const systems = ["B0_generic_judge", "B1_policy_judge", "V1_structured", "V2_forensic", "V3_ensemble", "V4_selective"];
let state = 20260808;
const random = () => { state = (1664525 * state + 1013904223) >>> 0; return state / 2 ** 32; };
const manifests = [], labels = [], outputs = [];
const acceptance = {
  B0_generic_judge: { valid:.82, benign_edit:.72, missing:.42, stale:.45, replay:.48, metadata_conflict:.44, semantic_mismatch:.36, contradiction:.40 },
  B1_policy_judge: { valid:.86, benign_edit:.77, missing:.30, stale:.34, replay:.38, metadata_conflict:.32, semantic_mismatch:.25, contradiction:.28 },
  V1_structured: { valid:.87, benign_edit:.77, missing:.12, stale:.31, replay:.34, metadata_conflict:.29, semantic_mismatch:.23, contradiction:.25 },
  V2_forensic: { valid:.84, benign_edit:.70, missing:.10, stale:.15, replay:.17, metadata_conflict:.12, semantic_mismatch:.22, contradiction:.22 },
  V3_ensemble: { valid:.88, benign_edit:.75, missing:.08, stale:.12, replay:.14, metadata_conflict:.10, semantic_mismatch:.13, contradiction:.15 },
  V4_selective: { valid:.80, benign_edit:.64, missing:.03, stale:.04, replay:.05, metadata_conflict:.04, semantic_mismatch:.05, contradiction:.06 }
};

for (let baseIndex=1;baseIndex<=30;baseIndex++) {
  const base = `syn_base_${String(baseIndex).padStart(3,"0")}`;
  const taskClass = classes[(baseIndex-1)%classes.length];
  const split = baseIndex<=18 ? "train" : baseIndex<=24 ? "dev" : "test";
  for (const variant of variants) {
    const caseId = `${base}_${variant}`;
    manifests.push({ case_id:caseId, base_case_id:base, task_class:taskClass, variant, split, synthetic:true });
    const supported = variant === "valid" || variant === "benign_edit";
    labels.push({ case_id:caseId, outcome:supported?"supported":"unsupported", adjudication:"synthetic_generator", rater_count:0, synthetic:true });
    for (const systemId of systems) {
      if (systemId === "V4_selective" && !supported && random()<.24) {
        outputs.push(makeOutput(caseId,base,systemId,"abstain",.58)); continue;
      }
      if (systemId === "V4_selective" && supported && random()<.10) {
        outputs.push(makeOutput(caseId,base,systemId,"abstain",.62)); continue;
      }
      const accept = random() < acceptance[systemId][variant];
      outputs.push(makeOutput(caseId,base,systemId,accept?"accept":"reject",accept?.85:.82));
    }
  }
}
function makeOutput(caseId,base,systemId,decision,confidence){return {case_id:caseId,base_case_id:base,system_id:systemId,model_family:"synthetic_simulator",decision,confidence,reason_codes:["SYNTHETIC_PIPELINE_TEST_ONLY"],latency_ms:Math.round(500+random()*1500),cost_usd:Number((.002+random()*.02).toFixed(5)),runtime_status:"ok",model_version:"synthetic-v1",prompt_sha256:null,run_at:"2026-08-08T00:00:00.000Z",synthetic:true}}
for(const [name,data] of [["manifest.jsonl",manifests],["labels.jsonl",labels],["outputs.jsonl",outputs]]) fs.writeFileSync(path.join(output,name),data.map(JSON.stringify).join("\n")+"\n");
fs.writeFileSync(path.join(output,"README.md"),"# SYNTHETIC DRY RUN ONLY\n\nGenerated data contains no real participants, evidence, ratings, or empirical claims. It must never be copied into confirmatory paths or presented as paper results.\n");
console.log(JSON.stringify({synthetic:true,base_cases:30,cases:manifests.length,outputs:outputs.length},null,2));
