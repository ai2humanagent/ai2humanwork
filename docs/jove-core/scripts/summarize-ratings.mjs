import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const input = process.argv[2] || path.join(root, "ratings", "pilot-rating-sheet.csv");

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines.shift().split(",");
  return lines.filter(Boolean).map((line) => Object.fromEntries(line.split(",").map((value, index) => [headers[index], value])));
}

const rows = parseCsv(fs.readFileSync(input, "utf8"));
const byCase = Map.groupBy(rows, (row) => row.case_id);
let paired = 0;
let agreements = 0;
const disagreements = [];

for (const [caseId, ratings] of byCase) {
  if (ratings.length !== 2) continue;
  paired += 1;
  if (ratings[0].outcome === ratings[1].outcome) agreements += 1;
  else disagreements.push({ case_id: caseId, outcomes: ratings.map((rating) => rating.outcome) });
}

const summary = {
  ratings: rows.length,
  unique_cases: byCase.size,
  paired_cases: paired,
  exact_outcome_agreements: agreements,
  exact_outcome_agreement_rate: paired ? agreements / paired : null,
  disagreements
};
console.log(JSON.stringify(summary, null, 2));
