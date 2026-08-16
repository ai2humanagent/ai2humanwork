import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const metricsPath = process.argv[2];
if (!metricsPath || !fs.existsSync(metricsPath)) throw new Error("Usage: generate-paper-assets.mjs <metrics.json>");
const templateInput = /template/i.test(path.basename(metricsPath));
if (templateInput && process.env.ALLOW_TEMPLATE_PAPER_ASSETS !== "1") {
  throw new Error("Refusing to generate paper assets from template metrics. Set ALLOW_TEMPLATE_PAPER_ASSETS=1 only for pipeline testing.");
}
const payload = JSON.parse(fs.readFileSync(metricsPath, "utf8"));
const syntheticInput = payload.synthetic === true;
if (syntheticInput && process.env.ALLOW_SYNTHETIC_PAPER_ASSETS !== "1") {
  throw new Error("Refusing to generate submission assets from synthetic metrics. Set ALLOW_SYNTHETIC_PAPER_ASSETS=1 only for dry-run reports.");
}
const systems = Object.entries(payload.metrics || {});
const figures = path.join(root, "figures");
const paperGenerated = path.join(root, "paper", "generated");
fs.mkdirSync(figures, { recursive: true });
fs.mkdirSync(paperGenerated, { recursive: true });

const width = 960, height = 540, margin = 80;
const values = systems.map(([, item]) => ({ coverage: item.operating_point?.automation_coverage ?? 0, risk: item.operating_point?.unsafe_positive_transition_rate ?? 0 }));
const maxRisk = Math.max(1, ...values.map((item) => item.risk));
const colors = ["#4f46e5", "#0891b2", "#16a34a", "#ca8a04", "#dc2626", "#7c3aed"];
const points = systems.map(([name, item], index) => {
  const x = margin + (item.operating_point?.automation_coverage ?? 0) * (width - margin * 2);
  const y = height - margin - ((item.operating_point?.unsafe_positive_transition_rate ?? 0) / maxRisk) * (height - margin * 2);
  return `<circle cx="${x}" cy="${y}" r="7" fill="${colors[index % colors.length]}"/><text x="${x + 10}" y="${y - 10}" font-size="14" fill="#111827">${name}</text>`;
}).join("\n");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/><line x1="${margin}" y1="${height-margin}" x2="${width-margin}" y2="${height-margin}" stroke="#111827"/><line x1="${margin}" y1="${margin}" x2="${margin}" y2="${height-margin}" stroke="#111827"/><text x="${width/2-70}" y="${height-22}" font-size="16">Automation coverage</text><text x="20" y="${height/2}" font-size="16" transform="rotate(-90 20 ${height/2})">Selective risk</text>${points}<text x="${margin}" y="30" font-size="18" font-weight="700">System operating points (not a full threshold sweep)</text></svg>`;
fs.writeFileSync(path.join(figures, "system-operating-points.svg"), svg);

const rows = systems.map(([name, item]) => `${name.replaceAll("_", "\\_")} & ${format(item.operating_point?.unsafe_positive_transition_rate)} & ${format(item.operating_point?.false_reject_rate)} & ${format(item.operating_point?.automation_coverage)} & ${format(item.aurc)} \\\\`).join("\n");
const latex = `\\begin{table*}[t]\n\\centering\n\\caption{Confirmatory system results generated only from the frozen scoring pipeline. UPT is unsafe positive-transition risk per evaluated case.}\n\\label{tab:mainresults}\n\\begin{tabular}{lrrrr}\n\\toprule\nSystem & UPT $\\downarrow$ & FRR $\\downarrow$ & Coverage $\\uparrow$ & AURC $\\downarrow$ \\\\\n\\midrule\n${rows}\n\\bottomrule\n\\end{tabular}\n\\end{table*}\n`;
fs.writeFileSync(path.join(paperGenerated, "main-results.tex"), latex);
fs.writeFileSync(path.join(paperGenerated, "provenance.json"), JSON.stringify({ metrics_path: path.resolve(metricsPath), metrics_sha256: (await import("node:crypto")).createHash("sha256").update(fs.readFileSync(metricsPath)).digest("hex"), template_input: templateInput, synthetic_input: syntheticInput, generated_at: new Date().toISOString() }, null, 2) + "\n");
console.log(`Generated paper assets from ${metricsPath}`);

function format(value) { return value == null ? "--" : Number(value).toFixed(3); }
