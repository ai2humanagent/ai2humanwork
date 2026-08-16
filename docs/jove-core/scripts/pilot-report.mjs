import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const directory = path.join(root, "pilot", "cases");
if (!fs.existsSync(directory)) throw new Error("No captured pilot cases.");
const cases = fs.readdirSync(directory).filter((name) => name.endsWith(".json")).map((name) => JSON.parse(fs.readFileSync(path.join(directory, name), "utf8")));
const byDecision = Object.fromEntries(Object.entries(Object.groupBy(cases, (item) => item.verification.system_decision)).map(([key, value]) => [key, value.length]));
const byClass = Object.fromEntries(Object.entries(Object.groupBy(cases, (item) => item.task_class)).map(([key, value]) => [key, value.length]));
const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const report = {
  generated_at: new Date().toISOString(), cases: cases.length, by_class: byClass, by_system_decision: byDecision,
  degraded_rate: mean(cases.map((item) => Number(item.verification.degraded))),
  escalation_rate: mean(cases.map((item) => Number(item.verification.escalated))),
  receipt_reconstruction_rate: mean(cases.map((item) => Number(item.receipt.reconstructable))),
  mean_latency_ms: mean(cases.map((item) => item.verification.latency_ms)),
  mean_model_cost_usd: mean(cases.map((item) => item.verification.model_cost_usd)),
  note: "Developmental feasibility statistics only; not confirmatory performance results."
};
fs.writeFileSync(path.join(root, "results", "pilot-descriptive.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
