import fs from "node:fs";
import path from "node:path";

const input = process.argv[2];
if (!input) {
  console.error("Usage: node audit-mutation-leakage.mjs <manifest.jsonl>");
  process.exit(2);
}
const rows = fs.readFileSync(path.resolve(input), "utf8").split(/\r?\n/).filter(Boolean).map((line, index) => {
  try { return JSON.parse(line); } catch { throw new Error(`invalid JSON at line ${index + 1}`); }
});
const forbiddenKey = /(label|expected|gold|mutation_type|attack_type|target_property)/i;
const suspiciousValue = /\b(valid|invalid|accept|reject|abstain|replay|tampered|policy[_ -]?drift)\b/i;
const findings = [];
for (const [index, row] of rows.entries()) {
  const publicView = row.public_input ?? row.model_input ?? row.evidence ?? row;
  const walk = (value, trail = []) => {
    if (Array.isArray(value)) return value.forEach((item, i) => walk(item, [...trail, i]));
    if (!value || typeof value !== "object") {
      if (typeof value === "string" && suspiciousValue.test(value) && trail.some((part) => /file|name|path|caption|metadata/i.test(String(part)))) findings.push(`line ${index + 1}: suspicious label token at ${trail.join(".")}`);
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (forbiddenKey.test(key)) findings.push(`line ${index + 1}: forbidden public key ${[...trail, key].join(".")}`);
      walk(child, [...trail, key]);
    }
  };
  walk(publicView);
}
if (findings.length) {
  console.error(`Mutation leakage audit failed (${findings.length}):`);
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}
console.log(`Mutation leakage audit passed: ${rows.length} records.`);
