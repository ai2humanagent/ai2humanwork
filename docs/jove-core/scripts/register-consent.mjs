import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const args = Object.fromEntries(process.argv.slice(2).map((item) => { const [key, ...rest] = item.replace(/^--/, "").split("="); return [key, rest.join("=")]; }));
for (const key of ["case-id", "consent-at", "retention"]) if (!args[key]) throw new Error(`Missing --${key}`);
if (!/^jove_core_[0-9]{4}$/.test(args["case-id"])) throw new Error("Invalid case ID");
if (!Number.isFinite(Date.parse(args["consent-at"]))) throw new Error("Invalid consent timestamp");
const directory = path.join(root, "pilot", "consents");
fs.mkdirSync(directory, { recursive: true });
const record = { case_id: args["case-id"], research_use: true, recorded_at: new Date(args["consent-at"]).toISOString(), retention_policy: args.retention, participant_reference: args["participant-reference"] || null };
const output = path.join(directory, `${args["case-id"]}.json`);
fs.writeFileSync(output, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
console.log(`Registered consent metadata for ${args["case-id"]}.`);
