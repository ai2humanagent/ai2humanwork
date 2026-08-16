import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const directory = path.join(root, "pilot", "cases");
if (!fs.existsSync(directory)) { console.log("Privacy audit passed: no captured cases yet."); process.exit(0); }
const forbiddenKeys = new Set(["accessUrl", "uri", "originalFilename", "receiverAddress", "payerAddress", "userAgent", "email", "phone"]);
const errors = [];
function walk(value, trail, caseId) {
  if (Array.isArray(value)) return value.forEach((item, index) => walk(item, `${trail}[${index}]`, caseId));
  if (!value || typeof value !== "object") {
    if (typeof value === "string" && /https?:\/\//i.test(value) && !trail.endsWith("retention_policy")) errors.push(`${caseId}: URL in ${trail}`);
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    if (forbiddenKeys.has(key)) errors.push(`${caseId}: forbidden key ${trail}.${key}`);
    walk(item, `${trail}.${key}`, caseId);
  }
}
for (const file of fs.readdirSync(directory).filter((name) => name.endsWith(".json"))) {
  const record = JSON.parse(fs.readFileSync(path.join(directory, file), "utf8"));
  walk(record, "record", record.case_id || file);
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log("Privacy audit passed for captured research records.");
