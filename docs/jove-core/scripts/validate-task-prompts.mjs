import fs from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const prompts = JSON.parse(fs.readFileSync(path.join(root, "pilot", "task-prompts.json"), "utf8"));
const errors = [];
if (prompts.length !== 20) errors.push(`expected 20 prompts, found ${prompts.length}`);
if (new Set(prompts.map((item) => item.case_id)).size !== prompts.length) errors.push("duplicate case IDs");
const forbidden = /password|seed phrase|private key|government id|bank balance|medical record/i;
for (const item of prompts) {
  if (!/^jove_core_[0-9]{4}$/.test(item.case_id)) errors.push(`${item.case_id}: invalid ID`);
  if (forbidden.test(item.prompt)) errors.push(`${item.case_id}: unsafe prompt content`);
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log("Pilot task prompts validated: 20 low-risk templates.");
