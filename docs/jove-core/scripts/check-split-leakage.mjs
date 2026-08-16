import fs from "node:fs";

const file = process.argv[2];
if (!file) throw new Error("Usage: node check-split-leakage.mjs <manifest.jsonl>");
const rows = fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const byBase = Map.groupBy(rows, (row) => row.base_case_id);
const errors = [];
for (const [baseCaseId, cases] of byBase) {
  const splits = new Set(cases.map((item) => item.split));
  if (splits.size !== 1) errors.push(`${baseCaseId}: appears in ${[...splits].join(", ")}`);
}
if (errors.length) {
  console.error("Split leakage detected:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`No base-case split leakage across ${byBase.size} base cases.`);
