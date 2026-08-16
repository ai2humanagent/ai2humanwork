import fs from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const lines = fs.readFileSync(path.join(root, "pilot", "launch-plan.csv"), "utf8").trim().split(/\r?\n/);
const header = lines.shift().split(",");
const rows = lines.map((line) => Object.fromEntries(line.split(",").map((value, index) => [header[index], value])));
const errors = [];
if (rows.length !== 30) errors.push(`expected 30 launch rows; found ${rows.length}`);
for (const row of rows) {
  if (row.source_strategy === "retrospective_candidate" && row.consent_state !== "missing") errors.push(`${row.case_id}: retrospective candidate must remain missing until consent is recorded`);
  if (row.consent_state === "missing" && row.execution_state !== "blocked") errors.push(`${row.case_id}: missing consent must block execution/export`);
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log("Pilot launch plan valid: 4 retrospective consent blocks, 26 prospective-ready slots.");
