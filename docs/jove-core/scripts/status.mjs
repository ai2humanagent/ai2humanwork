import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const lines = fs.readFileSync(path.join(root, "pilot", "manifest.csv"), "utf8").trim().split(/\r?\n/);
const headers = lines.shift().split(",");
const rows = lines.map((line) => Object.fromEntries(line.split(",").map((value, index) => [headers[index], value])));
const statuses = Object.groupBy(rows, (row) => row.research_status);
const casesDirectory = path.join(root, "pilot", "cases");
const capturedFiles = fs.existsSync(casesDirectory) ? fs.readdirSync(casesDirectory).filter((name) => name.endsWith(".json")).length : 0;
const ratingsPath = path.join(root, "ratings", "pilot-rating-sheet.csv");
const ratingRows = fs.readFileSync(ratingsPath, "utf8").trim().split(/\r?\n/).slice(1).filter(Boolean).length;
console.log(JSON.stringify({ manifest_slots: rows.length, manifest_statuses: Object.fromEntries(Object.entries(statuses).map(([key, value]) => [key, value.length])), captured_case_files: capturedFiles, rating_rows: ratingRows, next_gate: capturedFiles < 20 ? "capture_consented_live_cases" : ratingRows < 40 ? "complete_two_independent_ratings_per_case" : "adjudicate_and_analyze_pilot" }, null, 2));
