import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const [caseId, status, productTaskId = "", receiptId = ""] = process.argv.slice(2);
const allowed = new Set(["planned", "consented", "captured", "rated", "adjudicated", "excluded"]);
const transitions = {
  planned: new Set(["consented", "excluded"]),
  consented: new Set(["captured", "excluded"]),
  captured: new Set(["rated", "excluded"]),
  rated: new Set(["adjudicated", "excluded"]),
  adjudicated: new Set([]),
  excluded: new Set([])
};
if (!/^jove_core_[0-9]{4}$/.test(caseId || "") || !allowed.has(status)) throw new Error("Usage: update-manifest.mjs <case-id> <status> [product-task-id] [receipt-id]");
const file = path.join(root, "pilot", "manifest.csv");
const lines = fs.readFileSync(file, "utf8").trim().split(/\r?\n/);
const headers = lines[0].split(",");
let found = false;
const rows = lines.slice(1).map((line) => {
  const values = line.split(",");
  const row = Object.fromEntries(values.map((value, index) => [headers[index], value]));
  if (row.case_id !== caseId) return row;
  found = true;
  if (row.research_status !== status && !transitions[row.research_status]?.has(status)) {
    throw new Error(`Invalid transition for ${caseId}: ${row.research_status} -> ${status}`);
  }
  if (["captured", "rated", "adjudicated"].includes(status) && !(receiptId || row.receipt_id)) {
    throw new Error(`${caseId}: ${status} requires receipt_id`);
  }
  return { ...row, research_status: status, product_task_id: productTaskId || row.product_task_id, receipt_id: receiptId || row.receipt_id };
});
if (!found) throw new Error(`Case not found: ${caseId}`);
fs.writeFileSync(file, [headers.join(","), ...rows.map((row) => headers.map((key) => row[key] || "").join(","))].join("\n") + "\n");
console.log(`Updated ${caseId} to ${status}.`);
