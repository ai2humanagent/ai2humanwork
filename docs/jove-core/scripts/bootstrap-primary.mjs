import fs from "node:fs";
import path from "node:path";
import { pairedClusterBootstrap } from "./lib/estimator.mjs";

const root = path.resolve(import.meta.dirname, "..");
const outputsPath = process.argv[2] || path.join(root, "experiments", "outputs.jsonl");
const labelsPath = process.argv[3] || path.join(root, "confirmatory", "labels.jsonl");
const outputPath = process.argv[4] || path.join(root, "results", "bootstrap-primary.json");
const config = JSON.parse(fs.readFileSync(path.join(root, "config", "study.json"), "utf8"));
const readJsonl = (file) => fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const outputs = readJsonl(outputsPath);
const labels = new Map(readJsonl(labelsPath).map((row) => [row.case_id, row.outcome ?? row.majority_outcome]));

const result = pairedClusterBootstrap({ outputs, labels, config });

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
